import { MusicVideo, searchMusics } from "node-youtube-music";
import { isUrl, hu2ms } from "../../utils/baseUtils";
import extractor from "../extractor";

export default class ytMusicEx {
  static baseUrls = {
    videoUrl: (id: string) => "https://music.youtube.com/watch?v=" + id,
    channelUrl: (id: string) => "https://music.youtube.com/channel/" + id,
  };

  static async get(query: string, ext?: extractor, meta?: any) {
    
  }

  static async spSearch(title: string, duration?: string, artist: string = "") {
    if (isUrl(title)) return undefined;
    return await searchMusics(
      (artist ? +`${artist.trim()} - ` : "") + title.trim()
    ).then((tracks) =>
      ytMusicEx.#compareTracks(tracks, title, artist, duration)
    );
  }

  static pTrack(json: MusicVideo) {
    return {
      id: json.youtubeId,
      url: ytMusicEx.baseUrls.videoUrl(json.youtubeId),
      extractor: "youtube",
      image: json.thumbnailUrl,
      author: {
        ...json.artists?.[0],
        url: ytMusicEx.baseUrls.videoUrl(json.artists?.[0]?.id),
      },
      album: { name: json.album },
    };
  }

  static #compareTracks(
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
    return ytMusicEx.pTrack(tracks.shift());
  }
}
