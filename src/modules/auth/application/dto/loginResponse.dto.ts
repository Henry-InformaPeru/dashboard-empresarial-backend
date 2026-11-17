export interface LoginResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  usuario: {
    id: number;
    username: string;
    nombreCompleto: string | null;
    rolId: number | null;
    empresaId: number | null;
    empresaNombre?: string | null;
    empresaEsquema?: string | null;
    empresaLogo?: string | null;
  };
}
