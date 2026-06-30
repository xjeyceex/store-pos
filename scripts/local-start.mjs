import { spawn } from "node:child_process";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
import { request } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ensureLocalCerts } from "./ensure-local-certs.mjs";
import { getLanIp } from "./get-lan-ip.mjs";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const httpsPort = Number(process.env.PORT ?? 4000);
const internalPort = Number(process.env.LOCAL_INTERNAL_PORT ?? 4001);

const { keyPath, certPath } = ensureLocalCerts();
const lanIp = getLanIp();

const nextProcess = spawn(
  "npx",
  ["next", "start", "-H", "127.0.0.1", "-p", String(internalPort)],
  {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, NODE_ENV: "production" },
  },
);

nextProcess.on("exit", (code) => {
  process.exit(code ?? 0);
});

function waitForNext() {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 60;

    const tick = () => {
      const probe = request(
        { hostname: "127.0.0.1", port: internalPort, path: "/", method: "GET" },
        (res) => {
          res.resume();
          resolve();
        },
      );
      probe.on("error", () => {
        attempts += 1;
        if (attempts >= maxAttempts) {
          reject(new Error("Next.js did not start in time"));
          return;
        }
        setTimeout(tick, 500);
      });
      probe.end();
    };

    setTimeout(tick, 500);
  });
}

function startHttpsProxy() {
  const key = readFileSync(keyPath);
  const cert = readFileSync(certPath);

  createHttpsServer({ key, cert }, (req, res) => {
    const proxy = request(
      {
        hostname: "127.0.0.1",
        port: internalPort,
        path: req.url,
        method: req.method,
        headers: req.headers,
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
        proxyRes.pipe(res);
      },
    );

    proxy.on("error", () => {
      if (!res.headersSent) {
        res.writeHead(502);
      }
      res.end("Bad gateway");
    });

    req.pipe(proxy);
  }).listen(httpsPort, "0.0.0.0", () => {
    console.log("");
    console.log("Store POS is running on this PC.");
    console.log("");
    console.log(`  On this computer:  https://localhost:${httpsPort}`);
    console.log(`  On phone/tablet:   https://${lanIp}:${httpsPort}`);
    console.log("");
    console.log("  Your browser will warn about the self-signed certificate —");
    console.log('  choose "Advanced" → proceed (safe on your own Wi‑Fi).');
    console.log("");
    console.log("  Press Ctrl+C to stop.");
    console.log("");
  });
}

process.on("SIGINT", () => {
  nextProcess.kill("SIGINT");
});

process.on("SIGTERM", () => {
  nextProcess.kill("SIGTERM");
});

try {
  await waitForNext();
  startHttpsProxy();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  nextProcess.kill();
  process.exit(1);
}
