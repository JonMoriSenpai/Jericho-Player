import Playlist from "../../classes/playlist";
import Track from "../../classes/track";
import { isUrl, ms2hu } from "../../utils/baseUtils";
import extractor from "../extractor";
import scdClientGen from "../scd-client";

export default class soundCloudEx {
  static regex = {
    soundCloud: "",
  };

  static async nonApiGet(query: string, ext?: extractor, meta?: any) {
    if (!isUrl(query)) return await soundCloudEx.nonApiSearch(query, ext, meta);
  }

  static async nonApiSearch(query: string, ext?: extractor, meta?: any) {
    await scdClientGen.connect();
    let track = await scdClientGen.client
      .search({ query: query, filter: "tracks", limit: 1 })
      .then((sR) =>
        sR?.collection?.filter((tR) => tR?.kind?.trim() === "track")?.shift()
      )
      .then(
        (json: any) =>
          new Track(
            {
              id: json?.id ?? json?.title?.toLowerCase()?.trim(),
              title: json?.title ?? json?.name,
              image: json?.artwork_url,
              description: json?.description,
              url: json?.permalink_url,
              duration: {
                hR: ms2hu(json?.duration ?? json?.full_duration),
                ms: json?.duration ?? json?.full_duration,
              },
              extractor: "soundcloud",
              ratings: {
                likes: json?.likes_count,
                playCount: json?.playback_count,
                repostsCount: json?.reposts_count,
                commentsCount: json?.comment_count,
                downloadsCount: json?.download_count,
              },
              authors: {
                id: json?.user?.id,
                name: json?.user?.full_name,
                url: json?.user?.permalink_url,
                image: json?.user?.avatar_url,
              },
            },
            meta
          )
      );
    if (ext) ext.emit("track", track);
    return track;
  }

  static async nonApiTrack(query: string, ext?: extractor, meta?: any) {
    await scdClientGen.connect();
    let track = await scdClientGen.client.tracks.getTrack(query).then(
      (json) =>
        new Track(
          {
            id: json?.id ?? json?.title?.toLowerCase()?.trim(),
            title: json?.title,
            image: json?.artwork_url,
            description: json?.description,
            url: json?.permalink_url,
            duration: {
              hR: ms2hu(json?.duration ?? json?.full_duration),
              ms: json?.duration ?? json?.full_duration,
            },
            extractor: "soundcloud",
            ratings: {
              likes: json?.likes_count,
              playCount: json?.playback_count,
              repostsCount: json?.reposts_count,
              commentsCount: json?.comment_count,
              downloadsCount: json?.download_count,
            },
            authors: {
              id: json?.user?.id,
              name: json?.user?.full_name,
              url: json?.user?.permalink_url,
              image: json?.user?.avatar_url,
            },
          },
          meta
        )
    );

    if (ext) ext.emit("track", track);
    return track;
  }

  static async nonApiList(query: string, ext?: extractor, meta?: any) {
    await scdClientGen.connect();
    let playlist = await scdClientGen.client.playlists.getPlaylist(query).then(
      (json) =>
        new Playlist(
          {
            id: json.id,
            title: json?.title,
            url: json?.permalink_url,
            image: json?.artwork_url,
            author: {
              name: json?.user?.full_name,
              id: json?.user?.id,
              url: json?.user?.permalink_url,
              image: json?.user?.avatar_url,
            },
            tracks: json.tracks.map(
              (tR) =>
                new Track(
                  {
                    id: tR?.id ?? tR?.title?.toLowerCase()?.trim(),
                    title: tR?.title,
                    image: tR?.artwork_url,
                    description: tR?.description,
                    url: tR?.permalink_url,
                    duration: {
                      hR: ms2hu(tR?.duration ?? tR?.full_duration),
                      ms: tR?.duration ?? tR?.full_duration,
                    },
                    extractor: "soundcloud",
                    ratings: {
                      likes: tR?.likes_count,
                      playCount: tR?.playback_count,
                      repostsCount: tR?.reposts_count,
                      commentsCount: tR?.comment_count,
                      downloadsCount: tR?.download_count,
                    },
                    authors: {
                      id: tR?.user?.id,
                      name: tR?.user?.full_name,
                      url: tR?.user?.permalink_url,
                      image: tR?.user?.avatar_url,
                    },
                  },
                  meta
                )
            ),
          },
          meta
        )
    );
    if (ext) ext.emit("playlist", playlist);
    return playlist;
  }
}
