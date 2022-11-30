import { SoundCloud } from "scdl-core";

export default class scdClientGen {
  static client: typeof SoundCloud;

  static async connect(): Promise<SoundCloud> {
    if (scdClientGen.client) return scdClientGen.client;
    else scdClientGen.client = SoundCloud;
    await scdClientGen.client.connect();
    return scdClientGen.client;
  }
}

scdClientGen.connect();
