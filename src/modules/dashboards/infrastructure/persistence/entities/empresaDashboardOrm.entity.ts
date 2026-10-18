import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'comercial', name: 'EmpresaDashboards' })
export class EmpresaDashboardOrmEntity {
  @PrimaryGeneratedColumn('increment', {
    name: 'id_empresa_dashboard',
    type: 'int',
  })
  id!: number;

  @Column({ name: 'id_empresa', type: 'int' })
  empresaId!: number;

  @Column({ name: 'id_dashboard', type: 'int' })
  dashboardId!: number;

  @Column({
    name: 'fecha_asignacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaAsignacion!: Date;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    name: 'fecha_desactivacion',
    type: 'timestamptz',
    nullable: true,
  })
  fechaDesactivacion!: Date | null;
}
