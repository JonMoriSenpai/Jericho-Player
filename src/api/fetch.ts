import { Client, StageChannel, VoiceChannel } from "eris";

async function getChannel(
  client: Client,
  channelId: string
): Promise<VoiceChannel | StageChannel> {
  if (!client?.user?.id) return undefined;
  let channel = (client.getChannel(channelId) ??
    (await client.getRESTChannel(channelId))) as VoiceChannel | StageChannel;
  if (!channel?.id) return undefined;
  else if (!channel.videoQualityMode) return undefined;
  else return channel;
}

export { getChannel };
