export const muPlayerOption = {};

export const muQueueOption = {};

export const voiceOption = {};

export const muPlayOption = {
  metadata: {},
};

export type spotifyToken = {
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  accessToken?: string;
};

export type apiTokensTypes = {
  spotify?: spotifyToken;
};

export const humanTimeConversionArray = [1000, 60, 24];
