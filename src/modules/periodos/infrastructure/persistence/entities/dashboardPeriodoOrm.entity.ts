import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'reportes', name: 'DashboardPeriodos' })
export class DashboardPeriodoOrmEntity {
  @PrimaryColumn({ name: 'id_dashboard_periodo', type: 'int' })
  id!: number;

  @Column({ name: 'id_dashboard', type: 'int' })
  dashboardId!: number;

  @Column({ name: 'periodo', type: 'char', length: 6 })
  periodo!: string;

  @Column({ name: 'url_powerbi', type: 'nvarchar', length: 2048 })
  urlPowerbi!: string;

  @Column({
    name: 'url_mega',
    type: 'nvarchar',
    length: 2048,
    nullable: true,
  })
  urlMega!: string | null;

  @Column({ name: 'fecha_creacion', type: 'datetime2' })
  fechaCreacion!: Date;
}
