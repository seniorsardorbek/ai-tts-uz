import { Body, Controller, Get, Headers, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

interface LoginBody {
  username?: string;
  password?: string;
}

@Controller("api/auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(@Body() body: LoginBody): Promise<{ token: string; username: string }> {
    const result = await this.auth.validate(body?.username ?? "", body?.password ?? "");
    if (!result) throw new UnauthorizedException("invalid credentials");
    return result;
  }

  // Validate a persisted token (frontend uses this on load to stay logged in).
  @Get("me")
  async me(@Headers("authorization") authorization?: string): Promise<{ username: string }> {
    const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
    if (!token) throw new UnauthorizedException("missing token");
    try {
      return await this.auth.verify(token);
    } catch {
      throw new UnauthorizedException("invalid token");
    }
  }
}
