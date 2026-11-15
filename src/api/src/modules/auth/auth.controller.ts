import { Body, Controller, Get, HttpCode, Patch, Post, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { CookieOptions, Response } from 'express';
import { CurrentUser, Public } from '../../common/auth/decorators';
import { SESSION_COOKIE, type SessionUser } from '../../common/auth/session';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';

/** Atributos de la cookie de sesión (CLAUDE.md, D-03). Sin `Secure`: solo corre en local por HTTP (D-02). */
const COOKIE_OPTIONS: CookieOptions = { httpOnly: true, sameSite: 'strict', path: '/api' };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) res: Response): Promise<SessionUser> {
    const { user, token, expiresAt } = await this.auth.login(body.email, body.password);
    res.cookie(SESSION_COOKIE, token, { ...COOKIE_OPTIONS, expires: expiresAt });
    return user;
  }

  /** S-01: borra la cookie. Requiere sesión. */
  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
  }

  @Get('me')
  me(@CurrentUser() user: SessionUser): SessionUser {
    return user;
  }

  /** F-09 · RN-18: cambio de la contraseña propia. Requiere sesión. */
  @Patch('password')
  @HttpCode(204)
  async changePassword(@CurrentUser() user: SessionUser, @Body() body: ChangePasswordDto): Promise<void> {
    await this.auth.changePassword(user.id, body.currentPassword, body.newPassword);
  }
}
