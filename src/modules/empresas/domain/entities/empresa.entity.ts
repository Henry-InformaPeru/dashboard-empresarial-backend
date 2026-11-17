export interface Empresa {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
  esquema?: string | null;
  logo?: string | null;
  fechaCreacion: Date;
}
