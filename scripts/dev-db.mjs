// Local development only: runs a PostgreSQL server from the embedded-postgres
// dev dependency so no system install is needed. Production uses a managed
// PostgreSQL server (see docs/DEPLOYMENT.md).
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import EmbeddedPostgres from 'embedded-postgres';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, '.devdb');
const port = Number(process.env.DEV_DB_PORT || 5440);

const pg = new EmbeddedPostgres({
  databaseDir: dataDir,
  user: 'feathers',
  password: 'feathers',
  port,
  persistent: true,
  initdbFlags: ['--encoding=UTF8', '--locale=C'],
});

const fresh = !fs.existsSync(path.join(dataDir, 'PG_VERSION'));
if (fresh) await pg.initialise();
await pg.start();
if (fresh) await pg.createDatabase('feathers');
console.log(`Dev PostgreSQL running: postgresql://feathers:feathers@localhost:${port}/feathers`);
const stop = async () => { await pg.stop(); process.exit(0); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
