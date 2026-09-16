import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string = '';

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  body: string = '';
}
