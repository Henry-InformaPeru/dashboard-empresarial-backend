import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'reportes', name: 'Dashboards' })
export class DashboardOrmEntity {
  @PrimaryColumn({ name: 'id_dashboard', type: 'int' })
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

  @Column({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
