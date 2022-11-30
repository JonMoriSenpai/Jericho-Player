import {
  YouTubeVideo,
  YouTubePlayList,
  playlist_info,
  video_basic_info,
  search,
} from "play-dl";
import Playlist from "../../classes/playlist";
import Track from "../../classes/track";
import { isUrl } from "../../utils/baseUtils";
import extractor from "../extractor";

export default class youtubeEx {
  static baseRegex = {
    playlist: (url: string) => /^.*(youtu.be\/|list=)([^#\&\?]*).*/.test(url),
    youtube: (url: string) =>
      /(?:http?s?:\/\/)?(?:www.)?(?:m.)?(?:music.)?youtu(?:\.?be)(?:\.com)?(?:(?:\w*.?:\/\/)?\w*.?\w*-?.?\w*\/(?:embed|e|v|watch|.*\/)?\??(?:feature=\w*\.?\w*)?&?(?:v=)?\/?)([\w\d_-]{11})(?:\S+)?/gm.test(
        url
      ),
    video: (url: string) =>
      Boolean(
        url.match(
          "^(?:(?:https?):)?(?://)?[^/]*(?:youtube(?:-nocookie)?.com|youtu.be).*[=/]([-\\w]{11})(?:\\?|=|&|$)"
        )?.[1]
      ),
  };

  static async getNonApi(query: string, ext?: extractor, meta?: any) {
    if (!isUrl(query))
      return await search(query, { limit: 1, source: { youtube: "video" } })
        .then((tRs) => tRs.shift())
        .then((tR) => youtubeEx.pYoutubeTrack(tR, ext, meta));
    else if (!youtubeEx.baseRegex.youtube(query)) return undefined;
    else if (youtubeEx.baseRegex.playlist(query))
      return await playlist_info(query)
        .then((pL) => youtubeEx.pYoutubeList(pL, ext, meta))
        .catch(() => undefined);
    else if (youtubeEx.baseRegex.video(query))
      return await video_basic_info(query)
        .then((tR) => youtubeEx.pYoutubeTrack(tR.video_details, ext, meta))
        .catch(() => undefined);
    else return undefined;
  }

  static pYoutubeTrack(json: YouTubeVideo, ext?: extractor, meta?: any): Track {
    let track = new Track(
      {
        id: json.id,
        url: json.url,
        title: json.title,
        description: json.description,
        duration: {
          hR: json.durationRaw,
          ms: json.durationInSec * 1000,
        },
        views: json.views,
        image: json.thumbnails.sort((a, b) => a?.width - b?.width)?.pop()?.url,
        author: {
          name: json.channel?.name,
          id: json.channel?.id,
          url: json.channel?.url,
          image: json.channel?.icons?.sort((a, b) => a?.width - b?.width)?.pop()
            ?.url,
        },
        extractor: "youtube",
        isLive: json.live,
        ratings: {
          likes: json.likes,
        },
      },
      {
        meta,
        streamUrl: json.url,
      }
    );
    if (ext) ext.emit("track", track, meta);
    return track;
  }

  static async pYoutubeList(
    json: YouTubePlayList,
    ext?: extractor,
    meta?: any
  ): Promise<Playlist> {
    let tracks = await json.all_videos(),
      playlist = new Playlist(
        {
          id: json.id,
          url: json.url,
          title: json.title,
          views: json.views,
          author: {
            name: json.channel?.name,
            id: json.channel?.id,
            url: json.channel?.url,
            image: json.channel?.icons
              ?.sort((a, b) => a?.width - b?.width)
              ?.pop()?.url,
          },
          image: json.thumbnail.url,
          extractor: "youtube",
          tracks: tracks.map((tR) =>
            youtubeEx.pYoutubeTrack(tR, undefined, meta)
          ),
        },
        meta
      );
    if (ext) ext.emit("playlist", playlist, meta);
    return playlist;
  }
}
