import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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
  @IsEnum(ArticleStatus)
  @IsOptional()
  @IsNotEmpty()
  status?: ArticleStatus;
}
