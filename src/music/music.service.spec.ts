import { ItunesService } from './itunes.service';
import { MusicService } from './music.service';

describe('MusicService', () => {
  it('iTunes 응답을 프로젝트 음악 형식으로 변환한다', async () => {
    const itunesService = {
      searchTracks: jest.fn().mockResolvedValue({
        resultCount: 1,
        results: [
          {
            trackId: 123,
            trackName: '곡명',
            artistName: '아티스트명',
            artworkUrl100: 'https://image.test/album.jpg',
            trackViewUrl: 'https://music.apple.com/track/123',
          },
        ],
      }),
    } as unknown as ItunesService;
    const service = new MusicService(itunesService);

    await expect(service.search('곡명')).resolves.toEqual({
      items: [
        {
          id: 123,
          name: '곡명',
          artistName: '아티스트명',
          albumImageUrl: 'https://image.test/album.jpg',
          itunesUrl: 'https://music.apple.com/track/123',
        },
      ],
    });
  });

  it('검색 결과가 없으면 빈 items를 반환한다', async () => {
    const itunesService = {
      searchTracks: jest.fn().mockResolvedValue({
        resultCount: 0,
        results: [],
      }),
    } as unknown as ItunesService;
    const service = new MusicService(itunesService);

    await expect(service.search('없는 곡')).resolves.toEqual({ items: [] });
  });

  it('이미지와 iTunes URL이 없으면 null로 변환한다', async () => {
    const itunesService = {
      searchTracks: jest.fn().mockResolvedValue({
        resultCount: 1,
        results: [{ trackId: 123, trackName: '곡명', artistName: '아티스트명' }],
      }),
    } as unknown as ItunesService;
    const service = new MusicService(itunesService);

    await expect(service.search('곡명')).resolves.toEqual({
      items: [
        {
          id: 123,
          name: '곡명',
          artistName: '아티스트명',
          albumImageUrl: null,
          itunesUrl: null,
        },
      ],
    });
  });

  it('필수 곡 정보가 없는 결과는 제외한다', async () => {
    const itunesService = {
      searchTracks: jest.fn().mockResolvedValue({
        resultCount: 2,
        results: [
          { trackId: 123, trackName: '정상 곡', artistName: '아티스트' },
          { trackName: 'ID 없는 곡', artistName: '아티스트' },
        ],
      }),
    } as unknown as ItunesService;
    const service = new MusicService(itunesService);

    await expect(service.search('곡')).resolves.toEqual({
      items: [
        {
          id: 123,
          name: '정상 곡',
          artistName: '아티스트',
          albumImageUrl: null,
          itunesUrl: null,
        },
      ],
    });
  });
});
