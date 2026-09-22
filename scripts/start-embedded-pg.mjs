import EmbeddedPostgres from "embedded-postgres";
import path from "path";
import fs from "fs";

const dataDir = path.join(process.cwd(), ".pgdata");
const port = Number(process.env.PG_PORT ?? 5432);

async function main() {
  fs.mkdirSync(dataDir, { recursive: true });

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "shiftgrid",
    password: "shiftgrid",
    port,
    persistent: true,
  });

  const alreadyInitialized = fs.existsSync(path.join(dataDir, "PG_VERSION"));
  if (!alreadyInitialized) {
    await pg.initialise();
  }

  await pg.start();
  try {
    await pg.createDatabase("shiftgrid");
  } catch {
    // already exists on restart
  }

  console.log(`Embedded Postgres ready on port ${port}`);
  console.log("DATABASE_URL=postgresql://shiftgrid:shiftgrid@127.0.0.1:5432/shiftgrid");
  console.log("Press Ctrl+C to stop.");

  const stop = async () => {
    try {
      await pg.stop();
    } finally {
      process.exit(0);
    }
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);

  await new Promise(() => undefined);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
