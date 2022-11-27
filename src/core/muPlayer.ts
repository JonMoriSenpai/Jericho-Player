import { Client } from "eris";
import queue from "./muQueue";

export default class muPlayer {
  queues = new Map<String, queue>();
  constructor(public readonly client: Client, public option: object = {}) {}

  getQueue(guildId: string, option?: object): queue | undefined {
    let uQueue = this.queues.get(guildId.trim());
    if (!uQueue && option) uQueue = this.createQueue(guildId, option);
    else if (!uQueue) return undefined;
    else return uQueue;
  }

  createQueue(
    guildId: string,
    option: object = this.option
  ): queue | undefined {
    if (!guildId) return undefined;
    return new queue(this, guildId, option);
  }

  deleteQueue(
    guildId: string,
    disconnect: boolean = true
  ): Promise<Boolean> | Boolean {
    if (!guildId) return undefined;
    else if (!this.queues.has(guildId.trim())) return undefined;
    let uQueue = this.queues.get(guildId.trim());
    if (this.client.voiceConnections.has(guildId.trim()) && disconnect)
      return uQueue.disconnect().then(() => this.queues.delete(guildId.trim()));
    else this.queues.delete(guildId.trim());
    return true;
  }
}
