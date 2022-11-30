import { MusicVideo, searchMusics } from "node-youtube-music";
import { playlist_info, YouTubePlayList, YouTubeVideo } from "play-dl";
import Playlist from "../../classes/playlist";
import Track from "../../classes/track";
import { isUrl, hu2ms } from "../../utils/baseUtils";
import extractor from "../extractor";

export default class ytMusicEx {
  static baseUrls = {
    videoUrl: (id: string) => "https://music.youtube.com/watch?v=" + id,
    plistUrl: (id: string) => "https://music.youtube.com/playlist?list=" + id,
    channelUrl: (id: string) => "https://music.youtube.com/channel/" + id,
  };

  static regex = {
    youtubeMusic: (url: string) =>
      /^((?:https?:)?\/\/)?((?:music)\.)((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/gm.test(
        url
      ),
    video: (url: string) =>
      Boolean(
        url.match(
          "^(?:(?:https?):)?(?://)?[^/]*(?:youtube(?:-nocookie)?.com|youtu.be).*[=/]([-\\w]{11})(?:\\?|=|&|$)"
        )?.[1]
      ),
    playlist: (url: string) => /^.*(youtu.be\/|list=)([^#\&\?]*).*/.test(url),
  };

  static async getNonApi(query: string, ext?: extractor, meta?: any) {
    if (!isUrl(query))
      return await searchMusics(query).then((tracks) =>
        ytMusicEx.pMusicVideo(tracks.shift(), ext, meta)
      );
    else if (!ytMusicEx.regex.youtubeMusic(query)) return undefined;
    else if (ytMusicEx.regex.playlist(query))
      return await playlist_info(query).then(
        async (pl) => await ytMusicEx.pYTList(pl, ext, meta)
      );
    else if (ytMusicEx.regex.video(query))
      return await searchMusics(query).then((tracks) =>
        ytMusicEx.pMusicVideo(tracks.shift(), ext, meta)
      );
    else return undefined;
  }

  static async spSearch(title: string, duration?: string, artist: string = "") {
    if (isUrl(title)) return undefined;
    return await searchMusics(
      (artist ? +`${artist.trim()} - ` : "") + title.trim()
    ).then((tracks) =>
      ytMusicEx.#compareTracks(tracks, title, artist, duration)
    );
  }

  static async pYTList(
    json?: YouTubePlayList,
    ext?: extractor,
    meta?: any
  ): Promise<Playlist> {
    let tracks = await json.all_videos(),
      playlist = new Playlist(
        {
          id: json.id,
          url: ytMusicEx.baseUrls.plistUrl(json.id),
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
          tracks: tracks.map((tR) => ytMusicEx.pYTVideo(tR, undefined, meta)),
        },
        meta
      );
    if (ext) ext.emit("playlist", playlist, meta);
    return playlist;
  }

  static pYTVideo(json: YouTubeVideo, ext?: extractor, meta?: any): Track {
    let track = new Track(
      {
        id: json.id,
        url: ytMusicEx.baseUrls.videoUrl(json.id),
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
        streamUrl: ytMusicEx.baseUrls.videoUrl(json.id),
      }
    );
    if (ext) ext.emit("track", track, meta);
    return track;
  }

  static pMusicVideo(json?: MusicVideo, ext?: extractor, meta?: any) {
    let rTrack = ytMusicEx.spMusicTrack(json),
      track = new Track({ ...rTrack }, { ...meta, streamUrl: rTrack?.url });
    if (ext) ext.emit("track", track, meta);
    return track;
  }

  static spMusicTrack(json: MusicVideo) {
    if (!json.youtubeId) return undefined;
    return {
      id: json.youtubeId,
      title: json?.title,
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

      tracks = tracks.filter(
        (tR) => tR.title?.toLowerCase()?.trim() === title?.toLowerCase()?.trim()
      );
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
    return ytMusicEx.spMusicTrack(tracks.shift());
  }
}
