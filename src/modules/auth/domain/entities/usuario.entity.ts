export interface Usuario {
  id: number;
  empresaId: number | null;
  rolId: number | null;
  username: string;
  email: string | null;
  nombreCompleto: string | null;
  passwordHash: string;
  estado: string;
  fechaCreacion: Date;
}
