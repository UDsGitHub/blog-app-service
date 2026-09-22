import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';

export class CreateArticleDto {
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @IsString()
  @IsNotEmpty()
  body: string = '';

  @IsString()
  @IsOptional()
  @MaxLength(300)
  excerpt?: string = '';

  @IsEnum(ArticleStatus)
  @IsNotEmpty()
  status: ArticleStatus = 'DRAFT';
}
