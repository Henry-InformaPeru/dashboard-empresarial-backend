export interface PerfilUsuarioDto {
  id: number;
  username: string;
  nombreCompleto: string | null;
  rolId: number | null;
  empresaId: number | null;
}
