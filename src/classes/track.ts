export default class Track {
  readonly id: string;
  readonly title: string;
  readonly views: number;
  description?: string;
  readonly type: string = "track";
  readonly image?: string;
  readonly url: string;
  readonly duration?: { hR?: string; ms?: number };
  readonly author?: {
    name?: string;
    url?: string;
    id?: string;
    image?: string;
  };
  readonly isLive?: boolean;
  readonly ratings?: { like?: number; popilarity?: number };
  readonly extractor?: string;
  #meta: any;

  constructor(trackResolve: Record<string, any>, meta?: any) {
    Object.assign(this, trackResolve);
    this.#meta = meta;
  }

  async download(extractor: string = this.extractor) {}
}
