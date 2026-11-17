export interface UsuarioAutenticado {
  sub: number;
  username: string;
  rolId: number | null;
  empresaId: number | null;
  empresaNombre?: string | null;
  empresaEsquema?: string | null;
}
