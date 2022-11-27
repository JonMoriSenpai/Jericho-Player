import Track from "./track";
export default class Playlist {
  id: string;
  title: string;
  description: string;
  image: string;
  url: string;
  tracks: Array<Track>;
  #meta: any;

  constructor(trackResolve: Record<string, any>, meta?: any) {
    Object.assign(this, trackResolve);
    this.#meta = meta;
  }

  static fromYoutube(json: Record<string, any>, meta?: any) {
    if (!json.youtubeId) return undefined;
    return new Playlist({}, meta);
  }
}
