import 'reflect-metadata';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, NestFactory } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AuthController, SessionGuard } from './auth';
import { SchoolController } from './school';
import { PrismaService } from './prisma.service';
import { AccessService } from './access.service';
import { CommunicationsController } from './communications';
import { TicketsController } from './tickets';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }])],
  controllers: [AuthController, SchoolController, CommunicationsController, TicketsController],
  providers: [PrismaService, SessionGuard, AccessService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class AppModule {}

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  // O front usa proxy de mesma origem; requisições de escrita de outra origem são recusadas.
  app.use((req: any, res: any, next: () => void) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.headers.origin !== process.env.WEB_ORIGIN) {
      return res.status(403).json({ message: 'Origem não permitida.' });
    }
    next();
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  await app.init();
  return app;
}
