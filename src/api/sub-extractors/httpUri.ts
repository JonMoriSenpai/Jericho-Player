import fluentFfmpeg from "fluent-ffmpeg";
import Track from "../../classes/track";
import { isUrl, ms2hu } from "../../utils/baseUtils";
import extractor from "../extractor";

export type httpMetadataType = {
  name?: string;
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
  static async getHttp(
    url: string,
    ext?: extractor,
    meta?: any
  ): Promise<Track> {
    if (!isUrl(url)) return undefined;
    else
      return await httpUriEx
        .getMetadata(url)
        .then(
          (data) =>
            new Track(
              {
                id: data?.id,
                title: data?.name,
                description: data?.description,
                url: data?.url,
                author: data?.author,
                duration: data?.duration,
              },
              meta
            )
        )
        .then((track) => {
          if (ext) ext.emit("track", track);
          return track;
        })
        ?.catch(() => undefined);
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

    return new Promise((resolve, reject) => {
      fluentFfmpeg.ffprobe(url.trim(), (err, data) => {
        if (err) reject();
        else if (data?.format) {
          resolve({
            name: data?.format?.filename?.split("/").pop(),
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
        }
      });
    });
  }
}
