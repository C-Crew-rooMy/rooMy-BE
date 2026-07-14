import { S3Folder } from '../enums/s3-folder.enum';

export interface UploadFileOptions {
  folder: S3Folder;

  /**
   * posts: postId
   * profiles: userId
   * temp: userId
   */
  ownerId: string;

  fileName: string;
  contentType: string;
  contentLength: number;
}
