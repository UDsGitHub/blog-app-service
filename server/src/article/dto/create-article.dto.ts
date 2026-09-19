import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ArticleStatus } from '../../generated/prisma/client';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string = '';

  @ApiProperty()
  @IsEnum(ArticleStatus)
  @IsNotEmpty()
  status: ArticleStatus = 'DRAFT';
}
