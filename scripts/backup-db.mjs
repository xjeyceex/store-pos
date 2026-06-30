import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(root, "dev.db");
const backupsDir = path.join(root, "backups");

if (!existsSync(dbPath)) {
  console.error("No dev.db found. Run npm run local:setup first.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const dest = path.join(backupsDir, `dev-${stamp}.db`);

mkdirSync(backupsDir, { recursive: true });
copyFileSync(dbPath, dest);

console.log(`Backup saved: ${dest}`);
