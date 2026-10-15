export interface Dashboard {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  fechaCreacion: Date;
}
