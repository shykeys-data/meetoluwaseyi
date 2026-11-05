import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { E2E_ENV } from '../playwright.config.ts';

/** Creates the test admin and stores its 2FA secret for the admin test. */
export default function globalSetup() {
  const out = execFileSync('node', ['dist/jobs/cli.js', 'create-admin', 'owner@example.com'], {
    env: { ...process.env, ...E2E_ENV, ADMIN_PASSWORD: 'e2e correct horse battery staple' },
    encoding: 'utf8',
  });
  const secret = /secret: ([A-Z2-7]+)/.exec(out)?.[1];
  if (!secret) throw new Error('Could not read the admin 2FA secret');
  writeFileSync('e2e/.admin-secret', secret);
}
