export interface EmpresaResponseDto {
  id: number;
  nombre: string;
  ruc: string | null;
  estado: string;
  fechaCreacion: Date;
}
