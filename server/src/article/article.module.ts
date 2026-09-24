import { Module } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { PrismaService } from '../prisma.service';
import { ArticleQueryGuard } from './article-query.guard';

@Module({
  controllers: [ArticleController],
  providers: [ArticleService, PrismaService, ArticleQueryGuard],
})
export class ArticleModule {}
