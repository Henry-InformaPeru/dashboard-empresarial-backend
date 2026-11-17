export interface EmpresaResponseDto {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
  esquema?: string | null;
  logo?: string | null;
  fechaCreacion: Date;
}
