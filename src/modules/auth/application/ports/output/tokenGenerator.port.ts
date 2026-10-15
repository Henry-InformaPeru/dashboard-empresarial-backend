export interface TokenPayload {
  sub: number;
  username: string;
  rolId: number | null;
  empresaId: number | null;
}

export const TOKEN_GENERATOR = Symbol('TOKEN_GENERATOR');

export interface TokenGeneratorPort {
  generar(payload: TokenPayload): Promise<string>;
}
