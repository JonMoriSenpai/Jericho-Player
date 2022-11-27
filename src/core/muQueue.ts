import {
  Message,
  Client,
  VoiceConnection,
  CommandInteraction,
  Interaction,
  ComponentInteraction,
} from "eris";
import { getChannel } from "../api/fetch";
import extractor from "../api/extractor";
import Player from "./muPlayer";

import { muPlayOption, muQueueOption, voiceOption } from "../constants/dyno-json";

type reqSourceflake = Message | CommandInteraction | ComponentInteraction;

export default class queue {
  tracks: object[] = [];
  pTracks: object[] = [];
  ext: extractor = new extractor();
  constructor(
    public readonly player: Player,
    public readonly guildId: string,
    public option = muQueueOption
  ) {}

  async play(
    query: string,
    reqSource?: reqSourceflake,
    voiceId: string = reqSource?.member?.voiceState?.channelID,
    option = muPlayOption
  ): Promise<Boolean> {
    if (!reqSource?.id) return undefined;
    this.ext.request(query, option, {
      voiceId,
      reqSource,
      metadata: option?.metadata,
    });
    return await this.#cycle();
  }

  async switch(voiceId: string, option = voiceOption): Promise<Boolean> {
    if (!voiceId) return undefined;
    else if (voiceId === this.voiceId) return true;
    let channel = await getChannel(this.client, voiceId);
    await channel.join({ ...option })?.catch(() => undefined);
    return true;
  }

  async disconnect(): Promise<Boolean> {
    if (!this.active) return false;
    let channel = await getChannel(this.client, this.voiceId);
    channel.leave();
    return true;
  }

  async #cycle(
    tracks: Object[] = [],
    forcePlay: Boolean = false,
    svTrack: Boolean = false,
    splice: Array<any> = forcePlay
      ? [1, 0, ...tracks]
      : [this.tracks.length, 0, ...tracks]
  ) {
    if (!(tracks?.length > 0))
      this.tracks.splice(splice.shift(), splice.shift(), ...splice);
    let voiceConn = this.voiceConnection;
  }

  get voiceConnection(): VoiceConnection {
    return this.client.voiceConnections.get(this.guildId);
  }

  get client(): Client {
    return this.player.client;
  }

  get current(): object {
    return this.tracks?.[0];
  }

  get voiceId() {
    return this.voiceConnection.channelID;
  }

  get active() {
    const { playing, paused } = this.voiceConnection;
    return Boolean(playing ?? paused);
  }
}
