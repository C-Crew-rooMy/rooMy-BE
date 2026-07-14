// 업로드 전 원본 이미지 최대 크기: 20MB
export const ORIGINAL_IMAGE_MAX_SIZE = 20 * 1024 * 1024;

// WebP 압축 후 게시글 이미지 최대 크기: 5MB
export const POST_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

// WebP 압축 후 프로필 이미지 최대 크기: 2MB
export const PROFILE_IMAGE_MAX_SIZE = 2 * 1024 * 1024;

// 게시글당 업로드 가능한 이미지 최대 개수
export const POST_IMAGE_MAX_COUNT = 10;

// Presigned URL 발급을 허용할 이미지 MIME 타입
export const S3_ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

// 허용 이미지 MIME 타입 유니온
export type AllowedImageType = (typeof S3_ALLOWED_IMAGE_TYPES)[number];

// Presigned URL 유효 시간: 3분
export const S3_PRESIGNED_URL_EXPIRATION_SECONDS = 180;
