import { Body, Controller, ForbiddenException, Get, NotFoundException, Param, ParseUUIDPipe, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { IsDateString, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { PrismaService } from './prisma.service';
import { AuthRequest, SessionGuard } from './auth';

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
  constructor(private readonly db: PrismaService) {}

  @Get('students')
  async students(@Req() req: AuthRequest) {
    const user = req.principal;
    return this.db.student.findMany({
      where: user.roles.includes('admin') ? {} : { OR: [
        ...(user.roles.includes('student') ? [{ accountId: user.id }] : []),
        ...(user.roles.includes('guardian') ? [{ guardians: { some: { accountId: user.id, verified: true } } }] : []),
      ] },
      select: { id: true, name: true, enrollments: { where: { active: true }, select: { schoolClass: { select: { id: true, name: true, period: true } } } } },
      orderBy: { name: 'asc' },
    });
  }

  @Get('students/:id/agenda')
  async studentAgenda(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthRequest) {
    const accessible = await this.students(req);
    const student = accessible.find(s => s.id === id);
    // Mesmo retorno para registro inexistente ou sem vínculo.
    if (!student) throw new NotFoundException('Estudante não disponível para esta conta.');
    return this.db.agendaEvent.findMany({ where: { classId: { in: student.enrollments.map(e => e.schoolClass.id) } }, orderBy: { startsAt: 'asc' } });
  }

  @Get('classes')
  classes(@Req() req: AuthRequest) {
    const user = req.principal;
    if (!user.roles.some(r => r === 'teacher' || r === 'admin')) return [];
    return this.db.schoolClass.findMany({ where: user.roles.includes('admin') ? {} : { teachings: { some: { accountId: user.id } } }, select: { id: true, name: true, period: true }, orderBy: { name: 'asc' } });
  }

  private async requireClass(id: string, req: AuthRequest) {
    const classes = await this.classes(req);
    if (!classes.some(c => c.id === id)) throw new NotFoundException('Turma não disponível para esta conta.');
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
