import { Injectable } from '@nestjs/common';

import { ItunesService } from './itunes.service';
import {
  MusicSearchItem,
  MusicSearchResponse,
} from './dto/music-search-response.dto';

@Injectable()
export class MusicService {
  constructor(private readonly itunesService: ItunesService) {}

  async search(query: string): Promise<MusicSearchResponse> {
    const result = await this.itunesService.searchTracks(query);

    return {
      items: result.results
        .filter((track) => track.trackId && track.trackName && track.artistName)
        .map((track): MusicSearchItem => ({
          id: track.trackId as number,
          name: track.trackName as string,
          artistName: track.artistName as string,
          albumImageUrl: track.artworkUrl100 ?? null,
          itunesUrl: track.trackViewUrl ?? null,
        })),
    };
  }
}
