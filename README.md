# GEMAPE Hub

# SISTEMA DE CONTROLE DE PATRIMÔNIO GEMAPE

## Execução na VPN

1. Copie `.env.example` para `.env` e preencha apenas endereços internos e chaves do ambiente. Nunca versione esse arquivo.
2. Defina `VPN_HOST` como o IP privado já atribuído à interface VPN; IP público, curinga ou inexistente é recusado. Ajuste `APP_URL` para a URL interna usada pelos usuários.
3. Faça backup e aplique, nesta ordem, `20260916000000_security_integrity.sql`, `20260916001000_purchases.sql` e `20260928120000_empresa_papeis_rls.sql`. Os perfis nascem desativados: ative o primeiro administrador no SQL Editor antes do primeiro login (`UPDATE public.perfis SET ativo = true, papel = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'seu@email');`). Depois, em **Usuários e permissões**, defina papel e empresa dos demais.
   - **admin**: todas as empresas, cadastra e altera tudo, gerencia usuários.
   - **gestor**: somente a própria empresa, cadastra e altera.
   - **operador**: somente a própria empresa, consulta e registra movimentações e ocorrências.
   - Perfis que eram `consulta` viram `operador` e só enxergam dados depois que o admin definir a empresa.
   - Defina `VITE_DEMO_MODE=false` no `.env`; sem isso o app abre em modo demonstração, sem login real.
   - No painel do Supabase, em Authentication > URL Configuration, inclua `APP_URL` e `APP_URL/auth` nas Redirect URLs para a recuperação de senha funcionar.
4. Execute `npm ci`, `npm run build` e `npm start`. `GET /health` confirma a aplicação e a conexão com o banco, sem expor dados.

O proxy reverso da VPN deve terminar TLS e encaminhar somente tráfego interno para `VPN_HOST:PORT`. Configure a origem interna em `APP_URL`.

## CONTEXTO

Você está desenvolvendo um sistema de controle de patrimônio e estoque para o grupo GEMAPE. O sistema deve gerenciar EPIs, Uniformes, Ferramentas e Veículos, com módulos separados, dashboard gerencial integrado e banco de dados PostgreSQL.

A empresa possui múltiplas unidades:

- GEMAPE MÁQUINAS E PEÇAS LTDA

- GMP LOCAÇÕES DE MÁQUINAS E SERVIÇOS LTDA

- LAPA MÁQUINAS E PEÇAS LTDA

## STACK TECNOLÓGICA

- Frontend: React + TypeScript + Tailwind CSS + Shadcn/UI

- Backend/Database: supabase (PostgreSQL)

- Autenticação: Supabase Auth

- Arquitetura: Modular, escalável, com separação clara entre módulos

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```