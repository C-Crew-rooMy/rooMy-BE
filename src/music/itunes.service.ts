import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ItunesSearchResponse } from './itunes.types';

@Injectable()
export class ItunesService {
  private readonly searchBaseUrl: string;
  private readonly country: string;
  private readonly searchLimit: number;
  private readonly requestTimeoutMs: number;

  constructor(private readonly configService: ConfigService) {
    this.searchBaseUrl = this.getRequiredConfig('ITUNES_SEARCH_BASE_URL');
    this.country = this.getRequiredConfig('ITUNES_COUNTRY');
    this.searchLimit = this.getNumberConfig('ITUNES_SEARCH_LIMIT');
    this.requestTimeoutMs = this.getNumberConfig('ITUNES_REQUEST_TIMEOUT_MS');
  }

  async searchTracks(term: string): Promise<ItunesSearchResponse> {
    const url = new URL(this.searchBaseUrl);
    url.searchParams.set('term', term);
    url.searchParams.set('country', this.country);
    url.searchParams.set('media', 'music');
    url.searchParams.set('entity', 'song');
    url.searchParams.set('limit', String(this.searchLimit));

    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(this.requestTimeoutMs),
      });

      if (!response.ok) {
        throw new BadGatewayException(
          `iTunes Search API 호출에 실패했습니다. status=${response.status}`,
        );
      }

      return (await response.json()) as ItunesSearchResponse;
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }

      if (this.isTimeoutError(error)) {
        throw new GatewayTimeoutException(
          'iTunes Search API 응답 시간이 초과되었습니다.',
        );
      }

      throw new BadGatewayException('iTunes Search API를 호출할 수 없습니다.');
    }
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new Error(`${key} 환경 변수가 설정되지 않았습니다.`);
    }

    return value;
  }

  private getNumberConfig(key: string): number {
    const value = this.getRequiredConfig(key);
    const numberValue = Number(value);

    if (!Number.isFinite(numberValue) || numberValue <= 0) {
      throw new Error(`${key} 환경 변수가 올바른 숫자가 아닙니다.`);
    }

    return numberValue;
  }

  private isTimeoutError(error: unknown): boolean {
    return error instanceof DOMException && error.name === 'TimeoutError';
  }
}
