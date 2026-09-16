import { ApiProperty } from '@nestjs/swagger';

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
  createdAt: Date = new Date();

  @ApiProperty()
  updatedAt: Date | null = null;
}
