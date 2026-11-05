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
];

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
