-- Correções dos três pontos altos de banco da auditoria de 04/11/2026 (docs/auditorias e docs/propostas-sql).
-- Aplicar após 20260928140000_vistoria_sem_estoque.sql. Execute em transação e com backup. NÃO apaga nem altera linhas de negócio.
--   1. auditoria_movimentacoes (tabela antiga, órfã) fecha o acesso pela API: RLS ligada, sem privilégios para anon/authenticated,
--      leitura só para administrador. Nenhuma linha é apagada. A função antiga auditar_movimentacao fixa o search_path.
--   2. Cada ferramenta fica em uma caixa só: índice único em caixa_ferramenta_itens(ferramenta_id). Se já houver ferramenta em mais de
--      uma caixa, o índice NÃO é criado (aviso na saída) e os casos precisam ser resolvidos pelo responsável; a salvar_caixa já barra novos casos.
--   3. salvar_caixa passa a respeitar o que o aplicativo envia: número da caixa escolhido (codigo/codigo_num), responsavel_id e demais campos
--      preservados quando não vêm no envio, status com valor padrão, ferramenta de outra caixa recusada com mensagem clara.
BEGIN;

-- 1. auditoria_movimentacoes ----------------------------------------------------------------------------------------------------------
DO $$ BEGIN
  IF to_regclass('public.auditoria_movimentacoes') IS NOT NULL THEN
    ALTER TABLE public.auditoria_movimentacoes ENABLE ROW LEVEL SECURITY;
    REVOKE ALL ON public.auditoria_movimentacoes FROM anon, authenticated;
    DROP POLICY IF EXISTS auditoria_mov_admin ON public.auditoria_movimentacoes;
    CREATE POLICY auditoria_mov_admin ON public.auditoria_movimentacoes FOR SELECT TO authenticated USING (public.gemape_admin());
    GRANT SELECT ON public.auditoria_movimentacoes TO authenticated;
  END IF;
  IF to_regprocedure('public.auditar_movimentacao()') IS NOT NULL THEN
    ALTER FUNCTION public.auditar_movimentacao() SET search_path = '';
  END IF;
END $$;

-- 2. Uma ferramenta em uma caixa só ---------------------------------------------------------------------------------------------------
DO $$ DECLARE repetidas integer; BEGIN
  SELECT count(*) INTO repetidas FROM (
    SELECT ferramenta_id FROM public.caixa_ferramenta_itens GROUP BY ferramenta_id HAVING count(*) > 1
  ) d;
  IF repetidas > 0 THEN
    RAISE WARNING 'Índice caixa_ferramenta_itens_ferramenta_unica NÃO criado: % ferramenta(s) estão em mais de uma caixa. Resolva-as e rode de novo a criação do índice.', repetidas;
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS caixa_ferramenta_itens_ferramenta_unica ON public.caixa_ferramenta_itens(ferramenta_id);
  END IF;
END $$;

-- 3. salvar_caixa ---------------------------------------------------------------------------------------------------------------------
-- Roda com a RLS de quem chama (SECURITY INVOKER). Tudo ou nada: qualquer erro desfaz a caixa e os itens.
CREATE OR REPLACE FUNCTION public.salvar_caixa(p_id uuid, p_valores jsonb, p_itens jsonb) RETURNS uuid
LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE
  caixa uuid; registro record; v_empresa uuid; v_num integer; v_codigo text; outra text;
BEGIN
  IF p_valores IS NULL OR jsonb_typeof(p_valores) <> 'object' OR p_itens IS NULL OR jsonb_typeof(p_itens) <> 'array' THEN
    RAISE EXCEPTION 'Caixa inválida';
  END IF;
  v_empresa := (p_valores->>'empresa_id')::uuid;
  IF v_empresa IS NULL THEN RAISE EXCEPTION 'Informe a empresa da caixa'; END IF;
  IF NOT public.gemape_pode_gerir(v_empresa) THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
  IF length(trim(coalesce(p_valores->>'nome',''))) < 1 THEN RAISE EXCEPTION 'Caixa inválida'; END IF;

  -- Duas caixas ao mesmo tempo na mesma empresa não se atropelam na conferência das ferramentas.
  PERFORM pg_advisory_xact_lock(hashtext('salvar_caixa:' || v_empresa::text));

  -- Número da caixa escolhido na tela: o código é sempre CX-NNNN do número; sem número, o gatilho do banco sorteia o próximo.
  v_num := nullif(trim(coalesce(p_valores->>'codigo_num','')),'')::integer;
  IF v_num IS NOT NULL THEN
    IF v_num < 1 OR v_num > 999999 THEN RAISE EXCEPTION 'Número da caixa inválido'; END IF;
    v_codigo := 'CX-' || lpad(v_num::text, 4, '0');
    IF EXISTS (SELECT 1 FROM public.caixas_ferramentas WHERE codigo_num = v_num AND id IS DISTINCT FROM p_id) THEN
      RAISE EXCEPTION 'Já existe a caixa %.', v_codigo;
    END IF;
  END IF;

  -- Caixa nova sem número: pega o próximo da sequência que ainda não esteja em uso (números escolhidos à mão não podem colidir com o sorteio).
  IF p_id IS NULL AND v_num IS NULL THEN
    LOOP
      v_num := nextval('public.codigo_caixa_seq');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.caixas_ferramentas WHERE codigo_num = v_num);
    END LOOP;
    v_codigo := 'CX-' || lpad(v_num::text, 4, '0');
  END IF;

  -- Itens: ferramenta repetida no envio, quantidade inválida e ferramenta de outra empresa são recusadas antes de gravar.
  IF (SELECT count(*) - count(DISTINCT x.ferramenta_id)
        FROM jsonb_to_recordset(p_itens) AS x(ferramenta_id uuid)) > 0 THEN
    RAISE EXCEPTION 'A mesma ferramenta aparece mais de uma vez na caixa';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.caixas_ferramentas(empresa_id,nome,descricao,responsavel_id,localizacao,status,codigo_num,codigo)
    VALUES(v_empresa,p_valores->>'nome',p_valores->>'descricao',(p_valores->>'responsavel_id')::uuid,p_valores->>'localizacao',
      coalesce(nullif(p_valores->>'status',''),'Ativa'),v_num,v_codigo) RETURNING id INTO caixa;
  ELSE
    UPDATE public.caixas_ferramentas SET
      empresa_id = v_empresa,
      nome = p_valores->>'nome',
      descricao = CASE WHEN p_valores ? 'descricao' THEN p_valores->>'descricao' ELSE descricao END,
      responsavel_id = CASE WHEN p_valores ? 'responsavel_id' THEN (p_valores->>'responsavel_id')::uuid ELSE responsavel_id END,
      localizacao = CASE WHEN p_valores ? 'localizacao' THEN p_valores->>'localizacao' ELSE localizacao END,
      status = coalesce(nullif(p_valores->>'status',''), status),
      codigo_num = coalesce(v_num, codigo_num),
      codigo = coalesce(v_codigo, codigo)
    WHERE id = p_id RETURNING id INTO caixa;
    IF caixa IS NULL THEN RAISE EXCEPTION 'Caixa inexistente'; END IF;
    DELETE FROM public.caixa_ferramenta_itens WHERE caixa_id = caixa;
  END IF;

  FOR registro IN SELECT * FROM jsonb_to_recordset(p_itens) AS x(ferramenta_id uuid,quantidade integer,observacao text) LOOP
    IF registro.ferramenta_id IS NULL OR registro.quantidade IS NULL OR registro.quantidade < 1 THEN
      RAISE EXCEPTION 'Ferramenta ou quantidade inválida';
    END IF;
    IF NOT EXISTS(SELECT 1 FROM public.ferramentas WHERE id=registro.ferramenta_id AND empresa_id=v_empresa) THEN
      RAISE EXCEPTION 'Ferramenta inexistente ou de outra empresa';
    END IF;
    SELECT c.codigo INTO outra FROM public.caixa_ferramenta_itens i JOIN public.caixas_ferramentas c ON c.id = i.caixa_id
      WHERE i.ferramenta_id = registro.ferramenta_id AND i.caixa_id <> caixa LIMIT 1;
    IF outra IS NOT NULL THEN
      RAISE EXCEPTION 'Esta ferramenta já está na caixa %: cada ferramenta fica em uma caixa só. Dê baixa ou transfira antes.', outra;
    END IF;
    INSERT INTO public.caixa_ferramenta_itens(caixa_id,ferramenta_id,quantidade,observacao)
      VALUES(caixa,registro.ferramenta_id,registro.quantidade,registro.observacao);
  END LOOP;
  RETURN caixa;
EXCEPTION WHEN unique_violation THEN
  -- Corrida entre duas gravações ou número repetido: mensagem clara e nada gravado.
  RAISE EXCEPTION 'Já existe uma caixa com este número, ou a ferramenta já está em outra caixa.' USING ERRCODE='23505';
END; $$;
REVOKE ALL ON FUNCTION public.salvar_caixa(uuid,jsonb,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_caixa(uuid,jsonb,jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
