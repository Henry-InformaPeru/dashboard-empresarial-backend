export interface LoginResponseDto {
  accessToken: string;
  tokenType: 'Bearer';
  usuario: {
    id: number;
    username: string;
    nombreCompleto: string | null;
    rolId: number | null;
    empresaId: number | null;
  };
}
