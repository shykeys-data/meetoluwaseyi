import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/config.ts';

const PRODUCTION = {
  NODE_ENV: 'production',
  SITE_URL: 'https://meetoluwaseyi.com',
  MONGODB_URI: 'mongodb+srv://user:pass@cluster.example.mongodb.net/site',
  SESSION_SECRET: 'x'.repeat(40),
  IP_HASH_SALT: 'y'.repeat(20),
  ADMIN_EMAIL: 'hi@meetoluwaseyi.com',
};

describe('loadConfig', () => {
  it('runs a fresh clone in development with safe defaults', () => {
    const c = loadConfig({});
    expect(c.APP_ENV).toBe('development');
    expect(c.PORT).toBe(3000);
    expect(c.SITE_URL).toBe('http://localhost:3000');
    expect(c.isDev).toBe(true);
  });

  it('accepts a complete production environment', () => {
    const c = loadConfig(PRODUCTION);
    expect(c.APP_ENV).toBe('production');
    expect(c.isDev).toBe(false);
  });

  it('refuses to start in production when a required variable is missing', () => {
    const { MONGODB_URI: _gone, ...rest } = PRODUCTION;
    expect(() => loadConfig(rest)).toThrow(ConfigError);
    expect(() => loadConfig(rest)).toThrow(/MONGODB_URI is required in production/);
  });

  it('treats an empty value as missing', () => {
    expect(() => loadConfig({ ...PRODUCTION, SESSION_SECRET: '  ' })).toThrow(/SESSION_SECRET/);
  });

  it('rejects malformed values and lists every problem at once', () => {
    try {
      loadConfig({ ...PRODUCTION, SITE_URL: 'not a url', SESSION_SECRET: 'short', PORT: '99999' });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigError);
      expect((err as ConfigError).problems.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('requires a password on staging', () => {
    expect(() => loadConfig({ ...PRODUCTION, APP_ENV: 'staging' })).toThrow(/STAGING_PASSWORD/);
    const c = loadConfig({ ...PRODUCTION, APP_ENV: 'staging', STAGING_PASSWORD: 'a-long-password' });
    expect(c.isStaging).toBe(true);
  });
});
