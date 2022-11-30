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
    ytPlaylist: (url: string) => /^.*(youtu.be\/|list=)([^#\&\?]*).*/.test(url),
  };

  static async getNonApi(url: string, meta?: any, ext?: extractor) {
    if (!isUrl(url))
      return await search(url, { limit: 1, source: { youtube: "video" } })
        .then((tRs) => tRs.shift())
        .then((tR) => youtubeEx.pYoutubeTrack(tR, meta, ext));
    else if (youtubeEx.baseRegex.ytPlaylist(url))
      return await playlist_info(url)
        .then((pL) => youtubeEx.pYoutubeList(pL, meta, ext))
        .catch(() => undefined);
    else
      return await video_basic_info(url)
        .then((tR) => youtubeEx.pYoutubeTrack(tR.video_details, meta, ext))
        .catch(() => undefined);
  }

  static pYoutubeTrack(json: YouTubeVideo, meta?: any, ext?: extractor): Track {
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
    meta?: any,
    ext?: extractor
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
