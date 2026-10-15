export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasherPort {
  generar(passwordPlano: string): Promise<string>;

  verificar(passwordPlano: string, passwordHash: string): Promise<boolean>;
}
