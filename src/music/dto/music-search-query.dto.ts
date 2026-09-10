import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class MusicSearchQueryDto {
  @IsString({ message: '검색어는 문자열이어야 합니다.' })
  @IsNotEmpty({ message: '검색어를 입력해주세요.' })
  @Matches(/\S/, { message: '검색어를 입력해주세요.' })
  q: string;
}
