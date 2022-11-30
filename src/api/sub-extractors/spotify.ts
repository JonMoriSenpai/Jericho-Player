import isoFetch from "isomorphic-unfetch";
import spotifyUrlInfo from "spotify-url-info";
import SpotifyWebApiNode from "spotify-web-api-node";
import Playlist from "../../classes/playlist";
import Track from "../../classes/track";
import { spotifyToken } from "../../constants/dyno-json";
import { isUrl, ms2hu } from "../../utils/baseUtils";
import extractor from "../extractor";
import ytMusicEx from "./yt-music";

const { getData } = spotifyUrlInfo(isoFetch);

export default class spotifyEx {
  static regex = {
    url: /^(?:spotify:|(?:https?:\/\/(?:open|play)\.spotify\.com\/))(?:embed)?\/?(album|track|playlist|show|episode)(?::|\/)((?:[0-9a-zA-Z]){22})/,
  };

  static apiClient: SpotifyWebApiNode;

  static async getNonApi(
    query: string,
    ext?: extractor,
    meta?: any
  ): Promise<Track | Playlist> {
    try {
      if (!isUrl(query)) return await spotifyEx.apiTrack(query, ext, meta);
      else if (!spotifyEx.regex.url.test(query)) return undefined;
      else
        return await getData(query).then((sR: any) => {
          if (sR.type?.toLowerCase()?.trim() === "playlist")
            return spotifyEx.getNonApiPlaylist(sR, ext, meta);
          else if (sR.type?.toLowerCase()?.trim() === "track")
            return spotifyEx.getNonApiPlaylist(sR, ext, meta);
          else return undefined;
        });
    } catch {
      return undefined;
    }
  }

  static getNonApiTrack(
    json: Record<string, any>,
    ext?: extractor,
    meta?: any
  ): Track {
    if (!json?.id) return undefined;
    let track = new Track({
      id: json?.id,
      url: json?.external_urls?.spotify,
      title: json?.name,
      description: json?.description,
      duration: {
        hR: ms2hu(json?.duration),
        ms: json?.duration,
      },
      image: json?.coverArt?.sources?.shift().url,
      author: {
        name: json?.artists?.[0]?.name,
        id: json?.artists?.[0]?.id,
        url: "https://open.spotify.com/artist/" + json?.artists?.[0]?.uri,
      },
      extractor: "spotify",
      ratings: {
        popularity: json?.popularity,
      },
    });
    if (ext) ext.emit("track", track);
    return track;
  }

  static getNonApiPlaylist(
    json: Record<string, any>,
    ext?: extractor,
    meta?: any
  ): Playlist {
    if (!json?.id) return undefined;
    let playlist = new Playlist(
      {
        id: json?.id,
        url: json?.external_urls?.spotify,
        image: json?.images?.pop()?.url,
        title: json?.name,
        author: {
          name: json?.owner?.display_name,
          id: json?.owner?.id,
          url: json?.owner?.external_urls?.spotify,
        },
        tracks: json?.tracks?.items?.map(
          (tR: any) =>
            new Track(
              {
                id: tR?.track?.id,
                url: tR?.track?.external_urls?.spotify,
                title: tR?.track?.name,
                description: tR?.track?.description,
                duration: {
                  hR: ms2hu(tR?.track?.duration_ms),
                  ms: tR?.track?.duration_ms,
                },
                image: tR?.track?.album?.images?.shift().url,
                author: {
                  name: tR?.track?.artists?.[0]?.name,
                  id: tR?.track?.artists?.[0]?.id,
                  url: tR?.track?.artists?.[0]?.external_urls?.spotify,
                },
                extractor: "spotify",
                ratings: {
                  popularity: tR?.track?.popularity,
                },
              },
              meta
            )
        ),
      },
      meta
    );
    if (ext) ext.emit("playlist", playlist);
    return playlist;
  }

  static async apiTrack(
    query: string,
    ext?: extractor,
    meta: any = {}
  ): Promise<Track> {
    if (!spotifyEx.apiClient) return undefined;
    let track = await spotifyEx.apiClient
      .searchTracks(encodeURIComponent(query), { limit: 1 })
      .then((data) => data?.body?.tracks?.items?.[0])
      .then(async (rqTrack) => {
        if (
          !(rqTrack?.artists?.[0]?.name && rqTrack?.name && rqTrack.duration_ms)
        )
          return undefined;
        let streamUrl = await ytMusicEx
          .spSearch(
            rqTrack?.name,
            `${rqTrack.duration_ms}`,
            rqTrack.artists?.[0]?.name
          )
          .then((obj) => obj?.url);
        if (!streamUrl) return undefined;
        return {
          ...rqTrack,
          streamUrl,
        };
      })
      .then(
        (tR) =>
          new Track(
            {
              id: tR.id,
              url: tR.external_urls?.spotify,
              title: tR.name,
              duration: { hR: ms2hu(tR?.duration_ms), ms: tR.duration_ms },
              image: tR.album?.images?.shift()?.url,
              author: {
                name: tR.artists?.[0]?.name,
                id: tR.artists?.[0]?.id,
                url: tR.artists?.[0]?.external_urls?.spotify,
              },
              extractor: "spotify",
              ratings: {
                popilarity: tR.popularity,
              },
            },
            { ...meta, streamUrl: tR?.streamUrl }
          )
      );
    if (ext) ext.emit("track", track);
    return track;
  }

  static async apiConnect(cred: spotifyToken) {
    spotifyEx.apiClient = new SpotifyWebApiNode(cred);
    if (!cred.accessToken)
      cred.accessToken = await spotifyEx.apiClient
        .clientCredentialsGrant()
        .then((data) => data?.body?.access_token);

    spotifyEx.apiClient.setAccessToken(cred.accessToken);
    return true;
  }
}
