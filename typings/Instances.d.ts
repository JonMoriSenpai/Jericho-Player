import {
  User,
  VoiceBasedChannel,
  Message,
  CommandInteraction,
  ButtonInteraction,
  SelectMenuInteraction,
} from "discord.js";

export type eventOptions = {
  ignoreCrash?: Boolean | true;
  emitPlayer?: Boolean | true;
  debugRegister?: Boolean | true;
};

export type downloaderOptions = {
  fetchLyrics?: Boolean | true;
  eventReturn?: { metadata?: any } | undefined;
  ratelimit?: Number | 0;
  ignoreInternalError?: Boolean | true;
  fetchOptions?: {
    fetchLimit?: Number | "Infinity";
    streamQuality?: string | "high" | "medium" | "low" | undefined;
    rawCookies?: string;
    userAgents?: string[];
    skipalbumLimit?: Boolean | false;
  };
};

export type voiceOptions = {
  eventOptions?: eventOptions;
  delayTimeout?: Number | 0;
  leaveOn?: {
    end?: number | Boolean | false | 0;
    empty?: number | Boolean | false | 0;
    bot?: number | Boolean | false | 0;
  };
  anyoneCanMoveClient?: Boolean | true;
  altVoiceChannel?: string | number | VoiceBasedChannel;
  forceDestroy?: Boolean | false;
};

export type packetOptions = {
  downloaderOptions?: downloaderOptions;
  voiceOptions?: voiceOptions;
};

export type Options = {
  eventOptions?: eventOptions;
  packetOption?: packetOptions;
};

export class Playlist {
  public readonly id: string | number;
  public readonly name: string;
  public readonly url: string;
  public readonly thumbnail: string | object;
  public readonly views: string | number | 0;
  public readonly tracksCount: number | 0;
  public readonly author: object;
  public get raw(): object;
  public get requestedSource():
    | Message
    | CommandInteraction
    | ButtonInteraction
    | SelectMenuInteraction;
  public get user(): User;
  public get metadata(): object;
  public get type(): string | "playlist";
}
export class Track {
  public readonly id: string | number;
  public readonly playlistId: string | number | undefined;
  public readonly title: string;
  public readonly url: string;
  public readonly description: string;
  public readonly author: object;
  public readonly views: string | number | 0;
  public readonly extractors: object;
  public readonly thumbnail: string | object;
  public readonly isLive: Boolean;
  public readonly duration: number;
  public readonly ratings: object;
  public readonly playlist: Playlist;
  public readonly lyrics: string;
  public get raw(): object;
  public get requestedSource():
    | Message
    | CommandInteraction
    | ButtonInteraction
    | SelectMenuInteraction;
  public get user(): User;
  public get metadata(): object;
  public get type(): string | "track";
}

export type Awaitable<T> = T | PromiseLike<T>;
