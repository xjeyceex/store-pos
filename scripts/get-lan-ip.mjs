import { networkInterfaces } from "node:os";

/** First non-internal IPv4 address (typical Wi‑Fi / LAN IP). */
export function getLanIp() {
  const nets = networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "127.0.0.1";
}
