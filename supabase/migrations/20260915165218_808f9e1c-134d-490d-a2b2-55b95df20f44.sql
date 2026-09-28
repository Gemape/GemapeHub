ALTER FUNCTION public.handle_updated_at() SET search_path = public;
ALTER FUNCTION public.set_codigo_caixa_trigger() SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.aplicar_movimentacao_estoque_v2() FROM PUBLIC, anon, authenticated;