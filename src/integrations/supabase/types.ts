export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      cadastros_auxiliares: {
        Row: {
          ativo: boolean
          categoria: string
          id: string
          valor: string
        }
        Insert: {
          ativo?: boolean
          categoria: string
          id?: string
          valor: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          id?: string
          valor?: string
        }
        Relationships: []
      }
      caixa_ferramenta_itens: {
        Row: {
          caixa_id: string
          created_at: string
          ferramenta_id: string
          id: string
          observacao: string | null
          quantidade: number
        }
        Insert: {
          caixa_id: string
          created_at?: string
          ferramenta_id: string
          id?: string
          observacao?: string | null
          quantidade?: number
        }
        Update: {
          caixa_id?: string
          created_at?: string
          ferramenta_id?: string
          id?: string
          observacao?: string | null
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "caixa_ferramenta_itens_caixa_id_fkey"
            columns: ["caixa_id"]
            isOneToOne: false
            referencedRelation: "caixas_ferramentas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixa_ferramenta_itens_ferramenta_id_fkey"
            columns: ["ferramenta_id"]
            isOneToOne: false
            referencedRelation: "ferramentas"
            referencedColumns: ["id"]
          },
        ]
      }
      caixas_ferramentas: {
        Row: {
          codigo: string
          codigo_num: number | null
          created_at: string
          descricao: string | null
          empresa_id: string | null
          id: string
          localizacao: string | null
          nome: string
          responsavel_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          codigo?: string
          codigo_num?: number | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          codigo?: string
          codigo_num?: number | null
          created_at?: string
          descricao?: string | null
          empresa_id?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          responsavel_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "caixas_ferramentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "caixas_ferramentas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "empregados"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_epis: {
        Row: {
          created_at: string
          data_compra: string
          empresa_id: string | null
          fornecedor: string
          id: string
          item_id: string | null
          nota_fiscal: string | null
          observacao: string | null
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data_compra?: string
          empresa_id?: string | null
          fornecedor: string
          id?: string
          item_id?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Update: {
          created_at?: string
          data_compra?: string
          empresa_id?: string | null
          fornecedor?: string
          id?: string
          item_id?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_epis_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "epis"
            referencedColumns: ["id"]
          },
        ]
      }
      compras_uniformes: {
        Row: {
          created_at: string
          data_compra: string
          empresa_id: string | null
          fornecedor: string
          id: string
          item_id: string | null
          nota_fiscal: string | null
          observacao: string | null
          quantidade: number
          valor_total: number | null
          valor_unitario: number
        }
        Insert: {
          created_at?: string
          data_compra?: string
          empresa_id?: string | null
          fornecedor: string
          id?: string
          item_id?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade: number
          valor_total?: number | null
          valor_unitario: number
        }
        Update: {
          created_at?: string
          data_compra?: string
          empresa_id?: string | null
          fornecedor?: string
          id?: string
          item_id?: string | null
          nota_fiscal?: string | null
          observacao?: string | null
          quantidade?: number
          valor_total?: number | null
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "compras_uniformes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compras_uniformes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
        ]
      }
      empregados: {
        Row: {
          ativo: boolean
          cargo: string | null
          cpf: string
          created_at: string
          data_admissao: string | null
          data_demissao: string | null
          empresa_id: string | null
          id: string
          matricula: string | null
          nome: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          cpf: string
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          empresa_id?: string | null
          id?: string
          matricula?: string | null
          nome: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          cpf?: string
          created_at?: string
          data_admissao?: string | null
          data_demissao?: string | null
          empresa_id?: string | null
          id?: string
          matricula?: string | null
          nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "empregados_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          cnpj: string
          created_at: string
          id: string
          nome_fantasia: string
          razao_social: string
        }
        Insert: {
          cnpj: string
          created_at?: string
          id?: string
          nome_fantasia: string
          razao_social: string
        }
        Update: {
          cnpj?: string
          created_at?: string
          id?: string
          nome_fantasia?: string
          razao_social?: string
        }
        Relationships: []
      }
      enderecamentos: {
        Row: {
          apartamento: string
          codigo_produto: string
          created_at: string
          empresa_id: string
          id: string
          prateleira: string
          rua: string
          updated_at: string
        }
        Insert: {
          apartamento: string
          codigo_produto: string
          created_at?: string
          empresa_id: string
          id?: string
          prateleira: string
          rua: string
          updated_at?: string
        }
        Update: {
          apartamento?: string
          codigo_produto?: string
          created_at?: string
          empresa_id?: string
          id?: string
          prateleira?: string
          rua?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enderecamentos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      epis: {
        Row: {
          preco_unitario: number | null
          ca: string
          categoria: string
          codigo_sku: string
          created_at: string | null
          data_validade: string | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string | null
          tamanho: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          ca?: string
          categoria: string
          codigo_sku: string
          created_at?: string | null
          data_validade?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string | null
          tamanho?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          ca?: string
          categoria?: string
          codigo_sku?: string
          created_at?: string | null
          data_validade?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string | null
          tamanho?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "epis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas: {
        Row: {
          preco_unitario: number | null
          categoria: string
          codigo_sku: string
          created_at: string | null
          data_aquisicao: string | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          marca: string | null
          modelo: string | null
          nome: string
          numero_serie: string
          observacoes: string | null
          patrimonio: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          categoria: string
          codigo_sku: string
          created_at?: string | null
          data_aquisicao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome: string
          numero_serie?: string
          observacoes?: string | null
          patrimonio?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          codigo_sku?: string
          created_at?: string | null
          data_aquisicao?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nome?: string
          numero_serie?: string
          observacoes?: string | null
          patrimonio?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      itens: {
        Row: {
          ativo: boolean
          ca_certificado: string | null
          codigo: string
          codigo_sequencial: number | null
          cor: string | null
          created_at: string
          descricao: string
          empresa_id: string | null
          estado: string
          estoque_atual: number
          estoque_minimo: number
          id: string
          marca: string | null
          modelo: string | null
          modulo: string
          numero_serie: string | null
          preco_unitario: number | null
          tamanho: string | null
          unidade_medida: string
        }
        Insert: {
          ativo?: boolean
          ca_certificado?: string | null
          codigo: string
          codigo_sequencial?: number | null
          cor?: string | null
          created_at?: string
          descricao: string
          empresa_id?: string | null
          estado?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          marca?: string | null
          modelo?: string | null
          modulo: string
          numero_serie?: string | null
          preco_unitario?: number | null
          tamanho?: string | null
          unidade_medida?: string
        }
        Update: {
          ativo?: boolean
          ca_certificado?: string | null
          codigo?: string
          codigo_sequencial?: number | null
          cor?: string | null
          created_at?: string
          descricao?: string
          empresa_id?: string | null
          estado?: string
          estoque_atual?: number
          estoque_minimo?: number
          id?: string
          marca?: string | null
          modelo?: string | null
          modulo?: string
          numero_serie?: string | null
          preco_unitario?: number | null
          tamanho?: string | null
          unidade_medida?: string
        }
        Relationships: [
          {
            foreignKeyName: "itens_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimentacoes: {
        Row: {
          conducao_ocorrencia: string | null
          created_at: string
          created_by: string | null
          data_movimentacao: string
          empregado_id: string | null
          empresa_id: string | null
          id: string
          item_id: string | null
          modulo: string
          motivo_baixa: string | null
          observacao: string | null
          onus_baixa: string | null
          quantidade: number
          sinalizar_ocorrencia: boolean
          status_ocorrencia: string | null
          tipo_movimentacao: string
          tipo_ocorrencia: string | null
          tipo_vistoria: string | null
          veiculo_id: string | null
        }
        Insert: {
          conducao_ocorrencia?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          empregado_id?: string | null
          empresa_id?: string | null
          id?: string
          item_id?: string | null
          modulo: string
          motivo_baixa?: string | null
          observacao?: string | null
          onus_baixa?: string | null
          quantidade?: number
          sinalizar_ocorrencia?: boolean
          status_ocorrencia?: string | null
          tipo_movimentacao: string
          tipo_ocorrencia?: string | null
          tipo_vistoria?: string | null
          veiculo_id?: string | null
        }
        Update: {
          conducao_ocorrencia?: string | null
          created_at?: string
          created_by?: string | null
          data_movimentacao?: string
          empregado_id?: string | null
          empresa_id?: string | null
          id?: string
          item_id?: string | null
          modulo?: string
          motivo_baixa?: string | null
          observacao?: string | null
          onus_baixa?: string | null
          quantidade?: number
          sinalizar_ocorrencia?: boolean
          status_ocorrencia?: string | null
          tipo_movimentacao?: string
          tipo_ocorrencia?: string | null
          tipo_vistoria?: string | null
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_empregado_id_fkey"
            columns: ["empregado_id"]
            isOneToOne: false
            referencedRelation: "empregados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimentacoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          created_at: string
          data: string
          descricao_ocorrencia: string
          empregado_id: string | null
          hora: string
          id: string
          item_id: string | null
          responsavel_registro: string
          tipo_ocorrencia: string
          veiculo_id: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          descricao_ocorrencia: string
          empregado_id?: string | null
          hora?: string
          id?: string
          item_id?: string | null
          responsavel_registro: string
          tipo_ocorrencia: string
          veiculo_id?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          descricao_ocorrencia?: string
          empregado_id?: string | null
          hora?: string
          id?: string
          item_id?: string | null
          responsavel_registro?: string
          tipo_ocorrencia?: string
          veiculo_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_empregado_id_fkey"
            columns: ["empregado_id"]
            isOneToOne: false
            referencedRelation: "empregados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "itens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ocorrencias_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      uniformes: {
        Row: {
          preco_unitario: number | null
          categoria: string
          codigo_sku: string
          cor: string | null
          created_at: string | null
          empresa_id: string | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedor: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string | null
          tamanho: string | null
          unidade_medida: string | null
          updated_at: string | null
        }
        Insert: {
          categoria: string
          codigo_sku: string
          cor?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string | null
          tamanho?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Update: {
          categoria?: string
          codigo_sku?: string
          cor?: string | null
          created_at?: string | null
          empresa_id?: string | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedor?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string | null
          tamanho?: string | null
          unidade_medida?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uniformes_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      veiculos: {
        Row: {
          ano: number | null
          chassi: string | null
          combustivel: string | null
          cor: string | null
          created_at: string
          empregado_responsavel_id: string | null
          empresa_id: string | null
          id: string
          marca: string | null
          modelo: string | null
          observacoes: string | null
          placa: string
          quilometragem_atual: number
          renavam: string | null
          status: string
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ano?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          empregado_responsavel_id?: string | null
          empresa_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa: string
          quilometragem_atual?: number
          renavam?: string | null
          status?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ano?: number | null
          chassi?: string | null
          combustivel?: string | null
          cor?: string | null
          created_at?: string
          empregado_responsavel_id?: string | null
          empresa_id?: string | null
          id?: string
          marca?: string | null
          modelo?: string | null
          observacoes?: string | null
          placa?: string
          quilometragem_atual?: number
          renavam?: string | null
          status?: string
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "veiculos_empregado_responsavel_id_fkey"
            columns: ["empregado_responsavel_id"]
            isOneToOne: false
            referencedRelation: "empregados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "veiculos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      limpar_movimentacoes_antigas: { Args: never; Returns: number }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
