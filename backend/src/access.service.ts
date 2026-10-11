import { Injectable, NotFoundException } from '@nestjs/common';
import { Principal } from './auth';
import { PrismaService } from './prisma.service';

@Injectable()
export class AccessService {
  constructor(private readonly db: PrismaService) {}
  students(user: Principal) {
    return this.db.student.findMany({
      where: user.roles.includes('admin') ? {} : { OR: [
        ...(user.roles.includes('student') ? [{ accountId: user.id }] : []),
        ...(user.roles.includes('guardian') ? [{ guardians: { some: { accountId: user.id, verified: true } } }] : []),
      ] },
      select: { id: true, name: true, enrollments: { where: { active: true }, select: { schoolClass: { select: { id: true, name: true, period: true } } } } },
      orderBy: { name: 'asc' },
    });
  }
  async studentClasses(id: string, user: Principal) {
    const student = (await this.students(user)).find(s => s.id === id);
    if (!student) throw new NotFoundException('Estudante não disponível para esta conta.');
    return student.enrollments.map(e => e.schoolClass.id);
  }
  async classes(user: Principal) {
    if (!user.roles.some(r => r === 'teacher' || r === 'admin')) return [];
    return this.db.schoolClass.findMany({ where: user.roles.includes('admin') ? {} : { teachings: { some: { accountId: user.id } } }, select: { id: true, name: true, period: true }, orderBy: { name: 'asc' } });
  }
  async requireClass(id: string, user: Principal) {
    if (!(await this.classes(user)).some(c => c.id === id)) throw new NotFoundException('Turma não disponível para esta conta.');
  }
}
