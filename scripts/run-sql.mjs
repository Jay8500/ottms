/**
 * Run a .sql file against the linked Supabase database from the terminal.
 *
 *   node scripts/run-sql.mjs supabase/tests/permission_test.sql
 *
 * Useful when the Supabase dashboard is down — the database stays up even
 * when the website does not. Also handy for the test and script files, which
 * are not migrations and so cannot go through `supabase db push`.
 *
 * Needs your database password once per terminal session:
 *
 *   Dashboard → Project Settings → Database → Connection string
 *   (or reset the password there if you never noted it down)
 *
 *   PowerShell:  $env:SUPABASE_DB_PASSWORD = "your-password"
 *   Git Bash:    export SUPABASE_DB_PASSWORD="your-password"
 *
 * The host comes from supabase/.temp/pooler-url, which the CLI already
 * saved when you linked the project. Only the password is missing from it —
 * the CLI fetches temporary credentials at runtime, which we cannot reuse.
 *
 * Never put the password in a file inside the repo.
 *
 * Needs the pg package:  npm install pg --no-save
 */

import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/run-sql.mjs <file.sql>');
  process.exit(1);
}

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error(
    'Set your database password first:\n' +
      '  PowerShell:  $env:SUPABASE_DB_PASSWORD = "your-password"\n' +
      '  Git Bash:    export SUPABASE_DB_PASSWORD="your-password"\n\n' +
      'Find it in Dashboard → Project Settings → Database.',
  );
  process.exit(1);
}

let url;
try {
  url = readFileSync('supabase/.temp/pooler-url', 'utf8').trim();
} catch {
  console.error('No supabase/.temp/pooler-url. Run: npx supabase link');
  process.exit(1);
}

// The saved URL is postgresql://<user>@<host>/<db> with no password.
const withPassword = url.replace(
  /^(postgresql:\/\/[^:@/]+)@/,
  (_m, user) => `${user}:${encodeURIComponent(password)}@`,
);

const sql = readFileSync(file, 'utf8');

const client = new pg.Client({
  connectionString: withPassword,
  ssl: { rejectUnauthorized: false },
});

// Prints a result set as an aligned table. Our test files all return
// seq / step / outcome / detail, and reading that as raw JSON is painful.
function printTable(rows) {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const width = {};
  for (const c of cols) {
    width[c] = Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length));
    width[c] = Math.min(width[c], 70);
  }
  const line = (ch) => cols.map((c) => ch.repeat(width[c] + 2)).join('+');

  console.log(cols.map((c) => ' ' + c.padEnd(width[c] + 1)).join('|'));
  console.log(line('-'));
  for (const r of rows) {
    console.log(
      cols
        .map((c) => ' ' + String(r[c] ?? '').slice(0, 70).padEnd(width[c] + 1))
        .join('|'),
    );
  }
}

try {
  await client.connect();
  console.log(`Running ${file}\n`);

  // One call, so multi-statement files behave the same as pasting them into
  // the SQL Editor.
  const result = await client.query(sql);
  const sets = Array.isArray(result) ? result : [result];

  let printed = false;
  for (const r of sets) {
    if (r?.rows?.length) {
      printTable(r.rows);
      console.log('');
      printed = true;
    }
  }
  if (!printed) console.log('Done. No rows returned.');

  // Make a failing test fail the command, so this is safe to chain.
  const failed = sets.some((r) =>
    r?.rows?.some((row) => String(row.outcome ?? '').toUpperCase() === 'FAIL'),
  );
  process.exit(failed ? 1 : 0);
} catch (e) {
  console.error('\nSQL error:', e.message);
  if (e.hint) console.error('Hint:', e.hint);
  process.exit(1);
} finally {
  await client.end().catch(() => {});
}
