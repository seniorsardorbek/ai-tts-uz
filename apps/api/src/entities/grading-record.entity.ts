import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// One row per grading request (analytics + result history).
@Entity("grading_records")
export class GradingRecord {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "varchar", nullable: true })
  lessonId!: string | null;

  @Index()
  @Column({ type: "varchar", nullable: true })
  studentUuid!: string | null;

  @Column({ type: "varchar", nullable: true })
  lessonName!: string | null;

  @Column({ type: "varchar", length: 8 })
  mode!: string; // 'text' | 'voice'

  @Column({ type: "varchar", length: 8 })
  lang!: string; // 'uz' | 'ru'

  @Column({ type: "text" })
  question!: string;

  @Column({ type: "text" })
  rubric!: string;

  @Column({ type: "text", nullable: true })
  answerText!: string | null; // text mode

  @Column({ type: "text", nullable: true })
  transcript!: string | null; // voice mode

  @Column({ type: "boolean" })
  correct!: boolean;

  @Column({ type: "text" })
  feedback!: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt!: Date;
}
