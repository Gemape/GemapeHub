import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { allowedOrigin } from "./security";

const response = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const userUpdate = z.object({ id: z.string().uuid(), papel: z.enum(["admin", "consulta"]), ativo: z.boolean() }).strict();
const userCreate = z.object({ email: z.string().email(), password: z.string().min(12).max(128) }).strict();

export async function handleApi(request: Request): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (path !== "/health" && !path.startsWith("/api/admin/")) return null;
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_PUBLISHABLE_KEY'];
  if (!url || !key) return response({ error: "Servidor sem configuração do banco" }, 503);
  if (path === "/health") {
    if (request.method !== "GET") return response({ error: "Método não permitido" }, 405);
    try {
      // Uma consulta PostgREST testa conectividade real com PostgreSQL, sem expor linhas.
      const result = await fetch(`${url}/rest/v1/perfis?select=id&limit=0`, {
        headers: { apikey: key, ...(process.env['SUPABASE_SERVICE_ROLE_KEY'] ? { Authorization: `Bearer ${process.env['SUPABASE_SERVICE_ROLE_KEY']}` } : {}) },
        signal: AbortSignal.timeout(4000),
      });
      return response({ status: result.ok ? "ok" : "unavailable", database: result.ok }, result.ok ? 200 : 503);
    } catch { return response({ status: "unavailable", database: false }, 503); }
  }
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return response({ error: "Sessão necessária" }, 401);
  const userClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: authError } = await userClient.auth.getUser(authHeader.slice(7));
  if (authError || !userData.user) return response({ error: "Sessão inválida" }, 401);
  const { data: perfil } = await userClient.from("perfis").select("papel,ativo").eq("id", userData.user.id).single();
  if (!perfil?.ativo || perfil.papel !== "admin") return response({ error: "Acesso restrito ao administrador" }, 403);
  if (request.method !== "GET" && !allowedOrigin(request, process.env['APP_URL'] ?? "http://localhost:3000")) return response({ error: "Origem não permitida" }, 403);
  if (!process.env['SUPABASE_SERVICE_ROLE_KEY']) return response({ error: "Administração de usuários não configurada" }, 503);
  const admin = createClient(url, process.env['SUPABASE_SERVICE_ROLE_KEY'], { auth: { persistSession: false, autoRefreshToken: false } });
  if (path === "/api/admin/users" && request.method === "GET") {
    const page = Math.max(1, Math.min(10000, Number(new URL(request.url).searchParams.get("page")) || 1));
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 50 });
    if (error) return response({ error: "Não foi possível consultar usuários" }, 502);
    const ids = data.users.map(u => u.id);
    const { data: perfis, error: profileError } = await admin.from("perfis").select("*").in("id", ids);
    if (profileError) return response({ error: "Não foi possível consultar perfis" }, 502);
    return response(data.users.map(u => ({ id: u.id, email: u.email, ...perfis?.find(p => p.id === u.id) })));
  }
  if (!["POST", "PATCH"].includes(request.method)) return response({ error: "Método não permitido" }, 405);
  const text = await request.text();
  if (text.length > 8192) return response({ error: "Conteúdo muito grande" }, 413);
  let body: unknown;
  try { body = JSON.parse(text); } catch { return response({ error: "JSON inválido" }, 400); }
  if (path === "/api/admin/users" && request.method === "POST") {
    const parsed = userCreate.safeParse(body);
    if (!parsed.success) return response({ error: "Informe e-mail válido e senha de pelo menos 12 caracteres" }, 400);
    const { error } = await admin.auth.admin.createUser({ ...parsed.data, email_confirm: true });
    return error ? response({ error: "Não foi possível criar usuário" }, 400) : response({ ok: true }, 201);
  }
  if (path === "/api/admin/users" && request.method === "PATCH") {
    const parsed = userUpdate.safeParse(body);
    if (!parsed.success) return response({ error: "Perfil inválido" }, 400);
    if (parsed.data.id === userData.user.id) return response({ error: "Outro administrador deve alterar seu perfil" }, 409);
    const { id, ...values } = parsed.data;
    const { data, error } = await admin.from("perfis").update(values).eq("id", id).select("id").single();
    return error || !data ? response({ error: "Não foi possível alterar perfil" }, 400) : response({ ok: true });
  }
  return response({ error: "Rota não encontrada" }, 404);
}

