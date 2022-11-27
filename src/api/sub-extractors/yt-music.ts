import { MusicVideo, searchMusics } from "node-youtube-music";
import {
  stream,
  search,
  YouTubeVideo,
  YouTubeChannel,
  YouTubePlayList,
} from "play-dl";
import Playlist from "../../classes/playlist";
import Track from "../../classes/track";
import { isUrl, hu2ms } from "../../utils/baseUtils";
import extractor from "../extractor";

type YTSearchResultResolve = YouTubeVideo | YouTubeChannel | YouTubePlayList;
export default class ytMusic {
  static baseUrls = {
    youtubeMusicVideoURL: (id: string) =>
      "https://music.youtube.com/watch?v=" + id,
    youtubeMusicChannelURL: (id: string) =>
      "https://music.youtube.com/channel/" + id,
  };

  static async get(url: string, meta?: any, ext?: extractor) {
    if (!isUrl(url)) return undefined;
    return await search(url)
      .then((sR) => sR.filter((s) => s.type !== "channel"))
      .then((sR) => ytMusic.pYoutubeWeb(sR.shift(), meta, ext));
  }

  static async request(title: string, duration?: string, artist: string = "") {
    if (isUrl(title)) return undefined;
    return await searchMusics(
      (artist ? +`${artist.trim()} - ` : "") + title.trim()
    ).then((tracks) =>
      ytMusic.compYTMusicTracks(tracks, title, artist, duration)
    );
  }

  static compYTMusicTracks(
    tracks: Array<MusicVideo>,
    title: string,
    artist?: string,
    duration?: string
  ) {
    if (duration && isNaN(Number(duration))) duration = `${hu2ms(duration)}`;

    tracks = tracks.filter((tR) => tR.title?.trim() === title?.trim());
    if (artist?.trim() !== "")
      tracks = tracks.filter((tR) =>
        tR.artists.find((aR) => aR.name?.includes(artist?.trim()))
      );
    if (duration)
      tracks = tracks.filter(
        (tR) =>
          Math.trunc(tR.duration.totalSeconds / 1000) ===
          Math.trunc(parseInt(duration) / 1000)
      );
    return ytMusic.pYTMusicTrack(tracks.shift());
  }

  static pYoutubeWeb(
    json: YTSearchResultResolve,
    meta?: any,
    ext?: extractor
  ): Track | Playlist {
    switch (json?.type?.toLowerCase()?.trim()) {
      case "video":
        let track = Track.fromYoutube(json, meta);
        if (ext) ext.emit("track", track, meta);
        return track;
      case "playlist":
        let playlist = Playlist.fromYoutube(json, meta);
        if (ext) ext.emit("playlist", playlist, meta);
        return playlist;
      default:
        return undefined;
    }
  }

  static pYTMusicTrack(json: MusicVideo) {
    return {
      id: json.youtubeId,
      url: ytMusic.baseUrls.youtubeMusicVideoURL(json.youtubeId),
      extractor: "youtube",
      image: json.thumbnailUrl,
      author: {
        ...json.artists?.[0],
        url: ytMusic.baseUrls.youtubeMusicVideoURL(json.artists?.[0]?.id),
      },
      album: { name: json.album },
    };
  }
}
