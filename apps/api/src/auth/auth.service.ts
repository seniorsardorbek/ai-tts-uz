import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import bcrypt from "bcryptjs";
import { AdminUser } from "../entities/admin-user.entity";

export interface AuthResult {
  token: string;
  username: string;
}

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger("Auth");

  constructor(
    @InjectRepository(AdminUser) private readonly repo: Repository<AdminUser>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  // Seed a single admin user from env on boot, only if the table is empty.
  async onModuleInit(): Promise<void> {
    try {
      const count = await this.repo.count();
      if (count > 0) return;

      const username = (this.config.get<string>("ADMIN_USERNAME") || "admin").trim();
      const password = this.config.get<string>("ADMIN_PASSWORD");
      if (!password) {
        this.logger.warn("No ADMIN_PASSWORD set — skipping admin user seed (login will reject everyone)");
        return;
      }
      const passwordHash = await bcrypt.hash(password, 10);
      await this.repo.insert({ username, passwordHash });
      this.logger.log(`Seeded admin user "${username}"`);
    } catch (err: any) {
      this.logger.error(`Admin seed failed: ${err?.message ?? err}`);
    }
  }

  // Verify credentials -> signed JWT, or null if invalid.
  async validate(username: string, password: string): Promise<AuthResult | null> {
    if (!username?.trim() || !password) return null;
    const user = await this.repo.findOne({ where: { username: username.trim() } });
    if (!user) return null;
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return null;
    const token = await this.jwt.signAsync({ sub: user.id, username: user.username });
    return { token, username: user.username };
  }

  // Verify a bearer token -> { username }, or throw if invalid/expired.
  async verify(token: string): Promise<{ username: string }> {
    const payload = await this.jwt.verifyAsync<{ sub: number; username: string }>(token);
    return { username: payload.username };
  }
}
