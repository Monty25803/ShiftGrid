#!/usr/bin/env node
/**
 * npm run release -- 0.1.0
 * Updates package.json version, writes a CHANGELOG stub hint, creates annotated tag.
 * Push with: git push origin main --follow-tags
 */
import fs from "fs";
import { execSync } from "child_process";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[a-z0-9.]+)?$/i.test(version)) {
  console.error("Usage: npm run release -- <semver>   e.g. npm run release -- 0.1.0");
  process.exit(1);
}

const pkgPath = new URL("../package.json", import.meta.url);
const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
pkg.version = version;
fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

const tag = `v${version}`;
execSync("git add package.json", { stdio: "inherit" });
try {
  execSync(`git commit -m "chore: release ${tag}"`, { stdio: "inherit" });
} catch {
  console.log("(no commit needed or nothing staged)");
}
execSync(`git tag -a ${tag} -m "ShiftGrid ${tag}"`, { stdio: "inherit" });

console.log(`
Tagged ${tag}.

Push to publish the Windows .exe + GitHub Release notes:

  git push origin HEAD --follow-tags

Docs: docs/RELEASE.md
`);
