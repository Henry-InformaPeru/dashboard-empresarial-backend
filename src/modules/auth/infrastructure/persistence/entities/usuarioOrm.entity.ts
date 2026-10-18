import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'seguridad', name: 'Usuarios' })
export class UsuarioOrmEntity {
  @PrimaryGeneratedColumn('increment', {
    name: 'id_usuario',
    type: 'int',
  })
  id!: number;

  @Column({ name: 'id_empresa', type: 'int', nullable: true })
  empresaId!: number | null;

  @Column({ name: 'id_rol', type: 'int', nullable: true })
  rolId!: number | null;

  @Column({ name: 'username', type: 'varchar', length: 150 })
  username!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  email!: string | null;

  @Column({
    name: 'nombre_completo',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  nombreCompleto!: string | null;

  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    select: false,
  })
  passwordHash!: string;

  @Column({
    name: 'estado',
    type: 'varchar',
    length: 20,
    default: 'ACTIVO',
  })
  estado!: string;

  @Column({
    name: 'fecha_creacion',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaCreacion!: Date;
}
