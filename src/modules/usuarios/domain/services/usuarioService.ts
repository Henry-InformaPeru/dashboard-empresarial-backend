export class UsuarioService {
  normalizarUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  validarPassword(password: string): boolean {
    return (
      password.length >= 12 &&
      password.length <= 72 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  }

  validarRol(rolId: number): boolean {
    return rolId === 1 || rolId === 2;
  }

  requiereEmpresa(rolId: number): boolean {
    return rolId === 2;
  }
}
