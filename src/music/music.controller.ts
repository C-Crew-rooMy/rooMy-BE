import { Controller, Get, Query } from '@nestjs/common';

import { MusicSearchQueryDto } from './dto/music-search-query.dto';
import { MusicSearchResponse } from './dto/music-search-response.dto';
import { MusicService } from './music.service';

@Controller('music')
export class MusicController {
  constructor(private readonly musicService: MusicService) {}

  @Get('search')
  search(@Query() query: MusicSearchQueryDto): Promise<MusicSearchResponse> {
    return this.musicService.search(query.q.trim());
  }
}
