import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

let pg: EmbeddedPostgres;
let dir: string;

export async function setup() {
  dir = mkdtempSync(join(tmpdir(), "rise-pg-"));
  pg = new EmbeddedPostgres({ databaseDir: dir, user: "rise", password: "rise", port: 54330, persistent: false });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase("rise");
}

export async function teardown() {
  await pg.stop();
  rmSync(dir, { recursive: true, force: true });
  rmSync(".test-uploads", { recursive: true, force: true });
}
