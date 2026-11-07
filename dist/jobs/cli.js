import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import mysql from "mysql2/promise";
import { randomBytes, createCipheriv, scrypt, hkdfSync } from "node:crypto";
const MODES = ["playful", "serious"];
const INTENTS = ["partner", "hire", "collab", "hi"];
const PILLARS = ["data", "community", "bd", "ventures", "building"];
z.enum(MODES);
const AppEnvSchema = z.enum(["development", "test", "staging", "production"]);
function stripTags(input) {
  let out = input;
  for (let prev = ""; prev !== out; ) {
    prev = out;
    out = out.replace(/<[^>]*>/g, "");
  }
  return out;
}
function plainText(input) {
  return stripTags(input).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n?/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}
const text = (min, max) => z.string().transform(plainText).pipe(
  z.string().min(min, `Please write at least ${min} characters.`).max(max, `Please keep it under ${max} characters.`)
);
const IntentSchema = z.enum(INTENTS);
z.object({
  name: text(2, 80),
  email: z.string().trim().toLowerCase().pipe(z.email("That email address doesn’t look right.").max(254)),
  intent: IntentSchema,
  message: text(10, 2e3),
  source: z.enum(["form", "chat"]).default("form"),
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot. Humans never see this field, so it must arrive empty. */
  website: z.string().max(0).optional().or(z.literal(""))
});
z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(200),
  /** Required once 2FA is set up; absent only on the very first sign-in, which then enrols 2FA. */
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.").optional().or(z.literal("").transform(() => void 0))
});
z.object({
  token: z.string().min(10).max(500),
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.")
});
const PillarSchema = z.enum(PILLARS);
const SlugSchema = z.string().min(2).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and single hyphens.");
const httpsUrl = z.url({ protocol: /^https$/, error: "Must be an https:// link." }).max(500);
const optionalUrl = httpsUrl.optional().or(z.literal("").transform(() => void 0));
const ImageSchema = z.object({
  id: z.string().min(1).max(300),
  alt: z.string().trim().min(3, "Alt text is required.").max(200)
});
const CaseStudySchema = z.object({
  meta: z.array(z.object({ label: z.string().max(40), value: z.string().max(160) })).max(8).default([]),
  kpis: z.array(
    z.object({
      value: z.string().max(16),
      label: z.string().max(80),
      tone: z.enum(["plain", "warn", "bad"]).default("plain")
    })
  ).max(6).default([]),
  ratings: z.array(
    z.object({
      label: z.string().max(60),
      value: z.number().min(0).max(5),
      tone: z.enum(["good", "warn", "bad"])
    })
  ).max(6).default([]),
  steps: z.array(
    z.object({
      week: z.string().max(20),
      title: z.string().max(80),
      items: z.array(z.string().max(300)).max(6)
    })
  ).max(8).default([]),
  revised: z.array(z.object({ was: z.string().max(300), now: z.string().max(500) })).max(6).default([]),
  recommendations: z.array(z.object({ value: z.string().max(20), title: z.string().max(100), body: z.string().max(300) })).max(8).default([])
});
const ProjectInputSchema = z.object({
  slug: SlugSchema,
  title: z.string().trim().min(2).max(120),
  pillars: z.array(PillarSchema).min(1).max(3),
  summary: text(10, 280),
  cover: ImageSchema.nullable().default(null),
  mark: z.string().max(40).default(""),
  stack: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  links: z.object({ live: optionalUrl, repo: optionalUrl, book: optionalUrl }).default({ live: void 0, repo: void 0, book: void 0 }),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(1e4).default(100),
  status: z.enum(["draft", "published"]).default("draft"),
  hidden: z.boolean().default(false),
  caseStudy: CaseStudySchema.nullable().default(null)
});
const ExperienceSchema = z.object({
  when: z.string().max(40),
  /** Year the role started, used to place it on the "Twelve years, one road" timeline. */
  year: z.number().int().min(1990).max(2100),
  role: z.string().max(80),
  org: z.string().max(80),
  note: z.string().max(500).default(""),
  current: z.boolean().default(false),
  projectSlug: SlugSchema.optional()
});
const ProfileSchema = z.object({
  name: z.string().max(80),
  headline: z.string().max(160),
  bio: z.string().max(2e3),
  photo: ImageSchema,
  links: z.object({
    email: z.email(),
    linkedin: httpsUrl,
    github: httpsUrl,
    x: httpsUrl,
    telegram: httpsUrl,
    cv: optionalUrl,
    booking: optionalUrl
  }),
  experience: z.array(ExperienceSchema).max(30),
  tagline: z.string().max(200).default(""),
  education: z.array(z.object({ title: z.string().max(120), org: z.string().max(120), year: z.string().max(20) })).max(10),
  certificates: z.array(z.object({ title: z.string().max(160), org: z.string().max(80), year: z.string().max(20) })).max(30),
  languages: z.array(z.object({ name: z.string().max(40), level: z.string().max(40) })).max(10),
  stats: z.array(z.object({ value: z.string().max(16), label: z.string().max(80) })).max(8),
  programs: z.array(z.object({ name: z.string().max(80), cadence: z.string().max(40), note: z.string().max(200) })).max(12),
  now: z.array(z.string().max(200)).max(8),
  writing: z.array(
    z.object({
      kicker: z.string().max(60),
      title: z.string().max(120),
      /** An https link, or a page on this site such as /work/olist-ecommerce-bi. */
      link: z.union([
        httpsUrl,
        z.string().regex(/^\/[a-z0-9/-]*$/, "Use https:// or a path on this site.")
      ]),
      linkLabel: z.string().max(60).default(""),
      posts: z.array(
        z.object({
          kicker: z.string().max(30),
          date: z.string().max(30),
          title: z.string().max(160),
          desc: z.string().max(300),
          url: httpsUrl
        })
      ).max(20)
    })
  ).max(10),
  book: z.object({ title: z.string().max(160), url: optionalUrl }).optional()
});
const optional = z.string().trim().min(1).optional();
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: AppEnvSchema.optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(3e3),
  SITE_URL: z.url().optional(),
  DATABASE_URL: z.string().regex(/^mysql:\/\/.+/, "must look like mysql://user:password@localhost:3306/database").optional(),
  SESSION_SECRET: z.string().min(32, "must be at least 32 characters").optional(),
  IP_HASH_SALT: z.string().min(16, "must be at least 16 characters").optional(),
  ADMIN_EMAIL: z.email().optional(),
  /** First sign-in only: creates the admin when none exists. Remove it once 2FA is set up. */
  ADMIN_INITIAL_PASSWORD: z.string().min(14, "must be at least 14 characters").optional(),
  ADMIN_PATH: z.string().regex(/^\/[a-z0-9-]{4,40}$/, "must look like /fixoluwaseyi").default("/fixoluwaseyi"),
  STAGING_USER: z.string().min(1).default("preview"),
  STAGING_PASSWORD: z.string().min(12, "must be at least 12 characters").optional(),
  CLOUDINARY_CLOUD: optional,
  CLOUDINARY_KEY: optional,
  CLOUDINARY_SECRET: optional,
  RESEND_API_KEY: optional,
  MAIL_FROM: optional,
  NOTIFY_EMAIL: z.email().optional(),
  /** Optional copy of every new-message alert email (e.g. hello@meetoluwaseyi.com). */
  NOTIFY_CC: z.email().optional(),
  TELEGRAM_BOT_TOKEN: z.string().regex(/^\d+:[A-Za-z0-9_-]{30,}$/, "must look like 123456:ABC… from @BotFather").optional(),
  TELEGRAM_CHAT_ID: z.string().regex(/^-?\d+$/, "must be a number").optional(),
  WHATSAPP_TOKEN: optional,
  WHATSAPP_PHONE_ID: optional,
  WHATSAPP_TO: optional,
  WHATSAPP_TEMPLATE: z.string().default("new_message"),
  TURNSTILE_SITE_KEY: optional,
  TURNSTILE_SECRET: optional,
  GITHUB_USER: z.string().default("shykeys-data"),
  GITHUB_TOKEN: optional,
  CLOUDFLARE_ZONE_ID: optional,
  CLOUDFLARE_API_TOKEN: optional,
  PLAUSIBLE_DOMAIN: optional
}).transform((env) => ({
  ...env,
  APP_ENV: env.APP_ENV ?? (env.NODE_ENV === "production" ? "production" : env.NODE_ENV)
})).superRefine((env, ctx) => {
  const deployed = env.APP_ENV === "staging" || env.APP_ENV === "production";
  if (deployed) {
    for (const key of [
      "SITE_URL",
      "DATABASE_URL",
      "SESSION_SECRET",
      "IP_HASH_SALT",
      "ADMIN_EMAIL"
    ]) {
      if (!env[key])
        ctx.addIssue({ code: "custom", path: [key], message: `is required in ${env.APP_ENV}` });
    }
    if (env.NODE_ENV !== "production") {
      ctx.addIssue({
        code: "custom",
        path: ["NODE_ENV"],
        message: `must be "production" when APP_ENV is ${env.APP_ENV}`
      });
    }
  }
  if (env.APP_ENV === "staging" && !env.STAGING_PASSWORD) {
    ctx.addIssue({
      code: "custom",
      path: ["STAGING_PASSWORD"],
      message: "is required on staging (the site is password-protected)"
    });
  }
});
const DEV_DEFAULTS = {
  SITE_URL: "http://localhost:3000",
  DATABASE_URL: "mysql://root:root@127.0.0.1:3306/meetoluwaseyi",
  SESSION_SECRET: "dev-only-secret-change-me-dev-only-secret",
  IP_HASH_SALT: "dev-only-salt-1234",
  ADMIN_EMAIL: "admin@localhost.test"
};
class ConfigError extends Error {
  constructor(problems) {
    super(`Invalid configuration:
  - ${problems.join("\n  - ")}`);
    this.problems = problems;
    this.name = "ConfigError";
  }
}
function loadConfig(source = process.env) {
  const env = Object.fromEntries(
    Object.entries(source).filter(([, v]) => v !== void 0 && v.trim() !== "")
  );
  const parsed = schema.safeParse(env);
  if (!parsed.success) {
    throw new ConfigError(parsed.error.issues.map((i) => `${i.path.join(".") || "env"} ${i.message}`));
  }
  const c = parsed.data;
  const local = c.APP_ENV === "development" || c.APP_ENV === "test";
  const pick = (k) => c[k] ?? (local ? DEV_DEFAULTS[k] : "");
  return {
    ...c,
    SITE_URL: pick("SITE_URL").replace(/\/$/, ""),
    DATABASE_URL: pick("DATABASE_URL"),
    SESSION_SECRET: pick("SESSION_SECRET"),
    IP_HASH_SALT: pick("IP_HASH_SALT"),
    ADMIN_EMAIL: pick("ADMIN_EMAIL"),
    isDev: c.APP_ENV === "development",
    isStaging: c.APP_ENV === "staging",
    isProd: c.APP_ENV === "production"
  };
}
function loadDotEnv(path = ".env", target = process.env) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!m || line.trimStart().startsWith("#")) continue;
    const [, key = "", raw = ""] = m;
    const value = raw.replace(/^(['"])(.*)\1$/, "$2");
    if (target[key] === void 0) target[key] = value;
  }
}
function createDb(url) {
  return mysql.createPool({
    uri: url,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 50,
    charset: "utf8mb4",
    timezone: "Z",
    dateStrings: false,
    // Multiple statements stay off, so one query can never smuggle in a second.
    multipleStatements: false,
    connectTimeout: 1e4
  });
}
function json(value, fallback) {
  if (value === null || value === void 0) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}
const MIGRATIONS = [
  {
    id: "001_init",
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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
    ]
  },
  {
    // Public contact address moves to the domain. Only changes it if it is still the old one.
    id: "002_public_email",
    statements: [
      `UPDATE profile SET data = JSON_SET(data, '$.links.email', 'hello@meetoluwaseyi.com')
       WHERE JSON_UNQUOTE(JSON_EXTRACT(data, '$.links.email')) = 'shykeys@gmail.com'`
    ]
  },
  {
    id: "003_telegram_alerts",
    statements: [
      `ALTER TABLE messages ADD COLUMN notify_telegram ENUM('pending','sent','failed','off') NOT NULL DEFAULT 'off' AFTER notify_whatsapp`
    ]
  },
  {
    // The inbox pages newest-first by id, filtered by status: index (status, id) matches that exactly.
    id: "004_inbox_index",
    statements: [
      "ALTER TABLE messages ADD KEY messages_by_status (status, id)",
      "ALTER TABLE messages DROP KEY messages_inbox"
    ]
  }
];
async function migrate(db, log = console.log) {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(100) NOT NULL PRIMARY KEY,
      applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
  );
  const [rows] = await db.query("SELECT id FROM schema_migrations");
  const done = new Set(rows.map((r) => r.id));
  const applied = [];
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    for (const sql of m.statements) await db.query(sql);
    await db.execute("INSERT INTO schema_migrations (id) VALUES (?)", [m.id]);
    log(`applied ${m.id}`);
    applied.push(m.id);
  }
  return applied;
}
const LI = (id) => `https://www.linkedin.com/feed/update/urn:li:activity:${id}/`;
const BOOK = "https://drive.google.com/file/d/1MGE0tIrHogphMomjjWxtnbU8be1UBK72/view";
const PROFILE = {
  name: "Oluwaseyi Oshunwusi",
  headline: "Community manager, business developer and data analyst. Building for the web since 2014.",
  tagline: "I grow communities, close partnerships, and turn data into decisions.",
  bio: "I run the WEEX Africa community, and before that I grew Gate.io’s Nigeria and Africa community. I’ve built websites since 2014, I analyse data in public, and I’m building Korrect Cars, a car marketplace for Lagos.",
  photo: { id: "/img/headshot.webp", alt: "Oluwaseyi Oshunwusi smiling, in a white shirt" },
  links: {
    email: "hello@meetoluwaseyi.com",
    linkedin: "https://www.linkedin.com/in/oluwaseyi-o-601915b5",
    github: "https://github.com/shykeys-data",
    x: "https://x.com/shykeys101",
    telegram: "https://t.me/oluwamichael",
    cv: void 0,
    booking: void 0
  },
  experience: [
    {
      when: "Dec 2024 – now",
      year: 2024,
      role: "Community Manager (Africa)",
      org: "WEEX · Remote",
      current: true,
      projectSlug: "weex-community",
      note: "Zero to 25,000+ members in under 12 months; 7,000+ turned into active futures traders through live lectures. AMAs on X Spaces and Telegram, KOL partnerships, newsletters and campaign visuals."
    },
    {
      when: "2024 – now",
      year: 2024,
      role: "Crypto Trader",
      org: "Shykeys · Self-employed",
      current: true,
      note: "Active spot and futures trader, so I talk to users as a peer, not a marketer."
    },
    {
      when: "Nov 2021 – Mar 2024",
      year: 2021,
      role: "Web3 Community Manager & BD",
      org: "Gate.io · Remote",
      current: false,
      projectSlug: "weex-community",
      note: "Grew a 20,000+ Nigeria/Africa community and helped launch Gate.io P2P there. First Nigerian meetup (2022), 30+ X Spaces with 1,000+ live listeners, monthly classes that turned 2,000–3,000+ members into traders, campus programmes with LASU and Yabatech."
    },
    {
      when: "2022 – 2023",
      year: 2022,
      role: "Team Lead Manager",
      org: "Highlights Corner",
      current: false,
      note: "Led the team across WordPress and social media."
    },
    {
      when: "2020 – 2023",
      year: 2020,
      role: "Web Developer & Digital Marketer",
      org: "Amaget Online Store · Freelance",
      current: false,
      note: "Google Ads, SEO and SEM, newsletters, landing-page A/B tests and site content."
    },
    {
      when: "2020 – 2021",
      year: 2020,
      role: "Administrative Assistant, Operations",
      org: "Sixteen by Nine Creatives",
      current: false,
      note: "Deputised as HR and operations lead for 8 staff; coordinated music-video production and kept the books."
    },
    {
      when: "2016 – 2018",
      year: 2016,
      role: "Web Developer & Digital Marketer",
      org: "Blessing Computers / TechnocratNG",
      current: false,
      note: "Ran Technocrat operations, built client sites in HTML, CSS, JavaScript and WordPress, and ran Google Ads and SEO."
    },
    {
      when: "2015 – 2016",
      year: 2015,
      role: "Senior Web Developer",
      org: "Lantern Books",
      current: false,
      note: "Started the company’s digital marketing and ran its website and IT."
    },
    {
      when: "2014",
      year: 2014,
      role: "Web Developer",
      org: "HCS Properties",
      current: false,
      note: "Built the site and ran customer service and social media."
    }
  ],
  education: [
    { title: "OND, Computer Science", org: "Lagos City Polytechnic", year: "2010" },
    {
      title: "Diploma in Software Development",
      org: "British Computer Society",
      year: "Coursework completed"
    },
    { title: "MERN Stack Professional Course", org: "Udemy", year: "2024" }
  ],
  certificates: [
    "Data Analyst Capstone",
    "Data Visualization with Python",
    "Data Analysis with Python",
    "Databases & SQL",
    "Python Project for Data Science",
    "Python for Data Science & AI",
    "Dashboards with Excel & Cognos",
    "Excel Basics"
  ].map((title) => ({ title, org: "IBM", year: "" })),
  languages: [
    { name: "English", level: "Fluent" },
    { name: "Yoruba", level: "Fluent" },
    { name: "Hausa", level: "Conversational" }
  ],
  stats: [
    { value: "25k+", label: "WEEX members, from zero in under a year" },
    { value: "7k+", label: "members turned futures traders" },
    { value: "20k+", label: "Gate.io Nigeria/Africa community" },
    { value: "12 yrs", label: "building for the web, since 2014" }
  ],
  programs: [
    { name: "7AM market brief", cadence: "Daily", note: "Opens the WEEX Africa chat every morning." },
    { name: "Live trading classes", cadence: "Weekly", note: "Futures basics to risk management." },
    { name: "Community games", cadence: "Weekly", note: "Quiz polls, Last Commenter, Predict-to-Win." }
  ],
  now: ["Running the WEEX Africa community", "Building Korrect Cars", "Analysing data in public"],
  writing: [
    {
      kicker: "Series · 5 posts",
      title: "Olist BI, built in public",
      link: "/work/olist-ecommerce-bi",
      linkLabel: "Read the case study",
      posts: [
        {
          kicker: "Week 4",
          date: "21 Oct 2026",
          title: "Late parcels, early reviews: what 99,441 orders told me",
          desc: "Power BI for the first time: a four-page executive report and four recommendations.",
          url: LI("7518612076886601728")
        },
        {
          kicker: "Week 3",
          date: "16 Oct 2026",
          title: "A live dashboard anyone can click through",
          desc: "Filters by month, state and category, and every number matches the notebooks.",
          url: LI("7516800291485155328")
        },
        {
          kicker: "Week 2.1",
          date: "8 Oct 2026",
          title: "A finding isn’t a finding until you’ve tried to break it",
          desc: "Seven checks against my own conclusions. Two findings didn’t survive.",
          url: LI("7513901864749486080")
        },
        {
          kicker: "Week 2",
          date: "8 Oct 2026",
          title: "A late delivery doesn’t just cost a star",
          desc: "Cohort retention, RFM segments and hypothesis tests on 95k customers.",
          url: LI("7513892885935812608")
        },
        {
          kicker: "Week 1",
          date: "5 Oct 2026",
          title: "99,441 orders, and only 3.1% came back",
          desc: "Nine messy tables into a clean star schema, with 14 automated checks.",
          url: LI("7512846673832812544")
        }
      ]
    },
    {
      kicker: "Series · Growth Without Reach",
      title: "Five economies, one question",
      link: BOOK,
      linkLabel: "Read the free book",
      posts: [
        {
          kicker: "Episode 3",
          date: "20 Jul 2026",
          title: "Calm numbers are not good numbers",
          desc: "South Africa: the best-behaved economy of the five, and the most stuck.",
          url: LI("7484906641071484928")
        },
        {
          kicker: "Episode 2",
          date: "16 Jul 2026",
          title: "The closest thing to a comeback story",
          desc: "Ghana: the worst inflation spike of the five, and the only line that bends back down.",
          url: LI("7483418183438278657")
        }
      ]
    }
  ],
  book: { title: "Growth Without Reach", url: BOOK }
};
const PROJECTS = [
  {
    slug: "olist-ecommerce-bi",
    title: "Olist E-commerce BI",
    pillars: ["data"],
    summary: "Why customers didn’t come back: late parcels drop ratings from 4.3★ to under 2★, and only 2.2% ever order again. Four weeks, 99,441 real orders, four recommendations.",
    cover: null,
    mark: "",
    stack: ["Python", "SQL", "Streamlit", "Power BI"],
    links: {
      live: "https://olist-bi-shykeys.streamlit.app",
      repo: "https://github.com/shykeys-data/olist-ecommerce-bi"
    },
    featured: true,
    sortOrder: 10,
    status: "published",
    hidden: false,
    caseStudy: {
      meta: [
        { label: "Data", value: "99,441 orders · 96,096 customers · 9 linked tables" },
        { label: "Tools", value: "Python (pandas, SQL), Streamlit, Power BI" },
        { label: "Built", value: "Star schema, live dashboard, 4-page executive report" },
        {
          label: "Links",
          value: "Live dashboard at olist-bi-shykeys.streamlit.app, code and report on GitHub"
        }
      ],
      kpis: [
        { value: "R$15.4M", label: "Revenue from delivered orders", tone: "plain" },
        { value: "R$159.83", label: "Average order value", tone: "plain" },
        { value: "6.8%", label: "Orders that arrived late", tone: "warn" },
        { value: "4.16/5", label: "Average review score", tone: "plain" },
        { value: "2.2%", label: "Customers who ever came back", tone: "bad" }
      ],
      ratings: [
        { label: "On time", value: 4.3, tone: "good" },
        { label: "Late, reviewed after delivery", value: 3.5, tone: "warn" },
        { label: "8+ days late", value: 1.7, tone: "bad" }
      ],
      steps: [
        {
          week: "Week 1",
          title: "Clean & model",
          items: [
            "Turned 9 messy, linked tables into a star schema: 2 fact tables and 4 dimensions.",
            "Found the customer ID changes with every order; the real key showed 96,096 actual customers.",
            "14 automated checks so no row is lost and revenue reconciles to the cent."
          ]
        },
        {
          week: "Week 2",
          title: "Analyse",
          items: [
            "A monthly KPI layer in SQL, with written definitions for every metric.",
            "Cohort retention for 12 months and RFM segmentation of 95k customers into 7 groups.",
            "Hypothesis tests (Mann-Whitney U, chi-square), so findings are tested, not eyeballed."
          ]
        },
        {
          week: "Week 2.1",
          title: "Try to break it",
          items: [
            "Ran 7 checks designed to break my own conclusions.",
            "Checked same-day split orders, equal observation windows, cohort timing and when reviews were written.",
            "Two findings were revised in public; the delivery story got stronger."
          ]
        },
        {
          week: "Week 3",
          title: "Live dashboard",
          items: [
            "An interactive Streamlit dashboard anyone can click through.",
            "Filters by month, state and product category; ratings by delivery timing.",
            "Every number uses the same rules as the quality-checked notebooks."
          ]
        },
        {
          week: "Week 4",
          title: "Executive report",
          items: [
            "First time in Power BI: the Python star schema connected with 5 relationships.",
            "20+ DAX measures across 4 pages: Overview, Delivery & reviews, Customers, Recommendations.",
            "Caught a DAX blank-counting bug (77% vs 74%) by checking every number against the notebooks."
          ]
        }
      ],
      revised: [
        {
          was: "Repeat buyers come back within 28 days.",
          now: "28% of “repeat customers” had split one trip into several orders. Counting real return visits, the typical wait is 74 days."
        },
        {
          was: "A late first order makes customers less likely to return.",
          now: "Late orders cluster in certain months. Comparing customers who joined at the same time, the effect isn’t statistically significant."
        }
      ],
      recommendations: [
        {
          value: "4.3★ → <2★",
          title: "Set honest delivery dates by region",
          body: "Late parcels drop ratings from about 4.3 stars to under 2."
        },
        {
          value: "74%",
          title: "Ask for reviews after delivery",
          body: "Most late-order reviews were written before the parcel arrived."
        },
        {
          value: "2.2%",
          title: "Build a second-purchase programme",
          body: "Almost nobody comes back, so the next sale is the biggest opportunity."
        },
        {
          value: "62.5%",
          title: "Protect delivery in SP, RJ and MG",
          body: "Three states bring in most of the revenue."
        }
      ]
    }
  },
  {
    slug: "korrect-cars",
    title: "Korrect Cars",
    pillars: ["ventures", "bd"],
    summary: "A car marketplace built for Lagos buyers: inspected cars, Pay Small Small over 6 to 48 months, and car-for-car swaps. Live at korrectcars.com.",
    cover: null,
    mark: "Buy. Sell. Swap.",
    stack: ["Node.js", "React", "MySQL"],
    links: { live: "https://www.korrectcars.com", repo: "https://github.com/shykeys-data/korrectcars-app" },
    featured: true,
    sortOrder: 20,
    status: "published",
    hidden: false,
    caseStudy: null
  },
  {
    slug: "growth-without-reach",
    title: "Growth Without Reach",
    pillars: ["data"],
    summary: "Five African economies, 2020 to 2024, on World Bank open data: a LinkedIn series and a free digital book.",
    cover: null,
    mark: "5 economies",
    stack: ["Python", "World Bank data"],
    links: { book: BOOK },
    featured: true,
    sortOrder: 30,
    status: "published",
    hidden: false,
    caseStudy: null
  },
  {
    slug: "weex-community",
    title: "WEEX Africa & Gate.io Nigeria",
    pillars: ["community", "bd"],
    summary: "Zero to 25,000+ at WEEX in under a year, 20,000+ at Gate.io, and over 9,000 members turned into active traders through live classes.",
    cover: null,
    mark: "45,000+",
    stack: ["Telegram", "X Spaces", "KOLs"],
    links: {},
    featured: false,
    sortOrder: 40,
    status: "published",
    hidden: false,
    caseStudy: null
  },
  {
    slug: "weex-safety-bot",
    title: "WEEX Africa Safety Bot",
    pillars: ["community", "ventures"],
    summary: "Replaced paid moderation tools with a free custom bot that keeps the WEEX Africa group clear of spam and fake followers.",
    cover: null,
    mark: "Safety Bot",
    stack: ["Python", "Telegram"],
    links: {},
    featured: false,
    sortOrder: 50,
    status: "published",
    hidden: false,
    caseStudy: null
  },
  {
    slug: "ibm-data-analyst-capstone",
    title: "IBM Data Analyst Capstone",
    pillars: ["data"],
    summary: "The 2024 Stack Overflow survey, 65,437 developers: JavaScript leads job postings and PostgreSQL keeps growing.",
    cover: null,
    mark: "Dev survey",
    stack: ["Python", "Cognos"],
    links: { repo: "https://github.com/shykeys-data/ibm-data-analyst-capstone" },
    featured: false,
    sortOrder: 60,
    status: "published",
    hidden: false,
    caseStudy: null
  },
  {
    slug: "ratedesk",
    title: "RateDesk",
    pillars: ["ventures"],
    summary: "A bureau de change rate-comparison and booking platform for Nigerians, with clearly labelled indicative rates. In development.",
    cover: null,
    mark: "₦ ⇄ $",
    stack: ["MERN", "Fintech"],
    links: {},
    featured: false,
    sortOrder: 70,
    status: "published",
    hidden: false,
    caseStudy: null
  }
];
class HttpError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}
const conflict = (message) => new HttpError(409, "conflict", message);
async function saveProfile(db, profile) {
  const data = ProfileSchema.parse(profile);
  await db.execute(
    "INSERT INTO profile (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
    [JSON.stringify(data)]
  );
}
function values(p) {
  return [
    p.slug,
    p.title,
    JSON.stringify(p.pillars),
    p.summary,
    p.cover ? JSON.stringify(p.cover) : null,
    p.mark,
    JSON.stringify(p.stack),
    JSON.stringify(p.links),
    p.featured ? 1 : 0,
    p.sortOrder,
    p.status,
    p.hidden ? 1 : 0,
    p.caseStudy ? JSON.stringify(p.caseStudy) : null
  ];
}
function isDuplicate(err) {
  return typeof err === "object" && err !== null && err.code === "ER_DUP_ENTRY";
}
async function slugTakenByHistory(db, slug, exceptId) {
  const [rows] = await db.execute(
    "SELECT project_id FROM project_slug_history WHERE old_slug = ? LIMIT 1",
    [slug]
  );
  return Boolean(rows[0] && Number(rows[0].project_id) !== exceptId);
}
async function createProject(db, input, source = "manual") {
  const p = ProjectInputSchema.parse(input);
  if (await slugTakenByHistory(db, p.slug))
    throw conflict("That address was used before by another project.");
  try {
    const [res] = await db.execute(
      `INSERT INTO projects (slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, case_study, source)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [...values(p), source]
    );
    return res.insertId;
  } catch (err) {
    if (isDuplicate(err)) throw conflict("Another project already uses that address (slug).");
    throw err;
  }
}
async function getSetting(db, key, fallback) {
  const [rows] = await db.execute("SELECT v FROM settings WHERE k = ?", [key]);
  return rows[0] ? json(rows[0].v, fallback) : fallback;
}
async function setSetting(db, key, value) {
  await db.execute("INSERT INTO settings (k, v) VALUES (?, ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", [
    key,
    JSON.stringify(value)
  ]);
}
async function seed(db) {
  await saveProfile(db, ProfileSchema.parse(PROFILE));
  let created = 0;
  let kept = 0;
  for (const raw of PROJECTS) {
    const p = ProjectInputSchema.parse(raw);
    const [rows] = await db.execute("SELECT id FROM projects WHERE slug = ?", [p.slug]);
    if (rows[0]) {
      kept++;
      continue;
    }
    await db.execute(
      `INSERT INTO projects (slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, case_study)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        p.slug,
        p.title,
        JSON.stringify(p.pillars),
        p.summary,
        p.cover ? JSON.stringify(p.cover) : null,
        p.mark,
        JSON.stringify(p.stack),
        JSON.stringify(p.links),
        p.featured ? 1 : 0,
        p.sortOrder,
        p.status,
        p.hidden ? 1 : 0,
        p.caseStudy ? JSON.stringify(p.caseStudy) : null
      ]
    );
    created++;
  }
  return { profile: "saved", projectsCreated: created, projectsKept: kept };
}
const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const IPV4 = /\b(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}\b/g;
function mask(text2) {
  return text2.replace(EMAIL, "$1***@$2").replace(IPV4, "$1.$2.x.x");
}
function scrub(value) {
  if (typeof value === "string") return mask(value);
  if (value instanceof Error)
    return {
      name: value.name,
      message: mask(value.message),
      stack: value.stack?.split("\n").slice(0, 6).join("\n")
    };
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = /password|secret|token|totp|cookie|authorization/i.test(k) ? "[redacted]" : scrub(v);
    }
    return out;
  }
  return value;
}
function createLogger(minLevel = "info", write = (l) => process.stdout.write(l + "\n")) {
  const order = ["debug", "info", "warn", "error"];
  const at = order.indexOf(minLevel);
  const emit = (level) => (msg, data) => {
    if (order.indexOf(level) < at) return;
    write(
      JSON.stringify({
        t: (/* @__PURE__ */ new Date()).toISOString(),
        level,
        msg: mask(msg),
        ...data ? scrub(data) : {}
      })
    );
  };
  return { debug: emit("debug"), info: emit("info"), warn: emit("warn"), error: emit("error") };
}
const SCRYPT = { N: 2 ** 15, r: 8, p: 1, keylen: 64, maxmem: 64 * 1024 * 1024 };
function scryptAsync(password, salt, N, r, p, keylen) {
  return new Promise(
    (resolve2, reject) => scrypt(
      password,
      salt,
      keylen,
      { N, r, p, maxmem: SCRYPT.maxmem },
      (err, key) => err ? reject(err) : resolve2(key)
    )
  );
}
async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, SCRYPT.N, SCRYPT.r, SCRYPT.p, SCRYPT.keylen);
  return ["scrypt", SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString("base64url"), key.toString("base64url")].join(
    "$"
  );
}
"scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + Buffer.alloc(64).toString("base64url");
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function base32Encode(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = value << 8 | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[value >>> bits - 5 & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[value << 5 - bits & 31];
  return out;
}
function newTotpSecret() {
  return base32Encode(randomBytes(20));
}
function totpUri(secretB32, account, issuer = "meetoluwaseyi.com") {
  const label = encodeURIComponent(`${issuer}:${account}`);
  return `otpauth://totp/${label}?secret=${secretB32}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;
}
function deriveKey(secret, purpose) {
  return Buffer.from(hkdfSync("sha256", secret, "meetoluwaseyi", purpose, 32));
}
function encrypt(plain, key) {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), body].map((b) => b.toString("base64url")).join(".");
}
async function fetchWithTimeout(ctx, url, init = {}, ms = 1e4) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    return await ctx.fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(t);
  }
}
const keys = (secret) => ({
  session: deriveKey(secret, "session"),
  totp: deriveKey(secret, "totp"),
  setup: deriveKey(secret, "totp-setup")
});
async function upsertAdmin(ctx, email, password) {
  if (password.length < 14) throw new Error("Use a password of at least 14 characters.");
  const totpSecret = newTotpSecret();
  const hash = await hashPassword(password);
  const enc = encrypt(totpSecret, keys(ctx.config.SESSION_SECRET).totp);
  await ctx.db.execute(
    `INSERT INTO admins (email, password_hash, totp_secret_enc, totp_enabled) VALUES (?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), totp_secret_enc = VALUES(totp_secret_enc),
       totp_enabled = 1, failed_logins = 0, locked_until = NULL, session_version = session_version + 1`,
    [email.trim().toLowerCase(), hash, enc]
  );
  return { totpSecret };
}
const PILLAR_BY_TOPIC = {
  data: "data",
  "data-analysis": "data",
  bi: "data",
  community: "community",
  telegram: "community",
  bd: "bd",
  venture: "ventures",
  ventures: "ventures",
  startup: "ventures"
};
function repoToSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "project";
}
function repoToTitle(name) {
  return name.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function shouldSkip(r, user) {
  return r.fork || r.archived || r.name.toLowerCase() === user.toLowerCase() || (r.topics ?? []).includes("hide-from-site");
}
async function syncGithub(ctx) {
  const user = ctx.config.GITHUB_USER;
  const etag = await getSetting(ctx.db, "github_etag", null);
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "meetoluwaseyi-sync",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (ctx.config.GITHUB_TOKEN) headers.Authorization = `Bearer ${ctx.config.GITHUB_TOKEN}`;
  if (etag) headers["If-None-Match"] = etag;
  const result = { ok: false, created: 0, updated: 0, skipped: 0 };
  try {
    const res = await fetchWithTimeout(
      ctx,
      `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&type=owner&sort=pushed`,
      { headers }
    );
    if (res.status === 304) {
      await setSetting(ctx.db, "github_last_ok", { at: (/* @__PURE__ */ new Date()).toISOString() });
      return { ...result, ok: true, notModified: true };
    }
    if (!res.ok) throw new Error(`GitHub answered ${res.status}`);
    const repos = await res.json();
    for (const r of repos) {
      if (shouldSkip(r, user)) {
        result.skipped++;
        continue;
      }
      const facts = {
        id: r.id,
        fullName: r.full_name,
        languages: r.language ? [r.language] : [],
        topics: r.topics ?? [],
        stars: r.stargazers_count,
        pushedAt: r.pushed_at,
        syncedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
      const [linked] = await ctx.db.execute(
        `SELECT id FROM projects WHERE repo_id = ? OR JSON_UNQUOTE(JSON_EXTRACT(links, '$.repo')) = ? LIMIT 1`,
        [r.id, r.html_url]
      );
      if (linked[0]) {
        await ctx.db.execute(
          `UPDATE projects SET repo_id = ?, repo = ?, summary = IF(summary = '', ?, summary) WHERE id = ?`,
          [r.id, JSON.stringify(facts), (r.description ?? "").slice(0, 280), linked[0].id]
        );
        result.updated++;
        continue;
      }
      const pillar = (r.topics ?? []).map((t) => PILLAR_BY_TOPIC[t]).find(Boolean) ?? "building";
      const description = (r.description ?? "").trim();
      let slug = repoToSlug(r.name);
      const [taken] = await ctx.db.execute("SELECT id FROM projects WHERE slug = ?", [slug]);
      if (taken[0]) slug = `${slug}-${r.id}`.slice(0, 80);
      const id = await createProject(
        ctx.db,
        {
          slug,
          title: repoToTitle(r.name),
          pillars: [pillar],
          summary: description.length >= 10 ? description.slice(0, 280) : `${repoToTitle(r.name)}, a project on GitHub.`,
          stack: [...facts.languages, ...facts.topics].slice(0, 8),
          links: { repo: r.html_url, live: r.homepage?.startsWith("https://") ? r.homepage : void 0 },
          status: "published",
          sortOrder: 500
        },
        "github"
      );
      await ctx.db.execute("UPDATE projects SET repo_id = ?, repo = ? WHERE id = ?", [
        r.id,
        JSON.stringify(facts),
        id
      ]);
      result.created++;
    }
    const newEtag = res.headers.get("etag");
    if (newEtag) await setSetting(ctx.db, "github_etag", newEtag);
    await setSetting(ctx.db, "github_last_ok", { at: (/* @__PURE__ */ new Date()).toISOString(), ...result, ok: true });
    return { ...result, ok: true };
  } catch (err) {
    const error = err.message;
    ctx.log.warn("github sync failed", { error });
    await setSetting(ctx.db, "github_last_error", { at: (/* @__PURE__ */ new Date()).toISOString(), error });
    return { ...result, error };
  }
}
async function purgeOldMessages(ctx) {
  const [res] = await ctx.db.execute(
    "DELETE FROM messages WHERE created_at < (UTC_TIMESTAMP() - INTERVAL 24 MONTH)"
  );
  return res.affectedRows;
}
async function run() {
  const [cmd = "help", ...args] = process.argv.slice(2);
  if (process.env.NODE_ENV !== "production") loadDotEnv(resolve(process.cwd(), ".env"));
  const config = loadConfig();
  const log = createLogger("info");
  const db = createDb(config.DATABASE_URL);
  const ctx = { db, config, log, fetch: globalThis.fetch };
  try {
    switch (cmd) {
      case "check":
        console.log(`config ok for ${config.APP_ENV}`);
        break;
      case "migrate":
        console.log((await migrate(db)).length ? "migrations applied" : "database already up to date");
        break;
      case "seed":
        if (config.isProd && !args.includes("--force"))
          throw new Error("Refusing to seed production without --force.");
        await migrate(db);
        console.log(await seed(db));
        break;
      case "create-admin": {
        await migrate(db, () => {
        });
        const rl = createInterface({ input: process.stdin, output: process.stdout });
        const email = (args[0] ?? await rl.question("Admin email: ")).trim();
        const password = process.env.ADMIN_PASSWORD ?? await rl.question("Password (14+ characters): ");
        rl.close();
        const { totpSecret } = await upsertAdmin(ctx, email, password);
        console.log("\nAdmin saved. Add this to your authenticator app (shown once):");
        console.log(`  secret: ${totpSecret}`);
        console.log(`  link:   ${totpUri(totpSecret, email)}`);
        break;
      }
      case "github-sync":
        console.log(JSON.stringify(await syncGithub(ctx)));
        break;
      case "daily": {
        const purged = await purgeOldMessages(ctx);
        const sync = await syncGithub(ctx);
        console.log(JSON.stringify({ purgedMessages: purged, github: sync }));
        break;
      }
      default:
        console.log(
          "Commands: check | migrate | seed [--force] | create-admin [email] | github-sync | daily"
        );
    }
  } finally {
    await db.end();
  }
}
run().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
//# sourceMappingURL=cli.js.map
