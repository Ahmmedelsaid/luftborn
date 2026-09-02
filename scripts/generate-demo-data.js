#!/usr/bin/env node

/**
 * Snapshots the mock database into a single JSON file the demo build can bundle.
 *
 * It runs `server/db.js` rather than re-deriving anything, so the demo serves
 * byte-identical data to what json-server serves locally — `users` and
 * `activities` included, both of which are derived from the tasks and exist
 * nowhere on disk.
 */

const { mkdirSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

const buildDatabase = require('../server/db.js');

const OUTPUT = join(__dirname, '..', 'src', 'demo', 'demo-data.json');

const database = buildDatabase();

mkdirSync(dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, `${JSON.stringify(database, null, 2)}\n`, 'utf8');

const counts = Object.entries(database)
  .map(([name, value]) => `${name}: ${Array.isArray(value) ? value.length : 1}`)
  .join(', ');

console.log(`demo data written to src/demo/demo-data.json (${counts})`);
