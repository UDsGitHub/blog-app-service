import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsEnum,
  IsDate,
  IsArray,
  IsBoolean,
  IsNotEmpty,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/enums';
import { ArticleSearchPreview } from '../article.types';

export class SearchArticlesQueryDto {
  @IsNotEmpty()
  @IsString()
  search: string = '';

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

export class SearchArticlesResponseDto {
  @IsArray()
  data: ArticleSearchPreview[] = [];

  @IsBoolean()
  hasMore: boolean = false;
}
