import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, Injectable, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { Request, Response } from 'express';
import { randomBytes } from 'node:crypto';
import { PrismaService } from './prisma.service';
import { checkPassword, digest, hashPassword } from './password';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

export interface Principal { id: string; name: string; email: string; roles: Role[] }
export interface AuthRequest extends Request { principal: Principal; sessionId: string }
export const COOKIE = 'cortex_session';
export class LoginDto {
  @IsEmail() @MaxLength(254) email!: string;
  @IsString() @MinLength(1) @MaxLength(128) password!: string;
}

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthRequest>();
    const token = req.cookies?.[COOKIE];
    if (typeof token !== 'string' || token.length !== 64) throw new UnauthorizedException('Entre novamente para continuar.');
    const session = await this.db.session.findUnique({ where: { tokenHash: digest(token) }, include: { account: { include: { roles: true } } } });
    if (!session || session.expiresAt <= new Date() || !session.account.active) throw new UnauthorizedException('Sessão expirada ou inválida.');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      const csrf = req.get('X-CSRF-Token');
      if (!csrf || digest(csrf) !== session.csrfHash) throw new ForbiddenException('Reabra sua sessão antes de enviar alterações.');
    }
    const account = session.account;
    req.principal = { id: account.id, name: account.name, email: account.email, roles: account.roles.map(r => r.role) };
    req.sessionId = session.id;
    return true;
  }
}

@Controller('auth')
export class AuthController {
  private dummyHash = hashPassword(randomBytes(32).toString('hex'));
  constructor(private readonly db: PrismaService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const account = await this.db.account.findUnique({ where: { email: dto.email.toLowerCase().trim() }, include: { roles: true } });
    const valid = await checkPassword(dto.password, account?.passwordHash ?? await this.dummyHash);
    if (!account || !valid || !account.active) throw new UnauthorizedException('E-mail ou senha inválidos.');
    // Trocar a sessão após login evita reaproveitar identidade anterior.
    if (typeof req.cookies?.[COOKIE] === 'string') await this.db.session.deleteMany({ where: { tokenHash: digest(req.cookies[COOKIE]) } });
    const token = randomBytes(32).toString('hex');
    const csrfToken = digest(`${token}:csrf`);
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    await this.db.session.create({ data: { tokenHash: digest(token), csrfHash: digest(csrfToken), accountId: account.id, expiresAt } });
    res.cookie(COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/api', expires: expiresAt });
    return { user: { id: account.id, name: account.name, email: account.email, roles: account.roles.map(r => r.role) }, csrfToken };
  }

  @Get('me') @UseGuards(SessionGuard)
  async me(@Req() req: AuthRequest) {
    // Token estável por sessão: recarregar outra aba não invalida formulários abertos.
    const csrfToken = digest(`${req.cookies[COOKIE]}:csrf`);
    return { user: req.principal, csrfToken };
  }

  @Post('logout') @UseGuards(SessionGuard)
  async logout(@Req() req: AuthRequest, @Res({ passthrough: true }) res: Response) {
    await this.db.session.deleteMany({ where: { id: req.sessionId } });
    res.clearCookie(COOKIE, { path: '/api', httpOnly: true, sameSite: 'strict', secure: process.env.NODE_ENV === 'production' });
    return { message: 'Sessão encerrada.' };
  }
}
