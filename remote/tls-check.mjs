// verify the pinned-CA TLS path the way Vercel's Node runtime will
import tls from "node:tls";
import { readFileSync } from "node:fs";

const ca = readFileSync(new URL("./ifg-ca.crt", import.meta.url));
const socket = tls.connect(
  { host: "217.77.4.143", port: 443, ca, servername: "217.77.4.143", rejectUnauthorized: true },
  () => {
    console.log("authorized:", socket.authorized);
    console.log("subject:", JSON.stringify(socket.getPeerCertificate().subject));
    socket.end();
  }
);
socket.on("error", (err) => { console.error("TLS ERROR:", err.message); process.exit(1); });
