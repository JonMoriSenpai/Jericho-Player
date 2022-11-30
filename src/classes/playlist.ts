import Track from "./track";

export default class Playlist {
  readonly id: string;
  readonly type: string = "playlist";
  readonly title: string;
  readonly views?: number;
  readonly image?: string;
  readonly url: string;
  readonly author?: {
    name?: string;
    url?: string;
    id?: string;
    image?: string;
  };
  readonly extractor: string;
  tracks: Array<Track>;
  #meta: any;

  constructor(playListResolve: Record<string, any>, meta?: any) {
    Object.assign(this, playListResolve);
    this.#meta = meta;
  }
  
  get tracksCount(): number {
    return this.tracks.length;
  }
}
