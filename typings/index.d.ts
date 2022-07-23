import EventEmitter from "events";
import {
  Client,
  Guild,
  GuildMember,
  Message,
  StageChannel,
  User,
  VoiceChannel,
  CommandInteraction,
  ButtonInteraction,
  SelectMenuInteraction,
} from "discord.js";
import { Options, Playlist, Track, Awaitable } from "./Instances";

declare interface playerEvents {
  error: [
    date: Date,
    queue: queue | player | void,
    error: Error,
    variables: object,
    location: string | void,
    metadata: string,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  raw: [data: Date, metadata: string, variables: object];
  debug: [eventName: string, eventMessage: string, variables: object];
  trackEnd: [
    queue: queue,
    track: Track,
    user: User,
    remainingTracks: Track[],
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  queueEnd: [
    queue: queue,
    track: Track,
    user: User,
    previousTracks: Track[],
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  trackStart: [
    queue: queue,
    track: Track,
    user: User,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  playlistAdd: [
    queue: queue,
    playlist: Playlist,
    user: User | GuildMember,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  trackAdd: [
    queue: queue,
    track: Track,
    playlist: Playlist,
    user: User | GuildMember,
    tracks: Track[],
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  connectionError: [
    queue: queue,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  channelEmpty: [
    queue: queue,
    channel: VoiceChannel,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
}
declare class player extends EventEmitter {
  constructor(discordClient: Client, options?: Options);
  public readonly discordClient: Client;
  public readonly options: Options;
  public get type(): string | "player";
  public createQueue(
    guildId: Guild["id"] | String | Number,
    forceCreate?: boolean | false,
    options?: Options
  ): Promise<queue>;
  public getQueue(
    guildId: Guild["id"] | String | Number,
    options?: Options,
    forceGet?: Boolean | false
  ): Promise<queue>;
  public destroyQueue(
    guildId: Guild["id"] | String | Number,
    destroyConnection?: Boolean | true,
    options?: Options
  ): Promise<Boolean | undefined>;

  public on<K extends keyof playerEvents>(
    event: K,
    listener: (...args: playerEvents[K]) => Awaitable<void>
  ): this;
  public on<S extends string | symbol>(
    event: Exclude<S, keyof playerEvents>,
    listener: (...args: any[]) => Awaitable<void>
  ): this;
}

export class queue {
  constructor(
    guildId: Guild["id"] | string | number,
    options: Options,
    player: player
  );
  public readonly discordClient: Client;
  public readonly guildId: Guild["id"] | string | number;
  public readonly player: player;
  public readonly destroyed: boolean | false;
  public get type(): string | "queue";
  public get playing(): Boolean;
  public get paused(): Boolean;
  public get current(): Track | undefined;
  public get tracks(): Track[] | undefined;
  play(
    rawQuery: string,
    voiceSnowflake: string | number | VoiceChannel | StageChannel | Message,
    requestedBy: User | string | number | GuildMember,
    options?: Options
  ): Promise<Boolean | undefined>;
  skip(
    forceSkip?: Boolean | false,
    trackCount?: Number | 1
  ): Promise<Boolean | undefined>;
  stop(
    forceStop?: Boolean | false,
    preserveTracks?: Boolean | false
  ): Promise<Boolean | undefined>;
  destroy(
    delayVoiceTimeout?: Number | 0,
    destroyConnection?: Boolean | false
  ): Promise<Boolean | undefined>;
}
