import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!existsSync(path.join(root, ".env"))) {
  if (existsSync(path.join(root, ".env.example"))) {
    console.log("Creating .env from .env.example …");
    copyFileSync(path.join(root, ".env.example"), path.join(root, ".env"));
  } else {
    console.error("Missing .env — create one with DATABASE_URL=\"file:./dev.db\"");
    process.exit(1);
  }
}

console.log("\n→ Generating Prisma client …");
run("npm", ["run", "db:generate"]);

console.log("\n→ Applying database migrations …");
run("npx", ["prisma", "migrate", "deploy"]);

console.log("\n→ Building production app …");
run("npm", ["run", "build"]);

console.log("\nLocal setup complete. Run: npm run local:start");
