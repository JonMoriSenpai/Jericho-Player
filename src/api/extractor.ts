import { EventEmitter } from "events";
import { apiTokensTypes } from "../constants/dyno-json";

export default class extractor extends EventEmitter {
  api: apiTokensTypes;
  constructor() {
    super();
  }
  async request(query: string, option: object = {}, extCache: any = {}) {}
}
