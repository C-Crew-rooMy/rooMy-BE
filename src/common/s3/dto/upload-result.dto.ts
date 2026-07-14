export class UploadResultDto {
  /**
   * 프론트에서 S3로 직접 업로드할 때 사용하는 임시 URL
   */
  uploadUrl: string;

  /**
   * S3에 저장될 객체 Key
   * 예: temp/user-uuid/file-uuid.webp
   */
  key: string;

  /**
   * Presigned URL 유효 시간(초)
   */
  expiresIn: number;
}
