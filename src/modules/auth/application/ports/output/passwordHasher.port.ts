export const PASSWORD_HASHER = Symbol('PASSWORD_HASHER');

export interface PasswordHasherPort {
  verificar(passwordPlano: string, passwordHash: string): Promise<boolean>;
}
