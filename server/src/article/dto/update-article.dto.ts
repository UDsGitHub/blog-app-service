import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ArticleStatus } from '../../generated/prisma/client';

export class UpdateArticleDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  title?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  body?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  excerpt?: string;

  @ApiProperty()
  @IsEnum(ArticleStatus)
  @IsOptional()
  @IsNotEmpty()
  status?: ArticleStatus;
}
