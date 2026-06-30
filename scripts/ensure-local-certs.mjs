import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import selfsigned from "selfsigned";
import { getLanIp } from "./get-lan-ip.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const certDir = path.join(root, "certificates");
const keyPath = path.join(certDir, "localhost-key.pem");
const certPath = path.join(certDir, "localhost.pem");

export function ensureLocalCerts() {
  if (existsSync(keyPath) && existsSync(certPath)) {
    return { keyPath, certPath, lanIp: getLanIp() };
  }

  mkdirSync(certDir, { recursive: true });
  const lanIp = getLanIp();

  const altNames = [
    { type: 2, value: "localhost" },
    { type: 7, ip: "127.0.0.1" },
  ];
  if (lanIp !== "127.0.0.1") {
    altNames.push({ type: 7, ip: lanIp });
  }

  const pems = selfsigned.generate([{ name: "commonName", value: "localhost" }], {
    days: 3650,
    keySize: 2048,
    extensions: [
      {
        name: "basicConstraints",
        cA: true,
      },
      {
        name: "keyUsage",
        keyCertSign: true,
        digitalSignature: true,
        nonRepudiation: true,
        keyEncipherment: true,
        dataEncipherment: true,
      },
      {
        name: "subjectAltName",
        altNames,
      },
    ],
  });

  writeFileSync(keyPath, pems.private);
  writeFileSync(certPath, pems.cert);

  return { keyPath, certPath, lanIp };
}
