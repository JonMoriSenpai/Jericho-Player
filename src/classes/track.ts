import { searchMusics } from "node-youtube-music";
import { stream } from "play-dl";
import http from "http";
import https from "https";
import scdClientGen from "../api/scd-client";

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

  async download(extractor: string = this.extractor) {
    switch (extractor?.toLowerCase()?.trim()) {
      case "youtube":
        return await stream(this.streamUrl ?? this.url, { quality: 3 })?.catch(
          () => undefined
        );
      case "spotify":
        if (!this.title) return undefined;
        return await searchMusics(
          (this.author?.name ? +`${this.author?.name.trim()} - ` : "") +
            this.title.trim()
        )
          .then((tracks) => {
            tracks = tracks.filter(
              (tR) =>
                tR.title?.toLowerCase()?.trim() ===
                this.title?.toLowerCase()?.trim()
            );
            if (this.author?.name?.trim() !== "")
              tracks = tracks.filter((tR) =>
                tR.artists.find((aR) =>
                  aR.name?.includes(this.author?.name?.trim())
                )
              );
            if (this.duration?.ms)
              tracks = tracks.filter(
                (tR) =>
                  Math.trunc(tR.duration.totalSeconds / 1000) ===
                  Math.trunc(this.duration?.ms / 1000)
              );
            return tracks.shift();
          })
          .then(
            async (track) =>
              await stream(
                "https://music.youtube.com/watch?v=" + track.youtubeId,
                { quality: 3 }
              )?.catch(() => undefined)
          );
      case "soundcloud":
        if (!this.url) return undefined;
        await scdClientGen.connect();
        return await scdClientGen.client
          .download(this.url, {
            highWaterMark: 1 << 25,
          })
          ?.catch(() => undefined);
      case "unknwon":
        if (!this.url) return undefined;
        else
          return new Promise((resolve) => {
            try {
              if (this.url.startsWith("https://"))
                return https.get(this.url, (res) => resolve(res));
              else if (this.url.startsWith("http://"))
                return http.get(this.url, (res) => resolve(res));
            } catch {
              resolve(undefined);
            }
          });
      case "youtube-dl":
        return undefined;
      default:
        return undefined;
    }
  }

  get streamUrl(): string {
    if (
      ["youtube", "soundcloud"].includes(this.extractor?.toLowerCase()?.trim())
    )
      return this.#meta?.streamUrl;
    else return undefined;
  }
}
