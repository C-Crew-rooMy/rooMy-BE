import { Controller, Get, Param, Req } from '@nestjs/common';
import { PostService } from './post.service';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) { }

  @Get('/:uuid')
  async getPostByUuid(@Param('uuid') uuid: string, @Req() req) {
    const result = await this.postService.getPostByUuid(uuid, req.user.userId);
    return result;
  }
}
