export interface ItunesTrack {
  trackId?: number;
  trackName?: string;
  artistName?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

export interface ItunesSearchResponse {
  resultCount: number;
  results: ItunesTrack[];
}
