import { existsSync } from "node:fs";
import EmbeddedPostgres from "embedded-postgres";

const dir = new URL("../.pgdata", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const pg = new EmbeddedPostgres({ databaseDir: dir, user: "rise", password: "rise", port: 54329, persistent: true });

const fresh = !existsSync(dir + "/PG_VERSION");
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase("rise");
console.log("PostgreSQL ready: postgres://rise:rise@localhost:54329/rise  (Ctrl+C to stop)");

const stop = async () => {
  await pg.stop();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
setInterval(() => {}, 1 << 30);
