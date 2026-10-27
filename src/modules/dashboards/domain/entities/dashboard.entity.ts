export interface Dashboard {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  // Vínculo de Power BI del reporte (null si el reporte aún lo guarda por periodo)
  urlPowerbi: string | null;
  fechaCreacion: Date;
}
