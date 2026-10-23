/// <reference types="vite/client" />
// Variável que liga o modo demonstração. Declarada para poder ser lida como `import.meta.env.VITE_DEMO_MODE`: essa forma é trocada pelo valor
// logo no começo da compilação, e o código só do demo (dados de teste) sai do pacote de produção.
interface ImportMetaEnv {
  readonly VITE_DEMO_MODE?: string;
}
