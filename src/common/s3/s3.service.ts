import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

import {
  POST_IMAGE_MAX_SIZE,
  PROFILE_IMAGE_MAX_SIZE,
  S3_ALLOWED_IMAGE_TYPES,
  S3_PRESIGNED_URL_EXPIRATION_SECONDS,
} from './constants/s3.constants';
import { CreatePresignedUrlDto } from './dto/create-presigned-url.dto';
import { UploadResultDto } from './dto/upload-result.dto';
import { S3Folder } from './enums/s3-folder.enum';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const bucketName = this.configService.get<string>('AWS_S3_BUCKET');

    if (!region) {
      throw new Error('AWS_REGION 환경 변수가 설정되지 않았습니다.');
    }

    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET 환경 변수가 설정되지 않았습니다.');
    }

    this.bucketName = bucketName;

    this.s3Client = new S3Client({
      region,
    });
  }

  async createPresignedUrl(
    dto: CreatePresignedUrlDto,
    userId: string,
  ): Promise<UploadResultDto> {
    this.validateImage(dto);

    const ownerId = dto.folder === S3Folder.POSTS ? dto.postId : userId;

    if (!ownerId) {
      throw new BadRequestException(
        '이미지 저장 경로를 생성할 식별자가 없습니다.',
      );
    }

    const key = this.generateObjectKey(dto.folder, ownerId, dto.contentType);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: dto.contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: S3_PRESIGNED_URL_EXPIRATION_SECONDS,
    });

    return {
      uploadUrl,
      key,
      expiresIn: S3_PRESIGNED_URL_EXPIRATION_SECONDS,
    };
  }

  private validateImage(dto: CreatePresignedUrlDto): void {
    const { folder, contentType, fileSize } = dto;

    if (!(S3_ALLOWED_IMAGE_TYPES as readonly string[]).includes(contentType)) {
      throw new BadRequestException(
        'JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.',
      );
    }

    const maxFileSize =
      folder === S3Folder.PROFILES
        ? PROFILE_IMAGE_MAX_SIZE
        : POST_IMAGE_MAX_SIZE;

    if (fileSize > maxFileSize) {
      const maxFileSizeMb = maxFileSize / (1024 * 1024);

      throw new BadRequestException(
        `${folder === S3Folder.PROFILES ? '프로필' : '게시글'} 이미지는 압축 후 ${maxFileSizeMb}MB 이하여야 합니다.`,
      );
    }
  }

  private getExtensionFromMimeType(contentType: string): string {
    const extensionMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    const extension = extensionMap[contentType];

    if (!extension) {
      throw new BadRequestException('지원하지 않는 이미지 형식입니다.');
    }

    return extension;
  }

  private generateObjectKey(
    folder: S3Folder,
    ownerId: string,
    contentType: string,
  ): string {
    const extension = this.getExtensionFromMimeType(contentType);
    const fileName = `${uuidv4()}.${extension}`;

    return `${folder}/${ownerId}/${fileName}`;
  }
}
