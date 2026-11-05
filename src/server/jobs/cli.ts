import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { loadConfig, loadDotEnv } from '../config.ts';
import { createDb } from '../db/pool.ts';
import { migrate } from '../db/migrations.ts';
import { seed } from '../db/seed.ts';
import { createLogger } from '../lib/log.ts';
import { upsertAdmin } from '../services/auth.ts';
import { syncGithub } from '../services/integrations.ts';
import { purgeOldMessages } from '../services/messages.ts';
import { totpUri } from '../lib/crypto.ts';
import type { Ctx } from '../services/context.ts';

/**
 * One entry point for maintenance, run by hand or by the host's cron jobs:
 *   node dist/jobs/cli.js migrate | seed [--force] | create-admin | github-sync | daily | check
 */
async function run() {
  const [cmd = 'help', ...args] = process.argv.slice(2);
  if (process.env.NODE_ENV !== 'production') loadDotEnv(resolve(process.cwd(), '.env'));
  const config = loadConfig();
  const log = createLogger('info');
  const db = createDb(config.DATABASE_URL);
  const ctx: Ctx = { db, config, log, fetch: globalThis.fetch };
  try {
    switch (cmd) {
      case 'check':
        console.log(`config ok for ${config.APP_ENV}`);
        break;
      case 'migrate':
        console.log((await migrate(db)).length ? 'migrations applied' : 'database already up to date');
        break;
      case 'seed':
        if (config.isProd && !args.includes('--force')) throw new Error('Refusing to seed production without --force.');
        await migrate(db);
        console.log(await seed(db));
        break;
      case 'create-admin': {
        await migrate(db, () => {});
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const email = (args[0] ?? (await rl.question('Admin email: '))).trim();
        const password = process.env.ADMIN_PASSWORD ?? (await rl.question('Password (14+ characters): '));
        rl.close();
        const { totpSecret } = await upsertAdmin(ctx, email, password);
        console.log('\nAdmin saved. Add this to your authenticator app (shown once):');
        console.log(`  secret: ${totpSecret}`);
        console.log(`  link:   ${totpUri(totpSecret, email)}`);
        break;
      }
      case 'github-sync':
        console.log(JSON.stringify(await syncGithub(ctx)));
        break;
      case 'daily': {
        const purged = await purgeOldMessages(ctx);
        const sync = await syncGithub(ctx);
        console.log(JSON.stringify({ purgedMessages: purged, github: sync }));
        break;
      }
      default:
        console.log('Commands: check | migrate | seed [--force] | create-admin [email] | github-sync | daily');
    }
  } finally {
    await db.end();
  }
}

run().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
