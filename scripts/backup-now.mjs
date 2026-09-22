/**
 * CLI backup for desktop / scheduled jobs.
 * Usage: node --import tsx scripts/backup-now.mjs
 * Or: npx tsx scripts/backup-now.mjs
 */
import { runBackup, getDefaultDataRoot } from "../src/lib/backup.ts";

async function main() {
  console.log("Data root:", getDefaultDataRoot());
  const result = await runBackup();
  console.log("Backup OK:", result);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
