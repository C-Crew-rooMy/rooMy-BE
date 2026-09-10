export interface MusicSearchItem {
  id: number;
  name: string;
  artistName: string;
  albumImageUrl: string | null;
  itunesUrl: string | null;
}

export interface MusicSearchResponse {
  items: MusicSearchItem[];
}
