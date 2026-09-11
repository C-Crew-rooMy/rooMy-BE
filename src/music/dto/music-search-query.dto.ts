import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class MusicSearchQueryDto {
  @ApiProperty({
    description: '검색할 곡명 또는 아티스트명',
    example: '아이유',
  })
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '검색어를 입력해주세요.' })
  @Matches(/\S/, { message: '검색어를 입력해주세요.' })
  q: string;
}
