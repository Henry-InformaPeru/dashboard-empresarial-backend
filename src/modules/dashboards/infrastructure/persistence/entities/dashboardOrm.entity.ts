import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'reportes', name: 'Dashboards' })
export class DashboardOrmEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_dashboard', type: 'int' })
  id!: number;

  @Column({ name: 'codigo', type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 255 })
  nombre!: string;

  @Column({
    name: 'descripcion',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  descripcion!: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado!: string;

  // Vínculo de Power BI del reporte: el mismo para todos sus periodos. Es opcional porque en los reportes anteriores el vínculo estaba en cada periodo.
  @Column({
    name: 'url_powerbi',
    type: 'varchar',
    length: 2048,
    nullable: true,
  })
  urlPowerbi!: string | null;

  @Column({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
