import { BadGatewayException, GatewayTimeoutException } from '@nestjs/common';

import { ItunesService } from './itunes.service';

describe('ItunesService', () => {
  const config = {
    get: jest.fn((key: string) => {
      const values: Record<string, string> = {
        ITUNES_SEARCH_BASE_URL: 'https://itunes.test/search',
        ITUNES_COUNTRY: 'kr',
        ITUNES_SEARCH_LIMIT: '20',
        ITUNES_REQUEST_TIMEOUT_MS: '5000',
      };

      return values[key];
    }),
  };

  let service: ItunesService;
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ItunesService(config);
    fetchMock = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('검색어와 음악 검색 조건으로 iTunes API를 호출한다', async () => {
    const response = {
      resultCount: 1,
      results: [{ trackId: 1, trackName: '곡', artistName: '아티스트' }],
    };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(service.searchTracks('아이유')).resolves.toEqual(response);

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toBeInstanceOf(URL);
    expect((url as URL).href).toBe(
      'https://itunes.test/search?term=%EC%95%84%EC%9D%B4%EC%9C%A0&country=kr&media=music&entity=song&limit=20',
    );
    expect(options?.signal).toBeDefined();
  });

  it('iTunes API가 빈 결과를 반환하면 원본 응답을 반환한다', async () => {
    const response = { resultCount: 0, results: [] };
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify(response), { status: 200 }),
    );

    await expect(service.searchTracks('없는 곡')).resolves.toEqual(response);
  });

  it('iTunes API가 실패 상태를 반환하면 BadGatewayException을 던진다', async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 500 }));

    await expect(service.searchTracks('곡')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('네트워크 오류가 발생하면 BadGatewayException을 던진다', async () => {
    fetchMock.mockRejectedValue(new Error('network error'));

    await expect(service.searchTracks('곡')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('요청이 타임아웃되면 GatewayTimeoutException을 던진다', async () => {
    fetchMock.mockRejectedValue(
      new DOMException('The operation timed out', 'TimeoutError'),
    );

    await expect(service.searchTracks('곡')).rejects.toBeInstanceOf(
      GatewayTimeoutException,
    );
  });
});
