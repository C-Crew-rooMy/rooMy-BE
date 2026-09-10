import { Module } from '@nestjs/common';

import { ItunesService } from './itunes.service';
import { MusicController } from './music.controller';
import { MusicService } from './music.service';

@Module({
  controllers: [MusicController],
  providers: [ItunesService, MusicService],
  exports: [ItunesService, MusicService],
})
export class MusicModule {}
