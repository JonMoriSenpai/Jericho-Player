import { EventEmitter } from "events";
export default class extractor extends EventEmitter {
  constructor() {
    super();
  }
  async request(query: string, option: object = {}, extCache: any = {}) {}
}
