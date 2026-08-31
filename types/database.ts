/**
 * ⚠️ PLACEHOLDER TYPES — loose but shaped like Supabase's generated output,
 * so the JS client's query builder still type-checks.
 *
 * Replace with real generated types once the project is linked:
 *   npm run gen:types
 * (see AGENTS.md → "Data access"). Commit the generated file.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Row = Record<string, unknown>;

type GenericTable = {
  Row: Row;
  Insert: Row;
  Update: Row;
  Relationships: [];
};

type GenericView = {
  Row: Row;
  Relationships: [];
};

type GenericFunction = {
  Args: Record<string, unknown>;
  Returns: unknown;
};

export interface Database {
  public: {
    Tables: Record<string, GenericTable>;
    Views: Record<string, GenericView>;
    Functions: Record<string, GenericFunction>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
