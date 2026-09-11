import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { MusicSearchQueryDto } from './dto/music-search-query.dto';
import { MusicSearchResponse } from './dto/music-search-response.dto';
import { MusicService } from './music.service';

@ApiTags('Music')
@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  @ApiOperation({ summary: '곡명 또는 아티스트명으로 음악 검색' })
  @ApiQuery({ name: 'q', required: true, type: String, example: '아이유' })
  @ApiResponse({ status: 200, type: MusicSearchResponse })
  @ApiBadRequestResponse({ description: '검색어가 없거나 공백인 경우' })
  @ApiBadGatewayResponse({ description: 'iTunes Search API 호출 실패' })
  @ApiResponse({ status: 504, description: 'iTunes Search API 타임아웃' })
  search(@Query() query: MusicSearchQueryDto): Promise<MusicSearchResponse> {
    return this.musicService.search(query.q.trim());
  }
}
