export interface UsuarioResponseDto {
  id: number;
  empresaId: number | null;
  rolId: number | null;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  estado: string;
  fechaCreacion: Date;
}
