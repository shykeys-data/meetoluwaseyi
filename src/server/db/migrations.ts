import type { Db } from './pool.ts';

/**
 * Schema changes, applied in order and recorded in schema_migrations.
 * Never edit a migration that has run anywhere; add a new one instead.
 * Each entry is a list of single statements (multi-statement queries are disabled).
 */
export const MIGRATIONS: { id: string; statements: string[] }[] = [
  {
    id: '001_init',
    statements: [
      `CREATE TABLE IF NOT EXISTS profile (
        id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
        data JSON NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT profile_single_row CHECK (id = 1)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS projects (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(80) NOT NULL,
        title VARCHAR(120) NOT NULL,
        pillars JSON NOT NULL,
        summary VARCHAR(280) NOT NULL,
        cover JSON NULL,
        mark VARCHAR(40) NOT NULL DEFAULT '',
        stack JSON NOT NULL,
        links JSON NOT NULL,
        featured TINYINT(1) NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 100,
        status ENUM('draft','published') NOT NULL DEFAULT 'draft',
        hidden TINYINT(1) NOT NULL DEFAULT 0,
        source ENUM('manual','github') NOT NULL DEFAULT 'manual',
        repo_id BIGINT UNSIGNED NULL,
        repo JSON NULL,
        case_study JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY projects_slug (slug),
        UNIQUE KEY projects_repo_id (repo_id),
        KEY projects_listing (status, hidden, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS project_slug_history (
        old_slug VARCHAR(80) NOT NULL PRIMARY KEY,
        project_id INT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT slug_history_project FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS messages (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        email VARCHAR(254) NOT NULL,
        intent ENUM('partner','hire','collab','hi') NOT NULL,
        body TEXT NOT NULL,
        source ENUM('form','chat') NOT NULL DEFAULT 'form',
        status ENUM('new','replied','archived') NOT NULL DEFAULT 'new',
        notify_email ENUM('pending','sent','failed','off') NOT NULL DEFAULT 'pending',
        notify_whatsapp ENUM('pending','sent','failed','off') NOT NULL DEFAULT 'pending',
        notify_error VARCHAR(500) NULL,
        ip_hash CHAR(64) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY messages_inbox (status, created_at),
        KEY messages_rate (ip_hash, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS admins (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(254) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        totp_secret_enc VARCHAR(255) NULL,
        totp_enabled TINYINT(1) NOT NULL DEFAULT 0,
        failed_logins INT UNSIGNED NOT NULL DEFAULT 0,
        locked_until TIMESTAMP NULL,
        session_version INT UNSIGNED NOT NULL DEFAULT 1,
        last_login_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY admins_email (email)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
      `CREATE TABLE IF NOT EXISTS settings (
        k VARCHAR(64) NOT NULL PRIMARY KEY,
        v JSON NOT NULL,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    ],
  },
  {
    // Public contact address moves to the domain. Only changes it if it is still the old one.
    id: '002_public_email',
    statements: [
      `UPDATE profile SET data = JSON_SET(data, '$.links.email', 'hello@meetoluwaseyi.com')
       WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.links.email')) = 'shykeys@gmail.com'`,
    ],
  },
  {
    id: '003_telegram_alerts',
    statements: [
      `ALTER TABLE messages ADD COLUMN notify_telegram ENUM('pending','sent','failed','off') NOT NULL DEFAULT 'off' AFTER notify_whatsapp`,
    ],
  },
  {
    // The inbox pages newest-first by id, filtered by status: index (status, id) matches that exactly.
    id: '004_inbox_index',
    statements: [
      'ALTER TABLE messages ADD KEY messages_by_status (status, id)',
      'ALTER TABLE messages DROP KEY messages_inbox',
    ],
  },
  {
    // Oluwaseyi keeps his current employer off the public site. The launch copy is rewritten in place;
    // the final two replacements catch any mention added later in admin. Text REPLACE keeps the JSON
    // valid (the new words have no quotes) and works on MySQL 8 and MariaDB alike.
    id: '005_employer_private',
    statements: [
      `UPDATE profile SET data = ${replaceAll('data', [
        ['I run the WEEX Africa community,', 'I run the Africa community for a global crypto exchange,'],
        ['WEEX · Remote', 'Global crypto exchange · Remote'],
        ['WEEX members, from zero in under a year', 'exchange community members, from zero in under a year'],
        ['Opens the WEEX Africa chat every morning.', 'Opens the community chat every morning.'],
        ['Running the WEEX Africa community', 'Running a crypto exchange’s Africa community'],
        ['weex-community', 'exchange-community'],
        ['weex-safety-bot', 'telegram-safety-bot'],
        ['WEEX Africa', 'the exchange community'],
        ['WEEX', 'a global crypto exchange'],
      ])} WHERE id = 1`,
      `UPDATE projects SET slug = 'exchange-community', title = 'Crypto communities in Africa',
         summary = 'Zero to 25,000+ at a global exchange in under a year, 20,000+ at Gate.io, and over 9,000 members turned into active traders through live classes.'
       WHERE slug = 'weex-community'`,
      `UPDATE projects SET slug = 'telegram-safety-bot', title = 'Telegram Safety Bot',
         summary = 'Replaced paid moderation tools with a free custom bot that keeps a 25,000-member exchange community clear of spam and fake followers.'
       WHERE slug = 'weex-safety-bot'`,
      `UPDATE projects SET title = ${replaceAll('title', [['WEEX', 'a global exchange']])},
         summary = ${replaceAll('summary', [['WEEX', 'a global exchange']])}
       WHERE title LIKE '%WEEX%' OR summary LIKE '%WEEX%'`,
    ],
  },
];

/** Nested REPLACE() calls for a text migration. Values are fixed strings written here, never user input. */
function replaceAll(column: string, pairs: [string, string][]): string {
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;
  return pairs.reduce((expr, [from, to]) => `REPLACE(${expr}, ${q(from)}, ${q(to)})`, column);
}

export async function migrate(db: Db, log: (msg: string) => void = console.log): Promise<string[]> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  const [rows] = await db.query('SELECT id FROM schema_migrations');
  const done = new Set((rows as { id: string }[]).map((r) => r.id));
  const applied: string[] = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    for (const sql of m.statements) await db.query(sql);
    await db.execute('INSERT INTO schema_migrations (id) VALUES (?)', [m.id]);
    log(`applied ${m.id}`);
    applied.push(m.id);
  }
  return applied;
}
