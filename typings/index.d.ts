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
import { Options, Playlist, Track, Awaitable, TimeStamp } from "./Instances";
import { VoiceConnection } from "@discordjs/voice";

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
  tracksAdd: [
    queue: queue,
    tracksCount: Number,
    tracks: Tracks,
    playlist: Playlist,
    user: User | GuildMember,
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
  botDisconnect: [
    queue: queue,
    channel: VoiceChannel,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  channelShift: [
    queue: queue,
    oldChannel: VoiceChannel,
    newChannel: VoiceChannel,
    requestedSource:
      | Message
      | CommandInteraction
      | ButtonInteraction
      | SelectMenuInteraction
  ];
  destroyedQueue: [
    queue: queue,
    timeOutId: number,
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
  public static depReport(): String;
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
  public get volume(): Number;
  public get working(): Boolean;
  public get playing(): Boolean;
  public get paused(): Boolean;
  public get current(): Track | undefined;
  public get tracks(): Track[] | undefined;
  public get previousTrack(): Track;
  public get previousTracks(): Track[];
  public get voiceConnection(): VoiceConnection;
  public get timeStamp(): TimeStamp;
  play(
    rawQuery: string,
    voiceSnowflake: string | number | VoiceChannel | StageChannel | Message,
    requestedBy: User | string | number | GuildMember,
    options?: Options
  ): Promise<Boolean | undefined>;
  skip(
    forceSkip?: Boolean | true,
    trackCount?: Number | 1
  ): Promise<Boolean | undefined>;
  stop(
    forceStop?: Boolean | true,
    preserveTracks?: Boolean | false
  ): Promise<Boolean | undefined>;
  destroy(
    delayVoiceTimeout?: Number | 0,
    destroyConnection?: Boolean | false
  ): Promise<Boolean | undefined>;
  pause(): Boolean;
  unpause(): Boolean;
  setVolume(volume?: Number): Number | undefined;
  mute(): Boolean;
  unmute(): Boolean;
  clear(tracksCount?: Number): Boolean;
  shuffle(): Boolean;
  back(tracksCount?: Number | 1): Promise<Boolean>;
}

declare var cores: {
  Track: Track;
  Options: Options;
  Playlist: Playlist;
  queue: queue;
  player: player;
};

export default cores;

export { Track, Playlist, Options };
