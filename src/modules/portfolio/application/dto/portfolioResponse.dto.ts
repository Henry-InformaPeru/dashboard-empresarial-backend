export interface MatrizCeldaDto {
  fila: number;
  columna: number;
  filaDescripcion: string;
  columnaDescripcion: string;
  estrategia: number;
  estrategiaDescripcion: string;
  cantidad: number;
  saldoTotal: number;
  saldoCliente: number;
}

export interface MatrizResponseDto {
  filasHeaders: { id: number; descripcion: string }[];
  columnasHeaders: { id: number; descripcion: string }[];
  celdas: MatrizCeldaDto[];
  totalesPorFila: Record<number, { cantidad: number; saldoTotal: number }>;
  totalesPorColumna: Record<number, { cantidad: number; saldoTotal: number }>;
  granTotal: { cantidad: number; saldoTotal: number };
}

export interface EstrategiaResumenDto {
  id: number;
  descripcion: string;
  cantidad: number;
  saldo: number;
  participacionClientes: number; // Porcentaje ej: 31.21
  participacionSaldo: number;    // Porcentaje ej: 47.25
  color: string;
}

export interface EstrategiasCuadroResponseDto {
  items: EstrategiaResumenDto[];
  totales: {
    cantidad: number;
    saldo: number;
    participacionClientes: number;
    participacionSaldo: number;
  };
}

export interface ClienteDetalleItemDto {
  periodo: string;
  documento: string;
  razonSocial: string;
  saldoVigente: number;
  saldoCastigado: number;
  departamento: string;
  provincia: string;
  distrito: string;
  numeroEntidades: string;
  calificacionCliente: string;
  nor: number;
  cpp: number;
  def: number;
  dud: number;
  per: number;
  estrategia: number;
  estrategiaDescripcion: string;
}

export interface DetalleClientesPaginadoResponseDto {
  data: ClienteDetalleItemDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DepartamentoEstrategiaDto {
  estrategia: number;
  nombre: string;
  cantidad: number;
  participacion: number;
}

export interface GeografiaItemDto {
  departamento: string;
  provincia?: string;
  distrito?: string;
  clientes: number;
  exclusivo: number;
  saldo: number;
  deudasVigentes: number;
  deudasCastigadas: number;
  participacionClientes: number;
  participacionMontos: number;
  estrategias?: DepartamentoEstrategiaDto[];
}

export interface GeografiaResponseDto {
  items: GeografiaItemDto[];
  totales: {
    clientes: number;
    exclusivo: number;
    saldo: number;
    deudasVigentes: number;
    deudasCastigadas: number;
    participacionClientes: number;
    participacionMontos: number;
  };
}
