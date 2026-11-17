export interface PerfilUsuarioDto {
  id: number;
  username: string;
  nombreCompleto: string | null;
  rolId: number | null;
  empresaId: number | null;
  empresaNombre?: string | null;
  empresaEsquema?: string | null;
  empresaLogo?: string | null;
}
