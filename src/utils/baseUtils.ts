import * as linkify from "linkifyjs";
import { humanTimeConversionArray } from "../constants/dyno-json";

export function isUrl(query: string) {
  return Boolean(linkify.find(query)?.[0]?.href);
}

export function hu2ms(time: string) {
  if (!time) return 0;
  let tiArr = time.split(":") as string[]; // Time Split for 3:05 Format comes from YT-Music HTML / JSON Format
  return tiArr.reduceRight(
    (total, current) =>
      total + humanTimeConversionArray.shift() * parseInt(current),
    0
  );
}
