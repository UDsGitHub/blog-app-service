import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';

export class Article {
  @ApiProperty()
  id: string = '';

  @ApiProperty()
  title: string = '';

  @ApiProperty()
  slug: string = '';

  @ApiProperty()
  body: string = '';

  @ApiProperty()
  @IsEnum(ArticleStatus)
  status: ArticleStatus = 'DRAFT';

  @ApiProperty()
  createdAt: Date = new Date();

  @ApiProperty()
  updatedAt: Date | null = null;
}
