export default class Track {
  id: string;
  title: string;
  description?: string;
  image?: string;
  url: string;
  author: { name?: string; url?: string; id?: string };
  album: { name?: string };
  extractor: string;
  #meta: any;

  constructor(trackResolve: Record<string, any>, meta?: any) {
    Object.assign(this, trackResolve);
    this.#meta = meta;
  }

  static fromYoutube(json: Record<string, any>, meta?: any) {
    if (!json.youtubeId) return undefined;
    return new Track({}, meta);
  }
}
