import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// One row per TTS request (analytics) — including cache HITs, so usage is fully
// tracked. Optional lesson/student context comes from the frontend.
@Entity("tts_requests")
export class TtsRequest {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", length: 64 })
  cacheKey!: string;

  @Column({ type: "varchar", length: 1 })
  gender!: string;

  @Column({ type: "boolean" })
  cacheHit!: boolean;

  @Index()
  @Column({ type: "varchar", nullable: true })
  lessonId!: string | null;

  @Index()
  @Column({ type: "varchar", nullable: true })
  studentUuid!: string | null;

  @Column({ type: "varchar", nullable: true })
  lessonName!: string | null;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
