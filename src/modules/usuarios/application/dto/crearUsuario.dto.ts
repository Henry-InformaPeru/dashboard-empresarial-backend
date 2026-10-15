export interface CrearUsuarioDto {
  empresaId: number | null;
  rolId: number;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  password: string;
}
