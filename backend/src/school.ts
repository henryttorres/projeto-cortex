import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PrismaService } from './prisma.service';
import { AuthRequest, SessionGuard } from './auth';
import { AccessService } from './access.service';

export class EventDto {
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(3) @MaxLength(120) title!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MaxLength(1500) description!: string;
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @IsString() @MinLength(1) @MaxLength(120) location!: string;
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
}

@Controller() @UseGuards(SessionGuard)
export class SchoolController {
  constructor(private readonly db: PrismaService, private readonly access: AccessService) {}

  @Get('students')
  async students(@Req() req: AuthRequest) {
    return this.access.students(req.principal);
  }

  @Get('students/:id/agenda')
  async studentAgenda(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    const ids = await this.access.studentClasses(id, req.principal);
    return this.db.agendaEvent.findMany({ where: { classId: { in: ids } }, orderBy: { startsAt: 'asc' } });
  }

  @Get('classes')
  classes(@Req() req: AuthRequest) {
    return this.access.classes(req.principal);
  }

  private async requireClass(id: string, req: AuthRequest) {
    await this.access.requireClass(id, req.principal);
  }

  @Get('classes/:id/agenda')
  async classAgenda(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    await this.requireClass(id, req);
    return this.db.agendaEvent.findMany({ where: { classId: id }, orderBy: { startsAt: 'asc' } });
  }

  @Post('classes/:id/agenda')
  async createEvent(@Param('id', ParseUUIDPipe) id: string, @Body() dto: EventDto, @Req() req: AuthRequest) {
    if (!req.principal.roles.some(r => r === 'admin' || r === 'teacher')) throw new ForbiddenException('Este perfil não pode criar compromissos.');
    await this.requireClass(id, req);
    if (new Date(dto.endsAt) <= new Date(dto.startsAt)) throw new BadRequestException('O término deve ser posterior ao início.');
    return this.db.agendaEvent.create({ data: { ...dto, title: dto.title.trim(), classId: id, startsAt: new Date(dto.startsAt), endsAt: new Date(dto.endsAt) } });
  }
}
