/**
 * Reset demo data (destructive). Use only on local / staging.
 * Usage: npm run db:reset-demo
 */
import { execSync } from "child_process";

console.log("Resetting database seed (demo org)…");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit" });
console.log("Done. Demo logins restored (password123).");
