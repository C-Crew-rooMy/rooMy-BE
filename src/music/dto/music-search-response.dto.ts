import { ApiProperty } from '@nestjs/swagger';

export class MusicSearchItem {
  @ApiProperty({ example: 123456789, description: 'iTunes 곡 ID' })
  id: number;

  @ApiProperty({ example: '좋은 날', description: '곡명' })
  name: string;

  @ApiProperty({ example: '아이유', description: '아티스트명' })
  artistName: string;

  @ApiProperty({
    example: 'https://is1-ssl.mzstatic.com/image/thumb/album.jpg',
    nullable: true,
    description: '앨범 이미지 URL',
  })
  albumImageUrl: string | null;

  @ApiProperty({
    example: 'https://music.apple.com/kr/song/좋은-날/123456789',
    nullable: true,
    description: 'iTunes 곡 상세 URL',
  })
  itunesUrl: string | null;
}

export class MusicSearchResponse {
  @ApiProperty({ type: [MusicSearchItem], description: '검색된 곡 목록' })
  items: MusicSearchItem[];
}
