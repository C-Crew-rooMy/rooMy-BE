import { Module } from '@nestjs/common';

import { ItunesService } from './itunes.service';

@Module({
  providers: [ItunesService],
  exports: [ItunesService],
})
export class MusicModule {}
