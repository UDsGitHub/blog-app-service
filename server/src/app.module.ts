import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule } from '@nestjs/config';
import { ArticleModule } from './article/article.module';
import { PrismaService } from './prisma.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ArticleModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [PrismaService],
})
export class AppModule {}
