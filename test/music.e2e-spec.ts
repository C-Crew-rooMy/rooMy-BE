import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

import { MusicModule } from '../src/music/music.module';

describe('Music API (e2e)', () => {
  let app: INestApplication<App>;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              ITUNES_SEARCH_BASE_URL: 'https://itunes.test/search',
              ITUNES_COUNTRY: 'kr',
              ITUNES_SEARCH_LIMIT: '20',
              ITUNES_REQUEST_TIMEOUT_MS: '5000',
            }),
          ],
        }),
        MusicModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    await app.listen(0, '127.0.0.1');

    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  afterAll(async () => {
    fetchMock.mockRestore();
    await app.close();
  });

  it('정상 검색 결과를 프로젝트 형식으로 반환한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
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
        { status: 200 },
      ),
    );

    await request(app.getHttpServer())
      .get('/music/search')
      .query({ q: ' 곡명 ' })
      .expect(200)
      .expect({
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

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('검색 결과가 없으면 빈 items를 반환한다', async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ resultCount: 0, results: [] }), {
        status: 200,
      }),
    );

    await request(app.getHttpServer())
      .get('/music/search?q=없는곡')
      .expect(200)
      .expect({ items: [] });
  });

  it('검색어가 없으면 400을 반환하고 외부 API를 호출하지 않는다', async () => {
    await request(app.getHttpServer()).get('/music/search').expect(400);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('iTunes API가 실패하면 502를 반환한다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));

    await request(app.getHttpServer()).get('/music/search?q=곡').expect(502);
  });

  it('iTunes API가 타임아웃되면 504를 반환한다', async () => {
    fetchMock.mockRejectedValue(
      new DOMException('The operation timed out', 'TimeoutError'),
    );

    await request(app.getHttpServer()).get('/music/search?q=곡').expect(504);
  });
});
