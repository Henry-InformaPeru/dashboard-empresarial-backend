import { Controller, Get } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  // Para el healthcheck del contenedor y las pruebas de humo: confirma que la API ve la base
  @Get()
  async ejecutar(): Promise<{ estado: string }> {
    await this.dataSource.query('SELECT 1');
    return { estado: 'ok' };
  }
}
