// Cliente do Supabase sem os tipos das tabelas, para as leituras e gravações que ainda não têm tipo gerado (src/integrations/supabase/types.ts).
// O `any` é deliberado e fica só aqui: cada tela que precisava dele passa a importar este tipo, em vez de repeti-lo.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ClienteLivre = { from: (tabela: string) => any };
