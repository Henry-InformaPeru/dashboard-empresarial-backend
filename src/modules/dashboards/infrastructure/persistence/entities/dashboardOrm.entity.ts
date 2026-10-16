import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'reportes', name: 'Dashboards' })
export class DashboardOrmEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_dashboard', type: 'int' })
  id!: number;

  @Column({ name: 'codigo', type: 'varchar', length: 50 })
  codigo!: string;

  @Column({ name: 'nombre', type: 'nvarchar', length: 255 })
  nombre!: string;

  @Column({
    name: 'descripcion',
    type: 'nvarchar',
    length: 500,
    nullable: true,
  })
  descripcion!: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado!: string;

  @Column({ name: 'fecha_creacion', type: 'datetime2' })
  fechaCreacion!: Date;
}
