import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'comercial', name: 'Empresas' })
export class EmpresaOrmEntity {
  @PrimaryGeneratedColumn('increment', { name: 'id_empresa', type: 'int' })
  id!: number;

  @Column({ name: 'nombre', type: 'varchar', length: 200 })
  nombre!: string;

  @Column({
    name: 'ruc',
    type: 'varchar',
    length: 11,
    nullable: true,
  })
  ruc!: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 20 })
  estado!: string;

  @Column({ name: 'fecha_creacion', type: 'timestamptz' })
  fechaCreacion!: Date;
}
