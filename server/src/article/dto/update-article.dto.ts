import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @IsEnum(ArticleStatus)
  @IsOptional()
  @IsNotEmpty()
  status?: ArticleStatus;
}
