// direct store call the way lib/ifg-store.ts does it
import { Agent, request } from "undici";
import { readFileSync } from "node:fs";

const ca = readFileSync(new URL("./ifg-ca.crt", import.meta.url));
const secret = process.env.STORE_SECRET;
const { statusCode, body } = await request("https://217.77.4.143/applications", {
  headers: { "x-ifg-secret": secret },
  dispatcher: new Agent({ connect: { ca } }),
});
console.log("status:", statusCode);
console.log((await body.text()).slice(0, 150));
