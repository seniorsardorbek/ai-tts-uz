import { Column, Entity, PrimaryColumn } from "typeorm";

// One row per distinct cached speech (dedup by cacheKey = sha256(gender|text)).
// The audio itself lives on disk at cache/<gender>/<cacheKey>.mp3 — never in the DB.
@Entity("cache_entries")
export class CacheEntry {
  @PrimaryColumn({ type: "varchar", length: 64 })
  cacheKey!: string;

  @Column({ type: "varchar", length: 1 })
  gender!: string; // 'm' | 'f'

  @Column({ type: "text", nullable: true })
  text!: string | null;

  @Column({ type: "integer", default: 0 })
  sizeBytes!: number;

  @Column({ type: "timestamptz" })
  createdAt!: Date;
}
