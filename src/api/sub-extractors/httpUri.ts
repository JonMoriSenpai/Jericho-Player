import fluentFfmpeg from "fluent-ffmpeg";
import Track from "../../classes/track";
import { isUrl, ms2hu } from "../../utils/baseUtils";
import extractor from "../extractor";

export type httpMetadataType = {
  title?: string;
  id?: string;
  url?: string;
  description?: string;
  author?: { name?: string };
  duration?: {
    hR?: string;
    ms?: number;
  };
};

export default class httpUriEx {
  static regex = {
    url: /https?:\/\//gm,
    audio: /^(https?|http):\/\/(www.)?(.*?)\.(mp3)$/gm,
  };

  static async getHttp(
    url: string,
    ext?: extractor,
    meta?: any
  ): Promise<Track> {
    if (!isUrl(url)) return undefined;
    else if (httpUriEx.regex.audio.test(url))
      return await httpUriEx
        .getMetadata(url)
        .then((data) => new Track(data, meta))
        .then((track) => {
          if (ext) ext.emit("track", track);
          return track;
        })
        ?.catch(() => undefined);
    else return undefined;
  }

  static async getMetadata(url: string): Promise<httpMetadataType> {
    if (!isUrl(url)) return undefined;

    const tagsParser = (tags: Record<string, any>) => {
      if (!(tags && typeof tags === "object" && !Array.isArray(tags)))
        return undefined;
      return Object.entries(tags)
        .map((aR) => `${aR?.[0]} : ${aR?.[1]}`)
        .join("\n");
    };

    return new Promise((resolve) => {
      fluentFfmpeg.ffprobe(url.trim(), (err, data) => {
        if (err) resolve(undefined);
        else if (data?.format) {
          resolve({
            title: data?.format?.filename?.split("/").pop(),
            id:
              data?.format?.format_name +
              "_" +
              data?.format?.filename?.split("/").pop(),
            description:
              data?.format?.format_long_name +
              "\n" +
              (tagsParser(data?.format?.tags) ?? ""),
            url: data?.format?.filename,
            author: { name: data?.format?.tags?.artist as string },
            duration: {
              hR: ms2hu(data?.format?.duration * 1000),
              ms: data?.format?.duration * 1000,
            },
          });
        } else resolve(undefined);
      });
    });
  }
}
