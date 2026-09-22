import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Article, ArticleStatus } from '../../generated/prisma/client';
import { ArticlePreview } from '../article.types';

export class FindArticlesQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID('4')
  cursorId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 25;

  @IsOptional()
  @IsEnum(ArticleStatus)
  status?: ArticleStatus;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}

export class FindArticlesResponseDto {
  @IsArray()
  data: ArticlePreview[] = [];

  @IsBoolean()
  hasMore: boolean = false;
}

export class FindArticlesWithSearchResponseDto {
  @IsArray()
  data: Article[] = [];

  @IsBoolean()
  hasMore: boolean = false;
}
