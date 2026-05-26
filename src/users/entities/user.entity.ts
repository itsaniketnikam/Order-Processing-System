import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'varchar', length: 255 })
  email!: string;

  /**
   * Password hash. `select: false` keeps it out of default queries so it can
   * never be accidentally serialized into an API response. The auth/login
   * flow must opt in explicitly via `.addSelect('user.password')`.
   */
  @Column({ type: 'varchar', length: 255, select: false })
  password!: string;

  @Column({ name: 'firstName', type: 'varchar', length: 100 })
  firstName!: string;

  @Column({ name: 'lastName', type: 'varchar', length: 100 })
  lastName!: string;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamptz' })
  updatedAt!: Date;
}
