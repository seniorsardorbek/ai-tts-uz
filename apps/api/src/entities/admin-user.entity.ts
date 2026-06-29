import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

// Admin accounts that gate the React admin UI (login page).
// One row is seeded from env on boot; passwords are bcrypt hashes.
@Entity("admin_users")
export class AdminUser {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 64, unique: true })
  username!: string;

  @Column({ type: "varchar", length: 100 })
  passwordHash!: string;

  @Column({ type: "timestamptz", default: () => "now()" })
  createdAt!: Date;
}
