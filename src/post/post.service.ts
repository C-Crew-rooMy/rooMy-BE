import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Visibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PostService {

    constructor(private readonly prisma: PrismaService) { }

    async getPostByUuid(uuid: string, userId) {
        const post = await this.prisma.post.findUnique({
            where: {
                uuid,
            },
        });
        if (!post) {
            throw new NotFoundException('게시글을 찾을 수 없습니다.');
        }
        if (post.visibility === Visibility.PRIVATE &&
            post.userId !== userId) {
            throw new ForbiddenException('비공개 게시글입니다')
        }
        return post;
    }
}
