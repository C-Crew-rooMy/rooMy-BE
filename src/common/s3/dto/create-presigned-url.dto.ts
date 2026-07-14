import {
  IsEnum,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  POST_IMAGE_MAX_SIZE,
  S3_ALLOWED_IMAGE_TYPES,
} from '../constants/s3.constants';
import { S3Folder } from '../enums/s3-folder.enum';

export class CreatePresignedUrlDto {
  @IsEnum(S3Folder, {
    message: '올바른 이미지 업로드 경로가 아닙니다.',
  })
  folder: S3Folder;

  @IsIn(S3_ALLOWED_IMAGE_TYPES, {
    message: 'JPEG, PNG, WebP 이미지만 업로드할 수 있습니다.',
  })
  contentType: string;

  @IsInt({
    message: '파일 크기는 정수여야 합니다.',
  })
  @Min(1, {
    message: '파일 크기는 1Byte 이상이어야 합니다.',
  })
  @Max(POST_IMAGE_MAX_SIZE, {
    message: '압축된 이미지는 5MB 이하여야 합니다.',
  })
  fileSize: number;

  @ValidateIf((dto: CreatePresignedUrlDto) => dto.folder === S3Folder.POSTS)
  @IsString({
    message: '게시글 ID는 문자열이어야 합니다.',
  })
  postId?: string;
}
