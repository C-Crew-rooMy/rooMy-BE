import { Body, Controller, Post, UnauthorizedException } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import { S3Service } from './s3.service';

@Controller('s3')
export class S3Controller {
  constructor(
    private readonly s3Service: S3Service,
    private readonly configService: ConfigService,
  ) {}

  /**
   * 개발 환경에서 Presigned URL 발급 동작을 확인하기 위한 임시 API
   *
   * JWT 인증 구현 후에는 test-user 대신
   * 인증된 사용자의 userId를 사용하도록 변경해야 한다.
   */
  @Post('presigned-url')
  async createPresignedUrl(
    @Body() dto: CreatePresignedUrlDto,
  ): Promise<UploadResultDto> {
    const nodeEnv = this.configService.get<string>('NODE_ENV');

    if (nodeEnv === 'production') {
      throw new UnauthorizedException(
        '인증 기능이 연결되지 않아 사용할 수 없습니다.',
      );
    }

    const temporaryUserId = 'test-user';

    return this.s3Service.createPresignedUrl(dto, temporaryUserId);
  }
}
