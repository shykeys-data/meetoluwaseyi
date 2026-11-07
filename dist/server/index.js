import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync, readFileSync } from "node:fs";
import { z } from "zod";
import mysql from "mysql2/promise";
import { randomBytes, scrypt, timingSafeEqual, createHmac, hkdfSync, createDecipheriv, createCipheriv, createHash, randomUUID } from "node:crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { jsxs, Fragment, jsx } from "react/jsx-runtime";
import { renderToString } from "react-dom/server";
import { Fragment as Fragment$1, Component, useState, useRef } from "react";
const MODES = ["playful", "serious"];
function parseMode(value) {
  return value === "playful" || value === "serious" ? value : null;
}
const INTENTS$1 = ["partner", "hire", "collab", "hi"];
const PILLARS$1 = ["data", "community", "bd", "ventures", "building"];
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
const IntentSchema = z.enum(INTENTS$1);
const ContactInputSchema = z.object({
  name: text(2, 80),
  email: z.string().trim().toLowerCase().pipe(z.email("That email address doesn’t look right.").max(254)),
  intent: IntentSchema,
  message: text(10, 2e3),
  source: z.enum(["form", "chat"]).default("form"),
  turnstileToken: z.string().max(4096).optional(),
  /** Honeypot. Humans never see this field, so it must arrive empty. */
  website: z.string().max(0).optional().or(z.literal(""))
});
const LoginInputSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  password: z.string().min(12).max(200),
  /** Required once 2FA is set up; absent only on the very first sign-in, which then enrols 2FA. */
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.").optional().or(z.literal("").transform(() => void 0))
});
const TotpConfirmSchema = z.object({
  token: z.string().min(10).max(500),
  totp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.")
});
const PillarSchema = z.enum(PILLARS$1);
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
const schemas = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  AppEnvSchema,
  CaseStudySchema,
  ContactInputSchema,
  ExperienceSchema,
  INTENTS: INTENTS$1,
  ImageSchema,
  IntentSchema,
  LoginInputSchema,
  MODES,
  PILLARS: PILLARS$1,
  PillarSchema,
  ProfileSchema,
  ProjectInputSchema,
  SlugSchema,
  TotpConfirmSchema,
  parseMode,
  plainText
}, Symbol.toStringTag, { value: "Module" }));
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
async function ping(db) {
  try {
    await db.query("SELECT 1");
    return true;
  } catch {
    return false;
  }
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
const badRequest = (message, fields) => new HttpError(400, "validation_failed", message, fields);
const unauthorized = (message = "Please sign in.") => new HttpError(401, "unauthorized", message);
const forbidden = (message = "Not allowed.") => new HttpError(403, "forbidden", message);
const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
const conflict = (message) => new HttpError(409, "conflict", message);
const tooMany = (message = "Too many requests. Please wait a little and try again.") => new HttpError(429, "rate_limited", message);
function parse(schema2, input) {
  const r = schema2.safeParse(input);
  if (r.success) return r.data;
  const fields = {};
  for (const issue of r.error.issues) {
    const key = issue.path.join(".") || "_";
    fields[key] ??= issue.message;
  }
  throw badRequest("Some fields need another look.", fields);
}
const handler = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};
async function getProfile(db) {
  const [rows] = await db.execute("SELECT data FROM profile WHERE id = 1");
  const row = rows[0];
  if (!row) return null;
  const parsed = ProfileSchema.safeParse(json(row.data, {}));
  return parsed.success ? parsed.data : null;
}
async function saveProfile(db, profile) {
  const data = ProfileSchema.parse(profile);
  await db.execute(
    "INSERT INTO profile (id, data) VALUES (1, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)",
    [JSON.stringify(data)]
  );
}
const COLS = "id, slug, title, pillars, summary, cover, mark, stack, links, featured, sort_order, status, hidden, source, repo, case_study, updated_at";
function toAdmin(r) {
  return {
    id: Number(r.id),
    slug: String(r.slug),
    title: String(r.title),
    pillars: json(r.pillars, []),
    summary: String(r.summary),
    cover: json(r.cover, null),
    mark: String(r.mark ?? ""),
    stack: json(r.stack, []),
    links: json(r.links, {}),
    featured: Boolean(r.featured),
    sortOrder: Number(r.sort_order),
    status: r.status === "published" ? "published" : "draft",
    hidden: Boolean(r.hidden),
    caseStudy: json(r.case_study, null),
    source: r.source === "github" ? "github" : "manual",
    repo: json(r.repo, null),
    updatedAt: new Date(r.updated_at).toISOString()
  };
}
function toPublic(p) {
  return {
    slug: p.slug,
    title: p.title,
    pillars: p.pillars,
    summary: p.summary,
    cover: p.cover,
    mark: p.mark,
    stack: p.stack,
    links: Object.fromEntries(
      Object.entries(p.links).filter(([, v]) => Boolean(v))
    ),
    featured: p.featured,
    caseStudy: p.caseStudy
  };
}
async function listPublishedProjects(db) {
  const [rows] = await db.execute(
    `SELECT ${COLS} FROM projects WHERE status = 'published' AND hidden = 0 ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(toAdmin).map(toPublic);
}
async function findProjectBySlug(db, slug) {
  const [rows] = await db.execute(
    `SELECT ${COLS} FROM projects WHERE slug = ? AND status = 'published' AND hidden = 0 LIMIT 1`,
    [slug]
  );
  if (rows[0]) return { project: toPublic(toAdmin(rows[0])) };
  const [moved] = await db.execute(
    `SELECT p.slug FROM project_slug_history h JOIN projects p ON p.id = h.project_id
     WHERE h.old_slug = ? AND p.status = 'published' AND p.hidden = 0 LIMIT 1`,
    [slug]
  );
  return moved[0] ? { redirectTo: String(moved[0].slug) } : null;
}
async function listAllProjects(db) {
  const [rows] = await db.execute(
    `SELECT ${COLS} FROM projects ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(toAdmin);
}
async function getProjectById(db, id) {
  const [rows] = await db.execute(`SELECT ${COLS} FROM projects WHERE id = ?`, [id]);
  if (!rows[0]) throw notFound("That project doesn’t exist.");
  return toAdmin(rows[0]);
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
async function updateProject(db, id, input) {
  const p = ProjectInputSchema.parse(input);
  const current = await getProjectById(db, id);
  if (p.slug !== current.slug && await slugTakenByHistory(db, p.slug, id)) {
    throw conflict("That address was used before by another project.");
  }
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE projects SET slug = ?, title = ?, pillars = ?, summary = ?, cover = ?, mark = ?, stack = ?, links = ?,
       featured = ?, sort_order = ?, status = ?, hidden = ?, case_study = ? WHERE id = ?`,
      [...values(p), id]
    );
    if (p.slug !== current.slug) {
      await conn.execute("DELETE FROM project_slug_history WHERE old_slug = ?", [p.slug]);
      await conn.execute(
        "INSERT INTO project_slug_history (old_slug, project_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE project_id = VALUES(project_id)",
        [current.slug, id]
      );
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    if (isDuplicate(err)) throw conflict("Another project already uses that address (slug).");
    throw err;
  } finally {
    conn.release();
  }
}
async function reorderProjects(db, ids) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (const [i, id] of ids.entries()) {
      await conn.execute("UPDATE projects SET sort_order = ? WHERE id = ?", [(i + 1) * 10, id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
async function deleteProject(db, id) {
  const [res] = await db.execute("DELETE FROM projects WHERE id = ?", [id]);
  if (res.affectedRows === 0) throw notFound("That project doesn’t exist.");
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
async function verifyPassword(password, stored) {
  const [alg, n, r, p, saltB64, hashB64] = stored.split("$");
  if (alg !== "scrypt" || !n || !r || !p || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, "base64url");
  const key = await scryptAsync(
    password,
    Buffer.from(saltB64, "base64url"),
    Number(n),
    Number(r),
    Number(p),
    expected.length
  );
  return timingSafeEqual(key, expected);
}
const DUMMY_HASH = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA$" + Buffer.alloc(64).toString("base64url");
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
function base32Decode(input) {
  const clean = input.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of clean) {
    const idx = B32.indexOf(ch);
    if (idx === -1) throw new Error("Invalid base32");
    value = value << 5 | idx;
    bits += 5;
    if (bits >= 8) {
      out.push(value >>> bits - 8 & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}
function newTotpSecret() {
  return base32Encode(randomBytes(20));
}
function totpAt(secretB32, counter, digits = 6) {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", base32Decode(secretB32)).update(msg).digest();
  const offset = (mac[mac.length - 1] ?? 0) & 15;
  const code = (mac.readUInt32BE(offset) & 2147483647) % 10 ** digits;
  return code.toString().padStart(digits, "0");
}
function verifyTotp(secretB32, code, now = Date.now()) {
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(now / 1e3 / 30);
  let ok2 = false;
  for (const d of [-1, 0, 1]) {
    const expected = Buffer.from(totpAt(secretB32, counter + d));
    if (timingSafeEqual(expected, Buffer.from(code))) ok2 = true;
  }
  return ok2;
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
function decrypt(boxed, key) {
  const [iv, tag, body] = boxed.split(".").map((p) => Buffer.from(p, "base64url"));
  if (!iv || !tag || !body) throw new Error("Malformed ciphertext");
  const d = createDecipheriv("aes-256-gcm", key, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(body), d.final()]).toString("utf8");
}
function sign(value, key) {
  return `${value}.${createHmac("sha256", key).update(value).digest("base64url")}`;
}
function unsign(signed, key) {
  const i = signed.lastIndexOf(".");
  if (i <= 0) return null;
  const value = signed.slice(0, i);
  const mac = Buffer.from(signed.slice(i + 1));
  const expected = Buffer.from(createHmac("sha256", key).update(value).digest("base64url"));
  return mac.length === expected.length && timingSafeEqual(mac, expected) ? value : null;
}
function safeEqual(a, b) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}
function hashIp(ip, salt) {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("base64url");
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
const INTENT_LABEL = {
  partner: "Partnership",
  hire: "Hiring",
  collab: "Collaboration",
  hi: "Just saying hi"
};
async function withRetry(fn, tries = 3, baseMs = 800) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (i < tries - 1) await new Promise((r) => setTimeout(r, baseMs * 2 ** i));
    }
  }
  throw last;
}
function escapeHtml(s) {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
  );
}
async function sendEmail(ctx, to, subject, text2, replyTo, cc) {
  const key = ctx.config.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not set");
  const res = await fetchWithTimeout(ctx, "https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: ctx.config.MAIL_FROM ?? "meetoluwaseyi.com <site@meetoluwaseyi.com>",
      to: [to],
      subject,
      text: text2,
      html: `<pre style="font:14px/1.5 system-ui,sans-serif;white-space:pre-wrap">${escapeHtml(text2)}</pre>`,
      ...replyTo ? { reply_to: replyTo } : {},
      ...cc && cc !== to ? { cc: [cc] } : {}
    })
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
async function sendWhatsApp(ctx, params) {
  const {
    WHATSAPP_TOKEN: token,
    WHATSAPP_PHONE_ID: phoneId,
    WHATSAPP_TO: to,
    WHATSAPP_TEMPLATE: template
  } = ctx.config;
  if (!token || !phoneId || !to) throw new Error("WhatsApp not configured");
  const res = await fetchWithTimeout(
    ctx,
    `https://graph.facebook.com/v21.0/${encodeURIComponent(phoneId)}/messages`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: "en" },
          components: [
            { type: "body", parameters: params.map((text2) => ({ type: "text", text: text2.slice(0, 1e3) })) }
          ]
        }
      })
    }
  );
  if (!res.ok) throw new Error(`WhatsApp ${res.status}: ${(await res.text()).slice(0, 200)}`);
}
async function sendTelegram(ctx, text2) {
  const { TELEGRAM_BOT_TOKEN: token, TELEGRAM_CHAT_ID: chatId } = ctx.config;
  if (!token || !chatId) throw new Error("Telegram not configured");
  const res = await fetchWithTimeout(ctx, `https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: text2.slice(0, 4e3), disable_web_page_preview: true })
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}
async function notifyNewMessage(ctx, m) {
  const label = INTENT_LABEL[m.intent] ?? m.intent;
  const preview = m.message.length > 200 ? m.message.slice(0, 200) + "…" : m.message;
  const errors = [];
  const results = {};
  if (ctx.config.RESEND_API_KEY) {
    try {
      const to = ctx.config.NOTIFY_EMAIL ?? ctx.config.ADMIN_EMAIL;
      await withRetry(
        () => sendEmail(
          ctx,
          to,
          `New message: ${label} from ${m.name}`,
          `${m.name} <${m.email}>
Picked: ${label}
Via: ${m.source}

${m.message}`,
          m.email,
          ctx.config.NOTIFY_CC
        )
      );
      results.email = "sent";
    } catch (err) {
      results.email = "failed";
      errors.push(`email: ${err.message}`);
    }
  }
  if (ctx.config.WHATSAPP_TOKEN) {
    try {
      await withRetry(() => sendWhatsApp(ctx, [m.name, label, preview]));
      results.whatsapp = "sent";
    } catch (err) {
      results.whatsapp = "failed";
      errors.push(`whatsapp: ${err.message}`);
    }
  }
  if (ctx.config.TELEGRAM_BOT_TOKEN) {
    try {
      await withRetry(
        () => sendTelegram(
          ctx,
          `New message on meetoluwaseyi.com

From: ${m.name} (${m.email})
Picked: ${label}
Via: ${m.source}

${preview}

Reply by email, or see it in the admin inbox.`
        )
      );
      results.telegram = "sent";
    } catch (err) {
      results.telegram = "failed";
      errors.push(`telegram: ${err.message}`);
    }
  }
  if (!results.email && !results.whatsapp && !results.telegram) return;
  await ctx.db.execute(
    `UPDATE messages SET notify_email = COALESCE(?, notify_email), notify_whatsapp = COALESCE(?, notify_whatsapp),
       notify_telegram = COALESCE(?, notify_telegram), notify_error = ? WHERE id = ?`,
    [
      results.email ?? null,
      results.whatsapp ?? null,
      results.telegram ?? null,
      errors.length ? errors.join(" | ").slice(0, 500) : null,
      m.id
    ]
  );
  if (errors.length) ctx.log.warn("alert failed", { id: m.id, errors });
}
const SESSION_COOKIE = "mo_sess";
const SESSION_DAYS = 7;
const MAX_FAILS = 5;
const LOCK_MINUTES = 15;
const keys = (secret) => ({
  session: deriveKey(secret, "session"),
  totp: deriveKey(secret, "totp"),
  setup: deriveKey(secret, "totp-setup")
});
function encodeSession(s, secret) {
  const payload = Buffer.from(JSON.stringify(s)).toString("base64url");
  return sign(payload, keys(secret).session);
}
function decodeSession(cookie, secret, now = Date.now()) {
  if (!cookie) return null;
  const payload = unsign(cookie, keys(secret).session);
  if (!payload) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (typeof s.adminId !== "number" || typeof s.version !== "number" || typeof s.csrf !== "string")
      return null;
    return s.expires > now ? s : null;
  } catch {
    return null;
  }
}
async function loadAdmin(ctx, s) {
  if (!s) return null;
  const [rows] = await ctx.db.execute(
    "SELECT id, email, session_version FROM admins WHERE id = ?",
    [s.adminId]
  );
  const r = rows[0];
  if (!r || Number(r.session_version) !== s.version) return null;
  return { id: Number(r.id), email: String(r.email) };
}
const GENERIC = "That email, password or code isn’t right.";
async function login(ctx, raw) {
  const input = parse(LoginInputSchema, raw);
  const [rows] = await ctx.db.execute(
    "SELECT id, email, password_hash, totp_secret_enc, totp_enabled, failed_logins, locked_until, session_version FROM admins WHERE email = ?",
    [input.email]
  );
  const a = rows[0];
  if (!a) {
    await verifyPassword(input.password, DUMMY_HASH);
    ctx.log.warn("login failed", { reason: "unknown_email" });
    throw new HttpError(401, "invalid_login", GENERIC);
  }
  if (a.locked_until && new Date(a.locked_until).getTime() > Date.now()) {
    ctx.log.warn("login blocked: locked", { adminId: a.id });
    throw new HttpError(423, "locked", `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`);
  }
  const passOk = await verifyPassword(input.password, String(a.password_hash));
  const enrolled = Boolean(a.totp_enabled) && Boolean(a.totp_secret_enc);
  let codeOk = false;
  if (enrolled && input.totp) {
    try {
      codeOk = verifyTotp(
        decrypt(String(a.totp_secret_enc), keys(ctx.config.SESSION_SECRET).totp),
        input.totp
      );
    } catch {
      codeOk = false;
    }
  }
  if (passOk && !enrolled) {
    const secret = newTotpSecret();
    await ctx.db.execute("UPDATE admins SET totp_secret_enc = ?, failed_logins = 0 WHERE id = ?", [
      encrypt(secret, keys(ctx.config.SESSION_SECRET).totp),
      a.id
    ]);
    const token = sign(`${a.id}.${Date.now() + 10 * 6e4}`, keys(ctx.config.SESSION_SECRET).setup);
    ctx.log.info("2fa enrolment started", { adminId: a.id });
    return { kind: "setup", token, secret, uri: totpUri(secret, String(a.email)) };
  }
  if (!passOk || !codeOk) {
    const fails = Number(a.failed_logins) + 1;
    await ctx.db.execute(
      `UPDATE admins SET failed_logins = ?, locked_until = ${fails >= MAX_FAILS ? `(UTC_TIMESTAMP() + INTERVAL ${LOCK_MINUTES} MINUTE)` : "locked_until"} WHERE id = ?`,
      [fails >= MAX_FAILS ? 0 : fails, a.id]
    );
    ctx.log.warn("login failed", { adminId: a.id, fails, locked: fails >= MAX_FAILS });
    if (fails >= MAX_FAILS)
      throw new HttpError(423, "locked", `Too many attempts. Try again in ${LOCK_MINUTES} minutes.`);
    throw new HttpError(401, "invalid_login", GENERIC);
  }
  await ctx.db.execute(
    "UPDATE admins SET failed_logins = 0, locked_until = NULL, last_login_at = UTC_TIMESTAMP() WHERE id = ?",
    [a.id]
  );
  ctx.log.info("login ok", { adminId: a.id });
  sendLoginAlert(ctx, String(a.email));
  return { kind: "session", ...issueSession(ctx, Number(a.id), Number(a.session_version)) };
}
function issueSession(ctx, adminId, version) {
  const session = {
    adminId,
    version,
    expires: Date.now() + SESSION_DAYS * 864e5,
    csrf: randomToken(24)
  };
  return { cookie: encodeSession(session, ctx.config.SESSION_SECRET), session };
}
function sendLoginAlert(ctx, email) {
  if (!ctx.config.RESEND_API_KEY) return;
  void sendEmail(
    ctx,
    email,
    "New sign-in to meetoluwaseyi.com admin",
    `Someone signed in to the admin at ${(/* @__PURE__ */ new Date()).toUTCString()}.
If this wasn’t you, change the password now: it ends every other session.`
  ).catch((err) => ctx.log.warn("login alert email failed", { err }));
}
async function confirmTotp(ctx, raw) {
  const input = parse(TotpConfirmSchema, raw);
  const payload = unsign(input.token, keys(ctx.config.SESSION_SECRET).setup);
  const [idStr, expStr] = (payload ?? "").split(".");
  if (!payload || !idStr || Number(expStr) < Date.now()) {
    throw new HttpError(401, "setup_expired", "That setup link expired. Sign in again to restart.");
  }
  const [rows] = await ctx.db.execute(
    "SELECT id, email, totp_secret_enc, totp_enabled, session_version FROM admins WHERE id = ?",
    [Number(idStr)]
  );
  const a = rows[0];
  if (!a || a.totp_enabled || !a.totp_secret_enc)
    throw new HttpError(401, "setup_expired", "Sign in again to restart.");
  const ok2 = verifyTotp(decrypt(String(a.totp_secret_enc), keys(ctx.config.SESSION_SECRET).totp), input.totp);
  if (!ok2)
    throw new HttpError(
      401,
      "invalid_login",
      "That code isn’t right. Check the time on your phone and try the newest code."
    );
  await ctx.db.execute("UPDATE admins SET totp_enabled = 1, last_login_at = UTC_TIMESTAMP() WHERE id = ?", [
    a.id
  ]);
  ctx.log.info("2fa enrolled", { adminId: a.id });
  sendLoginAlert(ctx, String(a.email));
  return issueSession(ctx, Number(a.id), Number(a.session_version));
}
async function bootstrapAdmin(ctx) {
  const pass = ctx.config.ADMIN_INITIAL_PASSWORD;
  if (!pass) return false;
  const [rows] = await ctx.db.execute("SELECT COUNT(*) AS n FROM admins");
  if (Number(rows[0]?.n ?? 0) > 0) return false;
  await ctx.db.execute("INSERT INTO admins (email, password_hash) VALUES (?, ?)", [
    ctx.config.ADMIN_EMAIL.trim().toLowerCase(),
    await hashPassword(pass)
  ]);
  ctx.log.info("admin created from ADMIN_INITIAL_PASSWORD; sign in to set up 2FA, then remove that variable");
  return true;
}
async function endAllSessions(ctx, adminId) {
  await ctx.db.execute("UPDATE admins SET session_version = session_version + 1 WHERE id = ?", [adminId]);
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
const LIMITS = { perDay: 20 };
async function verifyTurnstile(ctx, token, ip) {
  const secret = ctx.config.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetchWithTimeout(
      ctx,
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }) },
      8e3
    );
    const body = await res.json();
    return body.success === true;
  } catch (err) {
    ctx.log.warn("turnstile check failed", { err });
    return false;
  }
}
async function submitContact(ctx, raw, ip) {
  if (raw && typeof raw === "object" && "website" in raw && String(raw.website ?? "") !== "") {
    ctx.log.info("contact honeypot tripped");
    return { ignored: true };
  }
  const input = parse(ContactInputSchema, raw);
  if (!await verifyTurnstile(ctx, input.turnstileToken, ip)) {
    throw new HttpError(400, "captcha_failed", "We couldn’t confirm you’re human. Please try again.");
  }
  const ipHash = hashIp(ip, ctx.config.IP_HASH_SALT);
  const [count] = await ctx.db.execute(
    "SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND created_at > (UTC_TIMESTAMP() - INTERVAL 1 DAY)",
    [ipHash]
  );
  if (Number(count[0]?.n ?? 0) >= LIMITS.perDay) throw tooMany();
  const [res] = await ctx.db.execute(
    `INSERT INTO messages (name, email, intent, body, source, ip_hash, notify_email, notify_whatsapp, notify_telegram)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.name,
      input.email,
      input.intent,
      input.message,
      input.source,
      ipHash,
      ctx.config.RESEND_API_KEY ? "pending" : "off",
      ctx.config.WHATSAPP_TOKEN ? "pending" : "off",
      ctx.config.TELEGRAM_BOT_TOKEN && ctx.config.TELEGRAM_CHAT_ID ? "pending" : "off"
    ]
  );
  const id = res.insertId;
  ctx.log.info("contact message saved", { id, intent: input.intent, source: input.source });
  void notifyNewMessage(ctx, { id, ...input }).catch((err) => ctx.log.error("notify crashed", { id, err }));
  return { id };
}
function toRow(r) {
  return {
    id: Number(r.id),
    name: String(r.name),
    email: String(r.email),
    intent: r.intent,
    body: String(r.body),
    source: r.source,
    status: r.status,
    notifyEmail: String(r.notify_email),
    notifyWhatsapp: String(r.notify_whatsapp),
    notifyTelegram: String(r.notify_telegram ?? "off"),
    notifyError: r.notify_error ? String(r.notify_error) : null,
    createdAt: new Date(r.created_at).toISOString()
  };
}
const MESSAGE_COLS = "id, name, email, intent, body, source, status, notify_email, notify_whatsapp, notify_telegram, notify_error, created_at";
async function listMessages(ctx, opts = {}) {
  const where = [];
  const params = [];
  if (opts.status && ["new", "replied", "archived"].includes(opts.status)) {
    where.push("status = ?");
    params.push(opts.status);
  }
  if (opts.intent && INTENTS$1.includes(opts.intent)) {
    where.push("intent = ?");
    params.push(opts.intent);
  }
  if (opts.before && Number.isInteger(opts.before) && opts.before > 0) {
    where.push("id < ?");
    params.push(opts.before);
  }
  const limit = Math.min(Math.max(Math.trunc(opts.limit ?? 50), 1), 1e3);
  const [rows] = await ctx.db.execute(
    `SELECT ${MESSAGE_COLS} FROM messages ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY id DESC LIMIT ${limit + 1}`,
    params
  );
  const more = rows.length > limit;
  const page = (more ? rows.slice(0, limit) : rows).map(toRow);
  return { rows: page, next: more ? page[page.length - 1].id : null };
}
async function setMessageStatus(ctx, id, status) {
  if (!["new", "replied", "archived"].includes(status))
    throw badRequest("Unknown status.", { status: "Unknown status." });
  const [res] = await ctx.db.execute("UPDATE messages SET status = ? WHERE id = ?", [
    status,
    id
  ]);
  if (res.affectedRows === 0) throw notFound("That message doesn’t exist.");
}
async function countNewMessages(ctx) {
  const [rows] = await ctx.db.execute(
    "SELECT COUNT(*) AS n FROM messages WHERE status = 'new'"
  );
  return Number(rows[0]?.n ?? 0);
}
function toCsv(rows) {
  const cell = (v) => {
    const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const head = ["id", "date", "name", "email", "intent", "status", "message"];
  const lines = rows.map(
    (r) => [String(r.id), r.createdAt, r.name, r.email, r.intent, r.status, r.body].map(cell).join(",")
  );
  return [head.join(","), ...lines].join("\r\n") + "\r\n";
}
const UPLOAD_RULES = {
  folder: "meetoluwaseyi",
  formats: "jpg,png,webp,avif",
  maxBytes: 5 * 1024 * 1024
};
function signCloudinaryUpload(ctx, now = Math.floor(Date.now() / 1e3)) {
  const { CLOUDINARY_CLOUD: cloud, CLOUDINARY_KEY: apiKey, CLOUDINARY_SECRET: secret } = ctx.config;
  if (!cloud || !apiKey || !secret) return null;
  const params = {
    allowed_formats: UPLOAD_RULES.formats,
    folder: UPLOAD_RULES.folder,
    timestamp: String(now)
  };
  const toSign = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  const signature = createHash("sha1").update(toSign + secret).digest("hex");
  return { cloud, apiKey, signature, maxBytes: UPLOAD_RULES.maxBytes, ...params };
}
async function purgeUrls(ctx, paths) {
  const { CLOUDFLARE_ZONE_ID: zone, CLOUDFLARE_API_TOKEN: token, SITE_URL: site } = ctx.config;
  if (!zone || !token || paths.length === 0) return;
  try {
    const res = await fetchWithTimeout(
      ctx,
      `https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ files: [...new Set(paths)].map((p) => site + p) })
      }
    );
    if (!res.ok) ctx.log.warn("cloudflare purge failed", { status: res.status });
  } catch (err) {
    ctx.log.warn("cloudflare purge failed", { err });
  }
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
function readCookies(req) {
  const out = /* @__PURE__ */ Object.create(null);
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k || Object.hasOwn(out, k)) continue;
    try {
      out[k] = decodeURIComponent(part.slice(i + 1).trim());
    } catch {
    }
  }
  return out;
}
function setCookie(res, name, value, o) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${o.path ?? "/"}`,
    `SameSite=${o.sameSite ?? "Lax"}`
  ];
  if (o.maxAge !== void 0) parts.push(`Max-Age=${o.maxAge}`);
  if (o.httpOnly) parts.push("HttpOnly");
  if (o.secure) parts.push("Secure");
  res.append("Set-Cookie", parts.join("; "));
}
const BOTS = /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|twitterbot|linkedin|embedly|preview|lighthouse|headless/i;
const isBot = (ua) => !ua || BOTS.test(ua);
const ok = (res, data, status = 200) => res.status(status).json({ data });
const limiter = (windowMs, limit) => rateLimit({
  windowMs,
  limit,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_req, _res, next) => next(tooMany())
});
const IdParam = z.coerce.number().int().positive();
function apiRouter(ctx) {
  const r = express.Router();
  const secure = !ctx.config.isDev;
  r.get(
    "/profile",
    handler(async (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      const profile = await getProfile(ctx.db);
      if (!profile) throw notFound();
      ok(res, profile);
    })
  );
  r.get(
    "/projects",
    handler(async (_req, res) => {
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      ok(res, await listPublishedProjects(ctx.db));
    })
  );
  r.get(
    "/projects/:slug",
    handler(async (req, res) => {
      const found = await findProjectBySlug(ctx.db, String(req.params.slug));
      if (!found) throw notFound();
      if ("redirectTo" in found) return res.redirect(301, `/api/v1/projects/${found.redirectTo}`);
      res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300, stale-while-revalidate=600");
      ok(res, found.project);
    })
  );
  r.post(
    "/contact",
    limiter(15 * 6e4, 5),
    handler(async (req, res) => {
      const result = await submitContact(ctx, req.body, req.ip ?? "0.0.0.0");
      void result;
      ok(res, { received: true }, 202);
    })
  );
  const loginLimit = limiter(15 * 6e4, 5);
  const startSession = (res, cookie, csrf) => {
    setCookie(res, SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure,
      sameSite: "Strict",
      maxAge: SESSION_DAYS * 86400
    });
    ok(res, { csrf });
  };
  r.post(
    "/auth/login",
    loginLimit,
    handler(async (req, res) => {
      const result = await login(ctx, req.body);
      if (result.kind === "setup")
        return ok(res, { setup: { token: result.token, secret: result.secret, uri: result.uri } });
      startSession(res, result.cookie, result.session.csrf);
    })
  );
  r.post(
    "/auth/totp/confirm",
    loginLimit,
    handler(async (req, res) => {
      const { cookie, session } = await confirmTotp(ctx, req.body);
      startSession(res, cookie, session.csrf);
    })
  );
  r.use("/auth/me", adminGate(ctx));
  r.get(
    "/auth/me",
    (_req, res) => ok(res, { email: res.locals.admin.email, csrf: res.locals.session.csrf })
  );
  r.post(
    "/auth/logout",
    adminGate(ctx),
    handler(async (_req, res) => {
      await endAllSessions(ctx, res.locals.admin.id);
      setCookie(res, SESSION_COOKIE, "", { httpOnly: true, secure, sameSite: "Strict", maxAge: 0 });
      ok(res, { signedOut: true });
    })
  );
  const a = express.Router();
  a.use(adminGate(ctx));
  a.get(
    "/dashboard",
    handler(async (_req, res) => {
      ok(res, {
        newMessages: await countNewMessages(ctx),
        githubLastOk: await getSetting(ctx.db, "github_last_ok", null),
        githubLastError: await getSetting(ctx.db, "github_last_error", null),
        dbOk: await ping(ctx.db)
      });
    })
  );
  a.get(
    "/profile",
    handler(async (_req, res) => ok(res, await getProfile(ctx.db)))
  );
  a.patch(
    "/profile",
    handler(async (req, res) => {
      const profile = parse(ProfileSchema, req.body);
      await saveProfile(ctx.db, profile);
      await purgeUrls(ctx, ["/", "/about", "/writing", "/llms.txt"]);
      ctx.log.info("profile updated", { adminId: res.locals.admin.id });
      ok(res, profile);
    })
  );
  a.get(
    "/projects",
    handler(async (_req, res) => ok(res, await listAllProjects(ctx.db)))
  );
  a.post(
    "/projects",
    handler(async (req, res) => {
      const id = await createProject(ctx.db, req.body);
      const p = await getProjectById(ctx.db, id);
      await purgeUrls(ctx, ["/", "/work", `/work/${p.slug}`, "/sitemap.xml"]);
      ok(res, p, 201);
    })
  );
  a.patch(
    "/projects/:id",
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const before = await getProjectById(ctx.db, id);
      await updateProject(ctx.db, id, req.body);
      const p = await getProjectById(ctx.db, id);
      await purgeUrls(ctx, ["/", "/work", `/work/${before.slug}`, `/work/${p.slug}`, "/sitemap.xml"]);
      ok(res, p);
    })
  );
  a.post(
    "/projects/reorder",
    handler(async (req, res) => {
      const ids = parse(z.object({ ids: z.array(z.number().int().positive()).max(500) }), req.body).ids;
      await reorderProjects(ctx.db, ids);
      await purgeUrls(ctx, ["/", "/work"]);
      ok(res, { reordered: ids.length });
    })
  );
  a.delete(
    "/projects/:id",
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const p = await getProjectById(ctx.db, id);
      await deleteProject(ctx.db, id);
      await purgeUrls(ctx, ["/", "/work", `/work/${p.slug}`, "/sitemap.xml"]);
      ok(res, { deleted: id });
    })
  );
  const MessagesQuery = z.object({
    status: z.enum(["new", "replied", "archived"]).optional(),
    intent: z.enum(INTENTS$1).optional(),
    before: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(50),
    format: z.enum(["json", "csv"]).default("json")
  });
  a.get(
    "/messages",
    handler(async (req, res) => {
      const q = parse(MessagesQuery, req.query);
      if (q.format === "csv") {
        const { rows } = await listMessages(ctx, { status: q.status, intent: q.intent, limit: 1e3 });
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", 'attachment; filename="messages.csv"');
        return res.send(toCsv(rows));
      }
      const page = await listMessages(ctx, q);
      res.json({ data: page.rows, page: { next: page.next } });
    })
  );
  a.patch(
    "/messages/:id",
    handler(async (req, res) => {
      const id = parse(IdParam, req.params.id);
      const { status } = parse(z.object({ status: z.enum(["new", "replied", "archived"]) }), req.body);
      await setMessageStatus(ctx, id, status);
      ok(res, { id, status });
    })
  );
  a.post(
    "/upload",
    handler(async (_req, res) => {
      const signed = signCloudinaryUpload(ctx);
      if (!signed) throw notFound("Image uploads aren’t set up yet (Cloudinary keys missing).");
      ok(res, signed);
    })
  );
  a.post(
    "/github/sync",
    limiter(6e4, 3),
    handler(async (_req, res) => {
      const result = await syncGithub(ctx);
      if (result.created || result.updated) await purgeUrls(ctx, ["/", "/work", "/sitemap.xml"]);
      ok(res, result);
    })
  );
  r.use("/admin", a);
  r.use((_req, _res, next) => next(notFound("No such endpoint.")));
  return r;
}
function adminGate(ctx) {
  return (req, res, next) => {
    void (async () => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      const session = decodeSession(readCookies(req)[SESSION_COOKIE], ctx.config.SESSION_SECRET);
      const who = await loadAdmin(ctx, session);
      if (!session || !who) throw unauthorized();
      if (req.method !== "GET" && req.method !== "HEAD") {
        const sent = String(req.get("x-csrf-token") ?? "");
        if (!sent || !safeEqual(sent, session.csrf)) {
          ctx.log.warn("csrf rejected", { adminId: who.id, path: req.path });
          throw forbidden("Your session expired. Reload the page and try again.");
        }
      }
      res.locals.admin = who;
      res.locals.session = session;
    })().then(() => next(), next);
  };
}
const esc = (s) => s.replace(
  /[&<>"']/g,
  (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c
);
const safeJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
function person(p, site) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: p.name,
    url: site,
    image: site + p.photo.id,
    jobTitle: "Community Manager (Africa)",
    worksFor: { "@type": "Organization", name: "WEEX" },
    description: p.headline,
    knowsLanguage: p.languages.map((l) => l.name),
    sameAs: [p.links.linkedin, p.links.github, p.links.x, p.links.telegram]
  };
}
function crumbs(site, items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: site + path
    }))
  };
}
function creativeWork(pr, p, site) {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: pr.title,
    description: pr.summary,
    url: `${site}/work/${pr.slug}`,
    author: { "@type": "Person", name: p.name, url: site },
    keywords: pr.stack.join(", "),
    ...pr.links.repo ? { codeRepository: pr.links.repo } : {}
  };
}
function headFor(page, site) {
  const p = page.profile;
  const first = p.name.split(" ")[0] ?? p.name;
  const base = {
    canonical: site + (page.path === "/" ? "/" : page.path),
    ogImage: `${site}/og/default.png`,
    jsonLd: []
  };
  switch (page.route) {
    case "home":
      return {
        ...base,
        canonical: site + "/",
        title: `${p.name}: community, business development and data`,
        description: `${p.tagline} ${first} runs the WEEX Africa community, builds Korrect Cars and analyses data in public.`.slice(
          0,
          160
        ),
        jsonLd: [
          person(p, site),
          { "@context": "https://schema.org", "@type": "WebSite", name: p.name, url: site }
        ]
      };
    case "work":
      return {
        ...base,
        title: `Work · ${p.name}`,
        description: "Communities grown, a car marketplace built, and data analysed in public. Every project, with links to the code and the live work.",
        jsonLd: []
      };
    case "project": {
      const pr = page.project;
      if (!pr) break;
      return {
        ...base,
        title: `${pr.title} · ${p.name}`,
        description: pr.summary.slice(0, 160),
        jsonLd: [
          creativeWork(pr, p, site),
          crumbs(site, [
            ["Home", "/"],
            ["Work", "/work"],
            [pr.title, `/work/${pr.slug}`]
          ])
        ]
      };
    }
    case "about":
      return {
        ...base,
        title: `About · ${p.name}`,
        description: `Twelve years on the web: ${p.headline}`.slice(0, 160),
        jsonLd: [person(p, site)]
      };
    case "writing":
      return {
        ...base,
        title: `Writing · ${p.name}`,
        description: "Notes from the work: the Olist BI series built in public, and Growth Without Reach on five African economies.",
        jsonLd: []
      };
    case "contact":
      return {
        ...base,
        title: `Contact · ${p.name}`,
        description: `Partnerships, hiring, collaborations or just hello. ${first} reads every message.`,
        jsonLd: []
      };
    case "thanks":
      return {
        ...base,
        title: `Message sent · ${p.name}`,
        description: "Thanks for your message.",
        noindex: true,
        jsonLd: []
      };
    case "privacy":
      return {
        ...base,
        title: `Privacy · ${p.name}`,
        description: "What this site collects, why, and how long it keeps it.",
        jsonLd: []
      };
  }
  return {
    ...base,
    title: `Page not found · ${p.name}`,
    description: "That page doesn’t exist.",
    noindex: true,
    jsonLd: []
  };
}
function headHtml(h, nonce) {
  return [
    `<title>${esc(h.title)}</title>`,
    `<meta name="description" content="${esc(h.description)}">`,
    `<link rel="canonical" href="${esc(h.canonical)}">`,
    h.noindex ? '<meta name="robots" content="noindex">' : "",
    `<meta property="og:type" content="website">`,
    `<meta property="og:title" content="${esc(h.title)}">`,
    `<meta property="og:description" content="${esc(h.description)}">`,
    `<meta property="og:url" content="${esc(h.canonical)}">`,
    `<meta property="og:image" content="${esc(h.ogImage)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:site" content="@shykeys101">`,
    ...h.jsonLd.map((j) => `<script type="application/ld+json" nonce="${nonce}">${safeJson(j)}<\/script>`)
  ].filter(Boolean).join("\n");
}
function sitemapXml(site, projects) {
  const paths = [
    "/",
    "/work",
    "/about",
    "/writing",
    "/contact",
    "/privacy",
    ...projects.filter((p) => p.caseStudy).map((p) => `/work/${p.slug}`)
  ];
  const urls = paths.map((p) => `  <url><loc>${esc(site + p)}</loc></url>`).join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
function robotsTxt(site, allow, adminPath) {
  if (!allow) return "User-agent: *\nDisallow: /\n";
  return `User-agent: *
Allow: /
Disallow: /api/
Disallow: ${adminPath}

Sitemap: ${site}/sitemap.xml
`;
}
function llmsTxt(site, p, projects) {
  const lines = [
    `# ${p.name}`,
    "",
    `> ${p.headline}`,
    "",
    p.bio,
    "",
    "## Roles",
    ...p.experience.slice(0, 4).map((e) => `- ${e.role}, ${e.org} (${e.when})`),
    "",
    "## Projects",
    ...projects.map((pr) => `- [${pr.title}](${site}/work/${pr.slug}): ${pr.summary}`),
    "",
    "## Pages",
    `- [Work](${site}/work)`,
    `- [About](${site}/about)`,
    `- [Writing](${site}/writing)`,
    `- [Contact](${site}/contact)`,
    "",
    "## Elsewhere",
    `- LinkedIn: ${p.links.linkedin}`,
    `- GitHub: ${p.links.github}`,
    `- X: ${p.links.x}`,
    `- Telegram: ${p.links.telegram}`,
    ""
  ];
  return lines.join("\n");
}
const COOKIES = { mode: "mo_mode", seen: "mo_seen" };
const ONE_YEAR = 365 * 24 * 60 * 60;
const HTML_CACHE = "private, no-cache";
const STATIC = {
  "/": "home",
  "/work": "work",
  "/about": "about",
  "/writing": "writing",
  "/contact": "contact",
  "/contact/thanks": "thanks",
  "/privacy": "privacy"
};
function pagesRouter(ctx, renderer) {
  const r = express.Router();
  const secure = !ctx.config.isDev;
  const site = ctx.config.SITE_URL;
  const indexable = ctx.config.isProd;
  r.get("/robots.txt", (_req, res) => {
    res.type("text/plain").setHeader("Cache-Control", "public, max-age=3600");
    res.send(robotsTxt(site, indexable, ctx.config.ADMIN_PATH));
  });
  r.get(
    "/sitemap.xml",
    handler(async (_req, res) => {
      res.type("application/xml").setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
      res.send(sitemapXml(site, await listPublishedProjects(ctx.db)));
    })
  );
  r.get(
    "/llms.txt",
    handler(async (_req, res) => {
      const profile = await getProfile(ctx.db);
      if (!profile) return res.status(503).type("text/plain").send("Content is not loaded yet.");
      res.type("text/plain").setHeader("Cache-Control", "public, max-age=300, s-maxage=3600");
      res.send(llmsTxt(site, profile, await listPublishedProjects(ctx.db)));
    })
  );
  r.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") return next();
    const path = req.path;
    const clean = localPath(path.length > 1 ? path.replace(/\/+$/, "") : path).toLowerCase();
    if (clean !== path) {
      const q = req.originalUrl.slice(req.path.length);
      return res.redirect(301, clean + (q.startsWith("?") ? q : ""));
    }
    next();
  });
  r.use((req, res, next) => {
    if (req.method !== "GET" || req.query.mode === void 0) return next();
    const mode = parseMode(req.query.mode);
    if (mode) {
      setCookie(res, COOKIES.mode, mode, { maxAge: ONE_YEAR, secure });
      setCookie(res, COOKIES.seen, "1", { maxAge: ONE_YEAR, secure });
    }
    const params = new URLSearchParams(req.originalUrl.split("?")[1] ?? "");
    params.delete("mode");
    const rest = params.toString();
    res.redirect(302, localPath(req.path) + (rest ? `?${rest}` : ""));
  });
  async function base(req, route) {
    const [profile, projects] = await Promise.all([getProfile(ctx.db), listPublishedProjects(ctx.db)]);
    if (!profile) throw new HttpError(503, "not_ready", "Content is not loaded yet. Run the seed.");
    const cookies = readCookies(req);
    const mode = parseMode(cookies[COOKIES.mode]) ?? "playful";
    const forced = req.query.intro === "1";
    const intro = route === "home" && !isBot(req.get("user-agent")) && (forced || cookies[COOKIES.seen] !== "1");
    return {
      route,
      path: req.path,
      mode,
      intro,
      profile,
      projects,
      ...ctx.config.TURNSTILE_SITE_KEY ? { turnstileSiteKey: ctx.config.TURNSTILE_SITE_KEY } : {}
    };
  }
  async function send(res, data, status = 200) {
    const html = await renderer.page(data, res.locals.nonce, site);
    res.status(status).setHeader("Cache-Control", HTML_CACHE);
    res.type("html").send(html);
  }
  r.get(
    "/cv",
    handler(async (req, res) => {
      const profile = await getProfile(ctx.db);
      if (profile?.links.cv) return res.redirect(302, profile.links.cv);
      await send(res, { ...await base(req, "notfound") }, 404);
    })
  );
  r.get(
    "/work/:slug",
    handler(async (req, res) => {
      const found = await findProjectBySlug(ctx.db, String(req.params.slug));
      if (found && "redirectTo" in found) return res.redirect(301, `/work/${found.redirectTo}`);
      const data = await base(req, "project");
      if (!found || !found.project.caseStudy) return send(res, { ...data, route: "notfound" }, 404);
      const withStudies = data.projects.filter((p) => p.caseStudy);
      const i = withStudies.findIndex((p) => p.slug === found.project.slug);
      const next = withStudies[(i + 1) % withStudies.length];
      await send(res, {
        ...data,
        project: found.project,
        ...next && next.slug !== found.project.slug ? { nextProject: { slug: next.slug, title: next.title } } : {}
      });
    })
  );
  r.post(
    "/contact",
    rateLimit({ windowMs: 15 * 6e4, limit: 5, standardHeaders: "draft-8", legacyHeaders: false }),
    handler(async (req, res) => {
      try {
        await submitContact(ctx, req.body, req.ip ?? "0.0.0.0");
        res.redirect(303, "/contact/thanks");
      } catch (err) {
        if (!(err instanceof HttpError) || err.status >= 500) throw err;
        const raw = req.body ?? {};
        const values2 = Object.fromEntries(
          ["name", "email", "intent", "message"].map((k) => [
            k,
            typeof raw[k] === "string" ? raw[k].slice(0, 2e3) : ""
          ])
        );
        const errors = err.fields ?? { _: err.message };
        await send(res, { ...await base(req, "contact"), form: { values: values2, errors } }, err.status);
      }
    })
  );
  r.get(
    "/{*path}",
    handler(async (req, res) => {
      const route = STATIC[req.path] ?? "notfound";
      await send(res, await base(req, route), route === "notfound" ? 404 : 200);
    })
  );
  return r;
}
function localPath(path) {
  return "/" + path.replace(/^[\\/]+/, "");
}
function stagingGate(ctx) {
  const user = ctx.config.STAGING_USER;
  const pass = ctx.config.STAGING_PASSWORD ?? "";
  return (req, res, next) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    if (req.path === "/healthz" || req.path === "/readyz") return next();
    const [scheme, encoded] = (req.headers.authorization ?? "").split(" ");
    if (scheme === "Basic" && encoded) {
      const [u = "", ...rest] = Buffer.from(encoded, "base64").toString("utf8").split(":");
      if (safeEqual(u, user) && safeEqual(rest.join(":"), pass)) return next();
    }
    res.setHeader("WWW-Authenticate", 'Basic realm="meetoluwaseyi staging", charset="UTF-8"');
    res.status(401).type("text/plain").send("Staging is password-protected.");
  };
}
function createApp({ ctx, renderer, assets = [] }) {
  const { config, log } = ctx;
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use((req, res, next) => {
    const id = (req.get("x-request-id") ?? "").slice(0, 64) || randomUUID();
    res.locals.requestId = id;
    res.setHeader("X-Request-Id", id);
    res.locals.nonce = randomBytes(16).toString("base64");
    const started = Date.now();
    res.on("finish", () => {
      if (req.path.startsWith("/assets/")) return;
      log.info("request", {
        id,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        ms: Date.now() - started
      });
    });
    next();
  });
  app.use(
    (req, res, next) => helmet({
      contentSecurityPolicy: config.isDev ? false : {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            `'nonce-${res.locals.nonce}'`,
            "https://challenges.cloudflare.com"
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
          fontSrc: ["'self'"],
          connectSrc: ["'self'", "https://api.cloudinary.com"],
          frameSrc: ["https://challenges.cloudflare.com"],
          frameAncestors: ["'none'"],
          formAction: ["'self'"],
          baseUri: ["'self'"],
          objectSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      strictTransportSecurity: config.isDev ? false : { maxAge: 31536e3, includeSubDomains: true },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginEmbedderPolicy: false,
      xFrameOptions: { action: "deny" }
    })(req, res, next)
  );
  app.use((_req, res, next) => {
    res.setHeader(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()"
    );
    next();
  });
  app.get("/healthz", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({ data: { status: "ok" } });
  });
  app.get("/readyz", async (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const dbOk = await ping(ctx.db);
    res.status(dbOk ? 200 : 503).json({ data: { status: dbOk ? "ready" : "database unavailable" } });
  });
  if (config.isProd) {
    const canonical = new URL(config.SITE_URL);
    app.use((req, res, next) => {
      if (req.hostname === canonical.hostname) return next();
      res.redirect(301, `${canonical.origin}${req.originalUrl}`);
    });
  }
  if (config.isStaging) app.use(stagingGate(ctx));
  app.use(
    rateLimit({
      windowMs: 6e4,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      handler: (_q, _s, next) => next(tooMany())
    })
  );
  app.use(express.json({ limit: "50kb" }));
  app.use(express.urlencoded({ extended: false, limit: "50kb", parameterLimit: 20 }));
  for (const a of assets) app.use(a);
  app.use("/api/v1", apiRouter(ctx));
  app.use("/api", (_req, _res, next) => next(new HttpError(404, "not_found", "No such endpoint.")));
  app.get([config.ADMIN_PATH, `${config.ADMIN_PATH}/{*rest}`], async (_req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Robots-Tag", "noindex, nofollow");
      res.type("html").send(await renderer.admin(res.locals.nonce));
    } catch (err) {
      next(err);
    }
  });
  app.use(pagesRouter(ctx, renderer));
  app.use(async (err, req, res, _next) => {
    const known = err instanceof HttpError;
    const status = known ? err.status : typeof err === "object" && err && "status" in err && Number(err.status) < 500 ? Number(err.status) : 500;
    if (status >= 500) log.error("request failed", { id: res.locals.requestId, path: req.path, err });
    if (res.headersSent) return;
    if (req.path.startsWith("/api/")) {
      const body = known ? { code: err.code, message: err.message, ...err.fields ? { fields: err.fields } : {} } : status === 413 ? { code: "too_large", message: "That request is too large." } : status < 500 ? { code: "bad_request", message: "That request couldn’t be read." } : { code: "server_error", message: "Something went wrong on our side. Please try again." };
      return res.status(status).json({ error: body });
    }
    try {
      const profile = await getProfile(ctx.db).catch(() => null) ?? PROFILE;
      const html = await renderer.page(
        {
          route: status === 404 ? "notfound" : "error",
          path: req.path,
          mode: "playful",
          intro: false,
          profile,
          projects: []
        },
        res.locals.nonce,
        config.SITE_URL
      );
      res.status(status).setHeader("Cache-Control", "no-store");
      res.type("html").send(html);
    } catch {
      res.status(status).type("text/plain").send("Something went wrong on our side. Please try again in a minute.");
    }
  });
  return app;
}
function pageKeyFor(data) {
  switch (data.route) {
    case "home":
      return data.mode === "serious" ? "SeriousHome" : "PlayfulHome";
    case "work":
      return "Work";
    case "project":
      return "CaseStudy";
    case "about":
      return "About";
    case "writing":
      return "Writing";
    case "contact":
      return "Contact";
    default:
      return "Simple";
  }
}
function cssKeyFor(data) {
  const k = pageKeyFor(data);
  return k === "Simple" ? "Writing" : k;
}
function App({ data, Page }) {
  const skipTo = data.route === "home" ? "#top" : "#main-content";
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("a", { className: "skip-link", href: skipTo, children: "Skip to content" }),
    /* @__PURE__ */ jsx(Page, { data })
  ] });
}
const cache = /* @__PURE__ */ new Map();
function css(text2) {
  const hit = cache.get(text2);
  if (hit) return hit;
  const out = {};
  let depth = 0;
  let start = 0;
  const decls = [];
  for (let i = 0; i < text2.length; i++) {
    const ch = text2[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === ";" && depth === 0) {
      decls.push(text2.slice(start, i));
      start = i + 1;
    }
  }
  decls.push(text2.slice(start));
  for (const d of decls) {
    const i = d.indexOf(":");
    if (i < 0) continue;
    const prop = d.slice(0, i).trim();
    const value = d.slice(i + 1).trim();
    if (!prop || value === "") continue;
    if (prop.startsWith("--")) {
      out[prop] = value;
      continue;
    }
    const key = prop.replace(
      /^-(webkit|moz|ms)-/,
      (_m, v) => v === "ms" ? "ms-" : v[0].toUpperCase() + v.slice(1) + "-"
    ).replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
    out[key] = value;
  }
  if (cache.size < 5e3) cache.set(text2, out);
  return out;
}
function PlayfulHomeView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("main", { ref: v.setRoot, className: v.rootCls, style: css("position:relative;background-color:#FFF6E5;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px;color:#1B1A2E;font-family:'Outfit',sans-serif;min-height:100dvh;overflow-x:clip;width:100%;max-width:100%;isolation:isolate"), children: [
    /* @__PURE__ */ jsx("svg", { width: "0", height: "0", style: css("position:absolute"), "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("defs", { children: [
      /* @__PURE__ */ jsxs("filter", { id: "cnA", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.022", numOctaves: "4", seed: "3", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "18", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "1.1", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-12", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "10.8", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#AEB6D6", floodOpacity: "0.8" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "9", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "12", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.16" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "cnB", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.022", numOctaves: "4", seed: "11", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "18", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "1.1", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-12", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "10.8", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#AEB6D6", floodOpacity: "0.8" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "9", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "12", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.16" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "cnNA", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.022", numOctaves: "4", seed: "3", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "18", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "1.1", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-12", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "10.8", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#8A82C6", floodOpacity: "0.85" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "9", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "12", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.2" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "cnNB", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.022", numOctaves: "4", seed: "11", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "18", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "1.1", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-12", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "10.8", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#8A82C6", floodOpacity: "0.85" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "9", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "12", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.2" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "skD", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.06", numOctaves: "4", seed: "5", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "7", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "0.5", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-5", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "4.5", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#B5BCD9", floodOpacity: "0.75" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "3", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "4", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.12" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "skN", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.06", numOctaves: "4", seed: "8", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "7", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "0.5", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-5", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "4.5", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#8C84C4", floodOpacity: "0.8" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "3", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "4", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.16" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "skD2", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.06", numOctaves: "4", seed: "14", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "7", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "0.5", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-5", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "4.5", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#B5BCD9", floodOpacity: "0.75" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "3", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "4", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.12" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "skN2", x: "-30%", y: "-70%", width: "160%", height: "240%", colorInterpolationFilters: "sRGB", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: "0.06", numOctaves: "4", seed: "21", result: "n" }),
        /* @__PURE__ */ jsx("feDisplacementMap", { in: "SourceGraphic", in2: "n", scale: "7", xChannelSelector: "R", yChannelSelector: "G", result: "d" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "d", stdDeviation: "0.5", result: "s" }),
        /* @__PURE__ */ jsx("feOffset", { in: "s", dy: "-5", result: "u" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "u", stdDeviation: "4.5", result: "ub" }),
        /* @__PURE__ */ jsx("feComposite", { in: "s", in2: "ub", operator: "out", result: "rim" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#8C84C4", floodOpacity: "0.8" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "rim", operator: "in", result: "shade" }),
        /* @__PURE__ */ jsx("feGaussianBlur", { in: "s", stdDeviation: "3", result: "b0" }),
        /* @__PURE__ */ jsx("feOffset", { in: "b0", dy: "4", result: "b1" }),
        /* @__PURE__ */ jsx("feFlood", { floodColor: "#1B1A2E", floodOpacity: "0.16" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "b1", operator: "in", result: "shadow" }),
        /* @__PURE__ */ jsxs("feMerge", { children: [
          /* @__PURE__ */ jsx("feMergeNode", { in: "shadow" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "s" }),
          /* @__PURE__ */ jsx("feMergeNode", { in: "shade" })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: "sunCoreG", cx: "44%", cy: "40%", r: "62%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0", stopColor: "#FFFEF6" }),
        /* @__PURE__ */ jsx("stop", { offset: ".36", stopColor: "#FFEA92" }),
        /* @__PURE__ */ jsx("stop", { offset: ".76", stopColor: "#FFC541" }),
        /* @__PURE__ */ jsx("stop", { offset: "1", stopColor: "#FF9628" })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "sunGran", x: "0", y: "0", width: "100%", height: "100%", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: ".11", numOctaves: "3", seed: "4" }),
        /* @__PURE__ */ jsx("feColorMatrix", { type: "matrix", values: "0 0 0 0 1  0 0 0 0 .52  0 0 0 0 .08  0 0 0 -2.2 1.35" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "SourceAlpha", operator: "in" })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: "moonG", cx: "40%", cy: "36%", r: "66%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0", stopColor: "#FFFDF6" }),
        /* @__PURE__ */ jsx("stop", { offset: ".6", stopColor: "#ECE6D4" }),
        /* @__PURE__ */ jsx("stop", { offset: "1", stopColor: "#CFC6AE" })
      ] }),
      /* @__PURE__ */ jsxs("filter", { id: "moonMaria", x: "0", y: "0", width: "100%", height: "100%", children: [
        /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: ".045", numOctaves: "3", seed: "7" }),
        /* @__PURE__ */ jsx("feColorMatrix", { type: "matrix", values: "0 0 0 0 .5  0 0 0 0 .48  0 0 0 0 .58  0 0 0 -2.6 1.42" }),
        /* @__PURE__ */ jsx("feComposite", { in2: "SourceAlpha", operator: "in" })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: "craterG", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0", stopColor: "#9C93A8", stopOpacity: ".38" }),
        /* @__PURE__ */ jsx("stop", { offset: ".7", stopColor: "#A49BB0", stopOpacity: ".22" }),
        /* @__PURE__ */ jsx("stop", { offset: ".9", stopColor: "#FFFFFF", stopOpacity: ".35" }),
        /* @__PURE__ */ jsx("stop", { offset: "1", stopColor: "#FFFFFF", stopOpacity: "0" })
      ] }),
      /* @__PURE__ */ jsxs("radialGradient", { id: "moonShade", cx: "88%", cy: "78%", r: "78%", children: [
        /* @__PURE__ */ jsx("stop", { offset: "0", stopColor: "#4A4280", stopOpacity: ".42" }),
        /* @__PURE__ */ jsx("stop", { offset: ".55", stopColor: "#4A4280", stopOpacity: ".12" }),
        /* @__PURE__ */ jsx("stop", { offset: "1", stopColor: "#4A4280", stopOpacity: "0" })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { className: "sky2", "aria-hidden": "true", ref: v.setSky, children: [
      /* @__PURE__ */ jsx("div", { className: "sk-flash" }),
      /* @__PURE__ */ jsx("div", { className: "sk-wash sk-day" }),
      /* @__PURE__ */ jsx("div", { className: "sk-wash sk-dusk" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "snap-flash", "aria-hidden": "true" }),
    /* @__PURE__ */ jsxs("div", { className: "snap-frame", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("i", {}),
      /* @__PURE__ */ jsx("i", {}),
      /* @__PURE__ */ jsx("i", {}),
      /* @__PURE__ */ jsx("i", {})
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sky-band", "aria-hidden": "true", ref: v.setBand, children: [
      /* @__PURE__ */ jsx("i", { className: "sb-day" }),
      /* @__PURE__ */ jsx("i", { className: "sb-night" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "sky2 sky2-fg", "aria-hidden": "true", ref: v.setSkyFg, children: [
      /* @__PURE__ */ jsx("i", { className: "sk-shoot" }),
      /* @__PURE__ */ jsx("div", { className: "sk-x", children: /* @__PURE__ */ jsxs("div", { className: "sk-y", children: [
        /* @__PURE__ */ jsxs("div", { className: "sk-set sk-dayset", children: [
          /* @__PURE__ */ jsx("svg", { className: "cl c2", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skD)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-m c2", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skD2)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "sk-b sk-sun", children: [
            /* @__PURE__ */ jsx("div", { className: "sk-glow" }),
            /* @__PURE__ */ jsx("div", { className: "sk-rays" }),
            /* @__PURE__ */ jsx("div", { className: "sk-rays sk-rays2" }),
            /* @__PURE__ */ jsx("div", { className: "sk-disc", children: /* @__PURE__ */ jsxs("svg", { className: "sk-tex", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false", children: [
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "49", fill: "url(#sunCoreG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "49", fill: "#fff", filter: "url(#sunGran)", opacity: ".9" }),
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "48", fill: "none", stroke: "#FFF6C9", strokeOpacity: ".55", strokeWidth: "1.5" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-front c1", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skD)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-m cl-front c1", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skD2)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "sk-set sk-nightset", children: [
          /* @__PURE__ */ jsx("b", { className: "sp lg", style: css("left:calc(var(--sz) * -0.35);top:calc(var(--sz) * -0.08);animation-delay:-0s;animation-duration:3.4s") }),
          /* @__PURE__ */ jsx("b", { className: "", style: css("left:calc(var(--sz) * -1.0);top:calc(var(--sz) * 0.55);animation-delay:-1.2s;animation-duration:2.6s") }),
          /* @__PURE__ */ jsx("b", { className: "sp", style: css("left:calc(var(--sz) * -0.9);top:calc(var(--sz) * -0.15);animation-delay:-2.1s;animation-duration:4.2s") }),
          /* @__PURE__ */ jsx("b", { className: "", style: css("left:calc(var(--sz) * 0.3);top:calc(var(--sz) * 1.3);animation-delay:-0.7s;animation-duration:3s") }),
          /* @__PURE__ */ jsx("b", { className: "sp", style: css("left:calc(var(--sz) * -0.25);top:calc(var(--sz) * 1.5);animation-delay:-1.8s;animation-duration:3.8s") }),
          /* @__PURE__ */ jsx("b", { className: "", style: css("left:calc(var(--sz) * -1.75);top:calc(var(--sz) * 0.95);animation-delay:-2.6s;animation-duration:2.4s") }),
          /* @__PURE__ */ jsx("b", { className: "gd", style: css("left:calc(var(--sz) * 1.1);top:calc(var(--sz) * 1.0);animation-delay:-0.4s;animation-duration:3.6s") }),
          /* @__PURE__ */ jsx("b", { className: "gd", style: css("left:calc(var(--sz) * -1.4);top:calc(var(--sz) * -0.25);animation-delay:-1.5s;animation-duration:2.9s") }),
          /* @__PURE__ */ jsx("b", { className: "", style: css("left:calc(var(--sz) * 0.9);top:calc(var(--sz) * -0.2);animation-delay:-3.1s;animation-duration:3.3s") }),
          /* @__PURE__ */ jsx("svg", { className: "cl c4", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skN)", fill: "#E6E2F8", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-m c4", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skN2)", fill: "#E6E2F8", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsxs("div", { className: "sk-b sk-moon", children: [
            /* @__PURE__ */ jsx("div", { className: "sk-glow" }),
            /* @__PURE__ */ jsx("div", { className: "sk-disc", children: /* @__PURE__ */ jsxs("svg", { className: "sk-tex", viewBox: "0 0 100 100", "aria-hidden": "true", focusable: "false", children: [
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "49", fill: "url(#moonG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "49", fill: "#fff", filter: "url(#moonMaria)", opacity: ".75" }),
              /* @__PURE__ */ jsx("circle", { cx: "30", cy: "36", r: "9", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "62", cy: "58", r: "7", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "54", cy: "26", r: "4.5", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "38", cy: "68", r: "5.5", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "72", cy: "36", r: "3.5", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "24", cy: "56", r: "3", fill: "url(#craterG)" }),
              /* @__PURE__ */ jsx("circle", { cx: "50", cy: "50", r: "49", fill: "url(#moonShade)" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-front c3", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skN)", fill: "#E6E2F8", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cl cl-m cl-front c3", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#skN2)", fill: "#E6E2F8", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "66%", rx: "42%", ry: "23%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "30%", cy: "52%", rx: "21%", ry: "30%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "55%", cy: "40%", rx: "24%", ry: "36%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "75%", cy: "56%", rx: "16%", ry: "24%" })
          ] }) })
        ] })
      ] }) })
    ] }),
    v.introShow ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: `intro ${v.introCls ?? ""}`, style: css(`position:fixed;inset:0;z-index:100;${v.introBg ?? ""};background-size:24px 24px;display:flex;align-items:center;justify-content:center;overflow:hidden`), children: [
      v.isNight ? /* @__PURE__ */ jsxs(Fragment, { children: [
        /* @__PURE__ */ jsx("div", { "aria-hidden": "true", style: css("position:absolute;inset:0"), children: (v.stars ?? []).map((st, st_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "twk", style: css(`position:absolute;top:${st.y ?? ""};left:${st.x ?? ""};width:${st.s ?? ""};height:${st.s ?? ""};border-radius:50%;background:${st.c ?? ""};animation-delay:${st.d ?? ""}`) }) }, st_i)) }),
        /* @__PURE__ */ jsx("div", { "aria-hidden": "true", style: css("position:absolute;inset:0;display:flex;align-items:center;justify-content:center"), children: /* @__PURE__ */ jsxs("div", { className: "intro-sun", style: css("position:relative;width:clamp(240px,36vw,480px);aspect-ratio:1"), children: [
          /* @__PURE__ */ jsx("div", { style: css("position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(circle,rgba(255,210,63,.22),transparent 68%)") }),
          /* @__PURE__ */ jsxs("div", { style: css("position:absolute;inset:0;border-radius:50%;background:#FFF1C9;box-shadow:0 40px 90px -30px rgba(255,210,63,.55);overflow:hidden"), children: [
            /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:20%;left:24%;width:20%;height:20%;border-radius:50%;background:#F1DFA6") }),
            /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:58%;left:56%;width:14%;height:14%;border-radius:50%;background:#F1DFA6") }),
            /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:34%;left:64%;width:9%;height:9%;border-radius:50%;background:#F1DFA6") }),
            /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:66%;left:22%;width:8%;height:8%;border-radius:50%;background:#F1DFA6") })
          ] })
        ] }) })
      ] }) : null,
      v.isDay ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { "aria-hidden": "true", style: css("position:absolute;inset:0;display:flex;align-items:center;justify-content:center"), children: /* @__PURE__ */ jsxs("div", { className: "intro-sun", style: css("position:relative;width:clamp(260px,40vw,540px);aspect-ratio:1"), children: [
        /* @__PURE__ */ jsx("svg", { className: "intro-rays", viewBox: "0 0 200 200", style: css("position:absolute;inset:-22%;width:144%;height:144%"), children: /* @__PURE__ */ jsxs("g", { stroke: "#FF7A3D", strokeWidth: "5", strokeLinecap: "round", children: [
          /* @__PURE__ */ jsx("path", { d: "M100 4v22" }),
          /* @__PURE__ */ jsx("path", { d: "M100 174v22" }),
          /* @__PURE__ */ jsx("path", { d: "M4 100h22" }),
          /* @__PURE__ */ jsx("path", { d: "M174 100h22" }),
          /* @__PURE__ */ jsx("path", { d: "M32 32l16 16" }),
          /* @__PURE__ */ jsx("path", { d: "M152 152l16 16" }),
          /* @__PURE__ */ jsx("path", { d: "M168 32l-16 16" }),
          /* @__PURE__ */ jsx("path", { d: "M48 152l-16 16" })
        ] }) }),
        /* @__PURE__ */ jsx("div", { style: css("position:absolute;inset:0;border-radius:50%;background:#FFD23F;box-shadow:0 40px 80px -30px rgba(255,122,61,.6)") })
      ] }) }) }) : null,
      /* @__PURE__ */ jsxs("div", { style: css("position:relative;display:flex;flex-direction:column;align-items:center;gap:8px"), children: [
        /* @__PURE__ */ jsx("p", { "aria-label": "Oluwaseyi", style: css(`margin:0;font:900 clamp(48px,13vw,210px)/1 'Outfit',sans-serif;letter-spacing:-0.04em;white-space:nowrap;color:${v.introInk ?? ""};${v.introFx ?? ""}`), children: (v.introLetters ?? []).map((il, il_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "intro-letter", style: css(`animation-delay:${il.d ?? ""};text-shadow:6px 6px 0 ${il.c ?? ""}`), children: il.ch }) }, il_i)) }),
        /* @__PURE__ */ jsx("p", { className: "hand pop", style: css(`margin:0;font-size:clamp(22px,3vw,40px);transform:rotate(-3deg);animation-delay:1.9s;color:${v.introInk ?? ""};${v.greetFx ?? ""}`), children: v.greeting })
      ] }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "chip", onClick: v.skipIntro, style: css("position:absolute;right:24px;bottom:24px;background:#fff"), children: "Skip intro" })
    ] }) }) : null,
    /* @__PURE__ */ jsx("div", { ref: v.setNav, className: "navwrap", style: css("position:fixed;top:34px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none;transition:transform 700ms var(--spring)"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", className: "cloudnav", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 14px"), children: [
      /* @__PURE__ */ jsxs("span", { className: "cn-sky", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsxs("span", { className: "cn-mode cn-day", children: [
          /* @__PURE__ */ jsx("svg", { className: "cn-cloud cn-a", width: "100%", height: "100%", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#cnA)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "60%", rx: "45%", ry: "29%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "7%", cy: "64%", rx: "26", ry: "22" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "93%", cy: "62%", rx: "28", ry: "24" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "15%", cy: "40%", rx: "34", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "28%", cy: "34%", rx: "40", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "42%", cy: "30%", rx: "44", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "57%", cy: "29%", rx: "50", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "71%", cy: "33%", rx: "42", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "85%", cy: "41%", rx: "34", ry: "30" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cn-cloud cn-b", width: "100%", height: "100%", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#cnB)", fill: "#FFFFFF", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "60%", rx: "45%", ry: "29%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "7%", cy: "64%", rx: "26", ry: "22" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "93%", cy: "62%", rx: "28", ry: "24" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "15%", cy: "40%", rx: "34", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "28%", cy: "34%", rx: "40", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "42%", cy: "30%", rx: "44", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "57%", cy: "29%", rx: "50", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "71%", cy: "33%", rx: "42", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "85%", cy: "41%", rx: "34", ry: "30" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("span", { className: "cn-mode cn-night", children: [
          /* @__PURE__ */ jsx("svg", { className: "cn-cloud cn-a", width: "100%", height: "100%", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#cnNA)", fill: "#EEEAFC", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "60%", rx: "45%", ry: "29%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "7%", cy: "64%", rx: "26", ry: "22" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "93%", cy: "62%", rx: "28", ry: "24" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "15%", cy: "40%", rx: "34", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "28%", cy: "34%", rx: "40", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "42%", cy: "30%", rx: "44", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "57%", cy: "29%", rx: "50", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "71%", cy: "33%", rx: "42", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "85%", cy: "41%", rx: "34", ry: "30" })
          ] }) }),
          /* @__PURE__ */ jsx("svg", { className: "cn-cloud cn-b", width: "100%", height: "100%", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { filter: "url(#cnNB)", fill: "#EEEAFC", children: [
            /* @__PURE__ */ jsx("ellipse", { cx: "50%", cy: "60%", rx: "45%", ry: "29%" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "7%", cy: "64%", rx: "26", ry: "22" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "93%", cy: "62%", rx: "28", ry: "24" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "15%", cy: "40%", rx: "34", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "28%", cy: "34%", rx: "40", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "42%", cy: "30%", rx: "44", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "57%", cy: "29%", rx: "50", ry: "30" }),
            /* @__PURE__ */ jsx("ellipse", { className: "b-sm", cx: "71%", cy: "33%", rx: "42", ry: "32" }),
            /* @__PURE__ */ jsx("ellipse", { cx: "85%", cy: "41%", rx: "34", ry: "30" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx("span", { className: "cn-glow" })
      ] }),
      /* @__PURE__ */ jsx("svg", { className: "cn-bolt", viewBox: "0 0 60 120", "aria-hidden": "true", focusable: "false", children: /* @__PURE__ */ jsxs("g", { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", children: [
        /* @__PURE__ */ jsx("path", { className: "bh", d: "M30 0 L24 18 L34 34 L22 58 L32 76 L20 104", stroke: "#FFB13B", strokeWidth: "6", opacity: ".6" }),
        /* @__PURE__ */ jsx("path", { className: "bc", d: "M30 0 L24 18 L34 34 L22 58 L32 76 L20 104", stroke: "#FFF4C2", strokeWidth: "2.4" }),
        /* @__PURE__ */ jsx("path", { className: "bbh", d: "M28 40 L40 52 L38 66 L48 80", stroke: "#FFB13B", strokeWidth: "4", opacity: ".5" }),
        /* @__PURE__ */ jsx("path", { className: "bbc", d: "M28 40 L40 52 L38 66 L48 80", stroke: "#FFF4C2", strokeWidth: "1.5", opacity: ".9" })
      ] }) }),
      /* @__PURE__ */ jsxs("a", { href: "#top", style: css("display:inline-flex;align-items:center;gap:8px;text-decoration:none;color:#1B1A2E;font:800 22px 'Outfit',sans-serif;padding:6px 10px 6px 0"), children: [
        /* @__PURE__ */ jsxs("span", { className: "cn-icon", children: [
          /* @__PURE__ */ jsx("span", { className: "cn-sunic", children: /* @__PURE__ */ jsxs("svg", { className: "spin", width: "28", height: "28", viewBox: "0 0 40 40", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsxs("g", { stroke: "#FF7A3D", strokeWidth: "3", strokeLinecap: "round", children: [
              /* @__PURE__ */ jsx("path", { d: "M20 2v6" }),
              /* @__PURE__ */ jsx("path", { d: "M20 32v6" }),
              /* @__PURE__ */ jsx("path", { d: "M2 20h6" }),
              /* @__PURE__ */ jsx("path", { d: "M32 20h6" }),
              /* @__PURE__ */ jsx("path", { d: "M7 7l4 4" }),
              /* @__PURE__ */ jsx("path", { d: "M29 29l4 4" }),
              /* @__PURE__ */ jsx("path", { d: "M33 7l-4 4" }),
              /* @__PURE__ */ jsx("path", { d: "M11 29l-4 4" })
            ] }),
            /* @__PURE__ */ jsx("circle", { cx: "20", cy: "20", r: "8", fill: "#FFD23F" })
          ] }) }),
          /* @__PURE__ */ jsxs("svg", { className: "cn-moonic", width: "28", height: "28", viewBox: "0 0 40 40", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M26 6a14 14 0 1 0 8 23A12 12 0 0 1 26 6z", fill: "#6A5CC8" }),
            /* @__PURE__ */ jsx("circle", { cx: "31", cy: "10", r: "1.6", fill: "#6A5CC8" }),
            /* @__PURE__ */ jsx("circle", { cx: "35", cy: "17", r: "1.1", fill: "#6A5CC8" })
          ] })
        ] }),
        " seyi",
        /* @__PURE__ */ jsx("span", { style: css("color:#FF7A3D"), children: "." })
      ] }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/work", children: "Things I made" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/about", children: "My story" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/writing", children: "Writing" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/contact", children: "Say hi" }),
      /* @__PURE__ */ jsx("a", { className: "navlink", href: "/?mode=serious", children: "Serious" }),
      /* @__PURE__ */ jsxs("button", { type: "button", className: v.burgerCls, onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: [
        /* @__PURE__ */ jsx("span", {}),
        /* @__PURE__ */ jsx("span", {})
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: v.menuCls, "aria-hidden": v.menuHidden, children: /* @__PURE__ */ jsxs("div", { style: css("height:100%;display:flex;flex-direction:column;justify-content:center;padding:120px clamp(24px,8vw,120px) 64px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsx("p", { className: "ml hand", style: css("--i:0;margin:0 0 20px;font-size:32px;color:#1B1A2E"), children: "where shall we go?" }),
      (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: "ml", href: ml.href, onClick: v.closeMenu, style: css(`--i:${ml.i ?? ""};color:#1B1A2E;text-decoration:none;font:900 clamp(44px,7vw,96px)/1.05 'Outfit',sans-serif;letter-spacing:-0.035em;padding:2px 0`), children: ml.t }) }, ml_i))
    ] }) }),
    /* @__PURE__ */ jsxs("section", { id: "top", className: v.heroClass, style: css("position:relative;max-width:1240px;margin:0 auto;padding:140px 24px 104px;box-sizing:border-box;min-height:100dvh"), children: [
      /* @__PURE__ */ jsxs("div", { style: css("position:relative;z-index:2;max-width:780px"), children: [
        /* @__PURE__ */ jsxs("div", { className: "pop", style: css("display:flex;align-items:flex-end;gap:8px;animation-delay:.1s"), children: [
          /* @__PURE__ */ jsx("p", { className: "hand", style: css("margin:0;font-size:30px;color:#E0601F;transform:rotate(-3deg)"), children: "hey there, welcome to my corner of the internet" }),
          /* @__PURE__ */ jsxs("svg", { width: "80", height: "60", viewBox: "0 0 80 60", "aria-hidden": "true", style: css("flex:none"), children: [
            /* @__PURE__ */ jsx("path", { className: "draw", d: "M6 8c22 2 44 12 52 40", fill: "none", stroke: "#FF7A3D", strokeWidth: "3", strokeLinecap: "round" }),
            /* @__PURE__ */ jsx("path", { className: "draw", d: "M48 40l10 10 8-14", fill: "none", stroke: "#FF7A3D", strokeWidth: "3", strokeLinecap: "round", strokeLinejoin: "round" })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("h1", { "aria-label": "Hi, I'm Oluwaseyi", style: css("margin:10px 0 0;font:900 clamp(64px,9.5vw,140px)/0.92 'Outfit',sans-serif;letter-spacing:-0.045em"), children: [
          /* @__PURE__ */ jsxs("span", { "aria-hidden": "true", style: css("display:flex;align-items:center;gap:.18em;white-space:nowrap"), children: [
            /* @__PURE__ */ jsx("span", { children: (v.line1 ?? []).map((l, l_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "drop", style: css(`animation-delay:${l.d ?? ""}`), children: /* @__PURE__ */ jsx("span", { className: "boing", children: l.ch }) }) }, l_i)) }),
            /* @__PURE__ */ jsx("span", { className: "drop", style: css("animation-delay:.5s;font-size:.75em"), children: /* @__PURE__ */ jsx("span", { className: "wave", style: css("animation-delay:1.4s"), children: /* @__PURE__ */ jsx("svg", { width: "1em", height: "1em", viewBox: "0 0 64 64", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M22 54c-8-6-14-16-14-22 0-3 3-5 6-3l8 8V12c0-3 2-5 5-5s5 2 5 5v14V8c0-3 2-5 5-5s5 2 5 5v18V12c0-3 2-5 5-5s5 2 5 5v26c0 12-8 20-20 20-4 0-7-1-10-4z", fill: "#FFD23F", stroke: "#1B1A2E", strokeWidth: "3", strokeLinejoin: "round" }) }) }) })
          ] }),
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:block;white-space:nowrap"), children: (v.line2 ?? []).map((l, l_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "drop", style: css(`animation-delay:${l.d ?? ""}`), children: /* @__PURE__ */ jsx("span", { className: "boing", style: css(`text-shadow:5px 5px 0 ${l.c ?? ""}`), children: l.ch }) }) }, l_i)) })
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "enter", style: css("margin:34px 0 0;max-width:680px;font:500 clamp(22px,2.2vw,30px)/1.45 'Outfit',sans-serif;letter-spacing:-0.01em;animation-delay:1.1s"), children: [
          "I bring ",
          /* @__PURE__ */ jsxs("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;gap:.12em;width:2em;height:1.05em;vertical-align:middle;border-radius:999px;background:#fff;box-shadow:0 8px 18px -8px rgba(27,26,46,.35)"), children: [
            /* @__PURE__ */ jsx("span", { className: "dt" }),
            /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.15s") }),
            /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.3s") })
          ] }),
          " people together, close ",
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;width:2em;height:1.05em;vertical-align:middle;border-radius:999px;background:#FFB38A;box-shadow:0 8px 18px -8px rgba(255,122,61,.5)"), children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 40 20", style: css("width:1.2em;height:.6em"), children: [
            /* @__PURE__ */ jsx("circle", { cx: "15", cy: "10", r: "7", fill: "none", stroke: "#1B1A2E", strokeWidth: "2.5" }),
            /* @__PURE__ */ jsx("circle", { cx: "25", cy: "10", r: "7", fill: "none", stroke: "#fff", strokeWidth: "2.5" })
          ] }) }),
          " good deals, play with ",
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:flex-end;justify-content:center;gap:.08em;width:2em;height:1.05em;padding-bottom:.22em;box-sizing:border-box;vertical-align:middle;border-radius:999px;background:#9FE8D0;box-shadow:0 8px 18px -8px rgba(46,196,160,.6)"), children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 40 24", style: css("width:1.2em;height:.62em"), children: [
            /* @__PURE__ */ jsx("rect", { className: "bar", x: "2", y: "8", width: "7", height: "16", rx: "2", fill: "#1B1A2E" }),
            /* @__PURE__ */ jsx("rect", { className: "bar", x: "12", y: "2", width: "7", height: "22", rx: "2", fill: "#1B1A2E", style: css("animation-delay:.2s") }),
            /* @__PURE__ */ jsx("rect", { className: "bar", x: "22", y: "10", width: "7", height: "14", rx: "2", fill: "#1B1A2E", style: css("animation-delay:.4s") }),
            /* @__PURE__ */ jsx("rect", { className: "bar", x: "32", y: "4", width: "7", height: "20", rx: "2", fill: "#1B1A2E", style: css("animation-delay:.6s") })
          ] }) }),
          " data and build ",
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;width:2em;height:1.05em;vertical-align:middle;border-radius:999px;background:#B9E2F7;box-shadow:0 8px 18px -8px rgba(91,192,235,.6);overflow:hidden"), children: /* @__PURE__ */ jsxs("svg", { className: "drive", viewBox: "0 0 110 48", style: css("width:1.4em;height:.62em"), children: [
            /* @__PURE__ */ jsx("path", { d: "M10 34h90v-8c0-4-3-6-7-7l-14-3-12-10H38L24 16H16c-4 0-6 3-6 6z", fill: "#FF7A3D" }),
            /* @__PURE__ */ jsx("circle", { cx: "30", cy: "36", r: "8", fill: "#1B1A2E" }),
            /* @__PURE__ */ jsx("circle", { cx: "82", cy: "36", r: "8", fill: "#1B1A2E" })
          ] }) }),
          " things for Africa."
        ] }),
        /* @__PURE__ */ jsxs("p", { className: "enter", style: css("margin:22px 0 0;font:500 19px 'Outfit',sans-serif;color:#4A4860;display:flex;flex-wrap:wrap;align-items:baseline;gap:0 .35em;animation-delay:1.25s"), children: [
          /* @__PURE__ */ jsx("span", { children: "Right now I’m probably" }),
          /* @__PURE__ */ jsx("span", { style: css("display:inline-grid;overflow:hidden;padding-bottom:.1em"), children: (v.doing ?? []).map((dg, dg_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": dg.hid, style: css(`grid-area:1/1;white-space:nowrap;font-weight:800;color:${dg.c ?? ""};transition:opacity 600ms var(--spring),transform 700ms var(--spring),filter 600ms var(--spring);${dg.st ?? ""}`), children: dg.t }) }, dg_i)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "enter", style: css("display:flex;flex-wrap:wrap;gap:14px;margin-top:40px;animation-delay:1.4s"), children: [
          /* @__PURE__ */ jsxs("span", { style: css("position:relative;display:inline-flex"), children: [
            /* @__PURE__ */ jsxs("button", { type: "button", className: "pbtn", onClick: v.sayHi, style: css("background:#FF7A3D;color:#1B1A2E"), children: [
              "Say hi",
              /* @__PURE__ */ jsx("span", { className: "ic", style: css("background:rgba(255,255,255,.35)"), children: /* @__PURE__ */ jsx("span", { className: "wave", style: css("display:inline-flex"), children: /* @__PURE__ */ jsx("svg", { width: "24", height: "24", viewBox: "0 0 64 64", "aria-hidden": "true", children: /* @__PURE__ */ jsx("path", { d: "M22 54c-8-6-14-16-14-22 0-3 3-5 6-3l8 8V12c0-3 2-5 5-5s5 2 5 5v14V8c0-3 2-5 5-5s5 2 5 5v18V12c0-3 2-5 5-5s5 2 5 5v26c0 12-8 20-20 20-4 0-7-1-10-4z", fill: "#FFD23F", stroke: "#1B1A2E", strokeWidth: "4", strokeLinejoin: "round" }) }) }) })
            ] }),
            v.burst ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("position:absolute;left:50%;top:50%;width:0;height:0;pointer-events:none"), children: (v.confetti ?? []).map((c, c_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { style: css(`position:absolute;width:${c.s ?? ""};height:${c.h ?? ""};border-radius:${c.br ?? ""};background:${c.col ?? ""};--x:${c.x ?? ""};--y:${c.y ?? ""};--rot:${c.r ?? ""};animation:confetti 1.2s cubic-bezier(.1,.8,.3,1) ${c.d ?? ""} forwards`) }) }, c_i)) }) }) : null
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "#made", style: css("background:#fff;color:#1B1A2E"), children: [
            "See what I’ve made",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("background:#FFD23F"), children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "hero-art pop", style: css("position:absolute;right:24px;bottom:70px;z-index:1;width:min(100%,470px);aspect-ratio:1;animation-delay:.4s"), children: [
        /* @__PURE__ */ jsx("div", { className: "ava-tilt", children: /* @__PURE__ */ jsx("div", { className: "ava-squash", children: /* @__PURE__ */ jsxs("div", { className: "blob", style: css("position:absolute;inset:12%;overflow:hidden;background:#FFD23F;box-shadow:0 50px 90px -40px rgba(255,122,61,.65),inset 0 2px 0 rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px"), children: [
          /* @__PURE__ */ jsx("img", { className: "ava-img", src: "/img/avatar-3d.webp", alt: "Oluwaseyi Oshunwusi", style: css("width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block") }),
          /* @__PURE__ */ jsx("i", { className: "ava-ping", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("i", { className: "ava-af", "aria-hidden": "true" }),
          /* @__PURE__ */ jsx("i", { className: "ava-glint", "aria-hidden": "true" })
        ] }) }) }),
        /* @__PURE__ */ jsx("p", { className: "ava-say", "aria-live": "polite" }),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "ava-chip", "aria-label": "Snap me: tap and Oluwaseyi takes a pretend photo of you", children: [
          /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M4 8h3l1.6-2.4h6.8L17 8h3v11H4z" }),
            /* @__PURE__ */ jsx("circle", { cx: "12", cy: "13", r: "3.6" })
          ] }),
          /* @__PURE__ */ jsx("span", { className: "chip-t", children: "Snap me" })
        ] }),
        /* @__PURE__ */ jsx("button", { type: "button", className: "ava-hit", "aria-label": "Tap Oluwaseyi's photo and he will snap a picture of you" }),
        /* @__PURE__ */ jsxs("div", { className: "ava-pol", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsxs("div", { className: "pol-img", children: [
            /* @__PURE__ */ jsx("i", { className: "pol-sun" }),
            /* @__PURE__ */ jsx("i", { className: "pol-cl c1" }),
            /* @__PURE__ */ jsx("i", { className: "pol-cl c2" }),
            /* @__PURE__ */ jsx("span", { className: "pol-you", children: "you!" }),
            /* @__PURE__ */ jsx("i", { className: "pol-dev" })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "pol-cap", children: "Snapped you" })
        ] }),
        /* @__PURE__ */ jsxs("svg", { className: "spin", viewBox: "0 0 200 200", "aria-hidden": "true", style: css("position:absolute;top:-2%;right:-2%;width:30%;height:30%"), children: [
          /* @__PURE__ */ jsx("defs", { children: /* @__PURE__ */ jsx("path", { id: "badgeRing", d: "M100 100m-72 0a72 72 0 1 1 144 0a72 72 0 1 1 -144 0" }) }),
          /* @__PURE__ */ jsx("circle", { cx: "100", cy: "100", r: "96", fill: "#1B1A2E" }),
          /* @__PURE__ */ jsx("text", { fill: "#FFF6E5", style: css("font:700 15px 'Outfit',sans-serif;letter-spacing:2.5px"), children: /* @__PURE__ */ jsx("textPath", { href: "#badgeRing", children: "COMMUNITY • DEALS • DATA • VENTURES •" }) }),
          /* @__PURE__ */ jsx("circle", { cx: "100", cy: "100", r: "26", fill: "#FF7A3D" })
        ] }),
        /* @__PURE__ */ jsxs("button", { type: "button", className: "float ava-note", style: css("--r:-5deg;position:absolute;top:6%;left:-6%;padding:12px 16px 10px;background:#fff;border:0;border-radius:20px 20px 20px 6px;box-shadow:0 20px 40px -18px rgba(27,26,46,.35);max-width:210px;text-align:left;color:#1B1A2E;cursor:pointer;z-index:4"), children: [
          /* @__PURE__ */ jsx("span", { style: css("display:block;font:700 22px/1.05 'Caveat',cursive"), children: "Tap my avatar, I'll take your picture" }),
          /* @__PURE__ */ jsxs("svg", { width: "54", height: "26", viewBox: "0 0 54 26", "aria-hidden": "true", style: css("display:block;margin:4px 0 0 auto"), children: [
            /* @__PURE__ */ jsx("path", { d: "M4 4c10 14 26 18 42 14", fill: "none", stroke: "#FF7A3D", strokeWidth: "2.5", strokeLinecap: "round" }),
            /* @__PURE__ */ jsx("path", { d: "M38 11l9 7-10 4", fill: "none", stroke: "#FF7A3D", strokeWidth: "2.5", strokeLinecap: "round", strokeLinejoin: "round" })
          ] })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { "aria-hidden": "true", className: "tape-wrap", style: css("position:relative;padding:24px 0;margin:0 -40px"), children: [
      /* @__PURE__ */ jsx("div", { style: css("transform:rotate(-2deg);background:#1B1A2E;overflow:hidden;padding:16px 0;box-shadow:0 20px 40px -20px rgba(27,26,46,.5)"), children: /* @__PURE__ */ jsx("div", { className: "tape", style: css("display:flex;width:max-content;gap:28px;font:900 28px 'Outfit',sans-serif;letter-spacing:-0.02em;color:#FFD23F;white-space:nowrap"), children: (v.tape ?? []).map((tp, tp_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("span", { style: css("display:inline-flex;align-items:center;gap:28px"), children: [
        tp.t,
        /* @__PURE__ */ jsx("svg", { width: "22", height: "22", viewBox: "0 0 24 24", children: /* @__PURE__ */ jsx("path", { d: "M12 2l2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6z", fill: "#FF7A3D" }) })
      ] }) }, tp_i)) }) }),
      /* @__PURE__ */ jsx("div", { style: css("transform:rotate(1.5deg);background:#FF7A3D;overflow:hidden;padding:10px 0;margin-top:-6px"), children: /* @__PURE__ */ jsx("div", { className: "tape-rev", style: css("display:flex;width:max-content;gap:28px;font:700 24px 'Caveat',cursive;color:#1B1A2E;white-space:nowrap"), children: (v.tape2 ?? []).map((tp, tp_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { children: tp.t }) }, tp_i)) }) })
    ] }),
    /* @__PURE__ */ jsxs("section", { id: "do", "aria-labelledby": "h-do", style: css("max-width:1240px;margin:0 auto;padding:112px 24px 80px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("text-align:center;margin-bottom:56px"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Four things I love doing" }),
        /* @__PURE__ */ jsx("h2", { id: "h-do", style: css("margin:20px 0 0;font:900 clamp(48px,6.5vw,96px)/0.95 'Outfit',sans-serif;letter-spacing:-0.045em"), children: "The whole me, stacked." }),
        /* @__PURE__ */ jsxs("p", { className: "hand", style: css("margin:12px 0 0;font-size:28px;color:#E0601F"), children: [
          /* @__PURE__ */ jsx("span", { className: "hide-sm", children: "hover a card, it straightens up" }),
          /* @__PURE__ */ jsx("span", { className: "show-sm", style: css("display:none"), children: "four sides of me, one scroll" })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "cascade", "data-r": "", style: css("--i:1"), children: (v.loves ?? []).map((lv, lv_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "cc", style: css(`--t:${lv.t ?? ""};z-index:${lv.z ?? ""}`), children: /* @__PURE__ */ jsx("div", { className: "lift shell", children: /* @__PURE__ */ jsxs("div", { className: "core lvcore", style: css(`background:${lv.bg ?? ""};padding:26px;min-height:320px;display:flex;flex-direction:column`), children: [
        /* @__PURE__ */ jsxs("span", { className: "wig", style: css("display:inline-flex;width:64px;height:64px;border-radius:50%;background:rgba(255,255,255,.75);align-items:center;justify-content:center;box-shadow:0 10px 20px -10px rgba(27,26,46,.3)"), children: [
          lv.isC ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("svg", { width: "30", height: "30", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("circle", { cx: "9", cy: "8", r: "3" }),
            /* @__PURE__ */ jsx("path", { d: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" }),
            /* @__PURE__ */ jsx("path", { d: "M16 5a3 3 0 0 1 0 6" }),
            /* @__PURE__ */ jsx("path", { d: "M18 14.5c2 .7 3 2.8 3 5.5" })
          ] }) }) : null,
          lv.isD ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("svg", { width: "30", height: "30", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M8 12h8" }),
            /* @__PURE__ */ jsx("path", { d: "M10 7H7a5 5 0 0 0 0 10h3" }),
            /* @__PURE__ */ jsx("path", { d: "M14 7h3a5 5 0 0 1 0 10h-3" })
          ] }) }) : null,
          lv.isDa ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("svg", { width: "30", height: "30", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M5 20V11" }),
            /* @__PURE__ */ jsx("path", { d: "M11 20V4" }),
            /* @__PURE__ */ jsx("path", { d: "M17 20v-7" }),
            /* @__PURE__ */ jsx("path", { d: "M3 20h18" })
          ] }) }) : null,
          lv.isB ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("svg", { width: "30", height: "30", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
            /* @__PURE__ */ jsx("path", { d: "M12 3c3 2 5 6 5 10l-2 4H9l-2-4c0-4 2-8 5-10z" }),
            /* @__PURE__ */ jsx("circle", { cx: "12", cy: "10", r: "2" }),
            /* @__PURE__ */ jsx("path", { d: "M9 17l-2 4" }),
            /* @__PURE__ */ jsx("path", { d: "M15 17l2 4" })
          ] }) }) : null
        ] }),
        /* @__PURE__ */ jsx("h3", { className: "lvh", style: css("margin:auto 0 10px;padding-top:24px;font:900 32px/1 'Outfit',sans-serif;letter-spacing:-0.03em"), children: lv.title }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:16px;line-height:1.55;color:#2E2C44"), children: lv.body })
      ] }) }) }) }, lv_i)) })
    ] }),
    /* @__PURE__ */ jsxs("section", { id: "day", "aria-labelledby": "h-day", style: css("max-width:1240px;margin:0 auto;padding:48px 24px 104px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 24px;margin-bottom:36px"), children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "A day with me" }),
          /* @__PURE__ */ jsx("h2", { id: "h-day", style: css("margin:20px 0 0;font:900 clamp(48px,6.5vw,96px)/0.95 'Outfit',sans-serif;letter-spacing:-0.045em"), children: "Tap a time, watch the sky." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "hand", style: css("margin:0;font-size:24px;color:#5C5A70"), children: "(roughly! tweak to your real day)" })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "sky-life shell", children: /* @__PURE__ */ jsxs("div", { className: "core sky", style: css(`background-color:${v.dayNow.sky ?? ""};min-height:460px`), children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "sun", style: css(`position:absolute;transform:translate(${v.dayNow.x ?? ""},${v.dayNow.y ?? ""});width:84px;height:84px;border-radius:50%;background-color:${v.dayNow.orb ?? ""};box-shadow:0 0 0 16px ${v.dayNow.glow ?? ""},0 0 80px 20px ${v.dayNow.glow ?? ""}`) }),
        /* @__PURE__ */ jsxs("div", { style: css("position:relative;display:flex;flex-direction:column;gap:28px;padding:clamp(24px,4vw,48px);min-height:460px;box-sizing:border-box;justify-content:flex-end"), children: [
          /* @__PURE__ */ jsx("div", { className: "shell", style: css("max-width:580px;background:rgba(255,255,255,.4)"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("background:#fff;padding:28px"), children: [
            /* @__PURE__ */ jsxs("p", { style: css("margin:0;font:800 15px 'Outfit',sans-serif;color:#E0601F"), children: [
              v.dayNow.t,
              " · ",
              v.dayNow.label
            ] }),
            /* @__PURE__ */ jsx("h3", { style: css("margin:8px 0;font:900 38px/1.02 'Outfit',sans-serif;letter-spacing:-0.03em"), children: v.dayNow.title }),
            /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:17px;line-height:1.55;color:#3E3C55"), children: v.dayNow.body })
          ] }) }),
          /* @__PURE__ */ jsx("div", { role: "group", "aria-label": "Time of day", style: css("display:flex;flex-wrap:wrap;gap:8px"), children: (v.times ?? []).map((tm, tm_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "timebtn", onClick: tm.pick, "aria-pressed": tm.pressed, style: css(`${tm.style ?? ""}`), children: tm.t }) }, tm_i)) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsxs("section", { id: "made", "aria-labelledby": "h-made", style: css("max-width:1000px;margin:0 auto;padding:48px 24px 104px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("text-align:center;margin-bottom:40px"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Built with love" }),
        /* @__PURE__ */ jsx("h2", { id: "h-made", style: css("margin:20px 0 0;font:900 clamp(48px,6.5vw,96px)/0.95 'Outfit',sans-serif;letter-spacing:-0.045em"), children: "Things I’ve made." }),
        /* @__PURE__ */ jsx("p", { className: "hand", style: css("margin:12px 0 24px;font-size:28px;color:#E0601F"), children: "keep scrolling, they pile up. my four favourites" })
      ] }),
      /* @__PURE__ */ jsx("div", { style: css("display:flex;flex-direction:column;gap:28px"), children: (v.projects ?? []).map((p, p_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: "stack-card", href: p.href, style: css(`top:${p.top ?? ""};z-index:${p.z ?? ""};display:block;text-decoration:none;color:#1B1A2E`), children: /* @__PURE__ */ jsx("div", { className: "lift shell", style: css("background:rgba(255,255,255,.7)"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("background:#fff;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))"), children: [
        /* @__PURE__ */ jsxs("div", { className: "stack-art", style: css(`position:relative;min-height:220px;background:${p.bg ?? ""};display:flex;align-items:center;justify-content:center;padding:24px`), children: [
          /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:16px;left:16px;padding:5px 12px;border-radius:999px;background:rgba(255,255,255,.8);font:700 12px 'Outfit',sans-serif"), children: p.label }),
          /* @__PURE__ */ jsx("span", { className: "wig", style: css("display:inline-block;font:900 clamp(36px,4vw,50px)/1 'Outfit',sans-serif;letter-spacing:-0.03em;text-align:center"), children: p.mark })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("padding:28px;display:flex;flex-direction:column;gap:12px"), children: [
          /* @__PURE__ */ jsx("h3", { style: css("margin:0;font:900 30px/1.02 'Outfit',sans-serif;letter-spacing:-0.03em"), children: p.title }),
          /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:16px;line-height:1.55;color:#3E3C55"), children: p.blurb }),
          /* @__PURE__ */ jsxs("span", { style: css("margin-top:auto;padding-top:8px;display:flex;align-items:center;justify-content:space-between;font:800 15px 'Outfit',sans-serif;color:#E0601F"), children: [
            p.cta,
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#FFF1C2;transition:transform 700ms var(--spring)"), children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "#1B1A2E", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] })
        ] })
      ] }) }) }) }, p_i)) }),
      /* @__PURE__ */ jsx("div", { style: css("display:flex;justify-content:center;margin-top:36px"), children: /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "/work", style: css("background:#1B1A2E;color:#FFF6E5;min-height:56px"), children: [
        "See everything I’ve made",
        /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.16)"), children: "↗" })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("section", { id: "road", className: "road-pin", "aria-labelledby": "h-road", children: /* @__PURE__ */ jsxs("div", { className: "road-stick", children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("max-width:1240px;width:100%;margin:0 auto 20px;padding:0 24px;box-sizing:border-box"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "How I got here" }),
        /* @__PURE__ */ jsx("h2", { id: "h-road", style: css("margin:20px 0 0;font:900 clamp(48px,6.5vw,96px)/0.95 'Outfit',sans-serif;letter-spacing:-0.045em"), children: "Twelve years, one road." }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;align-items:center;gap:8px 20px;margin-top:10px"), children: [
          /* @__PURE__ */ jsx("p", { className: "hand", style: css("margin:0;font-size:26px;color:#E0601F"), children: "keep scrolling, the road moves →" }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "/about", style: css("background:#fff;color:#1B1A2E;min-height:52px;font-size:15px"), children: [
            "The whole story",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "road", ref: v.setRoad, style: css("display:flex;gap:20px;padding:20px max(24px,calc((100vw - 1192px) / 2)) 36px;width:max-content"), children: (v.road ?? []).map((rd, rd_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "road-card", style: css("flex:0 0 min(78vw,300px)"), children: /* @__PURE__ */ jsx("div", { className: "lift shell", style: css(`transform:rotate(${rd.t ?? ""})`), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css(`background:${rd.bg ?? ""};padding:26px;min-height:280px;display:flex;flex-direction:column`), children: [
        /* @__PURE__ */ jsx("span", { style: css("font:900 44px/1 'Outfit',sans-serif;letter-spacing:-0.04em"), children: rd.y }),
        /* @__PURE__ */ jsx("h3", { style: css("margin:auto 0 6px;padding-top:24px;font:900 24px/1.05 'Outfit',sans-serif;letter-spacing:-0.02em"), children: rd.role }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0 0 8px;font:700 14px 'Outfit',sans-serif;color:#3E3C55"), children: rd.org }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:15px;line-height:1.5;color:#2E2C44"), children: rd.note })
      ] }) }) }) }, rd_i)) }),
      /* @__PURE__ */ jsx("div", { className: "road-prog", "aria-hidden": "true", children: /* @__PURE__ */ jsx("i", {}) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "h-nums", ref: v.setStats, style: css("max-width:1240px;margin:0 auto;padding:40px 24px 96px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("text-align:center;margin-bottom:48px"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Little numbers" }),
        /* @__PURE__ */ jsx("h2", { id: "h-nums", style: css("margin:20px 0 0;font:900 clamp(44px,6vw,84px)/0.95 'Outfit',sans-serif;letter-spacing:-0.045em"), children: "Big smiles." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "numgrid", style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr));gap:28px"), children: (v.nums ?? []).map((nm, nm_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { "data-r": "", style: css(`--i:${nm.i ?? ""}`), children: /* @__PURE__ */ jsxs("div", { className: "lift", style: css(`transform:rotate(${nm.t ?? ""});aspect-ratio:1;border-radius:50%;background:${nm.bg ?? ""};box-shadow:0 40px 70px -36px ${nm.sh ?? ""},inset 0 2px 0 rgba(255,255,255,.6);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px`), children: [
        /* @__PURE__ */ jsx("span", { className: "nv", style: css("font:900 76px/1 'Outfit',sans-serif;letter-spacing:-0.04em;font-variant-numeric:tabular-nums"), children: nm.v }),
        /* @__PURE__ */ jsx("span", { style: css("margin-top:8px;font-weight:700;font-size:16px;max-width:180px"), children: nm.l })
      ] }) }) }, nm_i)) })
    ] }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-now", style: css("max-width:1240px;margin:0 auto;padding:24px 24px 96px;box-sizing:border-box"), children: /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("background-color:#D9A877;background-image:radial-gradient(rgba(27,26,46,.14) 1.5px,transparent 1.5px);background-size:14px 14px;padding:clamp(24px,4vw,56px)"), children: [
      /* @__PURE__ */ jsx("h2", { id: "h-now", style: css("margin:0 0 36px;font:900 clamp(40px,5vw,72px)/1 'Outfit',sans-serif;letter-spacing:-0.04em;color:#FFF6E5"), children: "Right now I’m…" }),
      /* @__PURE__ */ jsx("div", { className: "notegrid", style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:24px"), children: (v.notes ?? []).map((nt, nt_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "notewrap", children: /* @__PURE__ */ jsxs("div", { className: "note", style: css(`--t:${nt.t ?? ""};position:relative;padding:34px 22px 26px;background:${nt.bg ?? ""};border-radius:6px;box-shadow:0 24px 40px -22px rgba(27,26,46,.6)`), children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css(`position:absolute;top:-10px;left:50%;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:${nt.pin ?? ""};box-shadow:0 4px 8px rgba(27,26,46,.3)`) }),
        /* @__PURE__ */ jsx("p", { className: "hand", style: css("margin:0;font-size:30px;line-height:1.1"), children: nt.txt })
      ] }) }) }, nt_i)) })
    ] }) }) }),
    /* @__PURE__ */ jsxs("section", { id: "hi", "aria-labelledby": "h-hi", style: css("max-width:1240px;margin:0 auto;padding:24px 24px 112px;box-sizing:border-box;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,420px),1fr));gap:56px;align-items:center"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Come say hi" }),
        /* @__PURE__ */ jsxs("h2", { id: "h-hi", style: css("margin:20px 0 0;font:900 clamp(60px,8vw,128px)/0.9 'Outfit',sans-serif;letter-spacing:-0.05em"), children: [
          "Let’s ",
          /* @__PURE__ */ jsx("span", { style: css("color:#FF7A3D"), children: "talk!" })
        ] }),
        /* @__PURE__ */ jsx("p", { style: css("margin:22px 0 30px;font-size:19px;line-height:1.6;max-width:440px;color:#3E3C55"), children: "Partnership, a role, a project, or just to say hi. My inbox (and my Telegram) are always open. English, Yoruba, or a little Hausa." }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;gap:10px"), children: [
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5", style: css("background:#B9E2F7;color:#1B1A2E;min-height:54px;font-size:15px"), children: [
            "LinkedIn",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "https://github.com/shykeys-data", style: css("background:#9FE8D0;color:#1B1A2E;min-height:54px;font-size:15px"), children: [
            "GitHub",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "mailto:hello@meetoluwaseyi.com", style: css("background:#FFB38A;color:#1B1A2E;min-height:54px;font-size:15px"), children: [
            "Email me",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "https://x.com/shykeys101", style: css("background:#FFD23F;color:#1B1A2E;min-height:54px;font-size:15px"), children: [
            "X @shykeys101",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn", href: "https://t.me/oluwamichael", style: css("background:#D7C3F5;color:#1B1A2E;min-height:54px;font-size:15px"), children: [
            "Telegram",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:42px;height:42px;background:rgba(255,255,255,.55)"), children: "↗" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("background:#fff"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;align-items:center;gap:12px;padding:16px 20px;background:#FFD23F"), children: [
          /* @__PURE__ */ jsx("img", { src: "/img/avatar-3d.webp", alt: "", width: "44", height: "44", style: css("width:44px;height:44px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px #fff") }),
          /* @__PURE__ */ jsxs("span", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("span", { style: css("font-weight:800"), children: "Oluwaseyi" }),
            /* @__PURE__ */ jsxs("span", { style: css("font-size:13px;display:flex;align-items:center;gap:6px"), children: [
              /* @__PURE__ */ jsx("span", { style: css("width:8px;height:8px;border-radius:50%;background:#22A06B") }),
              "online-ish"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("padding:24px;display:flex;flex-direction:column;gap:12px;min-height:360px;background:#FFFBF2"), children: [
          /* @__PURE__ */ jsx("p", { className: "msg", style: css("margin:0;align-self:flex-start;max-width:80%;padding:12px 16px;border-radius:22px 22px 22px 6px;background:#fff;box-shadow:0 10px 24px -14px rgba(27,26,46,.35);font-size:16px"), children: "Hey! Thanks for scrolling all the way down." }),
          /* @__PURE__ */ jsx("p", { className: "msg", style: css("margin:0;align-self:flex-start;max-width:80%;padding:12px 16px;border-radius:22px 22px 22px 6px;background:#fff;box-shadow:0 10px 24px -14px rgba(27,26,46,.35);font-size:16px;animation-delay:.2s"), children: "What brings you here?" }),
          v.noChoice ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "msg", role: "group", "aria-label": "Pick a reason", style: css("display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;transform-origin:bottom right;animation-delay:.4s"), children: (v.intents ?? []).map((it, it_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("button", { type: "button", className: "chip", onClick: it.pick, style: css(`background:${it.bg ?? ""}`), children: it.label }) }, it_i)) }) }) : null,
          v.hasChoice ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("p", { className: "msg", style: css("transform-origin:bottom right;margin:0;align-self:flex-end;max-width:80%;padding:12px 16px;border-radius:22px 22px 6px 22px;background:#FF7A3D;font-size:16px;font-weight:700"), children: v.choiceLabel }),
            v.typing ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("p", { className: "msg", "aria-label": "Typing", style: css("margin:0;align-self:flex-start;padding:14px 18px;border-radius:22px 22px 22px 6px;background:#fff;box-shadow:0 10px 24px -14px rgba(27,26,46,.35);display:flex;gap:5px;font-size:30px"), children: [
              /* @__PURE__ */ jsx("span", { className: "dt" }),
              /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.15s") }),
              /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.3s") })
            ] }) }) : null,
            v.replied ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("p", { className: "msg", style: css("margin:0;align-self:flex-start;max-width:80%;padding:12px 16px;border-radius:22px 22px 22px 6px;background:#9FE8D0;font-size:16px"), children: v.reply }),
              /* @__PURE__ */ jsxs("div", { className: "msg", style: css("display:flex;flex-wrap:wrap;gap:10px;margin-top:8px;animation-delay:.2s"), children: [
                /* @__PURE__ */ jsx("label", { htmlFor: "hi-email", style: css("position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)"), children: "Your email" }),
                /* @__PURE__ */ jsx("input", { id: "hi-email", className: "field", type: "email", name: "email", autoComplete: "email", required: true, placeholder: "your@email.com", value: v.chatEmail, onChange: v.onChatEmail, "aria-invalid": v.chatInvalid, "aria-describedby": "hi-status" }),
                /* @__PURE__ */ jsxs("button", { type: "button", className: "pbtn", onClick: v.sendChat, disabled: v.chatSending, "aria-busy": v.chatSending, style: css("background:#1B1A2E;color:#FFF6E5;min-height:56px"), children: [
                  v.chatSendLabel,
                  /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:44px;height:44px;background:rgba(255,255,255,.14)"), children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "#FFF6E5", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
                    /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
                    /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
                  ] }) })
                ] })
              ] }),
              v.chatStatus,
              /* @__PURE__ */ jsx("button", { type: "button", onClick: v.resetChat, style: css("align-self:center;margin-top:6px;background:none;border:0;font:500 14px 'Outfit',sans-serif;color:#5C5A70;text-decoration:underline;cursor:pointer;min-height:44px"), children: "start over" })
            ] }) : null
          ] }) : null
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("footer", { style: css("background:#1B1A2E;color:#FFF6E5;padding:64px 24px 36px;overflow:hidden"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1240px;margin:0 auto"), children: [
      /* @__PURE__ */ jsxs("p", { "data-r": "", "aria-hidden": "true", style: css("margin:0;font:900 clamp(72px,17vw,250px)/0.85 'Outfit',sans-serif;letter-spacing:-0.06em;white-space:nowrap;color:#FFD23F;padding-bottom:.12em"), children: [
        "seyi",
        /* @__PURE__ */ jsx("span", { style: css("color:#FF7A3D"), children: "." }),
        " ",
        /* @__PURE__ */ jsx("span", { className: "hand", style: css("font-weight:500;font-size:.22em;letter-spacing:0;color:#FFF6E5"), children: "thanks for stopping by!" })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin-top:36px"), children: [
        /* @__PURE__ */ jsx("span", { style: css("font-size:14px;color:#D9D4C7"), children: "© 2026 Oluwaseyi Oshunwusi · Lagos, Nigeria · built with React, Express, Node & MySQL" }),
        /* @__PURE__ */ jsxs("span", { style: css("display:flex;flex-wrap:wrap;gap:20px"), children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: v.replayIntro, style: css("background:none;border:0;padding:12px 0;min-height:44px;color:#FFF6E5;font:700 15px 'Outfit',sans-serif;text-decoration:underline;cursor:pointer"), children: "Replay intro" }),
          /* @__PURE__ */ jsx("a", { href: "#top", style: css("color:#FFD23F;font-weight:700;padding:12px 0"), children: "Back to the top ↑" })
        ] })
      ] })
    ] }) }),
    v.showToast ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "toast", role: "status", style: css("position:fixed;left:50%;bottom:20px;z-index:90;width:max-content;max-width:calc(100% - 32px);margin-left:calc(min(100% - 32px, 460px) / -2);box-sizing:border-box;display:flex;align-items:center;gap:12px;padding:8px 8px 8px 18px;border-radius:999px;background:#1B1A2E;color:#FFF6E5;font:500 14px 'Outfit',sans-serif;box-shadow:0 20px 40px -18px rgba(27,26,46,.6)"), children: [
      /* @__PURE__ */ jsx("span", { children: "Here for business? There's a serious version too." }),
      /* @__PURE__ */ jsx("a", { href: "/?mode=serious", style: css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 14px;border-radius:999px;background:#FFD23F;color:#1B1A2E;font-weight:700;text-decoration:none"), children: "Serious mode" }),
      /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Dismiss", onClick: v.hideToast, style: css("flex:none;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,246,229,.12);color:#FFF6E5;font:700 16px 'Outfit',sans-serif;cursor:pointer"), children: "×" })
    ] }) }) : null
  ] }) });
}
const KEY = "oluwaseyi-mode";
function saveMode(mode) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIES.mode}=${mode}; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
  document.cookie = `${COOKIES.seen}=1; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
  }
  applyMode(mode);
}
function applyMode(mode) {
  document.documentElement.dataset.theme = mode;
  document.documentElement.classList.remove("mode-playful", "mode-serious");
  document.documentElement.classList.add(`mode-${mode}`);
}
function markIntroSeen() {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIES.seen}=1; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax${secure}`;
}
function onModeChange(cb) {
  const handler2 = (e) => {
    if (e.key !== KEY) return;
    const m = parseMode(e.newValue);
    if (!m) return;
    applyMode(m);
    cb(m);
  };
  window.addEventListener("storage", handler2);
  return () => window.removeEventListener("storage", handler2);
}
const prefersReducedMotion = () => typeof window !== "undefined" && !!window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const NETWORK_ERROR = {
  code: "network",
  message: "That didn’t go through. Try again, or email hello@meetoluwaseyi.com."
};
async function sendContact(input) {
  try {
    const res = await fetch("/api/v1/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(input)
    });
    if (res.ok) return { ok: true };
    const body = await res.json().catch(() => null);
    return { ok: false, error: body?.error ?? NETWORK_ERROR };
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }
}
let loading = null;
function load() {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise((resolve2, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve2();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}
async function turnstileToken(siteKey) {
  if (!siteKey) return void 0;
  try {
    await load();
  } catch {
    return void 0;
  }
  const api = window.turnstile;
  if (!api) return void 0;
  return new Promise((resolve2) => {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:200";
    document.body.appendChild(el);
    let id = "";
    const done = (token) => {
      resolve2(token);
      setTimeout(() => {
        try {
          api.remove(id);
        } catch {
        }
        el.remove();
      }, 0);
    };
    id = api.render(el, {
      sitekey: siteKey,
      appearance: "interaction-only",
      callback: (t) => done(t),
      "error-callback": () => done(void 0),
      "timeout-callback": () => done(void 0)
    });
  });
}
const DOING = [
  { t: "hosting the 7AM market brief", c: "#E0601F" },
  { t: "on a partnership call", c: "#1B7F6A" },
  { t: "cleaning data in Colab", c: "#2B7DB5" },
  { t: "running a Telegram quiz", c: "#C2335F" },
  { t: "listing cars on Korrect", c: "#E0601F" }
];
const TAPE_WORDS = [
  "community",
  "deals",
  "data",
  "ventures",
  "good vibes",
  "Telegram",
  "Korrect Cars",
  "Python"
];
const TAPE_NOTES = [
  "say hi, I don’t bite",
  "gm from Nigeria",
  "built with love",
  "scroll for good stuff"
];
const LOVES = [
  {
    k: "C",
    title: "Community",
    bg: "#FFD23F",
    t: "-4deg",
    z: 1,
    body: "I grew WEEX from zero to 25,000+ members in under a year, and Gate.io Nigeria to 20,000+ before that. Briefs, games, live classes and AMAs people show up for."
  },
  {
    k: "D",
    title: "Deals",
    bg: "#FFB38A",
    t: "3deg",
    z: 2,
    body: "KOL partnerships, a P2P launch for Africa, campus programmes with LASU and Yabatech, and car deals for Korrect Cars. I like a handshake that sticks."
  },
  {
    k: "Da",
    title: "Data",
    bg: "#9FE8D0",
    t: "-2deg",
    z: 3,
    body: "Eight IBM data certificates and counting. I analyse in public, then tell the story so anyone can follow it."
  },
  {
    k: "B",
    title: "Building",
    bg: "#B9E2F7",
    t: "4deg",
    z: 4,
    body: "Building websites since 2014. Now a car marketplace, a free moderation bot and a BDC rate app."
  }
];
const DAYS = [
  {
    t: "07:00",
    label: "Morning",
    title: "Market brief, live",
    body: "I open the WEEX Africa chat with the 7AM market brief so the community starts the day informed.",
    sky: "#FFD9B8",
    orb: "#FFD23F",
    glow: "rgba(255,210,63,.35)",
    x: "58cqw",
    y: "300px"
  },
  {
    t: "11:00",
    label: "Late morning",
    title: "Calls & partnerships",
    body: "Business development calls, KOL onboarding and partner follow-ups.",
    sky: "#FFEB99",
    orb: "#FFD23F",
    glow: "rgba(255,255,255,.6)",
    x: "66cqw",
    y: "110px"
  },
  {
    t: "15:00",
    label: "Afternoon",
    title: "Games o’clock",
    body: "Quiz polls, Last Commenter and Predict-to-Win keep the chat buzzing.",
    sky: "#FFC48A",
    orb: "#FFB020",
    glow: "rgba(255,255,255,.45)",
    x: "76cqw",
    y: "40px"
  },
  {
    t: "19:00",
    label: "Evening",
    title: "Data time",
    body: "Python in Google Colab, turning big datasets into stories people can follow.",
    sky: "#D7C3F5",
    orb: "#FF7A3D",
    glow: "rgba(255,122,61,.3)",
    x: "86cqw",
    y: "150px"
  },
  {
    t: "22:00",
    label: "Night",
    title: "Builder mode",
    body: "Korrect Cars, bots and whatever idea won’t let me sleep.",
    sky: "#2D2A5A",
    orb: "#FFF6E5",
    glow: "rgba(255,246,229,.18)",
    x: "82cqw",
    y: "56px"
  }
];
const NUMS = [
  { v: "k", live: true, l: "orders analysed", bg: "#FFD23F", sh: "rgba(255,176,32,.8)", t: "-3deg" },
  { v: "k+", live: true, l: "WEEX members, from zero", bg: "#9FE8D0", sh: "rgba(46,196,160,.8)", t: "2deg" },
  { v: " yrs", live: true, l: "building websites", bg: "#B9E2F7", sh: "rgba(91,192,235,.8)", t: "-1deg" },
  {
    v: "7k+",
    live: false,
    l: "members turned futures traders",
    bg: "#FFB38A",
    sh: "rgba(255,122,61,.8)",
    t: "3deg"
  }
];
const ROAD = [
  {
    y: "2014",
    role: "Web Developer",
    org: "HCS Properties",
    note: "Built the site, ran customer service and social media.",
    bg: "#B9E2F7",
    t: "-2deg"
  },
  {
    y: "2015",
    role: "Senior Web Developer",
    org: "Lantern Books",
    note: "An e-commerce web app plus its mobile apps.",
    bg: "#D7C3F5",
    t: "2deg"
  },
  {
    y: "2016",
    role: "Web Dev & Marketing",
    org: "TechnocratNG",
    note: "Ran the shop, built client sites and ran the ads.",
    bg: "#9FE8D0",
    t: "-1.5deg"
  },
  {
    y: "2020",
    role: "Web & Digital Marketing",
    org: "Amaget Online Store",
    note: "Built it, then grew it with ads, SEO and A/B tests.",
    bg: "#FFB38A",
    t: "1.5deg"
  },
  {
    y: "2021",
    role: "Community Manager & BD",
    org: "Gate.io",
    note: "My crypto chapter starts: 20,000+ members, a P2P launch and Nigeria’s first Gate.io meetup.",
    bg: "#F7B6CC",
    t: "-2deg"
  },
  {
    y: "2024",
    role: "Community Manager (Africa)",
    org: "WEEX",
    note: "Zero to 25,000+ members in under a year. Every morning at 7.",
    bg: "#FFD23F",
    t: "2deg"
  },
  {
    y: "2025",
    role: "Data analyst in the making",
    org: "IBM",
    note: "Eight IBM data certificates, from Python and SQL to the Data Analyst Capstone.",
    bg: "#C9F2E2",
    t: "-1deg"
  }
];
const NOTES = [
  { txt: "filming short crypto lessons for TikTok & Reels", bg: "#FFF39A", pin: "#FF7A3D", t: "-4deg" },
  { txt: "building Korrect Swap so you can trade car for car", bg: "#FFD1E0", pin: "#5BC0EB", t: "3deg" },
  { txt: "getting my Safety Bot live in the WEEX Africa group", bg: "#C9F2E2", pin: "#FFD23F", t: "-2deg" },
  {
    txt: "telling data stories on LinkedIn, like Growth Without Reach",
    bg: "#D6ECFA",
    pin: "#F25F8B",
    t: "4deg"
  }
];
const INTENTS = [
  {
    id: "partner",
    label: "Let’s partner",
    bg: "#FFD23F",
    reply: "Love that! Partnerships are my favourite kind of conversation. Drop your email and I’ll reach out."
  },
  {
    id: "hire",
    label: "I’m hiring",
    bg: "#9FE8D0",
    reply: "Ooh, tell me about the role! Leave your email and I’ll get back to you."
  },
  {
    id: "collab",
    label: "Let’s build something",
    bg: "#B9E2F7",
    reply: "Yes! I’m always up for building something fun. Where can I reach you?"
  },
  {
    id: "hi",
    label: "Just saying hi",
    bg: "#F7B6CC",
    reply: "Hi back! You just made my day. Leave your email if you want to keep in touch."
  }
];
const PLAYFUL_CARDS = {
  "olist-ecommerce-bi": {
    label: "Data",
    mark: "99,441 orders!",
    bg: "#9FE8D0",
    blurb: "99,441 real orders. Late parcels dropped ratings from 4.3★ to under 2★, and only 2.2% of shoppers came back.",
    href: "https://olist-bi-shykeys.streamlit.app",
    cta: "Play with the live dashboard"
  },
  "korrect-cars": {
    label: "Venture",
    mark: "Buy. Sell. Swap.",
    bg: "#FFB38A",
    blurb: "Live at korrectcars.com! Buy an inspected car, pay small small over up to 48 months, or swap yours.",
    href: "https://www.korrectcars.com",
    cta: "Take it for a spin"
  },
  "weex-safety-bot": {
    label: "Bot",
    mark: "beep, no spam",
    bg: "#F7B6CC",
    blurb: "My own Telegram moderation bot that keeps spam and fake followers out, for free.",
    href: "/work",
    cta: "Story coming soon"
  },
  "growth-without-reach": {
    label: "Data story",
    mark: "5 economies",
    bg: "#C9F2E2",
    blurb: "My data series and digital book on five African economies, built with Python on World Bank data.",
    href: "https://drive.google.com/file/d/1MGE0tIrHogphMomjjWxtnbU8be1UBK72/view",
    cta: "Read the free book"
  },
  "ibm-data-analyst-capstone": {
    label: "Data",
    mark: "dev survey",
    bg: "#B9E2F7",
    blurb: "65,437 developers, one survey: JavaScript tops the job ads and PostgreSQL keeps growing.",
    href: "https://github.com/shykeys-data/ibm-data-analyst-capstone",
    cta: "See the analysis"
  },
  "weex-community": {
    label: "Community",
    mark: "gm, fam!",
    bg: "#FFD23F",
    blurb: "45,000+ members across two exchanges: daily briefs, live trading classes, weekly games, leagues and AMAs.",
    href: "#day",
    cta: "See a day in there"
  },
  ratedesk: {
    label: "Idea",
    mark: "₦ ⇄ $",
    bg: "#D7C3F5",
    blurb: "Compare bureau de change rates in Nigeria and book with licensed BDCs. Cooking now.",
    href: "/work",
    cta: "In the oven"
  }
};
const SHADOWS = ["#FF7A3D", "#2EC4A0", "#5BC0EB", "#F25F8B", "#FFD23F"];
const CARD_BG = ["#9FE8D0", "#FFB38A", "#C9F2E2", "#FFD23F", "#B9E2F7", "#F7B6CC", "#D7C3F5"];
function skyFromClock() {
  try {
    const q = new URLSearchParams(window.location.search).get("sky");
    if (q === "day" || q === "night") return q;
  } catch {
  }
  const h = (/* @__PURE__ */ new Date()).getHours();
  return h >= 18 || h < 7 ? "night" : "day";
}
function cardFor(p, i) {
  const o = PLAYFUL_CARDS[p.slug] ?? {};
  const href = p.caseStudy ? `/work/${p.slug}` : p.links.live ?? p.links.book ?? p.links.repo ?? "/work";
  return {
    tags: p.pillars,
    label: o.label ?? (p.pillars[0] === "data" ? "Data" : p.pillars[0] === "community" ? "Community" : "Venture"),
    title: p.title,
    mark: o.mark ?? p.mark,
    bg: o.bg ?? CARD_BG[i % CARD_BG.length],
    blurb: o.blurb ?? p.summary,
    href: o.href ?? href,
    cta: o.cta ?? "Have a look"
  };
}
class PlayfulHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      intro: props.data.intro ? "on" : "off",
      sky: "day",
      toast: false,
      d: 0,
      time: 0,
      filter: "all",
      burst: false,
      choice: null,
      typing: false,
      n1: 0,
      n2: 0,
      n3: 0,
      menu: false,
      rvOn: false,
      chatEmail: "",
      chatSending: false,
      chatError: "",
      chatSent: false,
      hour: null
    };
  }
  scan() {
    if (!this.io || !this.root) return;
    this.seen = this.seen || /* @__PURE__ */ new WeakSet();
    this.root.querySelectorAll("[data-r]").forEach((el) => {
      if (!this.seen.has(el)) {
        this.seen.add(el);
        this.io.observe(el);
      }
    });
  }
  /** The intro plays first; when it leaves, the homepage underneath is already there. */
  playIntro() {
    clearTimeout(this.i1);
    clearTimeout(this.i2);
    const reduce = prefersReducedMotion();
    document.documentElement.classList.add("intro-on");
    this.i1 = setTimeout(() => this.setState({ intro: "leave" }), reduce ? 900 : 2800);
    this.i2 = setTimeout(() => this.endIntro(true), reduce ? 1e3 : 3350);
  }
  endIntro(showToast) {
    document.documentElement.classList.remove("intro-on", "sky-day", "sky-night");
    markIntroSeen();
    this.setState({ intro: "off", toast: showToast });
    if (showToast) {
      clearTimeout(this.tt2);
      this.tt2 = setTimeout(() => this.setState({ toast: false }), 9e3);
    }
  }
  componentDidMount() {
    const win = window;
    this.reduce = prefersReducedMotion();
    this.setState(
      { sky: skyFromClock(), hour: (/* @__PURE__ */ new Date()).getHours() },
      () => document.documentElement.classList.add("intro-ready")
    );
    window.__introOwned = true;
    if (this.props.data.intro) this.playIntro();
    else document.documentElement.classList.remove("intro-on");
    if (win.IntersectionObserver && !this.reduce) {
      this.io = new win.IntersectionObserver(
        (es) => {
          es.forEach((x) => {
            if (x.isIntersecting) {
              x.target.classList.add("in");
              this.io.unobserve(x.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      this.setState({ rvOn: true }, () => this.scan());
    }
    this.timer = setInterval(() => this.setState((s) => ({ d: ((s.d || 0) + 1) % DOING.length })), 2400);
    this.skyY = -1;
    this.skyP = 0;
    this.skyTL = !!(win.CSS && win.CSS.supports && win.CSS.supports("animation-timeline: scroll()"));
    const loop = () => {
      const y = win.scrollY || 0;
      if (y !== this.skyY) {
        this.skyY = y;
        const de = win.document.documentElement;
        this.skyP = Math.min(1, Math.max(0, y / Math.max(1, de.scrollHeight - win.innerHeight)));
      }
      if (this.reduce || !this.skyTL)
        [this.sky, this.skyFg, this.nav, this.band].forEach((el) => {
          if (!el) return;
          if (this.reduce) {
            const n = this.skyP > 0.5;
            if (n !== el.hasAttribute("data-night")) el.toggleAttribute("data-night", n);
          } else {
            const v = this.skyP.toFixed(4);
            if (el.style.getPropertyValue("--p") !== v) el.style.setProperty("--p", v);
          }
        });
      if (this.avaSayUntil || this.avaPolUntil) {
        const el = win.document.querySelector(".hero-art");
        const now = Date.now();
        if (el) {
          const say = now < (this.avaSayUntil || 0);
          const pol = now < (this.avaPolUntil || 0);
          if (say !== el.hasAttribute("data-say")) el.toggleAttribute("data-say", say);
          if (pol !== el.hasAttribute("data-pol")) el.toggleAttribute("data-pol", pol);
          if (!!this.avaNight !== el.hasAttribute("data-night"))
            el.toggleAttribute("data-night", !!this.avaNight);
          if (this.snapped && !el.hasAttribute("data-snapped")) el.setAttribute("data-snapped", "");
          const b = el.querySelector(".ava-say");
          if (say && b && b.textContent !== this.avaSay) b.textContent = this.avaSay;
          const c = el.querySelector(".pol-cap");
          if (this.avaCap && c && c.textContent !== this.avaCap) c.textContent = this.avaCap;
          if (!say && !pol) {
            this.avaSayUntil = 0;
            this.avaPolUntil = 0;
          }
        }
      }
      const road = this.road;
      const pin = road ? road.closest(".road-pin") : null;
      if (road && pin) {
        if (this.roadW !== road.scrollWidth || this.roadVW !== win.innerWidth || this.roadVH !== win.innerHeight || this.roadPin !== pin) {
          this.roadW = road.scrollWidth;
          this.roadVW = win.innerWidth;
          this.roadVH = win.innerHeight;
          this.roadPin = pin;
          this.roadDist = Math.max(0, road.scrollWidth - pin.clientWidth);
          pin.style.height = win.innerHeight + this.roadDist + "px";
          pin.classList.add("road-js");
        }
        const r = pin.getBoundingClientRect();
        const d = this.roadDist || 0;
        const q = d ? Math.min(1, Math.max(0, -r.top / d)) : 0;
        if (q !== this.roadQ) {
          this.roadQ = q;
          road.style.transform = "translate3d(" + (-q * d).toFixed(1) + "px,0,0)";
          const bar = pin.querySelector(".road-prog");
          if (bar) bar.style.setProperty("--rp", q.toFixed(4));
        }
      }
      this.raf = win.requestAnimationFrame(loop);
    };
    this.raf = win.requestAnimationFrame(loop);
    this.strike = (bx) => {
      const nav = this.nav;
      if (!nav || this.reduce) return;
      const x = bx == null ? 22 + Math.random() * 56 : bx;
      nav.style.setProperty("--bx", x.toFixed(1) + "%");
      const R = Math.random;
      const pts = [[30, 0]];
      let px = 30;
      let py = 0;
      while (py < 108) {
        py = Math.min(118, py + 7 + R() * 11);
        px = Math.min(52, Math.max(8, px + (R() - 0.5) * 20));
        pts.push([px, py]);
      }
      const k = 2 + Math.floor(R() * 2);
      const fx0 = pts[k][0];
      const fy0 = pts[k][1];
      const dir = R() < 0.5 ? -1 : 1;
      const fork = [[fx0, fy0]];
      let fx = fx0;
      let fy = fy0;
      for (let i = 0; i < 3; i++) {
        fx = Math.min(58, Math.max(2, fx + dir * (5 + R() * 7)));
        fy += 8 + R() * 8;
        fork.push([fx, fy]);
      }
      const toD = (a) => "M" + a.map((q) => q[0].toFixed(1) + " " + q[1].toFixed(1)).join(" L");
      const main2 = toD(pts);
      const br = toD(fork);
      nav.querySelectorAll(".cn-bolt .bh,.cn-bolt .bc").forEach((el) => el.setAttribute("d", main2));
      nav.querySelectorAll(".cn-bolt .bbh,.cn-bolt .bbc").forEach((el) => el.setAttribute("d", br));
      const cloud = nav.querySelector(".cloudnav");
      const r = cloud ? cloud.getBoundingClientRect() : null;
      if (this.sky && r) this.sky.style.setProperty("--bxv", Math.round(r.left + r.width * x / 100) + "px");
      [nav, this.sky].forEach((el) => {
        if (!el) return;
        el.removeAttribute("data-strike");
        void el.offsetWidth;
        el.setAttribute("data-strike", "");
      });
      clearTimeout(this.st);
      this.st = setTimeout(
        () => [nav, this.sky].forEach((el) => el && el.removeAttribute("data-strike")),
        800
      );
    };
    const doc2 = win.document;
    if (!this.reduce) {
      const next = (first) => {
        const wait = (first ? 5e3 : 9e3) + Math.random() * 9e3 * (this.skyP > 0.5 ? 0.7 : 1);
        this.lt = setTimeout(() => {
          if (!doc2.hidden && !this.state.menu && this.state.intro === "off") this.strike();
          next(false);
        }, wait);
      };
      next(true);
      this.pulse = (el, attr, ms) => {
        if (!el) return;
        el.removeAttribute(attr);
        void el.offsetWidth;
        el.setAttribute(attr, "");
        clearTimeout(this["t" + attr]);
        this["t" + attr] = setTimeout(() => el.removeAttribute(attr), ms);
      };
      this.shoot = () => {
        const fg = this.skyFg;
        if (!fg) return;
        fg.style.setProperty("--sx", (35 + Math.random() * 55).toFixed(1) + "%");
        fg.style.setProperty("--sy", Math.round(6 + Math.random() * 40) + "px");
        this.pulse(fg, "data-shoot", 1200);
      };
      const stars = () => {
        this.ss = setTimeout(
          () => {
            if (!doc2.hidden && this.skyP > 0.55) this.shoot();
            stars();
          },
          6e3 + Math.random() * 7e3
        );
      };
      stars();
      this.onBodyClick = (e) => {
        const t = e.target;
        if (!(t.closest && t.closest(".sk-b"))) return;
        if (this.skyP > 0.5) this.shoot();
        else this.pulse(this.skyFg, "data-flare", 950);
      };
      this.onCloudClick = (e) => {
        const t = e.target;
        const cloud = t.closest && t.closest(".cloudnav");
        if (!cloud || t.closest("a,button")) return;
        const r = cloud.getBoundingClientRect();
        this.strike(Math.min(90, Math.max(10, (e.clientX - r.left) / r.width * 100)));
      };
      this.onCloudMove = (e) => {
        if (e.pointerType !== "mouse" || !this.nav) return;
        const t = e.target;
        const cloud = t.closest && t.closest(".cloudnav");
        if (!cloud) {
          if (this.mxOn) {
            this.mxOn = false;
            this.nav.style.setProperty("--mx", "0");
            this.nav.style.setProperty("--my", "0");
          }
          return;
        }
        const r = cloud.getBoundingClientRect();
        this.mxOn = true;
        this.nav.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 2 - 1).toFixed(2));
        this.nav.style.setProperty("--my", ((e.clientY - r.top) / r.height * 2 - 1).toFixed(2));
      };
      doc2.addEventListener("click", this.onBodyClick);
      doc2.addEventListener("click", this.onCloudClick);
      doc2.addEventListener("pointermove", this.onCloudMove, { passive: true });
    }
    {
      const art = () => doc2.querySelector(".hero-art");
      const lines = [
        "Got you! Ẹ kú àbọ̀",
        "Perfect shot!",
        "You look great, abeg",
        "One more? Okay, last one",
        "Framed. Welcome in!"
      ];
      let n = 0;
      const sayFor = (el, text2, ms) => {
        this.avaSay = text2;
        this.avaSayUntil = Date.now() + ms;
        const b = el.querySelector(".ava-say");
        if (b) b.textContent = text2;
        el.setAttribute("data-say", "");
      };
      const restart = (el, attr) => {
        el.removeAttribute(attr);
        void el.offsetWidth;
        el.setAttribute(attr, "");
      };
      this.snap = () => {
        const el = art();
        if (!el || this.snapBusy) return;
        this.snapBusy = true;
        this.snapped = true;
        el.setAttribute("data-snapped", "");
        const ct = el.querySelector(".chip-t");
        if (ct) ct.textContent = "Snap again";
        const h = (/* @__PURE__ */ new Date()).getHours();
        const night = h >= 18 || h < 7;
        this.avaNight = night;
        el.toggleAttribute("data-night", night);
        this.avaPolUntil = 0;
        el.removeAttribute("data-pol");
        if (!this.reduce) restart(el, "data-snap");
        sayFor(el, "Say cheese!", 900);
        const fr = doc2.querySelector(".snap-frame");
        if (fr && !this.reduce) {
          restart(fr, "data-on");
          setTimeout(() => fr.removeAttribute("data-on"), 1150);
        }
        const fire = () => {
          if (!this.reduce) {
            const f = doc2.querySelector(".snap-flash");
            const r = el.getBoundingClientRect();
            if (f) {
              f.style.setProperty("--fx", Math.round(r.left + r.width * 0.426) + "px");
              f.style.setProperty("--fy", Math.round(r.top + r.height * 0.676) + "px");
              restart(f, "data-on");
              setTimeout(() => f.removeAttribute("data-on"), 500);
            }
          }
          const stamp = String(h).padStart(2, "0") + ":" + String((/* @__PURE__ */ new Date()).getMinutes()).padStart(2, "0");
          this.avaCap = "Snapped you · " + stamp;
          const cap = el.querySelector(".pol-cap");
          if (cap) cap.textContent = this.avaCap;
          setTimeout(
            () => {
              this.avaPolUntil = Date.now() + 5400;
              restart(el, "data-pol");
              sayFor(el, lines[n++ % lines.length], 2600);
            },
            this.reduce ? 0 : 140
          );
        };
        this.snapT1 = setTimeout(fire, this.reduce ? 200 : 780);
        this.snapT2 = setTimeout(
          () => {
            el.removeAttribute("data-snap");
            this.snapBusy = false;
          },
          this.reduce ? 400 : 1750
        );
      };
      this.onAvaClick = (e) => {
        const t = e.target;
        if (t.closest && t.closest(".ava-hit,.ava-chip,.ava-note")) this.snap();
      };
      doc2.addEventListener("click", this.onAvaClick);
      if (!this.reduce) {
        this.onAvaMove = (e) => {
          if (e.pointerType !== "mouse") return;
          const el = art();
          if (!el) return;
          const r = el.getBoundingClientRect();
          const near = e.clientX > r.left - 200 && e.clientX < r.right + 200 && e.clientY > r.top - 200 && e.clientY < r.bottom + 200;
          const tx = near ? Math.max(-1, Math.min(1, (e.clientX - r.left) / r.width * 2 - 1)) : 0;
          const ty = near ? Math.max(-1, Math.min(1, (e.clientY - r.top) / r.height * 2 - 1)) : 0;
          el.style.setProperty("--tx", tx.toFixed(2));
          el.style.setProperty("--ty", ty.toFixed(2));
        };
        doc2.addEventListener("pointermove", this.onAvaMove, { passive: true });
        const hint = (wait) => {
          this.hintT = setTimeout(() => {
            const el = art();
            if (!el || this.snapped) return;
            const r = el.getBoundingClientRect();
            const visible = r.bottom > 80 && r.top < win.innerHeight - 80;
            if (visible && !doc2.hidden && this.state.intro === "off") {
              restart(el, "data-hint");
              this.hints = (this.hints || 0) + 1;
              sayFor(el, this.hints % 2 ? "Tap me, I’ll snap you!" : "Psst... say cheese?", 2600);
              setTimeout(() => el.removeAttribute("data-hint"), 950);
            }
            hint(14e3);
          }, wait);
        };
        hint(this.props.data.intro ? 3500 + 3400 : 3500);
      }
    }
    const countUp = () => {
      if (this.counted) return;
      this.counted = true;
      const start = win.performance.now();
      const step = (now) => {
        const p = this.reduce ? 1 : Math.min(1, (now - start) / 1800);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        this.setState({ n1: Math.round(99 * e), n2: Math.round(25 * e), n3: Math.round(12 * e) });
        if (p < 1) this.raf2 = win.requestAnimationFrame(step);
      };
      this.raf2 = win.requestAnimationFrame(step);
    };
    if (win.IntersectionObserver && this.stats) {
      this.io2 = new win.IntersectionObserver(
        (es) => {
          if (es.some((x) => x.isIntersecting)) {
            countUp();
            this.io2.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      this.io2.observe(this.stats);
    } else countUp();
  }
  componentDidUpdate() {
    this.scan();
  }
  componentWillUnmount() {
    for (const t of ["timer"]) clearInterval(this[t]);
    for (const t of [
      "bt",
      "bt2",
      "tt",
      "tt2",
      "i1",
      "i2",
      "i3",
      "lt",
      "st",
      "ss",
      "hintT",
      "snapT1",
      "snapT2"
    ])
      clearTimeout(this[t]);
    window.cancelAnimationFrame(this.raf);
    window.cancelAnimationFrame(this.raf2);
    const doc2 = document;
    for (const [type, fn] of [
      ["click", this.onAvaClick],
      ["click", this.onCloudClick],
      ["click", this.onBodyClick],
      ["pointermove", this.onAvaMove],
      ["pointermove", this.onCloudMove]
    ]) {
      if (fn) doc2.removeEventListener(type, fn);
    }
    if (this.io) this.io.disconnect();
    if (this.io2) this.io2.disconnect();
  }
  async sendChat(intent, label) {
    const email = String(this.state.chatEmail || "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      this.setState({ chatError: "That email doesn’t look right. Mind checking it?" });
      return;
    }
    this.setState({ chatSending: true, chatError: "" });
    const local = email.split("@")[0] ?? "";
    const token = await turnstileToken(this.props.data.turnstileSiteKey);
    const r = await sendContact({
      name: local.length >= 2 ? local.slice(0, 80) : "Chat visitor",
      email,
      intent,
      message: `Picked “${label}” in the playful chat. Reply to this email to continue.`,
      source: "chat",
      website: "",
      ...token ? { turnstileToken: token } : {}
    });
    this.setState(
      r.ok ? { chatSending: false, chatSent: true } : { chatSending: false, chatError: r.error.message }
    );
  }
  renderVals() {
    const s = this.state || {};
    const data = this.props.data;
    const rot2 = (n, cur, i) => {
      const k = (i - cur + n) % n;
      if (k === 0) return { st: "opacity:1;transform:none;filter:blur(0)", hid: false };
      if (k === n - 1) return { st: "opacity:0;transform:translateY(-70%);filter:blur(6px)", hid: true };
      return { st: "opacity:0;transform:translateY(70%);filter:blur(6px)", hid: true };
    };
    const first = data.profile.name.split(" ")[0] ?? "Oluwaseyi";
    const line1 = "Hi, I'm".split("").map((ch2, i) => ({ ch: ch2 === " " ? " " : ch2, d: (0.1 + i * 0.05).toFixed(2) + "s" }));
    const line2 = first.split("").map((ch2, i) => ({ ch: ch2, d: (0.65 + i * 0.06).toFixed(2) + "s", c: SHADOWS[i % SHADOWS.length] }));
    const doing = DOING.map((x, i) => ({ ...x, ...rot2(DOING.length, s.d || 0, i) }));
    const palette = ["#FF7A3D", "#FFD23F", "#2EC4A0", "#5BC0EB", "#F25F8B", "#1B1A2E"];
    const confetti = Array.from({ length: 28 }, (_, i) => {
      const a = i / 28 * Math.PI * 2 + i % 3 * 0.2;
      const dist = 90 + i * 37 % 110;
      return {
        x: Math.round(Math.cos(a) * dist) + "px",
        y: Math.round(Math.sin(a) * dist - 40) + "px",
        r: i * 53 % 540 - 270 + "deg",
        s: 8 + i % 4 * 3 + "px",
        h: (i % 2 ? 8 : 14) + "px",
        br: i % 3 === 0 ? "50%" : "3px",
        col: palette[i % palette.length],
        d: (i % 5 * 0.02).toFixed(2) + "s"
      };
    });
    const sayHi = () => {
      clearTimeout(this.bt);
      clearTimeout(this.bt2);
      this.setState({ burst: false });
      this.bt = setTimeout(() => this.setState({ burst: true }), 20);
      this.bt2 = setTimeout(() => this.setState({ burst: false }), 1500);
    };
    const tape = TAPE_WORDS.concat(TAPE_WORDS).map((t) => ({ t }));
    const tape2 = TAPE_NOTES.concat(TAPE_NOTES, TAPE_NOTES, TAPE_NOTES).map((t) => ({ t }));
    const loves = LOVES.map((l) => ({
      ...l,
      isC: l.k === "C",
      isD: l.k === "D",
      isDa: l.k === "Da",
      isB: l.k === "B"
    }));
    const ti = s.time || 0;
    const times = DAYS.map((d, i) => ({
      t: d.t,
      pressed: i === ti,
      pick: () => this.setState({ time: i }),
      style: i === ti ? "background:#1B1A2E;color:#FFF6E5" : "background:rgba(255,255,255,.85);color:#1B1A2E"
    }));
    const projects = data.projects.slice(0, 4).map((p, i) => ({ ...cardFor(p, i), top: 110 + i * 26 + "px", z: i + 1 }));
    const nums = NUMS.map((n, i) => ({ ...n, v: n.live ? `${[s.n1, s.n2, s.n3][i] || 0}${n.v}` : n.v, i }));
    const ch = INTENTS.find((x) => x.id === s.choice);
    const intents = INTENTS.map((x) => ({
      label: x.label,
      bg: x.bg,
      pick: () => {
        clearTimeout(this.tt);
        this.setState({ choice: x.id, typing: true, chatSent: false, chatError: "" });
        this.tt = setTimeout(() => this.setState({ typing: false }), 1300);
      }
    }));
    const intro = s.intro || "off";
    const night = s.sky === "night";
    const hr = s.hour ?? 10;
    const greeting = night ? hr >= 17 && hr < 22 ? "good evening, welcome in!" : "up late? welcome in!" : hr < 12 ? "good morning, welcome in!" : hr < 17 ? "good afternoon, welcome in!" : "hey, welcome in!";
    const starPts = [
      [8, 12],
      [18, 30],
      [27, 8],
      [36, 72],
      [44, 18],
      [58, 84],
      [66, 10],
      [74, 40],
      [82, 22],
      [90, 66],
      [12, 80],
      [50, 58],
      [94, 12],
      [30, 48]
    ];
    const stars = starPts.map((p, i) => ({
      x: p[0] + "%",
      y: p[1] + "%",
      s: (i % 3 === 0 ? 4 : 2) + "px",
      c: i % 4 === 0 ? "#FFD23F" : "#FFF6E5",
      d: (i * 0.37 % 2.6).toFixed(2) + "s"
    }));
    const introLetters = first.split("").map((c, i) => ({ ch: c, d: (0.55 + i * 0.08).toFixed(2) + "s", c: SHADOWS[i % SHADOWS.length] }));
    const menu = !!s.menu;
    const menuLinks = [
      ["/work", "Things I made"],
      ["/about", "My story"],
      ["/writing", "Writing"],
      ["/contact", "Say hi"],
      ["/?mode=serious", "Serious mode"]
    ].map(([href, t], i) => ({ href, t, i: i + 1 }));
    const chatStatus = s.chatSent ? /* @__PURE__ */ jsx(
      "p",
      {
        id: "hi-status",
        role: "status",
        className: "msg",
        style: {
          margin: "8px 0 0",
          alignSelf: "flex-start",
          padding: "12px 16px",
          borderRadius: "22px 22px 22px 6px",
          background: "#FFD23F",
          fontSize: 16
        },
        children: "Got it! I’ll be in touch soon."
      }
    ) : /* @__PURE__ */ jsx(
      "p",
      {
        id: "hi-status",
        role: s.chatError ? "alert" : "status",
        style: { margin: "6px 0 0", fontSize: 14, color: "#B42318", minHeight: s.chatError ? void 0 : 0 },
        children: s.chatError
      }
    );
    return {
      line1,
      line2,
      doing,
      confetti,
      burst: !!s.burst,
      sayHi,
      tape,
      tape2,
      loves,
      times,
      dayNow: DAYS[ti],
      projects,
      nums,
      notes: NOTES,
      road: ROAD,
      intents,
      noChoice: !ch,
      hasChoice: !!ch,
      choiceLabel: ch ? ch.label : "",
      typing: !!(ch && s.typing),
      replied: !!(ch && !s.typing),
      reply: ch ? ch.reply : "",
      chatEmail: s.chatEmail,
      onChatEmail: (e) => this.setState({ chatEmail: e.target.value, chatError: "" }),
      chatInvalid: !!s.chatError,
      chatSending: !!s.chatSending,
      chatSendLabel: s.chatSending ? "Sending…" : s.chatSent ? "Sent" : "Send",
      sendChat: () => ch && !s.chatSending && !s.chatSent && void this.sendChat(ch.id, ch.label),
      chatStatus,
      resetChat: () => this.setState({ choice: null, typing: false, chatSent: false, chatError: "" }),
      isNight: night,
      isDay: !night,
      stars,
      greeting,
      introBg: night ? "background-color:#14152B;background-image:radial-gradient(rgba(255,246,229,.07) 1.3px,transparent 1.3px)" : "background-color:#FFF6E5;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px)",
      introInk: night ? "#FFF6E5" : "#1B1A2E",
      introFx: night ? "-webkit-text-stroke:10px #14152B;paint-order:stroke fill" : "",
      greetFx: night ? "padding:2px 18px;border-radius:999px;background:#14152B" : "",
      showToast: !!s.toast && intro === "off",
      hideToast: () => this.setState({ toast: false }),
      introShow: intro !== "off",
      introCls: intro === "leave" ? "leave" : "",
      heroClass: "",
      introLetters,
      skipIntro: () => {
        clearTimeout(this.i1);
        clearTimeout(this.i2);
        this.setState({ intro: "leave" });
        this.i2 = setTimeout(() => this.endIntro(true), 560);
      },
      replayIntro: () => {
        clearTimeout(this.i3);
        window.scrollTo({ top: 0 });
        this.setState({ intro: "off", toast: false });
        this.i3 = setTimeout(() => {
          this.setState({ intro: "on" });
          this.playIntro();
        }, 30);
      },
      rootCls: s.rvOn ? "rv-on" : "",
      menuCls: "menu" + (menu ? " open" : ""),
      menuHidden: !menu,
      menuOpen: menu,
      menuLabel: menu ? "Close menu" : "Open menu",
      burgerCls: "burger" + (menu ? " x" : ""),
      menuLinks,
      toggleMenu: () => this.setState({ menu: !this.state.menu }),
      closeMenu: () => this.setState({ menu: false }),
      setRoot: (el) => {
        this.root = el;
      },
      setNav: (el) => {
        this.nav = el;
      },
      setSky: (el) => {
        this.sky = el;
      },
      setSkyFg: (el) => {
        this.skyFg = el;
      },
      setBand: (el) => {
        this.band = el;
      },
      setStats: (el) => {
        this.stats = el;
      },
      setRoad: (el) => {
        this.road = el;
      }
    };
  }
  render() {
    return /* @__PURE__ */ jsx(PlayfulHomeView, { v: this.renderVals() });
  }
}
function SeriousHomeView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("main", { ref: v.setRoot, className: v.rootCls, style: css("position:relative;background:transparent;color:#F3EFE7;font-family:'Geist',system-ui,sans-serif;min-height:100dvh;overflow-x:clip;width:100%;max-width:100%"), children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { "aria-hidden": "true", ref: v.setSpot, style: css("position:fixed;left:0;top:0;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,.085) 0%,rgba(245,165,36,.025) 38%,transparent 66%);pointer-events:none;z-index:0;transform:translate3d(-450px,-450px,0)") }),
    /* @__PURE__ */ jsxs("svg", { "aria-hidden": "true", style: css("position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;opacity:.05"), children: [
      /* @__PURE__ */ jsx("filter", { id: "grain", children: /* @__PURE__ */ jsx("feTurbulence", { type: "fractalNoise", baseFrequency: ".85", numOctaves: "3", stitchTiles: "stitch" }) }),
      /* @__PURE__ */ jsx("rect", { width: "100%", height: "100%", filter: "url(#grain)" })
    ] }),
    /* @__PURE__ */ jsx("div", { "aria-hidden": "true", className: v.ringCls, ref: v.setRing }),
    /* @__PURE__ */ jsx("div", { ref: v.setNav, style: css("position:fixed;top:18px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none;transition:transform 700ms var(--spring)"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", className: "enter", style: css("pointer-events:auto;display:flex;align-items:center;gap:4px;padding:6px 6px 6px 18px;border-radius:999px;background:rgba(16,19,25,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 50px -20px rgba(0,0,0,.6)"), children: [
      /* @__PURE__ */ jsxs("a", { href: "#top", style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#F3EFE7;font:400 24px/1 'Instrument Serif',serif;padding:4px 10px 4px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "Oluwaseyi Oshunwusi", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px rgba(245,165,36,.55)") }),
        "oluwaseyi",
        /* @__PURE__ */ jsx("span", { style: css("color:#F5A524"), children: "." })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "hide-sm", "aria-hidden": "true", style: css("position:relative;width:7px;height:7px;margin:0 8px 0 2px"), children: [
        /* @__PURE__ */ jsx("span", { className: "ping" }),
        /* @__PURE__ */ jsx("span", { style: css("position:absolute;inset:0;border-radius:50%;background:#3DDC97") })
      ] }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/work", children: "Work" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/about", children: "About" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/writing", children: "Writing" }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "/contact", children: "Contact" }),
      /* @__PURE__ */ jsx("a", { className: "navlink", href: "/?mode=playful", style: css("color:#F5A524"), children: "Playful" }),
      /* @__PURE__ */ jsxs("button", { type: "button", className: v.burgerCls, onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: [
        /* @__PURE__ */ jsx("span", {}),
        /* @__PURE__ */ jsx("span", {})
      ] })
    ] }) }),
    /* @__PURE__ */ jsx("div", { className: v.menuCls, "aria-hidden": v.menuHidden, children: /* @__PURE__ */ jsxs("div", { style: css("height:100%;display:flex;flex-direction:column;justify-content:center;padding:120px clamp(24px,8vw,120px) 64px;box-sizing:border-box"), children: [
      /* @__PURE__ */ jsx("p", { className: "ml", style: css("--i:0;margin:0 0 28px"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Where to" }) }),
      (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: "ml", href: ml.href, onClick: v.closeMenu, style: css(`--i:${ml.i ?? ""};color:#F3EFE7;text-decoration:none;font:400 clamp(44px,7vw,96px)/1.08 'Instrument Serif',serif;letter-spacing:-0.02em;padding:4px 0`), children: ml.t }) }, ml_i)),
      /* @__PURE__ */ jsx("p", { className: "ml", style: css("--i:7;margin:40px 0 0;color:#A9AEB9;font-size:15px"), children: "Community · Business Development · Data · Ventures" })
    ] }) }),
    /* @__PURE__ */ jsxs("div", { style: css("position:relative;z-index:1"), children: [
      /* @__PURE__ */ jsxs("section", { id: "top", style: css("position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:128px 24px 72px;box-sizing:border-box;text-align:center;overflow:hidden"), children: [
        /* @__PURE__ */ jsxs("div", { "aria-hidden": "true", style: css("position:absolute;inset:0;pointer-events:none"), children: [
          /* @__PURE__ */ jsx("div", { ref: v.setOrbA, style: css("position:absolute;top:-160px;right:-120px"), children: /* @__PURE__ */ jsx("div", { className: "orb1", style: css("width:640px;height:640px;border-radius:50%;background:#F5A524;filter:blur(170px);opacity:.15") }) }),
          /* @__PURE__ */ jsx("div", { ref: v.setOrbB, style: css("position:absolute;bottom:-160px;left:-160px"), children: /* @__PURE__ */ jsx("div", { className: "orb2", style: css("width:520px;height:520px;border-radius:50%;background:#3DDC97;filter:blur(170px);opacity:.08") }) }),
          /* @__PURE__ */ jsx("div", { className: "gridbg", style: css("position:absolute;inset:0") }),
          /* @__PURE__ */ jsxs("div", { style: css("position:absolute;left:50%;top:50%;width:min(130vw,1180px);aspect-ratio:1;transform:translate(-50%,-50%)"), children: [
            /* @__PURE__ */ jsx("div", { className: "spin", style: css("position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)"), children: /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#F5A524;box-shadow:0 0 24px rgba(245,165,36,.9)") }) }),
            /* @__PURE__ */ jsx("div", { className: "spin-rev", style: css("position:absolute;inset:14%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)"), children: /* @__PURE__ */ jsx("span", { style: css("position:absolute;bottom:12%;right:6%;width:6px;height:6px;border-radius:50%;background:#3DDC97;box-shadow:0 0 18px rgba(61,220,151,.9)") }) }),
            /* @__PURE__ */ jsx("div", { className: "spin", style: css("position:absolute;inset:30%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)") })
          ] }),
          /* @__PURE__ */ jsx("div", { style: css("position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(7,8,11,0) 0%,rgba(7,8,11,.35) 60%,rgba(7,8,11,.55) 95%)") })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("position:relative;width:100%;max-width:1200px"), children: [
          /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0;animation-delay:.15s"), children: /* @__PURE__ */ jsxs("span", { className: "eyebrow", children: [
            /* @__PURE__ */ jsx("span", { className: "hide-sm", children: "Web3 community & growth · Built in Lagos, working across Africa" }),
            /* @__PURE__ */ jsx("span", { className: "show-sm", children: "Web3 community & growth · Africa" })
          ] }) }),
          /* @__PURE__ */ jsxs("h1", { "aria-label": "Oluwaseyi Oshunwusi", style: css("margin:28px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(76px,12.5vw,196px);line-height:.88;letter-spacing:-0.03em"), children: [
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:block;white-space:nowrap"), children: (v.letters ?? []).map((l, l_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "mask", children: /* @__PURE__ */ jsx("span", { className: "mask-up", style: css(`animation-delay:${l.d ?? ""}`), children: l.ch }) }) }, l_i)) }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "mask", style: css("display:block;font-style:italic;color:#8C929E;font-size:.42em;letter-spacing:-0.01em;margin-top:.06em"), children: /* @__PURE__ */ jsx("span", { className: "mask-up", style: css("animation-delay:.65s"), children: "Oshunwusi" }) })
          ] }),
          /* @__PURE__ */ jsx("svg", { className: "underline", "aria-hidden": "true", viewBox: "0 0 400 24", preserveAspectRatio: "none", style: css("display:block;width:min(70%,560px);height:18px;margin:4px auto 0"), children: /* @__PURE__ */ jsx("path", { d: "M2 16C80 6 180 4 260 9s110 8 136 2", pathLength: "1", fill: "none", stroke: "#F5A524", strokeWidth: "2.5", strokeLinecap: "round" }) }),
          /* @__PURE__ */ jsxs("p", { className: "enter", style: css("animation-delay:.95s;margin:34px auto 0;font-family:'Instrument Serif',serif;font-size:clamp(28px,3.2vw,42px);line-height:1.15;display:flex;flex-wrap:wrap;justify-content:center;gap:0 .28em;align-items:baseline"), children: [
            /* @__PURE__ */ jsx("span", { children: "I" }),
            /* @__PURE__ */ jsx("span", { style: css("display:inline-grid;overflow:hidden;padding:0 .04em .1em 0;text-align:left"), children: (v.words ?? []).map((wd, wd_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": wd.hid, style: css(`grid-area:1/1;font-style:italic;color:${v.accent ?? ""};white-space:nowrap;transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);${wd.st ?? ""}`), children: wd.t }) }, wd_i)) })
          ] }),
          /* @__PURE__ */ jsx("p", { className: "enter", style: css("animation-delay:1.1s;margin:20px auto 0;max-width:620px;font-size:18px;line-height:1.65;color:#A9AEB9"), children: "I help exchanges and Web3 projects win in Africa. At WEEX I grew the community from zero to 25,000+ in under a year and turned 7,000+ members into active futures traders. Before that, I helped launch Gate.io P2P in Nigeria." }),
          /* @__PURE__ */ jsxs("div", { className: "enter", style: css("animation-delay:1.25s;display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:40px"), children: [
            /* @__PURE__ */ jsx("a", { className: "pbtn solid", href: "#work", onPointerMove: v.magnet, onPointerLeave: v.unmagnet, children: /* @__PURE__ */ jsxs("span", { className: "mag", children: [
              "See the proof",
              /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
                /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
                /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
              ] }) })
            ] }) }),
            /* @__PURE__ */ jsx("a", { className: "pbtn ghost", href: "/contact", onPointerMove: v.magnet, onPointerLeave: v.unmagnet, children: /* @__PURE__ */ jsxs("span", { className: "mag", children: [
              "Work with me",
              /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
                /* @__PURE__ */ jsx("path", { d: "M5 12h14" }),
                /* @__PURE__ */ jsx("path", { d: "M13 6l6 6-6 6" })
              ] }) })
            ] }) })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { "aria-hidden": "true", className: "hide-sm", style: css("position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:1px;height:40px;background:rgba(255,255,255,.1);overflow:hidden"), children: /* @__PURE__ */ jsx("span", { className: "cue", style: css("position:absolute;inset:0;background:#F5A524") }) })
      ] }),
      /* @__PURE__ */ jsx("section", { "aria-label": "In a sentence", className: "mf", style: css("view-timeline-name:--mf;padding:136px 24px 120px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsx("p", { "data-r": "", style: css("margin:0 0 36px"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "In a sentence" }) }),
        /* @__PURE__ */ jsx("p", { className: "mf-text", children: (v.manifesto ?? []).map((tk, tk_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("span", { className: "w", style: css(`--p:${tk.p ?? ""}`), children: [
          tk.isWord ? /* @__PURE__ */ jsx(Fragment, { children: tk.t }) : null,
          tk.isFace ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;overflow:hidden;background:#1B1F27;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)"), children: /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", style: css("width:100%;height:100%;object-fit:cover;object-position:50% 30%") }) }) }) : null,
          tk.isChat ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;gap:.12em;width:1.7em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#1A1F29;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)"), children: [
            /* @__PURE__ */ jsx("span", { className: "dt" }),
            /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.15s") }),
            /* @__PURE__ */ jsx("span", { className: "dt", style: css("animation-delay:.3s") })
          ] }) }) : null,
          tk.isDeal ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#1A1F29;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)"), children: /* @__PURE__ */ jsxs("svg", { viewBox: "0 0 40 20", style: css("width:1.1em;height:.55em"), children: [
            /* @__PURE__ */ jsx("circle", { cx: "15", cy: "10", r: "7", fill: "none", stroke: "#F5A524", strokeWidth: "2" }),
            /* @__PURE__ */ jsx("circle", { cx: "25", cy: "10", r: "7", fill: "none", stroke: "#F3EFE7", strokeWidth: "2" })
          ] }) }) }) : null,
          tk.isChart ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("span", { "aria-hidden": "true", style: css("display:inline-flex;align-items:flex-end;justify-content:center;gap:.06em;width:1.7em;height:.92em;padding-bottom:.2em;box-sizing:border-box;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#0F2A20;box-shadow:inset 0 0 0 1px rgba(61,220,151,.3)"), children: [
            /* @__PURE__ */ jsx("span", { className: "bar", style: css("width:.12em;height:.4em;background:#3DDC97;border-radius:2px") }),
            /* @__PURE__ */ jsx("span", { className: "bar", style: css("width:.12em;height:.5em;background:#3DDC97;border-radius:2px;animation-delay:.2s") }),
            /* @__PURE__ */ jsx("span", { className: "bar", style: css("width:.12em;height:.35em;background:#3DDC97;border-radius:2px;animation-delay:.4s") }),
            /* @__PURE__ */ jsx("span", { className: "bar", style: css("width:.12em;height:.55em;background:#3DDC97;border-radius:2px;animation-delay:.6s") })
          ] }) }) : null
        ] }) }, tk_i)) })
      ] }) }),
      /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-sides", style: css("padding:24px 24px 96px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px"), children: [
          /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Four disciplines" }),
            /* @__PURE__ */ jsxs("h2", { id: "h-sides", style: css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em"), children: [
              "Four skills, ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#8C929E"), children: "one outcome: growth." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { "data-r": "", style: css("--i:1;margin:0;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9"), children: /* @__PURE__ */ jsx("span", { className: "hide-sm", children: "Hover or tap a side to open it." }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "acc", "data-r": "", style: css("--i:2"), role: "list", children: (v.pillars ?? []).map((pl, pl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "slice shell", role: "listitem", tabIndex: 0, onPointerEnter: pl.pick, onClick: pl.pick, onFocus: pl.pick, "aria-expanded": pl.open, style: css(`flex-grow:${pl.grow ?? ""}`), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css(`background:${pl.bg ?? ""}`), children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "pnum", style: css(`position:absolute;top:24px;left:28px;font:italic 400 72px/1 'Instrument Serif',serif;color:${pl.c ?? ""};opacity:.9`), children: pl.n }),
          /* @__PURE__ */ jsx("span", { className: "vlabel", "aria-hidden": "true", style: css(`opacity:${pl.vOp ?? ""}`), children: pl.t }),
          /* @__PURE__ */ jsxs("div", { className: "full", style: css(`opacity:${pl.fOp ?? ""};transform:${pl.fTr ?? ""}`), children: [
            /* @__PURE__ */ jsx("h3", { style: css("margin:0;font:400 clamp(30px,3vw,44px)/1.05 'Instrument Serif',serif"), children: pl.t }),
            /* @__PURE__ */ jsx("p", { style: css("margin:14px 0 18px;max-width:440px;font-size:16px;line-height:1.6;color:#C9CDD6"), children: pl.b }),
            /* @__PURE__ */ jsx("div", { style: css("display:flex;flex-wrap:wrap;gap:6px"), children: (pl.tags ?? []).map((t, t_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "tag", children: t.t }) }, t_i)) })
          ] })
        ] }) }) }, pl_i)) })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "work", "aria-labelledby": "h-work", style: css("padding:104px 24px 96px"), children: /* @__PURE__ */ jsxs("div", { className: "wsplit", children: [
        /* @__PURE__ */ jsxs("div", { className: "pin", style: css("position:sticky;top:120px"), children: [
          /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Built and shipped" }),
            /* @__PURE__ */ jsxs("h2", { id: "h-work", style: css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em"), children: [
              "Proof, ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#8C929E"), children: "not promises." })
            ] }),
            /* @__PURE__ */ jsx("p", { style: css("margin:24px 0 32px;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9"), children: "Real numbers and live links. Start with these three." })
          ] }),
          /* @__PURE__ */ jsx("div", { "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsx("a", { className: "pbtn solid", href: "/work", onPointerMove: v.magnet, onPointerLeave: v.unmagnet, children: /* @__PURE__ */ jsxs("span", { className: "mag", children: [
            "See all 7 projects",
            /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] }) }) }),
          /* @__PURE__ */ jsxs("p", { "data-r": "", style: css("--i:2;margin:24px 0 0;font-size:13px;color:#8C929E"), children: [
            "New public repos join the Work page automatically from ",
            /* @__PURE__ */ jsx("a", { href: "https://github.com/shykeys-data", style: css("color:#F3EFE7"), children: "github.com/shykeys-data" })
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "wgrid", children: (v.projects ?? []).map((p, p_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: "card shell", href: p.href, onPointerMove: v.glow, "data-r": "", children: /* @__PURE__ */ jsxs("div", { className: "core", children: [
          /* @__PURE__ */ jsxs("div", { className: "cover-life cov", style: css(`position:relative;overflow:hidden;background:${p.coverBg ?? ""}99;box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)`), children: [
            /* @__PURE__ */ jsxs("div", { className: "zoom", style: css("position:absolute;inset:0;display:flex;align-items:flex-end;padding:22px 24px;box-sizing:border-box"), children: [
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css(`position:absolute;right:-40px;top:-40px;width:260px;height:260px;border-radius:50%;background:${p.color ?? ""};filter:blur(70px);opacity:.22`) }),
              /* @__PURE__ */ jsx("span", { className: "mk", style: css(`position:relative;font:400 clamp(34px,3.4vw,52px)/1 'Instrument Serif',serif;color:${p.color ?? ""};white-space:nowrap`), children: p.mark })
            ] }),
            /* @__PURE__ */ jsx("span", { style: css("position:absolute;top:20px;left:24px"), className: "tag", children: p.label })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "cbody", style: css("position:relative;padding:20px 22px 22px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px"), children: [
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("h3", { style: css("margin:0;font-size:19px;font-weight:500"), children: p.title }),
              /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 12px;font-size:14px;line-height:1.55;color:#A9AEB9"), children: p.blurb }),
              /* @__PURE__ */ jsx("div", { style: css("display:flex;flex-wrap:wrap;gap:6px"), children: (p.tags ?? []).map((t, t_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "tag", children: t.t }) }, t_i)) })
            ] }),
            /* @__PURE__ */ jsx("span", { className: "ic", "aria-label": p.cta, style: css(`flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:${p.color ?? ""}`), children: /* @__PURE__ */ jsxs("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] })
        ] }) }) }, p_i)) })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "journey", "aria-labelledby": "h-journey", style: css("padding:104px 24px 88px"), children: /* @__PURE__ */ jsxs("div", { className: "wsplit", children: [
        /* @__PURE__ */ jsxs("div", { className: "pin", style: css("position:sticky;top:120px"), children: [
          /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Twelve years on the web" }),
            /* @__PURE__ */ jsxs("h2", { id: "h-journey", style: css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em"), children: [
              "The road ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#8C929E"), children: "so far." })
            ] }),
            /* @__PURE__ */ jsx("p", { style: css("margin:24px 0 28px;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9"), children: "Twelve years of building audiences: first for Lagos businesses online, now for crypto exchanges across Africa." })
          ] }),
          /* @__PURE__ */ jsx("div", { "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsx("a", { className: "pbtn ghost", href: "/about", onPointerMove: v.magnet, onPointerLeave: v.unmagnet, children: /* @__PURE__ */ jsxs("span", { className: "mag", children: [
            "The full story",
            /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] }) }) })
        ] }),
        /* @__PURE__ */ jsx("ol", { className: "jlist", style: css("list-style:none;margin:0;padding:0;position:relative"), children: (v.jobs ?? []).map((jb, jb_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("li", { className: "job", "data-r": "", style: css(`--i:${jb.i ?? ""};position:relative;padding:0 0 ${jb.pad ?? ""} 40px`), children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "jdot", style: css(`position:absolute;left:${jb.dl ?? ""};top:${jb.dt ?? ""};width:${jb.ds ?? ""};height:${jb.ds ?? ""};border-radius:50%;background:${jb.dot ?? ""};box-shadow:0 0 0 5px #07080B`) }),
          jb.full ? /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx("p", { style: css(`margin:0;font:500 12px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${jb.c ?? ""}`), children: jb.when }),
            /* @__PURE__ */ jsx("h3", { style: css("margin:6px 0 2px;font:400 clamp(24px,2.2vw,30px)/1.1 'Instrument Serif',serif"), children: jb.role }),
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font-size:14px;color:#C9CDD6"), children: jb.org }),
            /* @__PURE__ */ jsx("p", { style: css("margin:0;max-width:540px;font-size:14px;line-height:1.6;color:#A9AEB9"), children: jb.note })
          ] }) : null,
          jb.mini ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "jmini", children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8C929E"), children: jb.when }),
            /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-size:15px;color:#E4E1DA"), children: [
              jb.role,
              " ",
              /* @__PURE__ */ jsxs("span", { style: css("color:#8C929E"), children: [
                "· ",
                jb.org
              ] })
            ] })
          ] }) }) : null
        ] }) }, jb_i)) }),
        /* @__PURE__ */ jsx("a", { href: "/about", style: css("display:inline-block;margin:4px 0 0 40px;color:#F3EFE7;font-size:15px;text-underline-offset:4px"), children: "Six more roles, back to 2014 →" })
      ] }) }),
      /* @__PURE__ */ jsx("section", { id: "rhythm", "aria-labelledby": "h-rhythm", style: css("padding:104px 24px 88px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px"), children: [
          /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Live from the group" }),
            /* @__PURE__ */ jsxs("h2", { id: "h-rhythm", style: css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em"), children: [
              "A community that runs ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#8C929E"), children: "on rhythm." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("p", { "data-r": "", style: css("--i:1;margin:0;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9"), children: "WEEX Africa (Official) on Telegram. Today is marked in WAT; tap any day." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "bento", ref: v.setStats, children: [
          /* @__PURE__ */ jsx("div", { className: "b-a shell", "data-r": "", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsxs("div", { role: "group", "aria-label": "Day of the week", style: css("position:relative;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));padding:8px;box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)"), children: [
              /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css(`position:absolute;top:8px;bottom:8px;left:8px;width:calc((100% - 16px) / 7);border-radius:14px;background:rgba(255,255,255,.07);transform:translateX(${v.selX ?? ""});transition:transform 700ms var(--spring)`) }),
              (v.days ?? []).map((dy, dy_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("button", { type: "button", className: "daybtn", onClick: dy.pick, "aria-pressed": dy.pressed, style: css(`color:${dy.col ?? ""}`), children: [
                dy.short,
                dy.today ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { "aria-label": "today", style: css("display:block;width:5px;height:5px;margin:3px auto 0;border-radius:50%;background:#3DDC97") }) }) : null
              ] }) }, dy_i))
            ] }),
            /* @__PURE__ */ jsx("div", { style: css("flex:1;display:grid;padding:clamp(22px,3vw,36px)"), children: (v.panels ?? []).map((pn, pn_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { "aria-hidden": pn.hid, style: css(`grid-area:1/1;${pn.st ?? ""}`), children: [
              /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:24px"), children: [
                /* @__PURE__ */ jsx("h3", { style: css("margin:0;font:400 clamp(34px,3.6vw,50px)/1 'Instrument Serif',serif"), children: pn.name }),
                /* @__PURE__ */ jsx("span", { style: css(`font:500 11px 'Geist',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${pn.badgeC ?? ""}`), children: pn.badge })
              ] }),
              /* @__PURE__ */ jsx("div", { style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px"), children: (pn.items ?? []).map((it, it_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { style: css("padding:18px;border-radius:18px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)"), children: [
                /* @__PURE__ */ jsx("p", { style: css(`margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${it.c ?? ""}`), children: it.when }),
                /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 6px;font-size:17px;font-weight:500"), children: it.name }),
                /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:14px;line-height:1.55;color:#A9AEB9"), children: it.note })
              ] }) }, it_i)) })
            ] }) }, pn_i)) })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "b-s shell stat", "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px"), children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", style: css("align-self:flex-start"), children: "Data" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "num", style: css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums"), children: [
                v.n1,
                /* @__PURE__ */ jsx("span", { style: css("color:#3DDC97"), children: "k" })
              ] }),
              /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:15px;color:#A9AEB9"), children: "e-commerce orders analysed" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "b-s shell stat", "data-r": "", style: css("--i:2"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px"), children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", style: css("align-self:flex-start"), children: "Community" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "num", style: css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums"), children: [
                v.n2,
                /* @__PURE__ */ jsx("span", { style: css("color:#F5A524"), children: "k+" })
              ] }),
              /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:15px;color:#A9AEB9"), children: "WEEX members, from zero in under 12 months" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "b-s shell stat", "data-r": "", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px"), children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", style: css("align-self:flex-start"), children: "Activation" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "num", style: css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums"), children: [
                v.n3,
                /* @__PURE__ */ jsx("span", { style: css("color:#F5A524"), children: "k+" })
              ] }),
              /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:15px;color:#A9AEB9"), children: "members turned futures traders through live classes" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "b-s shell stat", "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px"), children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", style: css("align-self:flex-start"), children: "Since 2014" }),
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsxs("p", { className: "num", style: css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums"), children: [
                v.n4,
                /* @__PURE__ */ jsx("span", { style: css("color:#F5A524"), children: " yrs" })
              ] }),
              /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:15px;color:#A9AEB9"), children: "building for the web" })
            ] })
          ] }) }),
          /* @__PURE__ */ jsx("div", { className: "b-s shell wide", "data-r": "", style: css("--i:2"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px"), children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", style: css("align-self:flex-start"), children: "On my desk" }),
            /* @__PURE__ */ jsx("div", { "aria-live": "polite", style: css("display:grid;overflow:hidden"), children: (v.ticker ?? []).map((tk, tk_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { "aria-hidden": tk.hid, style: css(`grid-area:1/1;transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);${tk.st ?? ""}`), children: [
              /* @__PURE__ */ jsx("p", { style: css(`margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${tk.c ?? ""}`), children: tk.k }),
              /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font:400 30px/1.1 'Instrument Serif',serif"), children: tk.v })
            ] }) }, tk_i)) })
          ] }) })
        ] })
      ] }) }),
      /* @__PURE__ */ jsxs("section", { "aria-label": "Programs", className: "marquee", style: css("padding:24px 0 96px;display:flex;flex-direction:column;gap:14px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)"), children: [
        /* @__PURE__ */ jsx("div", { className: "marquee-track", style: css("display:flex;gap:14px;width:max-content"), children: (v.marquee ?? []).map((m, m_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("span", { style: css("display:inline-flex;align-items:center;gap:12px;padding:16px 24px;border-radius:999px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-size:16px;color:#E3E0D8;white-space:nowrap"), children: [
          /* @__PURE__ */ jsx("span", { style: css("width:6px;height:6px;border-radius:50%;background:#F5A524") }),
          m.t
        ] }) }, m_i)) }),
        /* @__PURE__ */ jsx("div", { className: "marquee-rev", style: css("display:flex;gap:28px;width:max-content"), children: (v.marquee2 ?? []).map((m, m_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("span", { style: css("display:inline-flex;align-items:center;gap:28px;font:italic 400 clamp(32px,4vw,56px) 'Instrument Serif',serif;color:#4A505C;white-space:nowrap"), children: [
          m.t,
          /* @__PURE__ */ jsx("span", { style: css("color:#F5A524;font-style:normal;font-size:.5em"), children: "✦" })
        ] }) }, m_i)) })
      ] }),
      /* @__PURE__ */ jsx("section", { id: "writing", "aria-labelledby": "h-writing", style: css("padding:88px 24px 104px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px"), children: [
          /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
            /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Notes from the work" }),
            /* @__PURE__ */ jsxs("h2", { id: "h-writing", style: css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em"), children: [
              "Thinking ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#8C929E"), children: "out loud." })
            ] })
          ] }),
          /* @__PURE__ */ jsx("a", { "data-r": "", className: "pbtn ghost", href: "/writing", onPointerMove: v.magnet, onPointerLeave: v.unmagnet, style: css("--i:1"), children: /* @__PURE__ */ jsxs("span", { className: "mag", children: [
            "All writing",
            /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M5 12h14" }),
              /* @__PURE__ */ jsx("path", { d: "M13 6l6 6-6 6" })
            ] }) })
          ] }) })
        ] }),
        /* @__PURE__ */ jsx("div", { className: "hscroll", children: (v.posts ?? []).map((po, po_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: "card shell", href: po.href, onPointerMove: v.glow, "data-r": "", style: css(`--i:${po.i ?? ""}`), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("display:flex;flex-direction:column;gap:20px;min-height:250px;padding:26px"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("position:relative;display:flex;justify-content:space-between;align-items:center"), children: [
            /* @__PURE__ */ jsx("span", { className: "tag", style: css(`color:${po.c ?? ""}`), children: po.tag }),
            /* @__PURE__ */ jsx("span", { style: css("font-size:12px;color:#6E7480"), children: "On LinkedIn" })
          ] }),
          /* @__PURE__ */ jsx("h3", { style: css("position:relative;margin:0;font:400 34px/1.08 'Instrument Serif',serif"), children: po.t }),
          /* @__PURE__ */ jsxs("span", { style: css("position:relative;margin-top:auto;display:flex;align-items:center;justify-content:space-between;color:#C9CDD6;font-size:14px"), children: [
            "Read",
            /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06)"), children: /* @__PURE__ */ jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] })
        ] }) }) }, po_i)) })
      ] }) }),
      /* @__PURE__ */ jsxs("section", { id: "contact", "aria-labelledby": "h-contact", style: css("position:relative;padding:120px 24px 96px;overflow:hidden"), children: [
        /* @__PURE__ */ jsx("div", { "aria-hidden": "true", style: css("position:absolute;left:50%;top:0;transform:translateX(-50%)"), children: /* @__PURE__ */ jsx("div", { className: "orb1", style: css("width:820px;height:520px;border-radius:50%;background:#F5A524;filter:blur(190px);opacity:.12") }) }),
        /* @__PURE__ */ jsxs("div", { style: css("position:relative;max-width:1200px;margin:0 auto"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("text-align:center"), children: [
            /* @__PURE__ */ jsx("p", { "data-r": "", style: css("margin:0"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Open for conversations" }) }),
            /* @__PURE__ */ jsxs("h2", { id: "h-contact", "data-r": "", style: css("--i:1;margin:24px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(64px,10vw,168px);line-height:.92;letter-spacing:-0.03em"), children: [
              "Let’s grow ",
              /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:#F5A524"), children: "something." })
            ] }),
            /* @__PURE__ */ jsx("p", { "data-r": "", style: css("--i:2;margin:24px auto 0;max-width:520px;font-size:18px;line-height:1.65;color:#A9AEB9"), children: "Hiring for community or growth? Bringing a product to Africa? Planning an AMA or campaign? Tell me what you’re working on. Messages come straight to my phone." })
          ] }),
          /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css("--i:3;margin-top:64px"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:48px;padding:clamp(24px,4vw,48px)"), children: [
            v.form_0,
            /* @__PURE__ */ jsxs("div", { children: [
              /* @__PURE__ */ jsx("p", { style: css("margin:0 0 8px;font:500 11px 'Geist',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#A9AEB9"), children: "Or find me" }),
              /* @__PURE__ */ jsxs("a", { className: "lrow", href: "mailto:hello@meetoluwaseyi.com", children: [
                /* @__PURE__ */ jsx("span", { className: "lr", children: "hello@meetoluwaseyi.com" }),
                /* @__PURE__ */ jsx("span", { className: "ic", "aria-hidden": "true", children: "↗" })
              ] }),
              /* @__PURE__ */ jsxs("a", { className: "lrow", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5", children: [
                /* @__PURE__ */ jsx("span", { className: "lr", children: "LinkedIn" }),
                /* @__PURE__ */ jsx("span", { className: "ic", "aria-hidden": "true", children: "↗" })
              ] }),
              /* @__PURE__ */ jsxs("a", { className: "lrow", href: "https://github.com/shykeys-data", children: [
                /* @__PURE__ */ jsx("span", { className: "lr", children: "GitHub" }),
                /* @__PURE__ */ jsx("span", { className: "ic", "aria-hidden": "true", children: "↗" })
              ] }),
              /* @__PURE__ */ jsxs("a", { className: "lrow", href: "https://t.me/oluwamichael", children: [
                /* @__PURE__ */ jsxs("span", { className: "lr", children: [
                  "Telegram ",
                  /* @__PURE__ */ jsx("span", { style: css("color:#8C929E;font-size:14px;margin-left:6px"), children: "@oluwamichael" })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "ic", "aria-hidden": "true", children: "↗" })
              ] }),
              /* @__PURE__ */ jsxs("a", { className: "lrow", href: "https://x.com/shykeys101", children: [
                /* @__PURE__ */ jsxs("span", { className: "lr", children: [
                  "X ",
                  /* @__PURE__ */ jsx("span", { style: css("color:#8C929E;font-size:14px;margin-left:6px"), children: "@shykeys101" })
                ] }),
                /* @__PURE__ */ jsx("span", { className: "ic", "aria-hidden": "true", children: "↗" })
              ] })
            ] })
          ] }) })
        ] })
      ] }),
      /* @__PURE__ */ jsx("footer", { style: css("padding:40px 24px 32px;overflow:hidden"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsxs("p", { "data-r": "", "aria-hidden": "true", style: css("margin:0;font-family:'Instrument Serif',serif;font-size:clamp(72px,18vw,264px);line-height:.85;letter-spacing:-0.035em;white-space:nowrap;text-align:center"), children: [
          "Oluwaseyi",
          /* @__PURE__ */ jsx("span", { style: css("color:#F5A524"), children: "." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-top:40px;font-size:14px;color:#8C929E"), children: [
          /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi · Lagos, Nigeria" }),
          /* @__PURE__ */ jsx("span", { children: "Built with React, Express, Node and MySQL" }),
          /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:6px"), children: /* @__PURE__ */ jsx("a", { className: "navlink", href: "#top", children: "Back to top" }) })
        ] })
      ] }) })
    ] }),
    v.showToast ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { style: css("position:fixed;left:0;right:0;bottom:20px;z-index:85;display:flex;justify-content:center;padding:0 16px;pointer-events:none"), children: /* @__PURE__ */ jsxs("div", { className: "toast", role: "status", style: css("pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:100%;box-sizing:border-box;padding:6px 6px 6px 20px;border-radius:999px;background:rgba(16,19,25,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 24px 48px -20px rgba(0,0,0,.8);font:400 14px 'Geist',sans-serif;color:#C9CDD6"), children: [
      /* @__PURE__ */ jsx("span", { children: "After dark it's the serious side. Prefer the fun one?" }),
      /* @__PURE__ */ jsx("a", { href: "/?mode=playful", style: css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;background:#F5A524;color:#07080B;font-weight:500;text-decoration:none"), children: "Playful mode" }),
      /* @__PURE__ */ jsx("button", { type: "button", "aria-label": "Dismiss", onClick: v.hideToast, style: css("flex:none;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.06);color:#F3EFE7;font:400 18px 'Geist',sans-serif;cursor:pointer"), children: "×" })
    ] }) }) }) : null
  ] }) });
}
const HINTS = {
  partner: "Your project, the market you want to reach, and your timeline…",
  hire: "The role, the team, and what success looks like in six months…",
  collab: "What you want to build, and where I fit in…",
  hi: "Say hello…"
};
function labels(mode) {
  return mode === "playful" ? { partner: "Let’s partner", hire: "I’m hiring", collab: "Build something", hi: "Just say hi" } : { partner: "Partner", hire: "Hire", collab: "Collaborate", hi: "Just say hi" };
}
const srOnly = {
  position: "absolute",
  width: 1,
  height: 1,
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap"
};
function ContactForm({ mode, variant, siteKey, initial, email }) {
  const playful = mode === "playful";
  const init = initial?.values ?? {};
  const [intent, setIntent] = useState(
    INTENTS$1.includes(init.intent ?? "") ? init.intent : "partner"
  );
  const [errors, setErrors] = useState(initial?.errors ?? {});
  const [status, setStatus] = useState("idle");
  const formRef = useRef(null);
  const on = playful ? { background: "#1B1A2E", color: "#FFF6E5" } : { background: "#F5A524", color: "#07080B", boxShadow: "none" };
  const off = playful ? { background: "#fff", color: "#1B1A2E", boxShadow: "inset 0 0 0 1px rgba(27,26,46,.12)" } : {
    background: "rgba(255,255,255,.05)",
    color: "#F3EFE7",
    boxShadow: "inset 0 0 0 1px rgba(255,255,255,.1)"
  };
  const labelStyle = variant === "home" ? { fontSize: 13, color: "#A9AEB9" } : { display: "block", marginBottom: 6, fontSize: 13, color: "var(--muted)" };
  const errStyle = {
    margin: "6px 0 0",
    fontSize: 13.5,
    color: playful ? "#B42318" : "#FF8A7A"
  };
  async function onSubmit(e) {
    e.preventDefault();
    if (status !== "idle") return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(
      ["name", "email", "message", "website"].map((k) => [k, String(fd.get(k) ?? "")])
    );
    setStatus("sending");
    const { ContactInputSchema: ContactInputSchema2 } = await Promise.resolve().then(() => schemas);
    const parsed = ContactInputSchema2.safeParse({ ...raw, intent, source: "form" });
    if (!parsed.success) {
      const next2 = {};
      for (const i of parsed.error.issues) next2[String(i.path[0] ?? "_")] ??= i.message;
      setStatus("idle");
      setErrors(next2);
      focusFirst(next2);
      return;
    }
    setErrors({});
    const token = await turnstileToken(siteKey);
    const r = await sendContact({ ...parsed.data, ...token ? { turnstileToken: token } : {} });
    if (r.ok) {
      setStatus("sent");
      return;
    }
    setStatus("idle");
    const next = r.error.fields ?? { _: r.error.message };
    setErrors(next);
    focusFirst(next);
  }
  function focusFirst(errs) {
    const first = ["name", "email", "message"].find((k) => errs[k]);
    const el = first ? formRef.current?.querySelector(`[name="${first}"]`) : formRef.current?.querySelector('[role="alert"]');
    el?.focus();
  }
  if (status === "sent") {
    return /* @__PURE__ */ jsxs(
      "div",
      {
        role: "status",
        tabIndex: -1,
        ref: (el) => el?.focus(),
        className: "sent-panel",
        style: {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          padding: "28px 24px",
          borderRadius: 24,
          background: playful ? "#9FE8D0" : "rgba(61,220,151,.1)",
          boxShadow: playful ? "none" : "inset 0 0 0 1px rgba(61,220,151,.35)"
        },
        children: [
          /* @__PURE__ */ jsx(
            "p",
            {
              style: {
                margin: 0,
                font: playful ? "800 28px 'Outfit',sans-serif" : "400 30px 'Instrument Serif',serif"
              },
              children: playful ? "Yay, message sent!" : "Thank you. Your message is in."
            }
          ),
          /* @__PURE__ */ jsx("p", { style: { margin: 0, fontSize: 16, lineHeight: 1.6 }, children: "I read every message myself and usually reply within two working days." })
        ]
      }
    );
  }
  const field = (name, label, type, placeholder, auto) => {
    const input = /* @__PURE__ */ jsx(
      "input",
      {
        id: `c-${name}`,
        className: "field",
        name,
        type,
        placeholder,
        autoComplete: auto,
        defaultValue: init[name] ?? "",
        required: true,
        maxLength: name === "name" ? 80 : 254,
        "aria-invalid": !!errors[name],
        "aria-describedby": errors[name] ? `c-${name}-err` : void 0
      }
    );
    return /* @__PURE__ */ jsxs("div", { style: variant === "home" ? { display: "flex", flexDirection: "column", gap: 4 } : void 0, children: [
      /* @__PURE__ */ jsx("label", { htmlFor: `c-${name}`, style: labelStyle, children: label }),
      variant === "home" ? /* @__PURE__ */ jsx("div", { className: "fieldwrap", children: input }) : input,
      errors[name] ? /* @__PURE__ */ jsx("p", { id: `c-${name}-err`, style: errStyle, children: errors[name] }) : null
    ] });
  };
  const message = /* @__PURE__ */ jsx(
    "textarea",
    {
      id: "c-msg",
      className: "field",
      name: "message",
      rows: variant === "home" ? 4 : 5,
      placeholder: HINTS[intent],
      style: { resize: "vertical" },
      defaultValue: init.message ?? "",
      required: true,
      maxLength: 2e3,
      "aria-invalid": !!errors.message,
      "aria-describedby": errors.message ? "c-msg-err" : void 0
    }
  );
  const L = labels(mode);
  const sending = status === "sending";
  return /* @__PURE__ */ jsxs(
    "form",
    {
      ref: formRef,
      method: "post",
      action: "/contact",
      noValidate: true,
      onSubmit,
      "aria-label": "Contact form",
      style: { display: "flex", flexDirection: "column", gap: variant === "home" ? 22 : 16 },
      children: [
        /* @__PURE__ */ jsxs("fieldset", { style: { border: 0, padding: 0, margin: 0 }, children: [
          /* @__PURE__ */ jsx(
            "legend",
            {
              style: {
                padding: 0,
                marginBottom: 12,
                font: "500 11px var(--body, 'Geist'),sans-serif",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: variant === "home" ? "#A9AEB9" : "var(--faint)"
              },
              children: "I’d like to"
            }
          ),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: INTENTS$1.map((id) => /* @__PURE__ */ jsxs(
            "label",
            {
              className: "chip",
              style: {
                ...intent === id ? on : off,
                cursor: "pointer",
                position: "relative",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                lineHeight: 1.2
              },
              children: [
                /* @__PURE__ */ jsx(
                  "input",
                  {
                    type: "radio",
                    name: "intent",
                    value: id,
                    checked: intent === id,
                    onChange: () => setIntent(id),
                    style: srOnly
                  }
                ),
                L[id]
              ]
            },
            id
          )) })
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            className: variant === "page" ? "fgrid" : void 0,
            style: variant === "home" ? {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,200px),1fr))",
              gap: 20
            } : void 0,
            children: [
              field("name", "Name", "text", "Your name", "name"),
              field("email", "Email", "email", "you@company.com", "email")
            ]
          }
        ),
        /* @__PURE__ */ jsxs("div", { style: variant === "home" ? { display: "flex", flexDirection: "column", gap: 4 } : void 0, children: [
          /* @__PURE__ */ jsx("label", { htmlFor: "c-msg", style: labelStyle, children: "Message" }),
          variant === "home" ? /* @__PURE__ */ jsx("div", { className: "fieldwrap", children: message }) : message,
          errors.message ? /* @__PURE__ */ jsx("p", { id: "c-msg-err", style: errStyle, children: errors.message }) : null
        ] }),
        /* @__PURE__ */ jsxs(
          "div",
          {
            "aria-hidden": "true",
            style: { position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" },
            children: [
              /* @__PURE__ */ jsx("label", { htmlFor: "c-website", children: "Website" }),
              /* @__PURE__ */ jsx("input", { id: "c-website", name: "website", type: "text", tabIndex: -1, autoComplete: "off", defaultValue: "" })
            ]
          }
        ),
        errors._ ? /* @__PURE__ */ jsx("p", { role: "alert", tabIndex: -1, style: { ...errStyle, fontSize: 15 }, children: errors._.startsWith("That didn’t go through") ? errors._ : `${errors._} You can also email ${email}.` }) : null,
        /* @__PURE__ */ jsxs(
          "div",
          {
            style: {
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 16,
              marginTop: variant === "home" ? 6 : 0
            },
            children: [
              /* @__PURE__ */ jsxs("button", { type: "submit", className: "pbtn solid", disabled: sending, "aria-busy": sending, children: [
                sending ? "Sending…" : "Send my message",
                /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs(
                  "svg",
                  {
                    width: "16",
                    height: "16",
                    viewBox: "0 0 24 24",
                    fill: "none",
                    stroke: "currentColor",
                    strokeWidth: "1.6",
                    strokeLinecap: "round",
                    strokeLinejoin: "round",
                    "aria-hidden": "true",
                    children: [
                      /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
                      /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
                    ]
                  }
                ) })
              ] }),
              /* @__PURE__ */ jsxs(
                "span",
                {
                  style: {
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: variant === "home" ? "#8C929E" : "var(--faint)",
                    maxWidth: 340
                  },
                  children: [
                    "Your details are only used to reply to you. Nothing is shared or added to a mailing list.",
                    " ",
                    /* @__PURE__ */ jsx("a", { href: "/privacy", children: "Privacy" })
                  ]
                }
              )
            ]
          }
        )
      ]
    }
  );
}
const AMBER$1 = "#F5A524";
const GREEN$1 = "#3DDC97";
const WORDS = [
  "turn members into traders.",
  "grow crypto communities.",
  "open doors across Africa.",
  "make data make sense."
];
const TICKER = [
  { k: "07:00 WAT, daily", v: "Morning market brief", c: "#3DDC97" },
  { k: "Fridays", v: "Futures Friday", c: "#F5A524" },
  { k: "Building", v: "Korrect Swap", c: "#F5A524" },
  { k: "Learning", v: "Python for BI", c: "#3DDC97" },
  { k: "Writing", v: "Growth Without Reach", c: "#3DDC97" },
  { k: "Filming", v: "Crypto lessons for TikTok & Reels", c: "#F5A524" }
];
const MANIFESTO = "I'm {face} Oluwaseyi. I turn crypto-curious Africans {chat} into active traders, open doors {deal} for exchanges and founders, and turn raw data {chart} into decisions people can act on.";
const PILLARS = [
  {
    n: "i",
    t: "Community",
    c: AMBER$1,
    bg: "linear-gradient(160deg,rgba(245,165,36,.14) 0%,rgba(16,19,25,.25) 60%)",
    b: "Members who trade, not just lurk. WEEX: zero to 25,000+ in under a year, with 7,000+ activated through live classes. Gate.io: 20,000+ members, 30+ X Spaces and Nigeria’s first Gate.io meetup.",
    tags: ["Growth", "Education", "AMAs"]
  },
  {
    n: "ii",
    t: "Business Development",
    c: AMBER$1,
    bg: "linear-gradient(160deg,rgba(245,165,36,.11) 0%,rgba(16,19,25,.25) 60%)",
    b: "Doors opened in Africa. I helped launch Gate.io P2P for Nigeria, built campus programmes with LASU and Yabatech, and run KOL partnerships for WEEX. Plus dealer and financier deals for Korrect Cars.",
    tags: ["KOLs", "P2P launch", "Campus"]
  },
  {
    n: "iii",
    t: "Data & BI",
    c: GREEN$1,
    bg: "linear-gradient(160deg,rgba(61,220,151,.13) 0%,rgba(16,19,25,.25) 60%)",
    b: "Decisions backed by numbers. Eight IBM data certificates and analysis I test before I publish, from 99,441 e-commerce orders to five African economies.",
    tags: ["Python", "SQL", "Power BI"]
  },
  {
    n: "iv",
    t: "Building",
    c: AMBER$1,
    bg: "linear-gradient(160deg,rgba(245,165,36,.14) 0%,rgba(16,19,25,.25) 60%)",
    b: "Products that ship. Building for the web since 2014: a live car marketplace, a free moderation bot that replaced paid tools, and a BDC rate platform in progress.",
    tags: ["WordPress", "MERN", "Bots"]
  }
];
const PROGRAMS = [
  "Morning Market Brief",
  "Evening Wrap",
  "Meme Monday",
  "Futures Friday",
  "Last Commenter",
  "Community Polls",
  "Weekend Education",
  "Learn & Earn",
  "Monthly League",
  "Predict-to-Win",
  "X AMAs",
  "WE-Launch"
];
const PHRASES = [
  "Community",
  "Business Development",
  "Data & BI",
  "Ventures",
  "Storytelling",
  "Partnerships"
];
const daily = {
  when: "07:00 WAT",
  name: "Morning Market Brief",
  note: "The day starts informed, every single day.",
  c: GREEN$1
};
const wrap = {
  when: "Evening",
  name: "Evening market wrap",
  note: "What moved, what it means, what’s next.",
  c: GREEN$1
};
const midweek = {
  when: "Through the week",
  name: "Polls, Last Commenter, Learn & Earn",
  note: "Quick games and lessons that keep the chat moving.",
  c: AMBER$1
};
const weekend = {
  when: "Weekend",
  name: "Weekend Education",
  note: "Lessons like position sizing and support & resistance.",
  c: AMBER$1
};
const monthly = {
  when: "This month",
  name: "League & Predict-to-Win",
  note: "Monthly League, football Predict-to-Win and X AMAs.",
  c: AMBER$1
};
const DAY_DEFS = [
  {
    short: "Mon",
    name: "Monday",
    items: [
      daily,
      {
        when: "All day",
        name: "Meme Monday",
        note: "The week starts with a laugh and a lot of replies.",
        c: AMBER$1
      },
      wrap
    ]
  },
  { short: "Tue", name: "Tuesday", items: [daily, midweek, wrap] },
  { short: "Wed", name: "Wednesday", items: [daily, midweek, wrap] },
  { short: "Thu", name: "Thursday", items: [daily, midweek, wrap] },
  {
    short: "Fri",
    name: "Friday",
    items: [
      daily,
      {
        when: "All day",
        name: "Futures Friday",
        note: "New futures listings and market setups, explained simply.",
        c: AMBER$1
      },
      wrap
    ]
  },
  { short: "Sat", name: "Saturday", items: [daily, weekend, monthly] },
  { short: "Sun", name: "Sunday", items: [daily, weekend, monthly] }
];
const AMBER = "#F5A524";
const GREEN = "#3DDC97";
const rot = (n, cur, i) => {
  const k = (i - cur + n) % n;
  if (k === 0) return { st: "opacity:1;transform:none;filter:blur(0)", hid: false };
  if (k === n - 1) return { st: "opacity:0;transform:translateY(-70%);filter:blur(6px)", hid: true };
  return { st: "opacity:0;transform:translateY(70%);filter:blur(6px)", hid: true };
};
function card(p) {
  const data = p.pillars.includes("data");
  const href = p.caseStudy ? `/work/${p.slug}` : p.links.live ?? p.links.book ?? p.links.repo ?? "/work";
  const cta = p.caseStudy ? "Read case study" : p.links.live ? `Visit ${new URL(p.links.live).hostname.replace(/^www\./, "")}` : p.links.book ? "Read the free book" : p.links.repo ? "View on GitHub" : "See the work";
  return {
    pillars: p.pillars,
    label: data ? "Data & BI" : p.pillars.includes("community") ? "Community" : "Venture",
    title: p.title,
    mark: p.mark || (p.slug === "olist-ecommerce-bi" ? "99,441 orders" : p.title),
    color: data ? GREEN : AMBER,
    coverBg: data ? "#0B1712" : "#17120B",
    blurb: p.summary,
    tags: p.stack.slice(0, 3).map((t) => ({ t })),
    href,
    cta
  };
}
class SeriousHome extends Component {
  constructor(props) {
    super(props);
    this.state = {
      toast: false,
      w: 0,
      tk: 0,
      acc: 0,
      day: null,
      today: 0,
      n1: 0,
      n2: 0,
      n3: 0,
      n4: 0,
      fine: false,
      hot: false,
      moved: false,
      menu: false,
      rvOn: false
    };
  }
  scan() {
    if (!this.io || !this.root) return;
    this.seen = this.seen || /* @__PURE__ */ new WeakSet();
    this.root.querySelectorAll("[data-r]").forEach((el) => {
      if (!this.seen.has(el)) {
        this.seen.add(el);
        this.io.observe(el);
      }
    });
  }
  componentDidMount() {
    const win = window;
    const mq = (q) => !!(win.matchMedia && win.matchMedia(q).matches);
    this.reduce = prefersReducedMotion();
    const fine = mq("(hover: hover) and (pointer: fine)") && !this.reduce;
    let today = 0;
    try {
      const wd = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Africa/Lagos" }).format(
        /* @__PURE__ */ new Date()
      );
      today = Math.max(0, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(wd));
    } catch {
    }
    this.setState({ today, fine });
    if (win.IntersectionObserver && !this.reduce) {
      this.io = new win.IntersectionObserver(
        (es) => es.forEach((x) => {
          if (x.isIntersecting) {
            x.target.classList.add("in");
            this.io.unobserve(x.target);
          }
        }),
        { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
      );
      this.setState({ rvOn: true }, () => this.scan());
    }
    this.t1 = setInterval(() => this.setState((s) => ({ w: ((s.w || 0) + 1) % WORDS.length })), 2800);
    this.t2 = setInterval(() => this.setState((s) => ({ tk: ((s.tk || 0) + 1) % TICKER.length })), 3400);
    this.mx = win.innerWidth / 2;
    this.my = win.innerHeight / 3;
    this.sx = this.mx;
    this.sy = this.my;
    this.rx = this.mx;
    this.ry = this.my;
    this.rs = 1;
    this.lastY = win.scrollY || 0;
    this.navHidden = false;
    this.onMove = (e) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      const t = e.target;
      const hot = !!(t && t.closest && t.closest("a,button,input,textarea,label,[tabindex]"));
      if (hot !== this.state.hot) this.setState({ hot });
      if (!this.state.moved) this.setState({ moved: true });
    };
    if (fine) win.addEventListener("pointermove", this.onMove, { passive: true });
    const loop = () => {
      const y = win.scrollY || 0;
      if (!this.reduce) {
        this.sx += (this.mx - this.sx) * 0.06;
        this.sy += (this.my - this.sy) * 0.06;
        if (this.spot)
          this.spot.style.transform = "translate3d(" + (this.sx - 450).toFixed(1) + "px," + (this.sy - 450).toFixed(1) + "px,0)";
        this.rx += (this.mx - this.rx) * 0.2;
        this.ry += (this.my - this.ry) * 0.2;
        this.rs += ((this.state.hot ? 1.7 : 1) - this.rs) * 0.16;
        if (this.ring)
          this.ring.style.transform = "translate3d(" + this.rx.toFixed(1) + "px," + this.ry.toFixed(1) + "px,0) scale(" + this.rs.toFixed(3) + ")";
        if (this.orbA) this.orbA.style.transform = "translate3d(0," + (y * 0.25).toFixed(1) + "px,0)";
        if (this.orbB) this.orbB.style.transform = "translate3d(0," + (y * -0.12).toFixed(1) + "px,0)";
      }
      if (this.nav && !this.state.menu) {
        const down = y > this.lastY + 4;
        const up = y < this.lastY - 4;
        if (down && y > 280 && !this.navHidden) {
          this.navHidden = true;
          this.nav.style.transform = "translateY(-220%)";
        }
        if ((up || y < 120) && this.navHidden) {
          this.navHidden = false;
          this.nav.style.transform = "none";
        }
        if (down || up) this.lastY = y;
      }
      this.raf = win.requestAnimationFrame(loop);
    };
    this.raf = win.requestAnimationFrame(loop);
    const countUp = () => {
      if (this.counted) return;
      this.counted = true;
      const start = win.performance.now();
      const step = (now) => {
        const p = this.reduce ? 1 : Math.min(1, (now - start) / 1800);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        this.setState({
          n1: Math.round(99 * e),
          n2: Math.round(25 * e),
          n3: Math.round(7 * e),
          n4: Math.round(12 * e)
        });
        if (p < 1) this.raf2 = win.requestAnimationFrame(step);
      };
      this.raf2 = win.requestAnimationFrame(step);
    };
    if (win.IntersectionObserver && this.stats) {
      this.io2 = new win.IntersectionObserver(
        (es) => {
          if (es.some((x) => x.isIntersecting)) {
            countUp();
            this.io2.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      this.io2.observe(this.stats);
    } else countUp();
  }
  componentDidUpdate() {
    this.scan();
  }
  componentWillUnmount() {
    clearInterval(this.t1);
    clearInterval(this.t2);
    clearTimeout(this.tt2);
    window.cancelAnimationFrame(this.raf);
    window.cancelAnimationFrame(this.raf2);
    if (this.onMove) window.removeEventListener("pointermove", this.onMove);
    this.io?.disconnect();
    this.io2?.disconnect();
  }
  render() {
    const s = this.state;
    const { profile, projects: all, turnstileSiteKey } = this.props.data;
    const first = profile.name.split(" ")[0] ?? "Oluwaseyi";
    const letters = first.split("").map((ch, i) => ({ ch, d: (0.15 + i * 0.045).toFixed(3) + "s" }));
    const words = WORDS.map((t, i) => ({ t, ...rot(WORDS.length, s.w || 0, i) }));
    const ticker = TICKER.map((x, i) => ({ ...x, ...rot(TICKER.length, s.tk || 0, i) }));
    const parts = MANIFESTO.split(" ");
    const manifesto = parts.map((t, i) => ({
      t,
      p: (i / parts.length).toFixed(3),
      isFace: t === "{face}",
      isChat: t === "{chat}",
      isDeal: t === "{deal}",
      isChart: t === "{chart}",
      isWord: !["{face}", "{chat}", "{deal}", "{chart}"].includes(t)
    }));
    const acc = s.acc || 0;
    const pillars = PILLARS.map((p, i) => ({
      ...p,
      tags: p.tags.map((t) => ({ t })),
      open: i === acc,
      grow: i === acc ? 5 : 1,
      vOp: i === acc ? 0 : 1,
      fOp: i === acc ? 1 : 0,
      fTr: i === acc ? "none" : "translateY(24px)",
      pick: () => {
        if ((this.state.acc || 0) !== i) this.setState({ acc: i });
      }
    }));
    const projects = all.filter((p) => p.featured).slice(0, 3).map(card);
    const marquee = PROGRAMS.concat(PROGRAMS).map((t) => ({ t }));
    const marquee2 = PHRASES.concat(PHRASES, PHRASES).map((t) => ({ t }));
    const today = s.today || 0;
    const sel = s.day == null ? today : s.day;
    const days = DAY_DEFS.map((d, i) => ({
      short: d.short,
      today: i === today,
      pressed: i === sel,
      col: i === sel ? "#F3EFE7" : "#7C8290",
      pick: () => this.setState({ day: i })
    }));
    const panels = DAY_DEFS.map((d, i) => ({
      name: d.name,
      items: d.items,
      badge: i === today ? "Today · live in the group" : "On this day",
      badgeC: i === today ? GREEN : "#6E7480",
      hid: i !== sel,
      st: i === sel ? "opacity:1;transform:none;filter:blur(0);visibility:visible;transition:opacity 700ms var(--spring) 80ms,transform 800ms var(--spring) 80ms,filter 700ms var(--spring) 80ms,visibility 0s" : "opacity:0;transform:translateY(16px);filter:blur(6px);visibility:hidden;pointer-events:none;transition:opacity 300ms var(--spring),transform 300ms var(--spring),filter 300ms var(--spring),visibility 0s linear 300ms"
    }));
    const jobs = profile.experience.slice(0, 3).map((j, i) => ({
      when: j.when,
      role: j.role,
      org: j.org,
      note: j.note,
      now: i === 0 && j.current,
      i,
      full: true,
      mini: false,
      pad: "28px",
      ds: "15px",
      dl: "0",
      dt: "8px",
      c: i === 0 && j.current ? GREEN : "#8C929E",
      dot: i === 0 && j.current ? GREEN : "#2A2F3A"
    }));
    const certs = profile.certificates.map((c) => ({ t: c.title }));
    const allPosts = profile.writing.flatMap((w) => w.posts.map((p) => ({ ...p, series: w.title })));
    const posts = allPosts.slice(0, 3).map((p, i) => ({ tag: p.kicker, c: i < 2 ? GREEN : AMBER, t: p.title, href: p.url, i }));
    const menu = !!s.menu;
    const menuLinks = [
      ["/work", "Work"],
      ["/about", "About"],
      ["/writing", "Writing"],
      ["/contact", "Contact"],
      ["/?mode=playful", "Playful mode"]
    ].map(([href, t], i) => ({ href, t, i: i + 1 }));
    const magnet = (e) => {
      const el = e.currentTarget;
      const inner = el.querySelector(".mag");
      if (!inner || this.reduce || !s.fine) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
      inner.style.transform = "translate3d(" + dx.toFixed(1) + "px," + dy.toFixed(1) + "px,0)";
    };
    const unmagnet = (e) => {
      const inner = e.currentTarget.querySelector(".mag");
      if (inner) inner.style.transform = "";
    };
    const glow = (e) => {
      const el = e.currentTarget.querySelector(".core") ?? e.currentTarget;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", (e.clientX - r.left).toFixed(0) + "px");
      el.style.setProperty("--my", (e.clientY - r.top).toFixed(0) + "px");
    };
    const form_0 = /* @__PURE__ */ jsx(
      ContactForm,
      {
        mode: "serious",
        variant: "home",
        email: profile.links.email,
        ...turnstileSiteKey ? { siteKey: turnstileSiteKey } : {}
      }
    );
    const v = {
      accent: AMBER,
      letters,
      words,
      ticker,
      manifesto,
      pillars,
      projects,
      marquee,
      marquee2,
      days,
      panels,
      selX: sel * 100 + "%",
      posts,
      n1: s.n1 || 0,
      n2: s.n2 || 0,
      n3: s.n3 || 0,
      n4: s.n4 || 0,
      jobs,
      certs,
      magnet,
      unmagnet,
      glow,
      menuLinks,
      form_0,
      rootCls: s.rvOn ? "rv-on" : "",
      showToast: !!s.toast,
      hideToast: () => this.setState({ toast: false }),
      menuCls: "menu" + (menu ? " open" : ""),
      menuHidden: !menu,
      menuOpen: menu,
      menuLabel: menu ? "Close menu" : "Open menu",
      burgerCls: "burger" + (menu ? " x" : ""),
      toggleMenu: () => this.setState({ menu: !this.state.menu }),
      closeMenu: () => this.setState({ menu: false }),
      ringCls: "ring" + (s.fine && s.moved ? " on" : "") + (s.hot ? " hot" : ""),
      setRoot: (el) => {
        this.root = el;
      },
      setSpot: (el) => {
        this.spot = el;
      },
      setRing: (el) => {
        this.ring = el;
      },
      setNav: (el) => {
        this.nav = el;
      },
      setOrbA: (el) => {
        this.orbA = el;
      },
      setOrbB: (el) => {
        this.orbB = el;
      },
      setStats: (el) => {
        this.stats = el;
      },
      firstName: first
    };
    return /* @__PURE__ */ jsx(SeriousHomeView, { v });
  }
}
function AboutView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "pg", "data-theme": v.theme, children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)"), children: [
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)") }),
        v.brand
      ] }),
      (v.navLinks ?? []).map((nl, nl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `navlink hide-sm ${nl.cls ?? ""}`, href: nl.href, "aria-current": nl.current, children: nl.label }) }, nl_i)),
      /* @__PURE__ */ jsx("a", { className: "pbtn solid hide-sm", href: "/contact", style: css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px"), children: v.contactLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "modesw", onClick: v.toggleTheme, "aria-label": v.switchLabel, children: v.switchText }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "burger", onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: v.burgerIcon })
    ] }) }),
    v.menuOpen ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "mmenu", children: (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { href: ml.href, children: ml.label }) }, ml_i)) }) }) : null,
    /* @__PURE__ */ jsx("section", { style: css("padding:140px 24px 56px"), id: "main-content", children: /* @__PURE__ */ jsxs("div", { className: "wrap ahero", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: v.aboutEyebrow }) }),
        /* @__PURE__ */ jsxs("h1", { className: "h1 enter", style: css("animation-delay:.08s;font-size:clamp(44px,6vw,88px)"), children: [
          "Twelve years on the web, ",
          /* @__PURE__ */ jsx("span", { className: "em", children: "five in crypto." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "lead enter", style: css("animation-delay:.16s"), children: "I turn curious newcomers into active traders. At WEEX I grew the community from zero to 25,000+ members in under a year. At Gate.io I helped bring P2P trading to Nigeria. I trade spot and futures myself, so I talk to users as a peer, not a marketer." }),
        /* @__PURE__ */ jsx("p", { className: "lead enter", style: css("animation-delay:.22s;margin-top:14px"), children: "Before crypto I built websites and ran digital marketing for Lagos businesses. Now I'm learning data analysis in public, one real dataset at a time." }),
        /* @__PURE__ */ jsxs("div", { className: "enter", style: css("animation-delay:.3s;margin-top:28px;display:flex;flex-wrap:wrap;gap:10px"), children: [
          /* @__PURE__ */ jsxs("a", { className: "pbtn solid", href: "/work", children: [
            "See the proof",
            /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs("a", { className: "pbtn ghost", href: "/contact", children: [
            "Work with me",
            /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
              /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
              /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
            ] }) })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "shell enter", style: css("animation-delay:.2s;max-width:440px;width:100%;justify-self:end"), children: /* @__PURE__ */ jsx("div", { className: "core", style: css("aspect-ratio:4/5"), children: /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "Oluwaseyi Oshunwusi", style: css("width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block") }) }) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { style: css("padding:24px 24px 72px"), children: /* @__PURE__ */ jsx("div", { className: "wrap stats", children: (v.stats ?? []).map((st, st_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "shell", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:22px"), children: [
      /* @__PURE__ */ jsx("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(40px,4vw,60px);line-height:1;color:var(--accent)"), children: st.v }),
      /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:14px;line-height:1.5;color:var(--muted)"), children: st.l })
    ] }) }) }, st_i)) }) }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-road", style: css("padding:56px 24px 72px"), children: /* @__PURE__ */ jsxs("div", { className: "wrap tsplit", children: [
      /* @__PURE__ */ jsxs("div", { className: "tpin", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: v.roadEyebrow }),
        /* @__PURE__ */ jsxs("h2", { id: "h-road", className: "h2", style: css("margin-top:18px"), children: [
          "The road ",
          /* @__PURE__ */ jsx("span", { className: "em", children: "so far." })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "lead", style: css("font-size:16px"), children: "From building e-commerce sites in Lagos to running crypto communities across Africa." })
      ] }),
      /* @__PURE__ */ jsx("ol", { style: css("list-style:none;margin:0;padding:0;position:relative"), className: "tl", children: (v.jobs ?? []).map((jb, jb_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("li", { style: css("position:relative;padding:0 0 30px 36px"), children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css(`position:absolute;left:0;top:7px;width:13px;height:13px;border-radius:50%;background:${jb.dot ?? ""};box-shadow:0 0 0 5px var(--bg)`) }),
        /* @__PURE__ */ jsx("p", { style: css(`margin:0;font:500 12px var(--body);letter-spacing:.12em;text-transform:uppercase;color:${jb.c ?? ""}`), children: jb.when }),
        /* @__PURE__ */ jsx("h3", { style: css("margin:6px 0 2px;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(22px,2.2vw,30px);line-height:1.1"), children: jb.role }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font-size:14px;color:var(--ink);opacity:.85"), children: jb.org }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0;max-width:600px;font-size:15px;line-height:1.6;color:var(--muted)"), children: jb.note }),
        jb.hasProof ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("a", { href: jb.proof, style: css("display:inline-block;margin-top:8px;font-size:14px;color:var(--ink);text-underline-offset:4px"), children: [
          jb.proofLabel,
          " →"
        ] }) }) : null
      ] }) }, jb_i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-learn", style: css("padding:40px 24px 104px"), children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsxs("h2", { id: "h-learn", className: "h2", children: [
        "Learning ",
        /* @__PURE__ */ jsx("span", { className: "em", children: "never stops." })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "lgrid", style: css("margin-top:28px"), children: [
        /* @__PURE__ */ jsx("div", { className: "shell", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:24px"), children: [
          /* @__PURE__ */ jsx("p", { className: "eyebrow", style: css("margin:0"), children: "Education" }),
          (v.edu ?? []).map((ed, ed_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { style: css("margin-top:16px"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:22px;line-height:1.2"), children: ed.t }),
            /* @__PURE__ */ jsx("p", { style: css("margin:4px 0 0;font-size:14px;color:var(--muted)"), children: ed.s })
          ] }) }, ed_i))
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "shell", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:24px"), children: [
          /* @__PURE__ */ jsx("p", { className: "eyebrow", style: css("margin:0"), children: "IBM data certificates · 8" }),
          /* @__PURE__ */ jsx("div", { style: css("margin-top:16px;display:flex;flex-wrap:wrap;gap:6px"), children: (v.certs ?? []).map((ct, ct_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "tag", children: ct.t }) }, ct_i)) })
        ] }) }),
        /* @__PURE__ */ jsx("div", { className: "shell", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:24px"), children: [
          /* @__PURE__ */ jsx("p", { className: "eyebrow", style: css("margin:0"), children: "Languages" }),
          (v.langs ?? []).map((lg, lg_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { style: css("margin-top:16px;display:flex;justify-content:space-between;gap:12px;align-items:baseline"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:22px"), children: lg.t }),
            /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:14px;color:var(--muted)"), children: lg.s })
          ] }) }, lg_i))
        ] }) })
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("footer", { style: css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)"), children: [
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("max-width:320px"), children: [
          /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px"), children: [
            "oluwaseyi",
            /* @__PURE__ */ jsx("span", { style: css("color:var(--accent)"), children: "." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6"), children: "Community, deals, data and code. Lagos, Nigeria." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;gap:48px;flex-wrap:wrap"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Pages" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/work", children: "Work" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/about", children: "About" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/writing", children: "Writing" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact", children: "Contact" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Elsewhere" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/", children: "LinkedIn" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://github.com/shykeys-data", children: "GitHub" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://x.com/shykeys101", children: "X" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://t.me/oluwamichael", children: "Telegram" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "mailto:hello@meetoluwaseyi.com", children: "Email" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px"), children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi" }),
        /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:20px;flex-wrap:wrap"), children: /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact#privacy", style: css("font-size:13px;padding:0"), children: "Privacy" }) })
      ] })
    ] })
  ] }) });
}
function WorkView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "pg", "data-theme": v.theme, children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)"), children: [
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)") }),
        v.brand
      ] }),
      (v.navLinks ?? []).map((nl, nl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `navlink hide-sm ${nl.cls ?? ""}`, href: nl.href, "aria-current": nl.current, children: nl.label }) }, nl_i)),
      /* @__PURE__ */ jsx("a", { className: "pbtn solid hide-sm", href: "/contact", style: css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px"), children: v.contactLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "modesw", onClick: v.toggleTheme, "aria-label": v.switchLabel, children: v.switchText }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "burger", onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: v.burgerIcon })
    ] }) }),
    v.menuOpen ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "mmenu", children: (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { href: ml.href, children: ml.label }) }, ml_i)) }) }) : null,
    /* @__PURE__ */ jsx("section", { style: css("padding:140px 24px 40px"), id: "main-content", children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: v.workEyebrow }) }),
      /* @__PURE__ */ jsxs("h1", { className: "h1 enter", style: css("animation-delay:.08s"), children: [
        "Proof, ",
        /* @__PURE__ */ jsx("span", { className: "em", children: "not promises." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "lead enter", style: css("animation-delay:.16s"), children: "Communities grown, products shipped and data put to work. Every card has real numbers and a live link." }),
      /* @__PURE__ */ jsx("div", { className: "enter", style: css("animation-delay:.24s;margin-top:28px;display:flex;flex-wrap:wrap;align-items:center;gap:8px"), role: "group", "aria-label": "Filter work", children: (v.filters ?? []).map((f, f_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("button", { type: "button", className: "chip", onClick: f.pick, "aria-pressed": f.pressed, style: css(`${f.style ?? ""}`), children: [
        f.label,
        " ",
        /* @__PURE__ */ jsx("span", { style: css("opacity:.6"), children: f.count })
      ] }) }, f_i)) }),
      /* @__PURE__ */ jsxs("p", { className: "enter", style: css("animation-delay:.3s;margin:18px 0 0;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--faint)"), children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css("width:8px;height:8px;border-radius:50%;background:var(--accent2)") }),
        "Synced daily from ",
        /* @__PURE__ */ jsx("a", { href: "https://github.com/shykeys-data", style: css("color:var(--ink)"), children: "github.com/shykeys-data" }),
        " · last sync today, 06:00 WAT"
      ] })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { style: css("padding:24px 24px 104px"), children: [
      v.empty,
      /* @__PURE__ */ jsx("div", { className: "wrap wgrid", children: (v.projects ?? []).map((p, p_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("article", { className: `card shell ${p.cls ?? ""}`, children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("display:flex;flex-direction:column"), children: [
        /* @__PURE__ */ jsxs("div", { style: css(`position:relative;height:${p.coverH ?? ""};overflow:hidden;background:${p.cover ?? ""};display:flex;align-items:flex-end;padding:20px 22px;box-sizing:border-box`), children: [
          /* @__PURE__ */ jsx("span", { "aria-hidden": "true", style: css(`position:absolute;right:-50px;top:-50px;width:220px;height:220px;border-radius:50%;background:${p.color ?? ""};filter:blur(60px);opacity:.35`) }),
          /* @__PURE__ */ jsx("span", { className: "tag", style: css("position:absolute;top:16px;left:18px"), children: p.label }),
          p.synced ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { className: "tag", style: css("position:absolute;top:16px;right:18px"), children: "From GitHub" }) }) : null,
          /* @__PURE__ */ jsx("span", { style: css(`position:relative;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(32px,3.2vw,46px);line-height:1;color:${p.markInk ?? ""};white-space:nowrap`), children: p.mark })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("padding:20px 22px 22px;display:flex;flex-direction:column;gap:10px;flex:1"), children: [
          /* @__PURE__ */ jsx("h2", { style: css("margin:0;font:600 20px var(--body);letter-spacing:-0.01em"), children: p.title }),
          /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:15px;line-height:1.55;color:var(--muted)"), children: p.blurb }),
          /* @__PURE__ */ jsx("div", { style: css("display:flex;flex-wrap:wrap;gap:6px;margin-top:2px"), children: (p.tags ?? []).map((t, t_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("span", { className: "tag", children: t.t }) }, t_i)) }),
          /* @__PURE__ */ jsxs("div", { style: css("margin-top:auto;padding-top:10px;display:flex;flex-wrap:wrap;gap:8px"), children: [
            (p.links ?? []).map((lk, lk_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("a", { className: `pbtn ${lk.cls ?? ""}`, href: lk.href, style: css("min-height:44px;padding:3px 3px 3px 16px;font-size:14px"), children: [
              lk.label,
              /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:36px;height:36px"), children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
                /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
                /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
              ] }) })
            ] }) }, lk_i)),
            p.noLinks ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("span", { style: css("font-size:14px;color:var(--faint)"), children: p.status }) }) : null
          ] })
        ] })
      ] }) }) }, p_i)) })
    ] }),
    /* @__PURE__ */ jsxs("footer", { style: css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)"), children: [
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("max-width:320px"), children: [
          /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px"), children: [
            "oluwaseyi",
            /* @__PURE__ */ jsx("span", { style: css("color:var(--accent)"), children: "." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6"), children: "Community, deals, data and code. Lagos, Nigeria." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;gap:48px;flex-wrap:wrap"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Pages" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/work", children: "Work" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/about", children: "About" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/writing", children: "Writing" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact", children: "Contact" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Elsewhere" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/", children: "LinkedIn" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://github.com/shykeys-data", children: "GitHub" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://x.com/shykeys101", children: "X" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://t.me/oluwamichael", children: "Telegram" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "mailto:hello@meetoluwaseyi.com", children: "Email" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px"), children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi" }),
        /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:20px;flex-wrap:wrap"), children: /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact#privacy", style: css("font-size:13px;padding:0"), children: "Privacy" }) })
      ] })
    ] })
  ] }) });
}
function WritingView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "pg", "data-theme": v.theme, children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)"), children: [
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)") }),
        v.brand
      ] }),
      (v.navLinks ?? []).map((nl, nl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `navlink hide-sm ${nl.cls ?? ""}`, href: nl.href, "aria-current": nl.current, children: nl.label }) }, nl_i)),
      /* @__PURE__ */ jsx("a", { className: "pbtn solid hide-sm", href: "/contact", style: css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px"), children: v.contactLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "modesw", onClick: v.toggleTheme, "aria-label": v.switchLabel, children: v.switchText }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "burger", onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: v.burgerIcon })
    ] }) }),
    v.menuOpen ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "mmenu", children: (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { href: ml.href, children: ml.label }) }, ml_i)) }) }) : null,
    /* @__PURE__ */ jsx("section", { style: css("padding:140px 24px 40px"), id: "main-content", children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: v.wrEyebrow }) }),
      /* @__PURE__ */ jsxs("h1", { className: "h1 enter", style: css("animation-delay:.08s"), children: [
        "Thinking ",
        /* @__PURE__ */ jsx("span", { className: "em", children: "out loud." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "lead enter", style: css("animation-delay:.16s"), children: "I learn in public on LinkedIn. These are the posts worth your time, plus a free book." })
    ] }) }),
    /* @__PURE__ */ jsx("section", { style: css("padding:16px 24px 40px"), children: /* @__PURE__ */ jsx("div", { className: "wrap", children: /* @__PURE__ */ jsx("a", { className: "card shell", href: "https://drive.google.com/file/d/1MGE0tIrHogphMomjjWxtnbU8be1UBK72/view", style: css("display:block;text-decoration:none;color:inherit"), children: /* @__PURE__ */ jsxs("div", { className: "core book", children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Free digital book" }),
        /* @__PURE__ */ jsxs("h2", { className: "h2", style: css("margin-top:16px"), children: [
          "Growth ",
          /* @__PURE__ */ jsx("span", { className: "em", children: "Without Reach" })
        ] }),
        /* @__PURE__ */ jsx("p", { style: css("margin:14px 0 0;max-width:540px;font-size:16px;line-height:1.6;color:var(--muted)"), children: "Five African economies, 2020 to 2024, pulled from World Bank open data and analysed in Python. Why calm numbers aren't good numbers, and chaos isn't the only problem." })
      ] }),
      /* @__PURE__ */ jsxs("span", { className: "pbtn solid", style: css("align-self:flex-end"), children: [
        "Read the book",
        /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
          /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
          /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
        ] }) })
      ] })
    ] }) }) }) }),
    (v.series ?? []).map((se, se_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("section", { style: css("padding:40px 24px 24px"), children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:16px"), children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: se.kicker }),
          /* @__PURE__ */ jsx("h2", { className: "h2", style: css("margin-top:14px;font-size:clamp(28px,3vw,42px)"), children: se.title })
        ] }),
        se.hasProject ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("a", { className: "pbtn ghost", href: se.project, style: css("min-height:44px;padding:3px 3px 3px 16px;font-size:14px"), children: [
          se.projectLabel,
          /* @__PURE__ */ jsx("span", { className: "ic", style: css("width:36px;height:36px"), children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
            /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
          ] }) })
        ] }) }) : null
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pgrid", style: css(`margin-top:20px;grid-template-columns:${se.cols ?? ""}`), children: (se.posts ?? []).map((po, po_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `card shell ${po.cls ?? ""}`, href: po.url, style: css("display:block;text-decoration:none;color:inherit"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:22px;display:flex;flex-direction:column;gap:14px;min-height:210px"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;justify-content:space-between;gap:10px;font-size:12px;color:var(--faint)"), children: [
          /* @__PURE__ */ jsx("span", { children: po.kicker }),
          /* @__PURE__ */ jsx("span", { children: po.date })
        ] }),
        /* @__PURE__ */ jsx("h3", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:26px;line-height:1.1"), children: po.t }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:14px;line-height:1.55;color:var(--muted)"), children: po.d }),
        /* @__PURE__ */ jsx("span", { style: css("margin-top:auto;font-size:14px;color:var(--ink)"), children: "Read on LinkedIn ↗" })
      ] }) }) }, po_i)) })
    ] }) }) }, se_i)),
    /* @__PURE__ */ jsx("section", { style: css("padding:32px 24px 104px"), children: /* @__PURE__ */ jsx("div", { className: "wrap", children: /* @__PURE__ */ jsxs("a", { className: "pbtn ghost", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/recent-activity/all/", children: [
      "Everything on LinkedIn",
      /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.6", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
        /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
      ] }) })
    ] }) }) }),
    /* @__PURE__ */ jsxs("footer", { style: css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)"), children: [
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("max-width:320px"), children: [
          /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px"), children: [
            "oluwaseyi",
            /* @__PURE__ */ jsx("span", { style: css("color:var(--accent)"), children: "." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6"), children: "Community, deals, data and code. Lagos, Nigeria." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;gap:48px;flex-wrap:wrap"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Pages" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/work", children: "Work" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/about", children: "About" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/writing", children: "Writing" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact", children: "Contact" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Elsewhere" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/", children: "LinkedIn" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://github.com/shykeys-data", children: "GitHub" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://x.com/shykeys101", children: "X" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://t.me/oluwamichael", children: "Telegram" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "mailto:hello@meetoluwaseyi.com", children: "Email" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px"), children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi" }),
        /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:20px;flex-wrap:wrap"), children: /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact#privacy", style: css("font-size:13px;padding:0"), children: "Privacy" }) })
      ] })
    ] })
  ] }) });
}
function ContactView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "pg", "data-theme": v.theme, children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)"), children: [
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)") }),
        v.brand
      ] }),
      (v.navLinks ?? []).map((nl, nl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `navlink hide-sm ${nl.cls ?? ""}`, href: nl.href, "aria-current": nl.current, children: nl.label }) }, nl_i)),
      /* @__PURE__ */ jsx("a", { className: "pbtn solid hide-sm", href: "/contact", style: css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px"), children: v.contactLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "modesw", onClick: v.toggleTheme, "aria-label": v.switchLabel, children: v.switchText }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "burger", onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: v.burgerIcon })
    ] }) }),
    v.menuOpen ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "mmenu", children: (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { href: ml.href, children: ml.label }) }, ml_i)) }) }) : null,
    /* @__PURE__ */ jsx("section", { style: css("padding:140px 24px 104px"), id: "main-content", children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: v.ctEyebrow }) }),
      /* @__PURE__ */ jsxs("h1", { className: "h1 enter", style: css("animation-delay:.08s"), children: [
        "Let’s grow ",
        /* @__PURE__ */ jsx("span", { className: "em", children: "something." })
      ] }),
      /* @__PURE__ */ jsx("p", { className: "lead enter", style: css("animation-delay:.16s"), children: "Hiring for community or growth? Bringing a product to Africa? Planning an AMA or campaign? Tell me what you’re working on. Messages come straight to my phone." }),
      /* @__PURE__ */ jsx("div", { className: "shell enter", style: css("animation-delay:.24s;margin-top:40px"), children: /* @__PURE__ */ jsxs("div", { className: "core csplit", children: [
        v.form_0,
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("p", { style: css("margin:0 0 8px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Or find me" }),
          (v.links ?? []).map((lk, lk_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("a", { href: lk.href, style: css("display:flex;justify-content:space-between;align-items:center;gap:12px;min-height:52px;padding:0 4px;color:var(--ink);text-decoration:none;box-shadow:inset 0 -1px 0 var(--line)"), children: [
            /* @__PURE__ */ jsxs("span", { children: [
              lk.t,
              " ",
              /* @__PURE__ */ jsx("span", { style: css("color:var(--faint);font-size:14px;margin-left:6px"), children: lk.h })
            ] }),
            /* @__PURE__ */ jsx("span", { "aria-hidden": "true", children: "↗" })
          ] }) }, lk_i)),
          /* @__PURE__ */ jsx("p", { style: css("margin:20px 0 0;font-size:14px;line-height:1.6;color:var(--muted)"), children: "Based in Lagos (WAT, UTC+1). English, Yoruba or a little Hausa." })
        ] })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsxs("footer", { style: css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)"), children: [
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("max-width:320px"), children: [
          /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px"), children: [
            "oluwaseyi",
            /* @__PURE__ */ jsx("span", { style: css("color:var(--accent)"), children: "." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6"), children: "Community, deals, data and code. Lagos, Nigeria." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;gap:48px;flex-wrap:wrap"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Pages" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/work", children: "Work" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/about", children: "About" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/writing", children: "Writing" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact", children: "Contact" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Elsewhere" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/", children: "LinkedIn" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://github.com/shykeys-data", children: "GitHub" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://x.com/shykeys101", children: "X" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://t.me/oluwamichael", children: "Telegram" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "mailto:hello@meetoluwaseyi.com", children: "Email" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px"), children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi" }),
        /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:20px;flex-wrap:wrap"), children: /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact#privacy", style: css("font-size:13px;padding:0"), children: "Privacy" }) })
      ] })
    ] })
  ] }) });
}
function CaseStudyView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("main", { ref: v.setRoot, className: v.rootCls, "data-theme": v.theme, style: css("position:relative;background:transparent;color:var(--ink);font-family:var(--body);min-height:100dvh;overflow-x:clip"), children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:18px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", className: "enter", style: css("position:relative;pointer-events:auto;display:flex;align-items:center;gap:4px;padding:6px 6px 6px 18px;border-radius:999px;background:var(--navbg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(var(--l),.09),0 20px 50px -20px rgba(0,0,0,.6);overflow:hidden"), children: [
      /* @__PURE__ */ jsx("span", { "aria-hidden": "true", className: "readbar", style: css("position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--g)") }),
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("text-decoration:none;color:var(--ink);font:var(--dw) 24px/1 var(--display);padding:8px 10px 8px 0"), children: [
        "oluwaseyi",
        /* @__PURE__ */ jsx("span", { style: css("color:var(--a)"), children: "." })
      ] }),
      /* @__PURE__ */ jsx("a", { className: "navlink", href: "/work", children: v.workLabel }),
      /* @__PURE__ */ jsx("a", { className: "navlink hide-sm", href: "https://github.com/shykeys-data/olist-ecommerce-bi", children: "Code" }),
      /* @__PURE__ */ jsx("a", { className: "pbtn ghost", href: "/contact", style: css("min-height:44px;padding:0 18px;font-size:14px"), children: v.talkLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "navlink", onClick: v.toggleTheme, "aria-label": v.switchLabel, style: css("border:0;background:transparent;cursor:pointer;font:500 14px var(--body);color:var(--a)"), children: v.switchText })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { style: css("position:relative;padding:140px 24px 64px;overflow:hidden"), id: "main-content", children: [
      /* @__PURE__ */ jsx("div", { "aria-hidden": "true", style: css("position:absolute;top:-200px;right:-160px"), children: /* @__PURE__ */ jsx("div", { className: "orb", style: css("width:640px;height:640px;border-radius:50%;background:var(--g);filter:blur(170px);opacity:.12") }) }),
      /* @__PURE__ */ jsxs("div", { style: css("position:relative;max-width:1200px;margin:0 auto"), children: [
        /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:0;animation-delay:.1s"), children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Data & BI · Case study · Olist" }) }),
        /* @__PURE__ */ jsxs("h1", { "aria-label": "Late parcels, early reviews.", style: css("margin:26px 0 0;font-family:var(--display);font-weight:var(--dw);font-size:clamp(60px,9vw,140px);line-height:.92;letter-spacing:-0.03em"), children: [
          /* @__PURE__ */ jsx("span", { className: "mask", style: css("display:block"), children: /* @__PURE__ */ jsx("span", { className: "mask-up", "aria-hidden": "true", style: css("animation-delay:.15s"), children: "Late parcels," }) }),
          /* @__PURE__ */ jsx("span", { className: "mask", style: css("display:block;font-style:italic;color:var(--g)"), children: /* @__PURE__ */ jsx("span", { className: "mask-up", "aria-hidden": "true", style: css("animation-delay:.3s"), children: "early reviews." }) })
        ] }),
        /* @__PURE__ */ jsx("p", { className: "enter", style: css("margin:28px 0 0;max-width:640px;font-size:19px;line-height:1.6;color:var(--muted);animation-delay:.6s"), children: "An end-to-end Python BI project on 99,441 real orders from Olist, Brazil’s largest marketplace. Four weeks, from nine messy CSV files to a live dashboard and an executive report." }),
        /* @__PURE__ */ jsx("div", { className: "enter mgrid", style: css("animation-delay:.75s;margin-top:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px"), children: (v.meta ?? []).map((m, m_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "shell", children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:20px 22px"), children: [
          /* @__PURE__ */ jsx("p", { style: css("margin:0;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint2)"), children: m.k }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;font-size:15px;line-height:1.5"), children: m.v })
        ] }) }) }, m_i)) })
      ] })
    ] }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-numbers", style: css("padding:40px 24px 80px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
      /* @__PURE__ */ jsxs("h2", { id: "h-numbers", "data-r": "", style: css("margin:0 0 28px;font:var(--dw) clamp(36px,4vw,56px)/1 var(--display)"), children: [
        "The numbers, ",
        /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:var(--faint)"), children: "quality-checked." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "kgrid", style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px"), children: (v.kpis ?? []).map((kp, kp_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css(`--i:${kp.i ?? ""}`), children: /* @__PURE__ */ jsxs("div", { className: "core kcore", style: css("padding:22px;min-height:136px;display:flex;flex-direction:column;justify-content:space-between"), children: [
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:13px;color:var(--muted)"), children: kp.l }),
        /* @__PURE__ */ jsx("p", { style: css(`margin:16px 0 0;font:var(--dw) clamp(34px,3.2vw,48px)/1 var(--display);color:${kp.c ?? ""};white-space:nowrap`), className: "kv", children: kp.v })
      ] }) }) }, kp_i)) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-chart", style: css("padding:40px 24px 80px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:40px;align-items:center"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "The headline finding" }),
        /* @__PURE__ */ jsxs("h2", { id: "h-chart", style: css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em"), children: [
          "Customers weren’t rating the product. ",
          /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:var(--g)"), children: "They were rating the wait." })
        ] }),
        /* @__PURE__ */ jsx("p", { style: css("margin:22px 0 0;max-width:460px;font-size:17px;line-height:1.65;color:var(--muted)"), children: "74% of reviews on late orders were written before the parcel even arrived. Even after delivery, late orders still score lower." })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css("--i:1"), children: /* @__PURE__ */ jsxs("div", { className: "core", ref: v.setBars, style: css("padding:clamp(22px,3vw,36px)"), children: [
        /* @__PURE__ */ jsx("p", { style: css("margin:0 0 24px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)"), children: "Average review score, out of 5" }),
        (v.ratings ?? []).map((rt, rt_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { style: css("margin-bottom:22px"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px"), children: [
            /* @__PURE__ */ jsx("span", { style: css("font-size:15px"), children: rt.l }),
            /* @__PURE__ */ jsxs("span", { style: css(`font:var(--dw) 30px/1 var(--display);color:${rt.c ?? ""}`), children: [
              rt.v,
              "★"
            ] })
          ] }),
          /* @__PURE__ */ jsx("div", { style: css("height:14px;border-radius:999px;background:rgba(var(--l),.06);overflow:hidden"), children: /* @__PURE__ */ jsx("div", { className: "bar", style: css(`width:${rt.w ?? ""};height:100%;border-radius:999px;background:${rt.c ?? ""};transition-delay:${rt.d ?? ""}`) }) })
        ] }) }, rt_i)),
        /* @__PURE__ */ jsx("p", { style: css("margin:6px 0 0;font-size:13px;color:var(--faint2)"), children: "Source: Olist public dataset, my analysis (Weeks 2 and 2.1)" })
      ] }) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-weeks", style: css("padding:40px 24px 80px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("margin-bottom:32px"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "How I built it" }),
        /* @__PURE__ */ jsxs("h2", { id: "h-weeks", style: css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em"), children: [
          "Four weeks, ",
          /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:var(--faint)"), children: "five steps." })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { className: "pgrid", "data-r": "", style: css("--i:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px"), role: "group", "aria-label": "Project steps", children: (v.phases ?? []).map((ph, ph_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("button", { type: "button", className: "phase", onClick: ph.pick, "aria-pressed": ph.pressed, style: css(`padding:18px 20px;border-radius:20px;${ph.style ?? ""}`), children: [
        /* @__PURE__ */ jsx("span", { style: css("display:block;font:500 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--g)"), children: ph.w }),
        /* @__PURE__ */ jsx("span", { style: css("display:block;margin-top:8px;font:var(--dw) 24px/1.1 var(--display)"), children: ph.t })
      ] }) }, ph_i)) }),
      /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css("--i:2;margin-top:14px"), children: /* @__PURE__ */ jsx("div", { className: "core", style: css("display:grid;padding:clamp(24px,4vw,44px)"), children: (v.phases ?? []).map((ph, ph_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { "aria-hidden": ph.hid, style: css(`grid-area:1/1;${ph.panel ?? ""}`), children: [
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font:500 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--g)"), children: ph.w }),
        /* @__PURE__ */ jsx("h3", { style: css("margin:10px 0 18px;font:var(--dw) clamp(30px,3.4vw,46px)/1.05 var(--display)"), children: ph.t }),
        /* @__PURE__ */ jsx("ul", { style: css("margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px"), children: (ph.items ?? []).map((it, it_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("li", { style: css("padding:16px 18px;border-radius:16px;background:rgba(var(--l),.03);box-shadow:inset 0 0 0 1px rgba(var(--l),.06);font-size:15px;line-height:1.55;color:var(--soft)"), children: it.t }) }, it_i)) })
      ] }) }, ph_i)) }) })
    ] }) }),
    /* @__PURE__ */ jsx("section", { "aria-labelledby": "h-recs", style: css("padding:40px 24px 80px"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto"), children: [
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("margin-bottom:32px"), children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "What Olist should do" }),
        /* @__PURE__ */ jsx("h2", { id: "h-recs", style: css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em"), children: "Four recommendations." })
      ] }),
      /* @__PURE__ */ jsx("div", { style: css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px"), children: (v.recs ?? []).map((rc, rc_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css(`--i:${rc.i ?? ""}`), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:26px;min-height:240px;display:flex;flex-direction:column"), children: [
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font:var(--dw) clamp(44px,4.5vw,64px)/1 var(--display);color:var(--g)"), children: rc.v }),
        /* @__PURE__ */ jsx("h3", { style: css("margin:18px 0 8px;font-size:18px;font-weight:500"), children: rc.t }),
        /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:15px;line-height:1.6;color:var(--muted)"), children: rc.b })
      ] }) }) }, rc_i)) })
    ] }) }),
    /* @__PURE__ */ jsxs("section", { "aria-labelledby": "h-honest", style: css("padding:48px 24px 112px"), children: [
      /* @__PURE__ */ jsx("div", { className: "shell", "data-r": "", style: css("max-width:1200px;margin:0 auto"), children: /* @__PURE__ */ jsxs("div", { className: "core", style: css("padding:clamp(24px,4vw,56px);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:40px"), children: [
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "What didn’t survive" }),
          /* @__PURE__ */ jsxs("h2", { id: "h-honest", style: css("margin:20px 0 0;font:var(--dw) clamp(36px,4vw,56px)/1.05 var(--display)"), children: [
            "A finding isn’t a finding until you’ve tried to ",
            /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:var(--g)"), children: "break it." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:20px 0 0;font-size:16px;line-height:1.65;color:var(--muted)"), children: "Before moving on, I ran 7 checks designed to break my own conclusions. Two findings were revised in public." })
        ] }),
        /* @__PURE__ */ jsx("div", { style: css("display:flex;flex-direction:column;gap:12px"), children: (v.revised ?? []).map((rv, rv_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsxs("div", { style: css("padding:20px;border-radius:20px;background:rgba(var(--l),.03);box-shadow:inset 0 0 0 1px rgba(var(--l),.06)"), children: [
          /* @__PURE__ */ jsx("p", { style: css("margin:0;font-size:15px;color:var(--faint);text-decoration:line-through"), children: rv.was }),
          /* @__PURE__ */ jsx("p", { style: css("margin:10px 0 0;font-size:16px;line-height:1.55"), children: rv.now })
        ] }) }, rv_i)) })
      ] }) }),
      /* @__PURE__ */ jsxs("div", { "data-r": "", style: css("max-width:1200px;margin:28px auto 0;display:flex;flex-wrap:wrap;gap:12px"), children: [
        /* @__PURE__ */ jsxs("a", { className: "pbtn solid", href: "https://github.com/shykeys-data/olist-ecommerce-bi", children: [
          "Code & report",
          /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
            /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("a", { className: "pbtn ghost", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/recent-activity/all/", children: [
          "Follow the weekly posts",
          /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
            /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
          ] }) })
        ] }),
        /* @__PURE__ */ jsxs("a", { className: "pbtn ghost", href: "https://olist-bi-shykeys.streamlit.app", children: [
          "Live dashboard",
          /* @__PURE__ */ jsx("span", { className: "ic", children: /* @__PURE__ */ jsxs("svg", { width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M7 17L17 7" }),
            /* @__PURE__ */ jsx("path", { d: "M8 7h9v9" })
          ] }) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsx("a", { className: "next", href: "/work", style: css("display:block;padding:96px 24px;text-decoration:none;color:var(--ink);box-shadow:inset 0 1px 0 rgba(var(--l),.06)"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px"), children: [
      /* @__PURE__ */ jsxs("div", { children: [
        /* @__PURE__ */ jsx("span", { className: "eyebrow", children: "Next project" }),
        /* @__PURE__ */ jsxs("p", { className: "big", style: css("margin:18px 0 0;font:var(--dw) clamp(52px,8vw,112px)/1 var(--display)"), children: [
          "Korrect ",
          /* @__PURE__ */ jsx("span", { style: css("font-style:italic;color:var(--a)"), children: "Cars" }),
          " →"
        ] })
      ] }),
      /* @__PURE__ */ jsx("p", { style: css("margin:0;max-width:360px;font-size:16px;line-height:1.6;color:var(--muted)"), children: "A digital-first car marketplace for Nigeria: buy, sell or exchange." })
    ] }) }),
    /* @__PURE__ */ jsx("footer", { style: css("padding:28px 24px;font-size:14px;color:var(--faint)"), children: /* @__PURE__ */ jsxs("div", { style: css("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px"), children: [
      /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi · Lagos, Nigeria" }),
      /* @__PURE__ */ jsx("a", { className: "navlink", href: "/", children: "Back to home" })
    ] }) })
  ] }) });
}
function ShellView({ v }) {
  return /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsxs("div", { className: "pg", "data-theme": v.theme, children: [
    /* @__PURE__ */ jsxs("div", { className: "aurora", "aria-hidden": "true", children: [
      /* @__PURE__ */ jsx("span", { className: "au1" }),
      /* @__PURE__ */ jsx("span", { className: "au2" }),
      /* @__PURE__ */ jsx("span", { className: "au3" })
    ] }),
    /* @__PURE__ */ jsx("div", { className: "grain", "aria-hidden": "true" }),
    /* @__PURE__ */ jsx("div", { style: css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none"), children: /* @__PURE__ */ jsxs("nav", { "aria-label": "Main", style: css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)"), children: [
      /* @__PURE__ */ jsxs("a", { href: v.homeHref, style: css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0"), children: [
        /* @__PURE__ */ jsx("img", { src: "/img/headshot.webp", alt: "", width: "34", height: "34", style: css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)") }),
        v.brand
      ] }),
      (v.navLinks ?? []).map((nl, nl_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { className: `navlink hide-sm ${nl.cls ?? ""}`, href: nl.href, "aria-current": nl.current, children: nl.label }) }, nl_i)),
      /* @__PURE__ */ jsx("a", { className: "pbtn solid hide-sm", href: "/contact", style: css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px"), children: v.contactLabel }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "modesw", onClick: v.toggleTheme, "aria-label": v.switchLabel, children: v.switchText }),
      /* @__PURE__ */ jsx("button", { type: "button", className: "burger", onClick: v.toggleMenu, "aria-label": v.menuLabel, "aria-expanded": v.menuOpen, children: v.burgerIcon })
    ] }) }),
    v.menuOpen ? /* @__PURE__ */ jsx(Fragment, { children: /* @__PURE__ */ jsx("div", { className: "mmenu", children: (v.menuLinks ?? []).map((ml, ml_i) => /* @__PURE__ */ jsx(Fragment$1, { children: /* @__PURE__ */ jsx("a", { href: ml.href, children: ml.label }) }, ml_i)) }) }) : null,
    v.main,
    /* @__PURE__ */ jsxs("footer", { style: css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)"), children: [
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between"), children: [
        /* @__PURE__ */ jsxs("div", { style: css("max-width:320px"), children: [
          /* @__PURE__ */ jsxs("p", { style: css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px"), children: [
            "oluwaseyi",
            /* @__PURE__ */ jsx("span", { style: css("color:var(--accent)"), children: "." })
          ] }),
          /* @__PURE__ */ jsx("p", { style: css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6"), children: "Community, deals, data and code. Lagos, Nigeria." })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: css("display:flex;gap:48px;flex-wrap:wrap"), children: [
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Pages" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/work", children: "Work" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/about", children: "About" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/writing", children: "Writing" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact", children: "Contact" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: css("display:flex;flex-direction:column"), children: [
            /* @__PURE__ */ jsx("p", { style: css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)"), children: "Elsewhere" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://www.linkedin.com/in/oluwaseyi-o-601915b5/", children: "LinkedIn" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://github.com/shykeys-data", children: "GitHub" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://x.com/shykeys101", children: "X" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "https://t.me/oluwamichael", children: "Telegram" }),
            /* @__PURE__ */ jsx("a", { className: "flink", href: "mailto:hello@meetoluwaseyi.com", children: "Email" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "wrap", style: css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px"), children: [
        /* @__PURE__ */ jsx("span", { children: "© 2026 Oluwaseyi Oshunwusi" }),
        /* @__PURE__ */ jsx("span", { style: css("display:flex;gap:20px;flex-wrap:wrap"), children: /* @__PURE__ */ jsx("a", { className: "flink", href: "/contact#privacy", style: css("font-size:13px;padding:0"), children: "Privacy" }) })
      ] })
    ] })
  ] }) });
}
class InnerPage extends Component {
  constructor(props) {
    super(props);
    this.state = { theme: props.data.mode, menu: false, rvOn: false, ...this.initial() };
  }
  initial() {
    return {};
  }
  componentDidMount() {
    this.offMode = onModeChange((m) => this.setState({ theme: m, menu: false }));
    if (this.bars && (!window.IntersectionObserver || prefersReducedMotion()))
      this.bars.classList.add("bars-in");
    else if (this.bars) {
      this.io2 = new IntersectionObserver(
        (es) => {
          if (es.some((x) => x.isIntersecting)) {
            this.bars.classList.add("bars-in");
            this.io2.disconnect();
          }
        },
        { threshold: 0.3 }
      );
      this.io2.observe(this.bars);
    }
  }
  componentWillUnmount() {
    this.offMode?.();
    this.io2?.disconnect();
  }
  shell(cur) {
    const s = this.state;
    const p = s.theme === "playful";
    const defs = p ? [
      ["/work", "Things I made", "work"],
      ["/about", "My story", "about"],
      ["/writing", "Writing", "writing"]
    ] : [
      ["/work", "Work", "work"],
      ["/about", "About", "about"],
      ["/writing", "Writing", "writing"]
    ];
    const navLinks = defs.map(([href, label, id]) => ({
      href,
      label,
      cls: id === cur ? "cur" : "",
      current: id === cur ? "page" : void 0
    }));
    const menuLinks = defs.map(([href, label]) => ({ href, label })).concat([{ href: "/contact", label: p ? "Say hi" : "Contact" }]);
    return {
      theme: p ? "playful" : "serious",
      isPlayful: p,
      isSerious: !p,
      homeHref: "/",
      brand: p ? "seyi" : "oluwaseyi",
      navLinks,
      menuLinks,
      contactLabel: p ? "Say hi" : "Contact",
      switchText: p ? "Serious" : "Playful",
      switchLabel: p ? "Switch to serious mode" : "Switch to playful mode",
      toggleTheme: () => {
        const t = p ? "serious" : "playful";
        saveMode(t);
        this.setState({ theme: t });
      },
      menuOpen: !!s.menu,
      menuLabel: s.menu ? "Close menu" : "Open menu",
      burgerIcon: s.menu ? "×" : "≡",
      toggleMenu: () => this.setState({ menu: !s.menu })
    };
  }
}
const COVER = {
  playful: { data: "#9FE8D0", community: "#FFB38A", bd: "#FFD23F", ventures: "#D7C3F5", building: "#B9E2F7" },
  serious: {
    data: "rgba(61,220,151,.14)",
    community: "rgba(245,165,36,.12)",
    bd: "rgba(245,165,36,.16)",
    ventures: "rgba(110,124,245,.16)",
    building: "rgba(110,124,245,.12)"
  }
};
const GLOW = {
  data: "#3DDC97",
  community: "#F5A524",
  bd: "#F5A524",
  ventures: "#6E7CF5",
  building: "#6E7CF5"
};
const LABEL = {
  data: "Data & BI",
  community: "Community",
  bd: "Business Dev",
  ventures: "Venture",
  building: "Build"
};
function projectLinks(x) {
  const L = (label, href, primary) => ({
    label,
    href,
    cls: primary ? "solid" : "ghost"
  });
  const out = [];
  if (x.caseStudy) out.push(L("Read the case study", `/work/${x.slug}`, true));
  if (x.links.live)
    out.push(
      L(
        x.caseStudy ? "Live dashboard" : `Visit ${new URL(x.links.live).hostname.replace(/^www\./, "")}`,
        x.links.live,
        !x.caseStudy
      )
    );
  if (x.links.book) out.push(L("Read the free book", x.links.book, out.length === 0));
  if (x.links.repo) out.push(L(out.length ? "Code" : "View on GitHub", x.links.repo, out.length === 0));
  return out;
}
class WorkPage extends InnerPage {
  initial() {
    return { filter: "all" };
  }
  render() {
    const s = this.state;
    const base = this.shell("work");
    const p = base.isPlayful;
    const all = this.props.data.projects;
    const f = s.filter || "all";
    const fdefs = p ? [
      ["all", "Everything"],
      ["community", "Community"],
      ["bd", "Deals"],
      ["data", "Data"],
      ["ventures", "Building"]
    ] : [
      ["all", "All"],
      ["community", "Community"],
      ["bd", "Business Dev"],
      ["data", "Data & BI"],
      ["ventures", "Ventures"]
    ];
    const on = p ? "background:#1B1A2E;color:#FFF6E5" : "background:#F5A524;color:#07080B";
    const off = p ? "background:#fff;color:#1B1A2E;box-shadow:inset 0 0 0 1px rgba(27,26,46,.12)" : "background:rgba(255,255,255,.05);color:#F3EFE7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)";
    const filters = fdefs.map(([id, label]) => ({
      label,
      count: id === "all" ? all.length : all.filter((x) => x.pillars.includes(id)).length,
      pressed: f === id ? "true" : "false",
      style: f === id ? on : off,
      pick: () => this.setState({ filter: id })
    }));
    const shown = all.filter((x) => f === "all" || x.pillars.includes(f));
    const projects = shown.map((x) => {
      const pillar = x.pillars[0] ?? "building";
      const links = projectLinks(x);
      return {
        id: x.slug,
        label: x.pillars.map((pp) => LABEL[pp] ?? pp).join(" · "),
        title: x.title,
        mark: x.mark || x.title.split(" ")[0],
        cover: COVER[p ? "playful" : "serious"][pillar],
        color: GLOW[pillar],
        markInk: p ? "#1B1A2E" : GLOW[pillar],
        synced: false,
        blurb: x.summary,
        tags: x.stack.map((t) => ({ t })),
        links,
        noLinks: links.length === 0,
        status: links.length === 0 ? x.slug === "ratedesk" ? "In development" : "Write-up coming soon" : void 0,
        cls: f !== "all" ? "" : x.featured && x.caseStudy ? "f2" : x.slug === "ratedesk" ? "w3" : "",
        coverH: f === "all" && x.featured && x.caseStudy ? "220px" : "150px"
      };
    });
    const empty = shown.length === 0 ? /* @__PURE__ */ jsxs(
      "p",
      {
        role: "status",
        className: "wrap",
        style: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
        children: [
          "Nothing here yet.",
          " ",
          /* @__PURE__ */ jsx("button", { type: "button", className: "chip", onClick: () => this.setState({ filter: "all" }), children: "Show everything" })
        ]
      }
    ) : null;
    return /* @__PURE__ */ jsx(
      WorkView,
      {
        v: {
          ...base,
          filters,
          projects,
          empty,
          workEyebrow: p ? "everything I have made" : "Built and shipped"
        }
      }
    );
  }
}
class AboutPage extends InnerPage {
  render() {
    const base = this.shell("about");
    const p = base.isPlayful;
    const prof = this.props.data.profile;
    const g = p ? "#147A63" : "#3DDC97";
    const jobs = prof.experience.map((j) => ({
      when: j.when,
      role: j.role,
      org: j.org,
      note: j.note,
      now: j.current && j.year >= 2024 && j.org.startsWith("WEEX"),
      hasProof: !!j.projectSlug,
      proof: j.projectSlug ? "/work" : void 0,
      proofLabel: "See the community work",
      dot: j.current && j.org.startsWith("WEEX") ? g : p ? "#C9C3B4" : "#2A2F3A",
      c: j.current && j.org.startsWith("WEEX") ? g : "var(--faint)"
    }));
    const stats = prof.stats.map((x) => ({ v: x.value, l: x.label }));
    const edu = prof.education.map((e) => ({ t: e.title, s: [e.org, e.year].filter(Boolean).join(" · ") }));
    const certs = prof.certificates.map((c) => ({ t: c.title }));
    const langs = prof.languages.map((l) => ({ t: l.name, s: l.level }));
    return /* @__PURE__ */ jsx(
      AboutView,
      {
        v: {
          ...base,
          jobs,
          stats,
          edu,
          certs,
          langs,
          aboutEyebrow: p ? "hi, this is me" : "About",
          roadEyebrow: p ? "how I got here" : "Twelve years on the web"
        }
      }
    );
  }
}
class WritingPage extends InnerPage {
  render() {
    const base = this.shell("writing");
    const p = base.isPlayful;
    const series = this.props.data.profile.writing.map((x) => {
      const n = x.posts.length;
      const cols = n % 3 === 0 || n >= 5 ? 3 : 2;
      const posts = x.posts.map((po, i) => ({
        kicker: po.kicker,
        date: po.date,
        t: po.title,
        d: po.desc,
        url: po.url,
        cls: cols === 3 && n % 3 === 2 && i === 0 ? "wide" : ""
      }));
      return {
        kicker: x.kicker,
        title: x.title,
        project: x.link,
        projectLabel: x.linkLabel,
        posts,
        hasProject: !!x.link,
        cols: `repeat(${cols},minmax(0,1fr))`
      };
    });
    return /* @__PURE__ */ jsx(WritingView, { v: { ...base, series, wrEyebrow: p ? "stuff I wrote" : "Notes from the work" } });
  }
}
class ContactPage extends InnerPage {
  render() {
    const base = this.shell("contact");
    const p = base.isPlayful;
    const { profile, form, turnstileSiteKey } = this.props.data;
    const l = profile.links;
    const links = [
      { t: "Email", h: l.email, href: `mailto:${l.email}` },
      { t: "LinkedIn", h: "", href: l.linkedin },
      { t: "Telegram", h: "@" + l.telegram.split("/").pop(), href: l.telegram },
      { t: "X", h: "@" + l.x.split("/").pop(), href: l.x },
      { t: "GitHub", h: l.github.split("/").pop(), href: l.github }
    ];
    const form_0 = /* @__PURE__ */ jsx(
      ContactForm,
      {
        mode: p ? "playful" : "serious",
        variant: "page",
        email: l.email,
        ...turnstileSiteKey ? { siteKey: turnstileSiteKey } : {},
        ...form ? { initial: form } : {}
      }
    );
    return /* @__PURE__ */ jsx(
      ContactView,
      {
        v: { ...base, links, form_0, ctEyebrow: p ? "come say hi" : "Open to roles and partnerships" }
      }
    );
  }
}
const TONE = {
  plain: "var(--ink)",
  warn: "var(--a)",
  bad: "#FF7A59",
  good: "var(--g)"
};
class CaseStudyPage extends InnerPage {
  initial() {
    return { phase: 0 };
  }
  render() {
    const s = this.state;
    const pr = this.props.data.project;
    const cs = pr?.caseStudy;
    if (!pr || !cs) return null;
    const pl = s.theme === "playful";
    const cur = s.phase || 0;
    const phases = cs.steps.map((d, i) => ({
      w: d.week,
      t: d.title,
      items: d.items.map((t) => ({ t })),
      pressed: i === cur,
      hid: i !== cur,
      style: i === cur ? "background:rgba(61,220,151,.14);box-shadow:inset 0 0 0 1px rgba(61,220,151,.5),0 0 32px -8px rgba(61,220,151,.45)" : "background:rgba(var(--l),.045);box-shadow:inset 0 0 0 1px rgba(var(--l),.1)",
      panel: i === cur ? "opacity:1;transform:none;visibility:visible;transition:opacity 600ms var(--spring) 80ms,transform 700ms var(--spring) 80ms,visibility 0s" : "opacity:0;transform:translateY(14px);visibility:hidden;transition:opacity 250ms var(--spring),transform 250ms var(--spring),visibility 0s linear 250ms",
      pick: () => this.setState({ phase: i })
    }));
    const v = {
      theme: pl ? "playful" : "serious",
      homeHref: "/",
      workLabel: pl ? "Things I made" : "All work",
      talkLabel: pl ? "Say hi" : "Talk to me",
      switchText: pl ? "Serious" : "Playful",
      switchLabel: pl ? "Switch to serious mode" : "Switch to playful mode",
      toggleTheme: () => {
        const t = pl ? "serious" : "playful";
        saveMode(t);
        this.setState({ theme: t });
      },
      meta: cs.meta.map((m) => ({ k: m.label, v: m.value })),
      kpis: cs.kpis.map((k, i) => ({ l: k.label, v: k.value, c: TONE[k.tone] ?? TONE.plain, i })),
      ratings: cs.ratings.map((r, i) => ({
        l: r.label,
        v: r.value.toFixed(1),
        w: r.value / 5 * 100 + "%",
        c: TONE[r.tone],
        d: i * 150 + "ms"
      })),
      phases,
      recs: cs.recommendations.map((r, i) => ({ v: r.value, t: r.title, b: r.body, i })),
      revised: cs.revised,
      rootCls: "",
      setRoot: () => {
      },
      setBars: (el) => {
        this.bars = el;
      }
    };
    return /* @__PURE__ */ jsx(CaseStudyView, { v });
  }
}
class SimplePage extends InnerPage {
  render() {
    const base = this.shell("none");
    const { route, profile } = this.props.data;
    const email = profile.links.email;
    const box = (eyebrow, title, body) => /* @__PURE__ */ jsx("section", { id: "main-content", style: { padding: "140px 24px 104px" }, children: /* @__PURE__ */ jsxs("div", { className: "wrap", children: [
      /* @__PURE__ */ jsx("p", { className: "enter", style: { margin: 0 }, children: /* @__PURE__ */ jsx("span", { className: "eyebrow", children: eyebrow }) }),
      /* @__PURE__ */ jsx("h1", { className: "h1 enter", style: { animationDelay: ".08s" }, children: title }),
      /* @__PURE__ */ jsx("div", { className: "lead enter", style: { animationDelay: ".16s", maxWidth: 680 }, children: body })
    ] }) });
    const homeLinks = /* @__PURE__ */ jsxs("p", { style: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }, children: [
      /* @__PURE__ */ jsx("a", { className: "pbtn solid", href: "/", children: "Go home" }),
      /* @__PURE__ */ jsx("a", { className: "pbtn ghost", href: "/work", children: "See the work" })
    ] });
    let main2;
    if (route === "privacy") {
      main2 = box(
        "Privacy",
        "What this site keeps, and why.",
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("p", { children: "This site collects only what it needs to reply to you." }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "The contact form and playful chat" }),
            " store your name, email, the reason you picked and your message. They’re used only to reply to you, never shared or sold, and never added to a mailing list. Messages are deleted automatically after 24 months."
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Your IP address" }),
            " is never stored. A one-way, salted fingerprint of it is kept with each message to stop spam and limit how often the form can be used."
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Cookies:" }),
            " two small ones remember whether you’ve seen the intro and which mode (playful or serious) you prefer. There are no advertising or tracking cookies, and any visit statistics are cookie-free."
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            /* @__PURE__ */ jsx("strong", { children: "Spam protection" }),
            " uses Cloudflare Turnstile when you send a message. Cloudflare also serves the site."
          ] }),
          /* @__PURE__ */ jsxs("p", { children: [
            "To see, correct or delete anything you sent, email ",
            /* @__PURE__ */ jsx("a", { href: `mailto:${email}`, children: email }),
            ". This page follows the Nigeria Data Protection Act 2023."
          ] })
        ] })
      );
    } else if (route === "thanks") {
      main2 = box(
        "Message sent",
        "Thank you. Your message is in.",
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("p", { children: "I read every message myself and usually reply within two working days." }),
          homeLinks
        ] })
      );
    } else if (route === "error") {
      main2 = box(
        "Something went wrong",
        "That one’s on me.",
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("p", { children: [
            "The page hit an error. Please try again in a minute, or email",
            " ",
            /* @__PURE__ */ jsx("a", { href: `mailto:${email}`, children: email }),
            "."
          ] }),
          homeLinks
        ] })
      );
    } else {
      main2 = box(
        "404",
        "That page doesn’t exist.",
        /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("p", { children: "It may have moved, or the link has a typo." }),
          homeLinks
        ] })
      );
    }
    return /* @__PURE__ */ jsx(ShellView, { v: { ...base, main: main2 } });
  }
}
const PAGES = {
  PlayfulHome,
  SeriousHome,
  Work: WorkPage,
  CaseStudy: CaseStudyPage,
  About: AboutPage,
  Writing: WritingPage,
  Contact: ContactPage,
  Simple: SimplePage
};
function render(data) {
  return renderToString(/* @__PURE__ */ jsx(App, { data, Page: PAGES[pageKeyFor(data)] }));
}
const PAGE_CSS = {
  PlayfulHome: `:root{--spring:cubic-bezier(.32,.72,0,1);--toy:cubic-bezier(.34,1.56,.64,1);--expo:cubic-bezier(.19,1,.22,1);--ink:#1B1A2E;--cream:#FFF6E5;--sun:#FFD23F;--tang:#FF7A3D;--mint:#9FE8D0;--sky:#B9E2F7;--peach:#FFB38A;--pink:#F7B6CC;--lilac:#D7C3F5}
html{scroll-behavior:smooth}
body{margin:0;background:#FFF6E5}
a{color:#1B1A2E}
::selection{background:#FFD23F;color:#1B1A2E}
@keyframes drop{0%{opacity:0;transform:translateY(-120px) rotate(-20deg)}60%{opacity:1;transform:translateY(12px) rotate(4deg)}80%{transform:translateY(-6px) rotate(-2deg)}100%{transform:none}}
@keyframes boing{0%,100%{transform:none}30%{transform:translateY(-22px) scale(1.1,.9)}50%{transform:translateY(0) scale(.9,1.1)}70%{transform:translateY(-6px)}}
@keyframes wave{0%,60%,100%{transform:rotate(0)}10%,30%{transform:rotate(18deg)}20%,40%{transform:rotate(-10deg)}}
@keyframes pop{from{opacity:0;transform:scale(.6) translateY(20px)}to{opacity:1;transform:none}}
@keyframes blurUp{from{opacity:0;transform:translateY(48px);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes float{0%,100%{transform:translateY(0) rotate(var(--r,0deg))}50%{transform:translateY(-14px) rotate(calc(var(--r,0deg) * -1))}}
@keyframes blob{0%,100%{border-radius:58% 42% 55% 45%/48% 58% 42% 52%}33%{border-radius:42% 58% 38% 62%/60% 40% 60% 40%}66%{border-radius:55% 45% 62% 38%/40% 55% 45% 60%}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes drive{0%,100%{transform:translateX(-14px)}50%{transform:translateX(14px)}}
@keyframes blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes barUp{0%,100%{transform:scaleY(.4)}50%{transform:scaleY(1)}}
@keyframes dots{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
@keyframes draw{from{stroke-dashoffset:320}to{stroke-dashoffset:0}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes marqueeRev{from{transform:translateX(-50%)}to{transform:translateX(0)}}
@keyframes confetti{0%{opacity:1;transform:translate(0,0) rotate(0)}100%{opacity:0;transform:translate(var(--x),var(--y)) rotate(var(--rot))}}
@keyframes wiggle{0%,100%{transform:rotate(0)}25%{transform:rotate(-10deg)}75%{transform:rotate(10deg)}}
@keyframes msgIn{from{opacity:0;transform:scale(.96) translateY(8px)}to{opacity:1;transform:none}}
@keyframes sunRise{from{opacity:0;transform:translateY(180px) scale(.6)}to{opacity:1;transform:none}}
@keyframes introDrop{0%{opacity:0;transform:translateY(-110vh) rotate(-25deg)}55%{opacity:1;transform:translateY(18px) rotate(6deg) scaleY(.86)}72%{transform:translateY(-16px) rotate(-3deg) scaleY(1.04)}86%{transform:translateY(4px)}100%{transform:none}}
@keyframes twk{0%,100%{opacity:.2}50%{opacity:1}}
.twk{animation:twk 2.6s linear infinite}
@keyframes toastIn{from{opacity:0;transform:translateY(24px) scale(.96)}to{opacity:1;transform:none}}
.toast{animation:toastIn 600ms var(--spring) both;animation-delay:.8s}
@keyframes introLeave{to{transform:translateY(-100%)}}
@keyframes skyLife{0%{transform:scale(.82);opacity:.4}30%{transform:scale(1);opacity:1}75%{transform:scale(1);opacity:1}100%{transform:scale(.96);opacity:.3}}
.drop{display:inline-block;animation:drop .9s var(--toy) both}
.boing{display:inline-block;cursor:default}
.wave{display:inline-block;transform-origin:70% 80%;animation:wave 2.4s ease-in-out infinite}
.pop{animation:pop .7s var(--toy) both}
.enter{animation:blurUp 1100ms var(--spring) both}
.float{animation:float 5s ease-in-out infinite}
.blob{border-radius:58% 42% 55% 45%/48% 58% 42% 52%;animation:blob 9s ease-in-out infinite}
.spin{animation:spin 14s linear infinite}
.drive{animation:drive 3s ease-in-out infinite}
.blink{transform-origin:center;transform-box:fill-box;animation:blink 4s infinite}
.bar{transform-origin:bottom;transform-box:fill-box;animation:barUp 1.6s ease-in-out infinite}
.dt{display:inline-block;width:.18em;height:.18em;border-radius:50%;background:#1B1A2E;animation:dots 1.2s infinite}
.draw{stroke-dasharray:320;animation:draw 1.6s .9s ease-out both}
.tape{animation:marquee 30s linear infinite}
.tape-rev{animation:marqueeRev 36s linear infinite}
.hand{font-family:'Caveat',cursive}
.msg{transform-origin:bottom left;animation:msgIn 400ms var(--spring) both}
.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(27,26,46,.05);box-shadow:inset 0 0 0 1px rgba(27,26,46,.08);font:600 10px 'Outfit',sans-serif;text-transform:uppercase;letter-spacing:.2em;color:#4A4860}
.shell{padding:6px;border-radius:34px;background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px rgba(27,26,46,.06),0 30px 60px -28px rgba(27,26,46,.28)}
.core{position:relative;height:100%;box-sizing:border-box;border-radius:28px;box-shadow:inset 0 1px 1px rgba(255,255,255,.7);overflow:hidden}
.pbtn{display:inline-flex;align-items:center;gap:14px;min-height:60px;padding:6px 6px 6px 26px;border-radius:999px;box-sizing:border-box;border:0;text-decoration:none;font:700 17px 'Outfit',sans-serif;cursor:pointer;box-shadow:0 18px 36px -16px rgba(27,26,46,.4);transition:transform 400ms var(--spring),box-shadow 600ms var(--spring),background 500ms var(--spring)}
.pbtn:active{transform:scale(.98)}
.pbtn .ic{width:48px;height:48px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 700ms var(--spring)}
.navlink{color:#3E3C55;text-decoration:none;padding:10px 14px;border-radius:999px;font:600 14px 'Outfit',sans-serif;transition:background 500ms var(--spring),color 500ms var(--spring)}
.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:700 14px 'Outfit',sans-serif;cursor:pointer;transition:background 500ms var(--spring),color 500ms var(--spring),box-shadow 500ms var(--spring)}
.chip:active,.timebtn:active{transform:scale(.97)}
.timebtn{min-height:48px;padding:0 18px;border-radius:999px;border:0;font:700 15px 'Outfit',sans-serif;cursor:pointer;transition:background 500ms var(--spring),color 500ms var(--spring)}
.lift{transition:transform 800ms var(--spring)}
.road::-webkit-scrollbar{display:none}
.cascade{display:flex;justify-content:center;padding:20px 0 40px}
.cascade .cc{position:relative;flex:0 1 300px;min-width:0}
.cascade .cc + .cc{margin-left:-14px}
.cascade .cc .lift{transform:rotate(var(--t))}
.sky{transition:background-color 900ms var(--spring);container-type:inline-size}
.sun{left:0;top:0;transition:transform 1100ms var(--spring),background-color 900ms var(--spring),box-shadow 900ms var(--spring)}
.stack-card{position:sticky}
.note{transform:rotate(var(--t,0deg));transition:transform 700ms var(--spring)}
.field{flex:1 1 220px;min-height:56px;box-sizing:border-box;border:0;border-radius:999px;padding:0 22px;font:500 16px 'Outfit',sans-serif;background:#fff;color:#1B1A2E;box-shadow:inset 0 0 0 1px rgba(27,26,46,.12)}
.field:focus{outline:none;box-shadow:inset 0 0 0 2px #FF7A3D}
.intro.leave{animation:introLeave 550ms cubic-bezier(.77,0,.175,1) forwards}
.intro-sun{animation:sunRise 900ms var(--expo) both}
.intro-rays{animation:spin 12s linear infinite}
.intro-letter{display:inline-block;animation:introDrop 1000ms cubic-bezier(.25,.46,.45,.94) both}
.waiting .drop,.waiting .pop,.waiting .draw,.waiting .enter{animation-play-state:paused}
.menu{position:fixed;inset:0;z-index:70;background:rgba(255,210,63,.94);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;visibility:hidden;transition:opacity 600ms var(--spring),visibility 0s linear 600ms}
.menu.open{opacity:1;visibility:visible;transition:opacity 600ms var(--spring),visibility 0s}
.menu .ml{display:block;opacity:0;transform:translateY(48px) rotate(-2deg);transition:opacity 500ms var(--spring),transform 700ms var(--spring)}
.menu.open .ml{opacity:1;transform:none;transition-delay:calc(100ms + var(--i) * 60ms)}
.burger{position:relative;width:48px;height:48px;border-radius:50%;border:0;background:#1B1A2E;cursor:pointer}
.burger span{position:absolute;left:15px;right:15px;height:2px;background:#FFF6E5;border-radius:2px;transition:transform 600ms var(--spring)}
.burger span:nth-child(1){top:20px}.burger span:nth-child(2){top:27px}
.burger.x span:nth-child(1){transform:translateY(3.5px) rotate(45deg)}
.burger.x span:nth-child(2){transform:translateY(-3.5px) rotate(-45deg)}
.rv-on [data-r]{opacity:0;transform:translateY(40px);filter:blur(8px);transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);transition-delay:calc(var(--i,0) * 70ms)}
.rv-on [data-r].in{opacity:1;transform:none;filter:blur(0)}
a:focus-visible,button:focus-visible,input:focus-visible{outline:3px solid #FF7A3D;outline-offset:3px}
@supports (animation-timeline: view()){.sky-life{animation:skyLife linear both;animation-timeline:view();animation-range:cover 0% cover 100%}}
@media (hover:hover){
.navlink:hover{background:rgba(27,26,46,.06);color:#1B1A2E}
.pbtn:hover{box-shadow:0 26px 48px -18px rgba(27,26,46,.45)}
.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}
.cascade .cc:hover{z-index:5}
.cascade .cc:hover .lift{transform:rotate(0) translateY(-18px) scale(1.04)}
.cascade .cc:hover .wig,.stack-card:hover .wig{animation:wiggle .6s ease}
.stack-card:hover .lift{transform:translateY(-8px)}
.stack-card:hover .ic{transform:translate(4px,-1px) scale(1.05)}
.chip:hover{box-shadow:inset 0 0 0 1px rgba(27,26,46,.3)}
.boing:hover{animation:boing .6s ease}
.road-card:hover .lift{transform:rotate(0) translateY(-10px) !important}
.notewrap:hover .note{transform:rotate(0) scale(1.05)}
.tape-wrap:hover .tape,.tape-wrap:hover .tape-rev{animation-play-state:paused}
}
@media (max-width:900px){
.hide-sm{display:none !important}
.road{padding-left:24px !important;padding-right:24px !important}
.hero-art{position:relative !important;right:auto !important;bottom:auto !important;margin:40px auto 0 !important}
.cascade{flex-direction:column;align-items:stretch;gap:16px}
.cascade .cc{flex:auto}
.cascade .cc + .cc{margin-left:0}
.cascade .cc .lift{transform:none !important}
.stack-art{min-height:150px !important}
#top{min-height:0 !important;padding-top:120px !important;padding-bottom:48px !important}
main > section:not(#top){padding-top:56px !important;padding-bottom:56px !important}
.cascade{display:grid !important;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.lvcore{min-height:0 !important;padding:18px !important}
.lvcore .wig{width:44px !important;height:44px !important}
.lvcore .lvh{font-size:22px !important;padding-top:14px !important}
.lvcore p{font-size:13px !important}
.numgrid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:14px !important}
.numgrid .lift{padding:12px !important}
.numgrid .nv{font-size:40px !important}
.numgrid .lift span + span{font-size:12px !important}
.notegrid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:16px !important}
.notegrid .note{padding:24px 14px 16px !important}
.notegrid .note p{font-size:20px !important}
.road .core{min-height:220px !important}
.show-sm{display:inline !important}
}
@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;animation-delay:0s !important;transition-duration:.01ms !important;transition-delay:0s !important}.rv-on [data-r]{opacity:1;transform:none;filter:none}}

/* scroll sky: sun (top, far left) -> sets in an arc -> moon (bottom, far right). Opacity/transform only. */
.sky2{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;--sz:clamp(40px,4.6vw,68px);--g:clamp(10px,2.4vw,36px);--top:14px;--dip:calc(var(--sz) * .35);--p:0}
.sky2-fg{bottom:auto;height:calc(var(--sz) * 2.6);z-index:65;overflow:visible}
.sky2 .sk-wash{position:absolute;inset:0}
.sky2 .sk-day{background:radial-gradient(60vmax 40vmax at 0% 0%,rgba(255,210,63,.20),transparent 60%)}
.sky2 .sk-dusk{opacity:0;background:radial-gradient(70vmax 46vmax at 100% 0%,rgba(122,108,214,.16),transparent 62%),linear-gradient(180deg,rgba(43,38,92,.06),transparent 55%)}
.sky2 .sk-x{position:absolute;left:var(--g);top:var(--top);width:calc(100% - var(--sz) - var(--g) * 2);height:var(--sz)}
.sky2 .sk-y,.sky2 .sk-set,.sky2 .sk-b{position:absolute;left:0;top:0;width:var(--sz);height:var(--sz)}
.sky2 .sk-glow{position:absolute;inset:-45%;border-radius:50%}
.sky2 .sk-sun .sk-glow{background:radial-gradient(circle,rgba(255,196,61,.42),rgba(255,196,61,.12) 45%,transparent 70%);animation:skBreath 5s ease-in-out infinite alternate}
.sky2 .sk-rays{position:absolute;inset:-22%;border-radius:50%;background:repeating-conic-gradient(rgba(255,170,40,.32) 0 5deg,transparent 5deg 20deg);-webkit-mask:radial-gradient(circle,transparent 58%,#000 60%,transparent 72%);mask:radial-gradient(circle,transparent 58%,#000 60%,transparent 72%);animation:skSpin 48s linear infinite}
.sky2 .sk-disc{position:absolute;inset:0;border-radius:50%}
.sky2 .sk-moon .sk-glow{background:radial-gradient(circle,rgba(170,176,255,.38),rgba(170,176,255,.10) 45%,transparent 70%)}
/* clouds travel with their body; each drifts on its own slow loop so the pair never moves in lockstep */
.sky2 .cl{position:absolute;overflow:visible;aspect-ratio:1.7;animation:skDrift var(--dd,9s) ease-in-out var(--dl,0s) infinite alternate}
.sky2 .cl.cl-m{animation:skDrift var(--dd,9s) ease-in-out var(--dl,0s) infinite alternate,cnMorph 6.5s ease-in-out infinite alternate}
.sky2 .cl-front{z-index:2}
.sky2 .sk-dayset .c1{left:calc(var(--sz) * .3);top:calc(var(--sz) * .5);width:calc(var(--sz) * 1.35)}
.sky2 .sk-dayset .c2{left:calc(var(--sz) * 1.1);top:calc(var(--sz) * -.12);width:calc(var(--sz) * .95);--dd:12s;--dl:-4s;z-index:0}
.sky2 .sk-nightset .c3{left:calc(var(--sz) * -.7);top:calc(var(--sz) * .5);width:calc(var(--sz) * 1.3)}
.sky2 .sk-nightset .c4{left:calc(var(--sz) * -1.6);top:calc(var(--sz) * -.05);width:calc(var(--sz) * .9);opacity:.85;--dd:13s;--dl:-6s;z-index:0}
.sky2 .sk-flash{position:absolute;inset:0;opacity:0;background:radial-gradient(80vmax 50vmax at var(--bxv,50vw) 0%,rgba(255,248,225,.75),transparent 60%)}
.sky2[data-strike] .sk-flash{animation:cnFlash 750ms linear both}
.sky2 .sk-nightset b{position:absolute;width:4px;height:4px;border-radius:50%;background:#7A6CD6;box-shadow:0 0 8px rgba(122,108,214,.7);animation:skTwinkle 3.2s ease-in-out infinite alternate}
.sky2 .sk-nightset b.sp{width:12px;height:12px;margin:-4px 0 0 -4px;border-radius:0;box-shadow:none;background:radial-gradient(circle,#fff 0 12%,#7A6CD6 30%,transparent 72%);clip-path:polygon(50% 0,58% 42%,100% 50%,58% 58%,50% 100%,42% 58%,0 50%,42% 42%)}
.sky2 .sk-nightset b.sp.lg{width:16px;height:16px;margin:-6px 0 0 -6px}
.sky2 .sk-nightset b.gd{background:#E2A93B;box-shadow:0 0 8px rgba(226,169,59,.7)}

.sky2 .sk-nightset{opacity:0}
@keyframes skBreath{to{opacity:.6;scale:1.08}}
@keyframes skSpin{to{rotate:360deg}}
@keyframes skDrift{0%{translate:-5px 0}100%{translate:7px 3px}}
@keyframes skTwinkle{from{opacity:.25;scale:.6}to{opacity:1;scale:1}}
@keyframes skX{from{translate:0 0}to{translate:100% 0}}
@keyframes skY{0%{translate:0 0;animation-timing-function:cubic-bezier(.45,0,.55,1)}50%{translate:0 var(--dip);animation-timing-function:cubic-bezier(.45,0,.55,1)}100%{translate:0 0}}
@keyframes skSetOut{0%,38%{opacity:1}54%,100%{opacity:0}}
@keyframes skSetIn{0%,46%{opacity:0}64%,100%{opacity:1}}
@keyframes skSunSink{0%,36%{scale:1}54%,100%{scale:.7}}
@keyframes skMoonTurn{0%,46%{scale:.6;rotate:-50deg}64%,100%{scale:1;rotate:0deg}}
@keyframes skDayOut{0%{opacity:1}40%,100%{opacity:0}}
@keyframes skDuskIn{0%,45%{opacity:0}100%{opacity:1}}
.sky2 .sk-x{animation:skX 1s linear both}
.sky2 .sk-y{animation:skY 1s linear both}
.sky2 .sk-dayset{animation:skSetOut 1s linear both}
.sky2 .sk-nightset{animation:skSetIn 1s linear both}
.sky2 .sk-sun{animation:skSunSink 1s linear both}
.sky2 .sk-moon{animation:skMoonTurn 1s linear both}
.sky2 .sk-day{animation:skDayOut 1s linear both}
.sky2 .sk-dusk{animation:skDuskIn 1s linear both}
.sky2 :is(.sk-x,.sk-y,.sk-dayset,.sk-nightset,.sk-sun,.sk-moon,.sk-day,.sk-dusk){animation-play-state:paused;animation-delay:calc(var(--p) * -1s)}
@supports (animation-timeline: scroll()){.sky2 :is(.sk-x,.sk-y,.sk-dayset,.sk-nightset,.sk-sun,.sk-moon,.sk-day,.sk-dusk){animation-play-state:running;animation-delay:0s;animation-duration:auto;animation-timeline:scroll(root)}}
@media (max-width:640px){.sky2{--top:10px;--dip:calc(var(--sz) * 2.1)}.sky-band{height:150px}.sky2 .sk-nightset .c4{display:none}}
@media (prefers-reduced-motion: reduce){.sky2 *{animation:none !important}.sky2 .sk-y{width:100%}.sky2 .sk-nightset{left:100%;margin-left:calc(var(--sz) * -1)}.sky2 .sk-dayset,.sky2 .sk-day{opacity:1}.sky2 .sk-nightset,.sky2 .sk-dusk{opacity:0}.sky2[data-night] .sk-dayset,.sky2[data-night] .sk-day{opacity:0}.sky2[data-night] .sk-nightset,.sky2[data-night] .sk-dusk{opacity:1}}

/* living cloud nav: the island menu is a cloud that breathes, bobs, and turns moonlit with the scroll sky */
.cloudnav{position:relative;isolation:isolate;animation:cnFloat 6s ease-in-out infinite alternate;cursor:default}
.cn-sky{position:absolute;inset:-26px -34px;z-index:-1;pointer-events:none;transform-origin:50% 60%}
.cn-mode{position:absolute;inset:0}
.cn-cloud{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;transform-origin:50% 70%;transition:scale 900ms var(--spring),translate 900ms var(--spring)}
.cn-cloud g{pointer-events:visiblePainted;cursor:pointer}
.cn-a{translate:calc(var(--mx,0) * -3px) calc(var(--my,0) * -2px)}
.cn-b{translate:calc(var(--mx,0) * 4px) calc(var(--my,0) * 2px);animation:cnMorph 7s ease-in-out infinite alternate}
.cloudnav:hover .cn-cloud{scale:1.03}
.cn-glow{position:absolute;inset:14% 8% 6%;border-radius:50%;opacity:0;background:radial-gradient(34% 62% at var(--bx,50%) 72%,rgba(255,238,170,.95),rgba(255,238,170,.35) 45%,transparent 72%)}
.cn-bolt{position:absolute;top:calc(100% - 4px);left:var(--bx,50%);width:46px;height:92px;margin-left:-23px;opacity:0;overflow:visible;pointer-events:none;z-index:-1;filter:drop-shadow(0 0 4px rgba(255,236,160,.95)) drop-shadow(0 0 14px rgba(255,190,70,.6));transform-origin:50% 0}
@media (max-width:640px){.cn-bolt{width:36px;height:72px;margin-left:-18px}}
.navwrap[data-strike] .cn-bolt{animation:cnStrike 750ms linear both}
.navwrap[data-strike] .cn-glow{animation:cnStrike 750ms linear both}
.navwrap[data-strike] .cn-sky{animation:cnRumble 520ms cubic-bezier(.32,.72,0,1) both}
.cn-mode .b-sm{display:inline}
.cn-icon{position:relative;display:inline-block;width:28px;height:28px}
.cn-icon>*{position:absolute;inset:0}
.cn-moonic{opacity:0}
@keyframes cnFloat{from{translate:0 -2px}to{translate:0 3px}}
@keyframes cnMorph{0%,15%{opacity:0}85%,100%{opacity:1}}
@keyframes cnStrike{0%{opacity:0;scale:1 .9}5%{opacity:1;scale:1 1}11%{opacity:.12}17%{opacity:1}36%{opacity:.85}62%,100%{opacity:0}}
@keyframes cnFlash{0%{opacity:0}6%{opacity:.9}12%{opacity:.15}18%{opacity:.7}60%,100%{opacity:0}}
@keyframes cnRumble{0%,100%{rotate:0deg}20%{rotate:-.7deg}45%{rotate:.55deg}70%{rotate:-.25deg}}
@keyframes cnNightIn{0%,46%{opacity:0}64%,100%{opacity:1}}
@keyframes cnSunIconOut{0%,40%{opacity:1;scale:1}56%,100%{opacity:0;scale:.6}}
@keyframes cnMoonIconIn{0%,48%{opacity:0;scale:.6;rotate:-40deg}64%,100%{opacity:1;scale:1;rotate:0deg}}
.cn-night{animation:cnNightIn 1s linear both}
.cn-sunic{animation:cnSunIconOut 1s linear both}
.cn-moonic{animation:cnMoonIconIn 1s linear both}
.navwrap :is(.cn-night,.cn-sunic,.cn-moonic){animation-play-state:paused;animation-delay:calc(var(--p,0) * -1s)}
@supports (animation-timeline: scroll()){.navwrap :is(.cn-night,.cn-sunic,.cn-moonic){animation-play-state:running;animation-delay:0s;animation-duration:auto;animation-timeline:scroll(root)}}
@media (max-width:640px){.cn-mode .b-sm{display:none}.cn-sky{inset:-22px -26px}}
@media (prefers-reduced-motion: reduce){.cn-b{opacity:0}.cn-bolt,.cn-glow{display:none}.cloudnav,.cn-b,.cn-bolt,.cn-glow,.cn-sky,.sk-flash,.navwrap :is(.cn-night,.cn-sunic,.cn-moonic){animation:none !important}.cn-night,.cn-moonic{opacity:0}.cn-sunic{opacity:1}.navwrap[data-night] :is(.cn-night,.cn-moonic){opacity:1}.navwrap[data-night] .cn-sunic{opacity:0}}

/* living sun + moon */
.sky2 .sk-disc{overflow:hidden}
.sky2 .sk-tex{position:absolute;inset:0;width:100%;height:100%;display:block}
.sky2 .sk-sun .sk-disc{box-shadow:0 0 0 1px rgba(255,214,110,.35),0 0 22px 4px rgba(255,200,80,.55),0 18px 40px -16px rgba(255,122,61,.55);animation:skSpin 70s linear infinite}
.sky2 .sk-sun .sk-rays2{inset:-34%;opacity:.55;background:repeating-conic-gradient(rgba(255,196,80,.28) 0 3deg,transparent 3deg 14deg);animation:skSpin 90s linear infinite reverse,skShimmer 3.8s ease-in-out infinite alternate}
.sky2 .sk-moon .sk-disc{box-shadow:0 0 18px 3px rgba(190,186,255,.45),0 18px 40px -16px rgba(43,38,92,.45);animation:skLibrate 14s ease-in-out infinite alternate}
.sky2 .sk-moon .sk-glow{animation:skBreath 6s ease-in-out infinite alternate}
.sky2 :is(.sk-sun,.sk-moon){pointer-events:auto;cursor:pointer}
.sky2[data-flare] .sk-sun .sk-glow{animation:skFlare 900ms cubic-bezier(.32,.72,0,1) both}
.sky2[data-flare] .sk-sun .sk-rays{animation:skSpin 48s linear infinite,skFlare 900ms cubic-bezier(.32,.72,0,1) both}
.sky2 .sk-shoot{position:absolute;left:var(--sx,60%);top:var(--sy,30px);width:110px;height:2px;border-radius:2px;opacity:0;pointer-events:none;background:linear-gradient(90deg,rgba(122,108,214,0),rgba(122,108,214,.55) 60%,#fff);box-shadow:0 0 8px rgba(160,150,255,.8);rotate:-14deg;transform-origin:100% 50%}
.sky2[data-shoot] .sk-shoot{animation:skShoot 1100ms cubic-bezier(.22,.61,.36,1) both}
.sky-band{position:fixed;left:0;right:0;top:0;height:clamp(124px,15vh,148px);z-index:60;pointer-events:none}
.sky-band i{position:absolute;inset:0}
.sky-band .sb-day{background:linear-gradient(180deg,#FFF1D6 0%,rgba(255,244,224,.92) 38%,rgba(255,246,229,0) 100%)}
.sky-band .sb-night{opacity:0;background:linear-gradient(180deg,#EDE7FA 0%,rgba(240,235,250,.9) 38%,rgba(244,240,250,0) 100%)}
.sky-band .sb-night{animation:skDuskIn 1s linear both}
.sky-band .sb-night{animation-play-state:paused;animation-delay:calc(var(--p,0) * -1s)}
@supports (animation-timeline: scroll()){.sky-band .sb-night{animation-play-state:running;animation-delay:0s;animation-duration:auto;animation-timeline:scroll(root)}}
@keyframes skShimmer{from{opacity:.3}to{opacity:.7}}
@keyframes skLibrate{from{rotate:-5deg}to{rotate:5deg}}
@keyframes skFlare{0%{scale:1;opacity:1}35%{scale:1.35;opacity:1}100%{scale:1;opacity:1}}
@keyframes skShoot{0%{opacity:0;translate:0 0}10%{opacity:1}70%{opacity:.9}100%{opacity:0;translate:-170px 42px}}
@media (prefers-reduced-motion: reduce){.sky2 .cl-m,.sky2 .sk-shoot{display:none}.sky-band :is(.sb-day,.sb-night){animation:none !important}.sky-band .sb-night{opacity:0}.sky-band[data-night] .sb-night{opacity:1}}

/* living avatar: breathes, tilts toward the pointer, and snaps the visitor with a phone when tapped */
.ava-tilt{position:absolute;inset:0;transform:perspective(900px) rotateX(calc(var(--ty,0) * -7deg)) rotateY(calc(var(--tx,0) * 9deg));transition:transform 700ms cubic-bezier(.32,.72,0,1);animation:avaBreath 4.8s ease-in-out infinite alternate}
.ava-squash{position:absolute;inset:0;transform-origin:50% 88%}
.ava-img{scale:1.08;translate:calc(var(--tx,0) * -10px) calc(var(--ty,0) * -6px);transition:translate 700ms cubic-bezier(.32,.72,0,1)}
.ava-hit{position:absolute;inset:12%;border-radius:50%;border:0;background:transparent;cursor:pointer;z-index:3;-webkit-tap-highlight-color:transparent}
.ava-hit:focus-visible{outline:3px solid #1B1A2E;outline-offset:6px}
@media (hover:hover){.hero-art:hover .ava-squash{scale:1.025;transition:scale 600ms cubic-bezier(.32,.72,0,1)}}
.ava-say{position:absolute;left:50%;top:-3%;z-index:5;margin:0;padding:10px 16px;border-radius:18px 18px 18px 6px;background:#1B1A2E;color:#FFF6E5;font:700 15px 'Outfit',sans-serif;white-space:nowrap;opacity:0;translate:-30% 8px;scale:.9;pointer-events:none;transition:opacity 300ms cubic-bezier(.32,.72,0,1),translate 500ms cubic-bezier(.32,.72,0,1),scale 500ms cubic-bezier(.32,.72,0,1)}
.hero-art[data-say] .ava-say{opacity:1;translate:-30% 0;scale:1}
.ava-pol{position:absolute;left:-10%;bottom:6%;z-index:6;width:40%;padding:7% 7% 3%;background:#fff;border-radius:6px;box-shadow:0 24px 40px -18px rgba(27,26,46,.45),0 2px 6px rgba(27,26,46,.08);opacity:0;translate:60% -30%;scale:.4;rotate:0deg;pointer-events:none;transition:opacity 400ms cubic-bezier(.32,.72,0,1),translate 900ms cubic-bezier(.32,.72,0,1),scale 900ms cubic-bezier(.32,.72,0,1),rotate 900ms cubic-bezier(.32,.72,0,1)}
.hero-art[data-pol] .ava-pol{opacity:1;translate:0 0;scale:1;rotate:-8deg}
.pol-img{position:relative;aspect-ratio:1;border-radius:3px;overflow:hidden;background:linear-gradient(180deg,#9FD4F2,#DDF0FB 70%,#FFF6E5)}
.hero-art[data-night] .pol-img{background:linear-gradient(180deg,#2B2660,#5A4FA8 70%,#B7A9E8)}
.pol-sun{position:absolute;right:14%;top:14%;width:24%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 40% 38%,#FFFDF0,#FFD23F 60%,#FFB13B);box-shadow:0 0 14px 4px rgba(255,210,63,.6)}
.hero-art[data-night] .pol-sun{background:radial-gradient(circle at 40% 38%,#FFFDF5,#E9E2CC 70%,#CFC6AE);box-shadow:0 0 14px 4px rgba(200,195,255,.55)}
.pol-cl{position:absolute;height:12%;border-radius:999px;background:#fff;opacity:.95}
.pol-cl.c1{left:8%;top:30%;width:40%}.pol-cl.c2{left:44%;top:46%;width:30%;opacity:.8}
.hero-art[data-night] .pol-cl{background:#D9D2F5;opacity:.7}
.pol-you{position:absolute;left:0;right:0;bottom:12%;text-align:center;font:700 clamp(22px,4.2vw,34px)/1 'Caveat',cursive;color:#1B1A2E;rotate:-4deg}
.hero-art[data-night] .pol-you{color:#FFF6E5}
.pol-dev{position:absolute;inset:0;background:#3B3950;opacity:0}
.hero-art[data-pol] .pol-dev{animation:polDevelop 1.8s cubic-bezier(.32,.72,0,1) both}
.pol-cap{margin:8px 0 0;font:700 clamp(15px,2.4vw,19px)/1.15 'Caveat',cursive;color:#1B1A2E;text-align:center}
.snap-flash{position:fixed;inset:0;z-index:95;pointer-events:none;background:radial-gradient(circle at var(--fx,70%) var(--fy,40%),#fff 0,rgba(255,255,255,.92) 35%,rgba(255,250,235,.75) 100%);opacity:0}
.snap-flash[data-on]{animation:snapFlash 420ms cubic-bezier(.22,.61,.36,1) both}
.hero-art[data-snap] .ava-squash{animation:avaSquash 700ms cubic-bezier(.32,.72,0,1) both}
.hero-art[data-hint] .ava-squash{animation:avaHop 900ms cubic-bezier(.32,.72,0,1) both}
@keyframes avaBreath{from{scale:1}to{scale:1.018}}
@keyframes avaSquash{0%{scale:1 1}18%{scale:1.06 .93}42%{scale:.97 1.05}66%{scale:1.015 .99}100%{scale:1 1}}
@keyframes avaHop{0%,100%{translate:0 0}30%{translate:0 -12px}55%{translate:0 0}70%{translate:0 -5px}}
@media (max-width:640px){.sky-band{height:150px}}
@keyframes snapFlash{0%{opacity:0}12%{opacity:.85}100%{opacity:0}}
@keyframes polDevelop{0%{opacity:.95}100%{opacity:0}}
@media (max-width:900px){.ava-pol{left:-2%;width:42%}.ava-say{font-size:14px}}
@media (prefers-reduced-motion: reduce){.ava-tilt,.hero-art[data-snap] .ava-squash,.hero-art[data-hint] .ava-squash,.hero-art[data-pol] .pol-dev{animation:none !important}.ava-tilt{transform:none}.ava-img{translate:none}.snap-flash{display:none}}

.ava-af,.ava-glint{position:absolute;left:42.6%;top:67.6%;width:9%;aspect-ratio:1;margin:-4.5% 0 0 -4.5%;border-radius:50%;pointer-events:none;opacity:0;z-index:2}
.ava-af{border:2px solid #FFD23F;box-shadow:0 0 0 2px rgba(27,26,46,.25)}
.ava-glint{width:34%;margin:-17% 0 0 -17%;background:radial-gradient(circle,#fff 0 6%,rgba(255,255,255,.9) 10%,rgba(255,244,200,.55) 22%,transparent 60%),conic-gradient(from 45deg,transparent 0 21deg,rgba(255,255,255,.95) 22deg 23deg,transparent 24deg 111deg,rgba(255,255,255,.95) 112deg 113deg,transparent 114deg 201deg,rgba(255,255,255,.95) 202deg 203deg,transparent 204deg 291deg,rgba(255,255,255,.95) 292deg 293deg,transparent 294deg);-webkit-mask:radial-gradient(circle,#000 30%,transparent 70%);mask:radial-gradient(circle,#000 30%,transparent 70%)}
.hero-art[data-snap] .ava-af{animation:avaAF 1300ms cubic-bezier(.32,.72,0,1) both}
.hero-art[data-snap] .ava-glint{animation:avaGlint 1300ms cubic-bezier(.22,.61,.36,1) both}
.snap-frame{position:fixed;inset:clamp(14px,3vw,36px);z-index:94;pointer-events:none;opacity:0}
.snap-frame i{position:absolute;width:clamp(28px,5vw,56px);aspect-ratio:1;border:3px solid rgba(27,26,46,.75)}
.snap-frame i:nth-child(1){left:0;top:0;border-right:0;border-bottom:0;border-radius:14px 0 0 0}
.snap-frame i:nth-child(2){right:0;top:0;border-left:0;border-bottom:0;border-radius:0 14px 0 0}
.snap-frame i:nth-child(3){left:0;bottom:0;border-right:0;border-top:0;border-radius:0 0 0 14px}
.snap-frame i:nth-child(4){right:0;bottom:0;border-left:0;border-top:0;border-radius:0 0 14px 0}
.snap-frame[data-on]{animation:snapFrame 1100ms cubic-bezier(.32,.72,0,1) both}
@keyframes avaAF{0%{opacity:0;scale:1.8}15%{opacity:1;scale:1}30%{scale:.82}42%{scale:1}55%{opacity:1}62%,100%{opacity:0}}
@keyframes avaGlint{0%,56%{opacity:0;scale:.3;rotate:0deg}62%{opacity:1;scale:1.15}100%{opacity:0;scale:.9;rotate:40deg}}
@keyframes snapFrame{0%{opacity:0;scale:1.04}25%,72%{opacity:1;scale:1}100%{opacity:0;scale:.98}}
@media (prefers-reduced-motion: reduce){.ava-af,.ava-glint,.snap-frame{display:none}}

/* make the snap discoverable: visible chip, ping on the phone, camera cursor, repeating hint until first snap */
.ava-hit{cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Ccircle cx='18' cy='18' r='17' fill='%231B1A2E'/%3E%3Cpath d='M9 13h4l2-3h6l2 3h4v13H9z' fill='none' stroke='%23FFD23F' stroke-width='2' stroke-linejoin='round'/%3E%3Ccircle cx='18' cy='19' r='4' fill='none' stroke='%23FFD23F' stroke-width='2'/%3E%3C/svg%3E") 18 18, pointer}
.ava-chip{position:absolute;left:14%;bottom:7%;z-index:5;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px 0 12px;border:0;border-radius:999px;background:#1B1A2E;color:#FFF6E5;font:700 14px 'Outfit',sans-serif;cursor:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='36' height='36' viewBox='0 0 36 36'%3E%3Ccircle cx='18' cy='18' r='17' fill='%231B1A2E'/%3E%3Cpath d='M9 13h4l2-3h6l2 3h4v13H9z' fill='none' stroke='%23FFD23F' stroke-width='2' stroke-linejoin='round'/%3E%3Ccircle cx='18' cy='19' r='4' fill='none' stroke='%23FFD23F' stroke-width='2'/%3E%3C/svg%3E") 18 18, pointer;box-shadow:0 14px 28px -12px rgba(27,26,46,.55),inset 0 1px 0 rgba(255,255,255,.12);rotate:-4deg;transition:scale 500ms cubic-bezier(.32,.72,0,1),background-color 300ms cubic-bezier(.32,.72,0,1)}
.ava-chip svg{color:#FFD23F}
.ava-chip::after{content:"";position:absolute;inset:-4px;border-radius:999px;border:2px solid #FFD23F;opacity:0;animation:chipPing 2.6s cubic-bezier(.22,.61,.36,1) 1.2s infinite}
.ava-chip:hover{scale:1.06}.ava-chip:active{scale:.96}
.ava-note:focus-visible{outline:3px solid #1B1A2E;outline-offset:4px}
.ava-chip:focus-visible{outline:3px solid #1B1A2E;outline-offset:4px}
.hero-art[data-snapped] .ava-chip::after{animation:none}
.hero-art[data-pol] .ava-chip{opacity:0;pointer-events:none}
.ava-ping{position:absolute;left:42.6%;top:67.6%;width:7%;aspect-ratio:1;margin:-3.5% 0 0 -3.5%;border-radius:50%;border:2px solid #FFD23F;box-shadow:0 0 10px rgba(255,210,63,.7);pointer-events:none;z-index:2;animation:phonePing 2.4s cubic-bezier(.22,.61,.36,1) infinite}
.hero-art[data-snapped] .ava-ping,.hero-art[data-snap] .ava-ping{display:none}
@keyframes chipPing{0%{opacity:.9;scale:1}70%,100%{opacity:0;scale:1.25}}
@keyframes phonePing{0%{opacity:.95;scale:.6}75%,100%{opacity:0;scale:2.2}}
@media (prefers-reduced-motion: reduce){.ava-chip::after,.ava-ping{animation:none !important}.ava-ping{opacity:.9;scale:1}}

/* "Twelve years, one road": pinned horizontal scroll. The section is as tall as the track is wide;
   while it is pinned, vertical scroll moves the cards sideways, then the page carries on (and back again going up). */
.road-pin{position:relative;padding:0}
.road-stick{position:sticky;top:0;height:100vh;height:100dvh;display:flex;flex-direction:column;justify-content:center;padding-top:clamp(84px,11vh,120px);box-sizing:border-box;overflow:hidden}
.road-pin .road{will-change:transform}
.road-pin h2{font-size:clamp(40px,5.6vw,84px) !important}
.road-prog{position:absolute;left:max(24px,calc((100vw - 1192px) / 2));right:max(24px,calc((100vw - 1192px) / 2));bottom:clamp(14px,3vh,28px);height:4px;border-radius:4px;background:rgba(27,26,46,.08);overflow:hidden}
.road-prog i{position:absolute;inset:0;background:#FF7A3D;border-radius:4px;transform-origin:0 50%;transform:scaleX(var(--rp,0))}
@media (max-height:640px){.road-pin .road .core{min-height:200px !important}}

/* phones: keep the avatar's face clear. The note sits above the circle, the badge shrinks into the corner,
   and the speech bubble moves to the bottom-right instead of over the head. */
@media (max-width:640px){
.hero-art{margin-top:84px !important}
.ava-note{top:auto !important;bottom:86% !important;left:0 !important;max-width:66% !important;padding:10px 14px 6px !important}
.ava-note span{font-size:19px !important}
.ava-note svg{width:44px;height:20px}
.hero-art > svg.spin{width:24% !important;height:24% !important;top:0 !important;right:-1% !important}
.ava-say{top:auto;bottom:3%;left:auto;right:0;translate:0 8px;border-radius:18px 18px 6px 18px;font-size:13px;white-space:normal;max-width:52%}
.hero-art[data-say] .ava-say{translate:0 0}
.ava-pol{left:-1%;bottom:-9%;width:37%}
}`,
  SeriousHome: ":root{--spring:cubic-bezier(.32,.72,0,1);--expo:cubic-bezier(.19,1,.22,1);--ink:#07080B;--core:#101319;--text:#F3EFE7;--muted:#A9AEB9;--amber:#F5A524;--signal:#3DDC97}\nhtml{scroll-behavior:smooth}\nbody{margin:0;background:#07080B}\na{color:#F5A524}\n::selection{background:#F5A524;color:#07080B}\n@keyframes maskUp{from{transform:translateY(108%)}to{transform:none}}\n@keyframes blurUp{from{opacity:0;transform:translateY(48px);filter:blur(10px)}to{opacity:1;transform:none;filter:blur(0)}}\n@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}\n@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}\n@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}\n@keyframes marqueeRev{from{transform:translateX(-50%)}to{transform:translateX(0)}}\n@keyframes ping{0%{transform:scale(1);opacity:.7}100%{transform:scale(2.6);opacity:0}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes spinRev{to{transform:rotate(-360deg)}}\n@keyframes draw{from{stroke-dashoffset:1}to{stroke-dashoffset:0}}\n@keyframes barUp{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}\n@keyframes dots{0%,80%,100%{opacity:.3}40%{opacity:1}}\n@keyframes cue{0%{transform:scaleY(0);transform-origin:top}45%{transform:scaleY(1);transform-origin:top}55%{transform:scaleY(1);transform-origin:bottom}100%{transform:scaleY(0);transform-origin:bottom}}\n@keyframes toastIn{from{opacity:0;transform:translateY(24px) scale(.96);filter:blur(6px)}to{opacity:1;transform:none;filter:blur(0)}}\n.toast{animation:toastIn 700ms var(--spring) both;animation-delay:.9s}\n@keyframes scrub{from{opacity:.16;transform:translateY(.14em)}to{opacity:1;transform:none}}\n@keyframes coverLife{0%{transform:scale(.84);opacity:.35}30%{transform:scale(1);opacity:1}72%{transform:scale(1);opacity:1}100%{transform:scale(.97);opacity:.25}}\n.mask{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em}\n.mask-up{display:inline-block;animation:maskUp 1300ms var(--expo) both}\n.enter{animation:blurUp 1100ms var(--spring) both}\n.orb1{animation:drift1 26s var(--spring) infinite alternate}\n.orb2{animation:drift2 32s var(--spring) infinite alternate}\n.spin{animation:spin 90s linear infinite}\n.spin-rev{animation:spinRev 60s linear infinite}\n.ping{position:absolute;inset:0;border-radius:50%;background:#3DDC97;animation:ping 2.2s var(--spring) infinite}\n.underline path{stroke-dasharray:1;stroke-dashoffset:1;animation:draw 1600ms var(--expo) 1.2s forwards}\n.cue{animation:cue 2.6s var(--spring) infinite}\n.bar{transform-origin:bottom;animation:barUp 1.8s var(--spring) infinite}\n.dt{display:inline-block;width:.16em;height:.16em;border-radius:50%;background:#F3EFE7;animation:dots 1.4s infinite}\n.gridbg{background-image:linear-gradient(rgba(255,255,255,.028) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.028) 1px,transparent 1px);background-size:80px 80px;-webkit-mask-image:radial-gradient(ellipse at 50% 45%,#000 15%,transparent 65%);mask-image:radial-gradient(ellipse at 50% 45%,#000 15%,transparent 65%)}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(255,255,255,.04);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);font:500 10px 'Geist',sans-serif;text-transform:uppercase;letter-spacing:.2em;color:#C9CDD6}\n.shell{padding:6px;border-radius:32px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 45%,rgba(255,255,255,.04));box-shadow:inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px -30px rgba(0,0,0,.7)}\n.core{position:relative;height:100%;box-sizing:border-box;border-radius:26px;background:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));box-shadow:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.05);overflow:hidden}\n.core::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(120deg,rgba(255,255,255,.07) 0%,rgba(255,255,255,0) 32%);pointer-events:none}\n@media (min-width:861px){.core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}\n@media (max-width:860px){.core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}\n.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}\n.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:#F5A524;opacity:.22;animation:drift1 34s var(--spring) infinite alternate}\n.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:#3DDC97;opacity:.16;animation:drift2 40s var(--spring) infinite alternate}\n.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.16;animation:drift1 46s var(--spring) infinite alternate-reverse}\n.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(255,255,255,.7) .6px,transparent .6px);background-size:3px 3px}\nmain > section,main > footer{position:relative;z-index:1}\n@property --ga{syntax:'<angle>';inherits:false;initial-value:0deg}\n@keyframes rim{to{--ga:360deg}}\n.shell{position:relative}\n.shell::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:conic-gradient(from var(--ga),transparent 0deg 240deg,rgba(255,255,255,.7) 300deg,rgba(245,165,36,.65) 325deg,transparent 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);opacity:0;transition:opacity 500ms var(--spring);pointer-events:none;z-index:3}\n@media (hover:hover){.shell:hover::before{opacity:1;animation:rim 3.2s linear infinite}}\n.num{text-shadow:0 0 44px rgba(245,165,36,.28)}\n@keyframes auA{0%{opacity:.24;translate:0 0}45%{opacity:.07;translate:0 20vh}100%{opacity:.14;translate:10vw 52vh}}\n@keyframes auB{0%{opacity:.05}35%{opacity:.22}70%{opacity:.09}100%{opacity:.16;translate:-8vw -10vh}}\n@keyframes auC{0%{opacity:.04}55%{opacity:.2;translate:-6vw -20vh}100%{opacity:.24;translate:4vw -40vh}}\n@supports (animation-timeline: scroll()){\n.au1{animation:drift1 34s var(--spring) infinite alternate,auA linear both;animation-timeline:auto,scroll(root)}\n.au2{animation:drift2 40s var(--spring) infinite alternate,auB linear both;animation-timeline:auto,scroll(root)}\n.au3{animation:drift1 46s var(--spring) infinite alternate-reverse,auC linear both;animation-timeline:auto,scroll(root)}\n}\n\n.pbtn{display:inline-flex;align-items:center;gap:14px;min-height:56px;padding:6px 6px 6px 26px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px 'Geist',sans-serif;cursor:pointer;border:0;transition:background 500ms var(--spring),color 500ms var(--spring),transform 400ms var(--spring)}\n.pbtn:active{transform:scale(.98)}\n.pbtn .ic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 700ms var(--spring),background 500ms var(--spring)}\n.solid{background:#F5A524;color:#07080B}.solid .ic{background:rgba(7,8,11,.12)}\n.ghost{background:rgba(255,255,255,.04);color:#F3EFE7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}.ghost .ic{background:rgba(255,255,255,.08)}\n.mag{display:inline-flex;align-items:center;gap:14px;transition:transform 600ms var(--spring)}\n.navlink{color:#C9CDD6;text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:color 500ms var(--spring),background 500ms var(--spring)}\n.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:500 14px 'Geist',sans-serif;cursor:pointer;transition:background 500ms var(--spring),color 500ms var(--spring),box-shadow 500ms var(--spring)}\n.chip:active{transform:scale(.97)}\n.tag{font:500 11px 'Geist',sans-serif;letter-spacing:.06em;color:#C9CDD6;background:rgba(255,255,255,.05);border-radius:999px;padding:6px 10px}\n.card{display:block;text-decoration:none;color:#F3EFE7}\n.card .core{transition:transform 700ms var(--spring)}\n.card .core::before{content:'';position:absolute;inset:0;background:radial-gradient(420px circle at var(--mx,50%) var(--my,0%),rgba(245,165,36,.12),transparent 55%);opacity:0;transition:opacity 600ms var(--spring);pointer-events:none}\n.card .zoom{transition:transform 900ms var(--spring)}\n.card .ic{transition:transform 700ms var(--spring)}\n.acc{display:flex;gap:10px;height:460px}\n.slice{position:relative;flex-basis:0;min-width:0;border-radius:28px;cursor:pointer;transition:flex-grow 800ms var(--spring)}\n.slice .core{display:flex;flex-direction:column;justify-content:flex-end;padding:28px}\n.slice .vlabel{position:absolute;left:24px;bottom:28px;writing-mode:vertical-rl;transform:rotate(180deg);font:400 30px 'Instrument Serif',serif;white-space:nowrap;transition:opacity 500ms var(--spring)}\n.mf .w{display:inline-block;margin-right:.26em;will-change:opacity,transform}\n.mf-text{margin:0;max-width:min(100%,920px);font-family:'Instrument Serif',serif;font-size:clamp(30px,3.7vw,54px);line-height:1.32;letter-spacing:-0.01em;text-wrap:pretty}\n.mf .w > span[aria-hidden]{width:1.6em !important;height:.78em !important;margin:0 .06em !important;vertical-align:.04em !important}\n.slice .full{min-width:min(400px,70vw);transition:opacity 600ms var(--spring) 120ms,transform 700ms var(--spring) 120ms}\n.bento{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));grid-auto-flow:dense;gap:14px}\n.wsplit{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:48px;align-items:start}\n.wgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}\n.wgrid > .card:first-child{grid-column:span 2}\n.wgrid > .card:first-child .cov{height:200px}\n.cov{height:148px}\n.jmini{display:grid;grid-template-columns:110px minmax(0,1fr);gap:4px 16px;align-items:baseline}\n.show-sm{display:none}\n.hscroll{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}\n.b-a{grid-column:span 8;grid-row:span 2}.b-s{grid-column:span 4}\n.daybtn{position:relative;z-index:1;min-height:48px;border:0;background:transparent;font:500 14px 'Geist',sans-serif;cursor:pointer;transition:color 500ms var(--spring)}\n.marquee-track{animation:marquee 50s linear infinite}\n.marquee-rev{animation:marqueeRev 64s linear infinite}\n.field{width:100%;box-sizing:border-box;background:transparent;border:0;border-bottom:1px solid rgba(255,255,255,.1);color:#F3EFE7;font:400 17px 'Geist',sans-serif;padding:14px 0;border-radius:0}\n.field:focus{outline:none}\n.fieldwrap{position:relative}\n.fieldwrap::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;background:#F5A524;transform:scaleX(0);transform-origin:left;transition:transform 700ms var(--spring)}\n.fieldwrap:focus-within::after{transform:scaleX(1)}\n.lrow{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:18px 4px;color:#F3EFE7;text-decoration:none;box-shadow:inset 0 -1px 0 rgba(255,255,255,.07);transition:color 500ms var(--spring)}\n.jlist::before{content:'';position:absolute;left:7px;top:10px;bottom:10px;width:1px;background:linear-gradient(#F5A524,rgba(255,255,255,.08) 40%)}\n.job .jdot{transition:transform 600ms var(--spring)}\n.lrow .lr,.lrow .ic{display:inline-flex;transition:transform 700ms var(--spring)}\n.ring{position:fixed;left:0;top:0;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(245,165,36,.7);pointer-events:none;z-index:90;opacity:0;transition:opacity 500ms var(--spring),background 500ms var(--spring)}\n.ring.on{opacity:1}.ring.hot{background:rgba(245,165,36,.12)}\n.menu{position:fixed;inset:0;z-index:70;background:rgba(7,8,11,.86);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);opacity:0;visibility:hidden;transition:opacity 600ms var(--spring),visibility 0s linear 600ms}\n.menu.open{opacity:1;visibility:visible;transition:opacity 600ms var(--spring),visibility 0s}\n.menu .ml{display:block;opacity:0;transform:translateY(48px);transition:opacity 500ms var(--spring),transform 700ms var(--spring)}\n.menu.open .ml{opacity:1;transform:none;transition-delay:calc(100ms + var(--i) * 60ms)}\n.burger{position:relative;width:44px;height:44px;border-radius:50%;border:0;background:rgba(255,255,255,.08);cursor:pointer}\n.burger span{position:absolute;left:14px;right:14px;height:1.5px;background:#F3EFE7;border-radius:2px;transition:transform 600ms var(--spring)}\n.burger span:nth-child(1){top:18px}.burger span:nth-child(2){top:25px}\n.burger.x span:nth-child(1){transform:translateY(3.5px) rotate(45deg)}\n.burger.x span:nth-child(2){transform:translateY(-3.5px) rotate(-45deg)}\n.rv-on [data-r]{opacity:0;transform:translateY(40px);filter:blur(8px);transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);transition-delay:calc(var(--i,0) * 70ms)}\n.rv-on [data-r].in{opacity:1;transform:none;filter:blur(0)}\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #F5A524;outline-offset:3px}\n@supports (animation-timeline: view()){\n.mf .w{animation:scrub cubic-bezier(.32,.72,0,1) both;animation-timeline:--mf;animation-range:cover calc(12% + var(--p) * 34%) cover calc(26% + var(--p) * 34%)}\n.cover-life{animation:coverLife linear both;animation-timeline:view();animation-range:cover 0% cover 100%}\n}\n@media (hover:hover){\n.navlink:hover{color:#F3EFE7;background:rgba(255,255,255,.06)}\n.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}\n.solid:hover{background:#FFC35C}\n.ghost:hover{background:rgba(255,255,255,.08)}\n.card:hover .core{transform:translateY(-6px)}\n.card:hover .core::before{opacity:1}\n.card:hover .zoom{transform:scale(1.05)}\n.card:hover .ic{transform:translate(4px,-1px) scale(1.05)}\n.chip:hover{box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}\n.marquee:hover .marquee-track,.marquee:hover .marquee-rev{animation-play-state:paused}\n.job:hover .jdot{transform:scale(1.35)}\n.lrow:hover{color:#F5A524}\n.lrow:hover .lr{transform:translateX(8px)}\n.lrow:hover .ic{transform:translate(4px,-2px)}\n}\n@media (max-width:860px){\n.hide-sm{display:none !important}\n.show-sm{display:inline !important}\n.wsplit{grid-template-columns:minmax(0,1fr);gap:28px}\n.wgrid{grid-template-columns:minmax(0,1fr);gap:12px}\n.wgrid > .card:first-child{grid-column:span 1}\n.cov,.wgrid > .card:first-child .cov{height:112px}\n.cov .mk{font-size:36px !important}\n.cbody{padding:18px 20px 20px !important}\n.hscroll{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -24px;padding:0 24px 6px;scrollbar-width:none}\n.hscroll::-webkit-scrollbar{display:none}\n.hscroll > *{flex:0 0 78%;scroll-snap-align:start}\n.hscroll .core{min-height:200px !important}\n.bento .stat .core{min-height:0 !important;padding:20px !important;gap:14px !important}\n.bento .stat .num{font-size:52px !important}\n.jmini{grid-template-columns:minmax(0,1fr);gap:2px}\n\n.acc{flex-direction:column;height:auto}\n.slice{flex-grow:1 !important}\n.slice .core{min-height:0}\n.slice .vlabel{display:none}\n.slice .full{opacity:1 !important;transform:none !important;position:static !important;min-width:0}\n.bento{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}\n.b-a{grid-column:span 2;grid-row:span 1}\n.b-s{grid-column:span 1;grid-row:span 1}\n.b-s.wide{grid-column:span 2}\n.pin{position:static !important}\n.slice .pnum{position:static !important;display:block;font-size:44px !important;margin-bottom:12px}\n#top{min-height:0 !important;padding-top:120px !important;padding-bottom:64px !important}\nmain section:not(#top){padding-top:64px !important;padding-bottom:56px !important}\n.mf{padding-top:56px !important}\n}\n@media (prefers-reduced-motion: reduce){.aurora span{animation:none !important}.shell::before{display:none}*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;animation-delay:0s !important;transition-duration:.01ms !important;transition-delay:0s !important}.mf .w{animation:none !important;opacity:1 !important}.underline path{stroke-dashoffset:0}.ring{display:none}.rv-on [data-r]{opacity:1;transform:none;filter:none}.mf .w{opacity:1}}",
  About: "body{margin:0}\n:root{--spring:cubic-bezier(.32,.72,0,1)}\n.pg{position:relative;min-height:100dvh;overflow-x:clip;width:100%;font-family:var(--body);color:var(--ink);background-color:var(--bg);transition:background-color 600ms var(--spring),color 600ms var(--spring)}\n.pg[data-theme=serious]{--bg:#07080B;--ink:#F3EFE7;--muted:#A9AEB9;--faint:#8C929E;--accent:#F5A524;--accent2:#3DDC97;--on-accent:#07080B;--display:'Instrument Serif',serif;--dw:400;--dls:-0.02em;--body:'Geist',system-ui,sans-serif;--shell:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 45%,rgba(255,255,255,.04));--shell-ring:inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px -30px rgba(0,0,0,.7);--core:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));--core-ring:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.05);--pill:rgba(255,255,255,.06);--pill-ink:#C9CDD6;--line:rgba(255,255,255,.08);--nav:rgba(16,19,25,.62);--nav-ring:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 40px -20px rgba(0,0,0,.8);--field:rgba(255,255,255,.04)}\n.pg[data-theme=playful]{--bg:#FFF6E5;--ink:#1B1A2E;--muted:#4A4860;--faint:#5C5A70;--accent:#FF7A3D;--accent2:#147A63;--on-accent:#1B1A2E;--display:'Outfit',sans-serif;--dw:900;--dls:-0.045em;--body:'Outfit',sans-serif;--shell:rgba(255,255,255,.55);--shell-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 30px 50px -34px rgba(27,26,46,.45);--core:#FFFFFF;--core-ring:inset 0 0 0 1px rgba(27,26,46,.06);--pill:#FFEFD2;--pill-ink:#1B1A2E;--line:rgba(27,26,46,.10);--nav:rgba(255,255,255,.82);--nav-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 14px 30px -18px rgba(27,26,46,.4);--field:#FFFFFF;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px}\n@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}\n@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}\n@keyframes blurUp{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}\n.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}\n.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:#F5A524;opacity:.2;animation:drift1 34s var(--spring) infinite alternate}\n.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:#3DDC97;opacity:.15;animation:drift2 40s var(--spring) infinite alternate}\n.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.15;animation:drift1 46s var(--spring) infinite alternate-reverse}\n.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(255,255,255,.7) .6px,transparent .6px);background-size:3px 3px}\n.pg[data-theme=playful] .aurora,.pg[data-theme=playful] .grain{display:none}\n.pg > section,.pg > footer{position:relative;z-index:1}\n.wrap{max-width:1200px;margin:0 auto}\n.enter{animation:blurUp 900ms var(--spring) both}\n.h1{margin:20px 0 0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(48px,7vw,104px);line-height:.98}\n.h2{margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(34px,4vw,56px);line-height:1}\n.em{font-style:italic;color:var(--muted)}\n.pg[data-theme=playful] .em{font-style:normal;color:var(--accent)}\n.lead{margin:22px 0 0;max-width:620px;font-size:18px;line-height:1.65;color:var(--muted)}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--pill);color:var(--pill-ink);font:500 11px var(--body);text-transform:uppercase;letter-spacing:.16em}\n.tag{display:inline-flex;align-items:center;font:500 12px var(--body);color:var(--pill-ink);background:var(--pill);border-radius:999px;padding:6px 10px}\n.shell{position:relative;padding:6px;border-radius:30px;background:var(--shell);box-shadow:var(--shell-ring)}\n.core{position:relative;height:100%;box-sizing:border-box;border-radius:24px;background:var(--core);box-shadow:var(--core-ring);overflow:hidden}\n@media (min-width:861px){.pg[data-theme=serious] .core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}\n@media (max-width:860px){.pg[data-theme=serious] .core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}\n.pbtn{display:inline-flex;align-items:center;gap:12px;min-height:52px;padding:5px 5px 5px 22px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px var(--body);cursor:pointer;border:0;transition:transform 300ms var(--spring)}\n.pbtn .ic{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 600ms var(--spring)}\n.pbtn:active{transform:scale(.98)}\n.solid{background:var(--accent);color:var(--on-accent)}.solid .ic{background:rgba(0,0,0,.12)}\n.ghost{background:var(--pill);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}.ghost .ic{background:var(--pill)}\n.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:500 14px var(--body);cursor:pointer;transition:background 400ms var(--spring),color 400ms var(--spring)}\n.navlink{color:var(--ink);opacity:.8;text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:opacity 300ms var(--spring),background 300ms var(--spring)}\n.navlink.cur{opacity:1;background:var(--pill)}\n.modesw{min-height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--pill);color:var(--ink);font:500 13px var(--body);cursor:pointer}\n.burger{display:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--pill);color:var(--ink);cursor:pointer;font:500 18px var(--body)}\n.mmenu{position:fixed;top:84px;left:12px;right:12px;z-index:79;padding:10px;border-radius:24px;background:var(--nav);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:var(--nav-ring);display:flex;flex-direction:column}\n.mmenu a{color:var(--ink);text-decoration:none;font:500 20px var(--body);padding:14px 16px;border-radius:16px}\n.flink{color:var(--muted);text-decoration:none;font-size:14px;padding:6px 0;display:inline-block}\n.field{width:100%;box-sizing:border-box;min-height:52px;border:0;border-radius:16px;padding:14px 16px;font:400 16px var(--body);color:var(--ink);background:var(--field);box-shadow:inset 0 0 0 1px var(--line)}\n.field::placeholder{color:var(--faint)}\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}\n@media (hover:hover){.navlink:hover{opacity:1;background:var(--pill)}.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}.card:hover .core{transform:translateY(-4px)}.flink:hover{color:var(--ink)}}\n.card .core{transition:transform 600ms var(--spring)}\n@media (max-width:860px){.hide-sm{display:none !important}.burger{display:inline-flex;align-items:center;justify-content:center}.pg > section{padding-left:20px !important;padding-right:20px !important}}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}\n.ahero{display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px;align-items:center}\n.stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}\n.tsplit{display:grid;grid-template-columns:minmax(0,4fr) minmax(0,7fr);gap:48px;align-items:start}\n.tpin{position:sticky;top:120px}\n.tl::before{content:'';position:absolute;left:6px;top:10px;bottom:20px;width:1px;background:linear-gradient(var(--accent),var(--line) 40%)}\n.lgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}\n@media (max-width:860px){.ahero,.tsplit{grid-template-columns:minmax(0,1fr);gap:28px}.ahero .shell{justify-self:start !important;max-width:300px !important}.tpin{position:static}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.lgrid{grid-template-columns:minmax(0,1fr)}}",
  Work: "body{margin:0}\n:root{--spring:cubic-bezier(.32,.72,0,1)}\n.pg{position:relative;min-height:100dvh;overflow-x:clip;width:100%;font-family:var(--body);color:var(--ink);background-color:var(--bg);transition:background-color 600ms var(--spring),color 600ms var(--spring)}\n.pg[data-theme=serious]{--bg:#07080B;--ink:#F3EFE7;--muted:#A9AEB9;--faint:#8C929E;--accent:#F5A524;--accent2:#3DDC97;--on-accent:#07080B;--display:'Instrument Serif',serif;--dw:400;--dls:-0.02em;--body:'Geist',system-ui,sans-serif;--shell:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 45%,rgba(255,255,255,.04));--shell-ring:inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px -30px rgba(0,0,0,.7);--core:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));--core-ring:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.05);--pill:rgba(255,255,255,.06);--pill-ink:#C9CDD6;--line:rgba(255,255,255,.08);--nav:rgba(16,19,25,.62);--nav-ring:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 40px -20px rgba(0,0,0,.8);--field:rgba(255,255,255,.04)}\n.pg[data-theme=playful]{--bg:#FFF6E5;--ink:#1B1A2E;--muted:#4A4860;--faint:#5C5A70;--accent:#FF7A3D;--accent2:#147A63;--on-accent:#1B1A2E;--display:'Outfit',sans-serif;--dw:900;--dls:-0.045em;--body:'Outfit',sans-serif;--shell:rgba(255,255,255,.55);--shell-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 30px 50px -34px rgba(27,26,46,.45);--core:#FFFFFF;--core-ring:inset 0 0 0 1px rgba(27,26,46,.06);--pill:#FFEFD2;--pill-ink:#1B1A2E;--line:rgba(27,26,46,.10);--nav:rgba(255,255,255,.82);--nav-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 14px 30px -18px rgba(27,26,46,.4);--field:#FFFFFF;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px}\n@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}\n@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}\n@keyframes blurUp{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}\n.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}\n.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:#F5A524;opacity:.2;animation:drift1 34s var(--spring) infinite alternate}\n.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:#3DDC97;opacity:.15;animation:drift2 40s var(--spring) infinite alternate}\n.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.15;animation:drift1 46s var(--spring) infinite alternate-reverse}\n.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(255,255,255,.7) .6px,transparent .6px);background-size:3px 3px}\n.pg[data-theme=playful] .aurora,.pg[data-theme=playful] .grain{display:none}\n.pg > section,.pg > footer{position:relative;z-index:1}\n.wrap{max-width:1200px;margin:0 auto}\n.enter{animation:blurUp 900ms var(--spring) both}\n.h1{margin:20px 0 0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(48px,7vw,104px);line-height:.98}\n.h2{margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(34px,4vw,56px);line-height:1}\n.em{font-style:italic;color:var(--muted)}\n.pg[data-theme=playful] .em{font-style:normal;color:var(--accent)}\n.lead{margin:22px 0 0;max-width:620px;font-size:18px;line-height:1.65;color:var(--muted)}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--pill);color:var(--pill-ink);font:500 11px var(--body);text-transform:uppercase;letter-spacing:.16em}\n.tag{display:inline-flex;align-items:center;font:500 12px var(--body);color:var(--pill-ink);background:var(--pill);border-radius:999px;padding:6px 10px}\n.shell{position:relative;padding:6px;border-radius:30px;background:var(--shell);box-shadow:var(--shell-ring)}\n.core{position:relative;height:100%;box-sizing:border-box;border-radius:24px;background:var(--core);box-shadow:var(--core-ring);overflow:hidden}\n@media (min-width:861px){.pg[data-theme=serious] .core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}\n@media (max-width:860px){.pg[data-theme=serious] .core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}\n.pbtn{display:inline-flex;align-items:center;gap:12px;min-height:52px;padding:5px 5px 5px 22px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px var(--body);cursor:pointer;border:0;transition:transform 300ms var(--spring)}\n.pbtn .ic{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 600ms var(--spring)}\n.pbtn:active{transform:scale(.98)}\n.solid{background:var(--accent);color:var(--on-accent)}.solid .ic{background:rgba(0,0,0,.12)}\n.ghost{background:var(--pill);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}.ghost .ic{background:var(--pill)}\n.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:500 14px var(--body);cursor:pointer;transition:background 400ms var(--spring),color 400ms var(--spring)}\n.navlink{color:var(--ink);opacity:.8;text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:opacity 300ms var(--spring),background 300ms var(--spring)}\n.navlink.cur{opacity:1;background:var(--pill)}\n.modesw{min-height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--pill);color:var(--ink);font:500 13px var(--body);cursor:pointer}\n.burger{display:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--pill);color:var(--ink);cursor:pointer;font:500 18px var(--body)}\n.mmenu{position:fixed;top:84px;left:12px;right:12px;z-index:79;padding:10px;border-radius:24px;background:var(--nav);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:var(--nav-ring);display:flex;flex-direction:column}\n.mmenu a{color:var(--ink);text-decoration:none;font:500 20px var(--body);padding:14px 16px;border-radius:16px}\n.flink{color:var(--muted);text-decoration:none;font-size:14px;padding:6px 0;display:inline-block}\n.field{width:100%;box-sizing:border-box;min-height:52px;border:0;border-radius:16px;padding:14px 16px;font:400 16px var(--body);color:var(--ink);background:var(--field);box-shadow:inset 0 0 0 1px var(--line)}\n.field::placeholder{color:var(--faint)}\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}\n@media (hover:hover){.navlink:hover{opacity:1;background:var(--pill)}.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}.card:hover .core{transform:translateY(-4px)}.flink:hover{color:var(--ink)}}\n.card .core{transition:transform 600ms var(--spring)}\n@media (max-width:860px){.hide-sm{display:none !important}.burger{display:inline-flex;align-items:center;justify-content:center}.pg > section{padding-left:20px !important;padding-right:20px !important}}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}\n.wgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:dense;gap:14px}\n.wgrid > .f2,.wgrid > .w3{grid-column:span 2}\n@media (max-width:1100px){.wgrid{grid-template-columns:repeat(2,minmax(0,1fr))}.wgrid > .w3{grid-column:auto}}\n@media (max-width:700px){.wgrid{grid-template-columns:minmax(0,1fr)}.wgrid > *{grid-column:auto !important}}",
  Writing: "body{margin:0}\n:root{--spring:cubic-bezier(.32,.72,0,1)}\n.pg{position:relative;min-height:100dvh;overflow-x:clip;width:100%;font-family:var(--body);color:var(--ink);background-color:var(--bg);transition:background-color 600ms var(--spring),color 600ms var(--spring)}\n.pg[data-theme=serious]{--bg:#07080B;--ink:#F3EFE7;--muted:#A9AEB9;--faint:#8C929E;--accent:#F5A524;--accent2:#3DDC97;--on-accent:#07080B;--display:'Instrument Serif',serif;--dw:400;--dls:-0.02em;--body:'Geist',system-ui,sans-serif;--shell:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 45%,rgba(255,255,255,.04));--shell-ring:inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px -30px rgba(0,0,0,.7);--core:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));--core-ring:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.05);--pill:rgba(255,255,255,.06);--pill-ink:#C9CDD6;--line:rgba(255,255,255,.08);--nav:rgba(16,19,25,.62);--nav-ring:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 40px -20px rgba(0,0,0,.8);--field:rgba(255,255,255,.04)}\n.pg[data-theme=playful]{--bg:#FFF6E5;--ink:#1B1A2E;--muted:#4A4860;--faint:#5C5A70;--accent:#FF7A3D;--accent2:#147A63;--on-accent:#1B1A2E;--display:'Outfit',sans-serif;--dw:900;--dls:-0.045em;--body:'Outfit',sans-serif;--shell:rgba(255,255,255,.55);--shell-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 30px 50px -34px rgba(27,26,46,.45);--core:#FFFFFF;--core-ring:inset 0 0 0 1px rgba(27,26,46,.06);--pill:#FFEFD2;--pill-ink:#1B1A2E;--line:rgba(27,26,46,.10);--nav:rgba(255,255,255,.82);--nav-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 14px 30px -18px rgba(27,26,46,.4);--field:#FFFFFF;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px}\n@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}\n@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}\n@keyframes blurUp{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}\n.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}\n.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:#F5A524;opacity:.2;animation:drift1 34s var(--spring) infinite alternate}\n.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:#3DDC97;opacity:.15;animation:drift2 40s var(--spring) infinite alternate}\n.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.15;animation:drift1 46s var(--spring) infinite alternate-reverse}\n.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(255,255,255,.7) .6px,transparent .6px);background-size:3px 3px}\n.pg[data-theme=playful] .aurora,.pg[data-theme=playful] .grain{display:none}\n.pg > section,.pg > footer{position:relative;z-index:1}\n.wrap{max-width:1200px;margin:0 auto}\n.enter{animation:blurUp 900ms var(--spring) both}\n.h1{margin:20px 0 0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(48px,7vw,104px);line-height:.98}\n.h2{margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(34px,4vw,56px);line-height:1}\n.em{font-style:italic;color:var(--muted)}\n.pg[data-theme=playful] .em{font-style:normal;color:var(--accent)}\n.lead{margin:22px 0 0;max-width:620px;font-size:18px;line-height:1.65;color:var(--muted)}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--pill);color:var(--pill-ink);font:500 11px var(--body);text-transform:uppercase;letter-spacing:.16em}\n.tag{display:inline-flex;align-items:center;font:500 12px var(--body);color:var(--pill-ink);background:var(--pill);border-radius:999px;padding:6px 10px}\n.shell{position:relative;padding:6px;border-radius:30px;background:var(--shell);box-shadow:var(--shell-ring)}\n.core{position:relative;height:100%;box-sizing:border-box;border-radius:24px;background:var(--core);box-shadow:var(--core-ring);overflow:hidden}\n@media (min-width:861px){.pg[data-theme=serious] .core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}\n@media (max-width:860px){.pg[data-theme=serious] .core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}\n.pbtn{display:inline-flex;align-items:center;gap:12px;min-height:52px;padding:5px 5px 5px 22px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px var(--body);cursor:pointer;border:0;transition:transform 300ms var(--spring)}\n.pbtn .ic{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 600ms var(--spring)}\n.pbtn:active{transform:scale(.98)}\n.solid{background:var(--accent);color:var(--on-accent)}.solid .ic{background:rgba(0,0,0,.12)}\n.ghost{background:var(--pill);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}.ghost .ic{background:var(--pill)}\n.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:500 14px var(--body);cursor:pointer;transition:background 400ms var(--spring),color 400ms var(--spring)}\n.navlink{color:var(--ink);opacity:.8;text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:opacity 300ms var(--spring),background 300ms var(--spring)}\n.navlink.cur{opacity:1;background:var(--pill)}\n.modesw{min-height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--pill);color:var(--ink);font:500 13px var(--body);cursor:pointer}\n.burger{display:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--pill);color:var(--ink);cursor:pointer;font:500 18px var(--body)}\n.mmenu{position:fixed;top:84px;left:12px;right:12px;z-index:79;padding:10px;border-radius:24px;background:var(--nav);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:var(--nav-ring);display:flex;flex-direction:column}\n.mmenu a{color:var(--ink);text-decoration:none;font:500 20px var(--body);padding:14px 16px;border-radius:16px}\n.flink{color:var(--muted);text-decoration:none;font-size:14px;padding:6px 0;display:inline-block}\n.field{width:100%;box-sizing:border-box;min-height:52px;border:0;border-radius:16px;padding:14px 16px;font:400 16px var(--body);color:var(--ink);background:var(--field);box-shadow:inset 0 0 0 1px var(--line)}\n.field::placeholder{color:var(--faint)}\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}\n@media (hover:hover){.navlink:hover{opacity:1;background:var(--pill)}.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}.card:hover .core{transform:translateY(-4px)}.flink:hover{color:var(--ink)}}\n.card .core{transition:transform 600ms var(--spring)}\n@media (max-width:860px){.hide-sm{display:none !important}.burger{display:inline-flex;align-items:center;justify-content:center}.pg > section{padding-left:20px !important;padding-right:20px !important}}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}\n.book{padding:clamp(24px,4vw,44px);display:flex;flex-wrap:wrap;justify-content:space-between;gap:24px}\n.pgrid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));grid-auto-flow:dense;gap:12px}\n.pgrid > .wide{grid-column:span 2}\n@media (max-width:1000px){.pgrid{grid-template-columns:repeat(2,minmax(0,1fr)) !important}}\n@media (max-width:640px){.pgrid{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:0 20px 6px;scrollbar-width:none}.pgrid::-webkit-scrollbar{display:none}.pgrid > *{flex:0 0 82%;scroll-snap-align:start}}",
  Contact: "body{margin:0}\n:root{--spring:cubic-bezier(.32,.72,0,1)}\n.pg{position:relative;min-height:100dvh;overflow-x:clip;width:100%;font-family:var(--body);color:var(--ink);background-color:var(--bg);transition:background-color 600ms var(--spring),color 600ms var(--spring)}\n.pg[data-theme=serious]{--bg:#07080B;--ink:#F3EFE7;--muted:#A9AEB9;--faint:#8C929E;--accent:#F5A524;--accent2:#3DDC97;--on-accent:#07080B;--display:'Instrument Serif',serif;--dw:400;--dls:-0.02em;--body:'Geist',system-ui,sans-serif;--shell:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.02) 45%,rgba(255,255,255,.04));--shell-ring:inset 0 0 0 1px rgba(255,255,255,.10),0 30px 60px -30px rgba(0,0,0,.7);--core:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));--core-ring:inset 0 1px 0 rgba(255,255,255,.16),inset 0 0 0 1px rgba(255,255,255,.05);--pill:rgba(255,255,255,.06);--pill-ink:#C9CDD6;--line:rgba(255,255,255,.08);--nav:rgba(16,19,25,.62);--nav-ring:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 40px -20px rgba(0,0,0,.8);--field:rgba(255,255,255,.04)}\n.pg[data-theme=playful]{--bg:#FFF6E5;--ink:#1B1A2E;--muted:#4A4860;--faint:#5C5A70;--accent:#FF7A3D;--accent2:#147A63;--on-accent:#1B1A2E;--display:'Outfit',sans-serif;--dw:900;--dls:-0.045em;--body:'Outfit',sans-serif;--shell:rgba(255,255,255,.55);--shell-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 30px 50px -34px rgba(27,26,46,.45);--core:#FFFFFF;--core-ring:inset 0 0 0 1px rgba(27,26,46,.06);--pill:#FFEFD2;--pill-ink:#1B1A2E;--line:rgba(27,26,46,.10);--nav:rgba(255,255,255,.82);--nav-ring:inset 0 0 0 1px rgba(27,26,46,.08),0 14px 30px -18px rgba(27,26,46,.4);--field:#FFFFFF;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px}\n@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}\n@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}\n@keyframes blurUp{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}\n.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}\n.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}\n.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:#F5A524;opacity:.2;animation:drift1 34s var(--spring) infinite alternate}\n.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:#3DDC97;opacity:.15;animation:drift2 40s var(--spring) infinite alternate}\n.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.15;animation:drift1 46s var(--spring) infinite alternate-reverse}\n.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(255,255,255,.7) .6px,transparent .6px);background-size:3px 3px}\n.pg[data-theme=playful] .aurora,.pg[data-theme=playful] .grain{display:none}\n.pg > section,.pg > footer{position:relative;z-index:1}\n.wrap{max-width:1200px;margin:0 auto}\n.enter{animation:blurUp 900ms var(--spring) both}\n.h1{margin:20px 0 0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(48px,7vw,104px);line-height:.98}\n.h2{margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(34px,4vw,56px);line-height:1}\n.em{font-style:italic;color:var(--muted)}\n.pg[data-theme=playful] .em{font-style:normal;color:var(--accent)}\n.lead{margin:22px 0 0;max-width:620px;font-size:18px;line-height:1.65;color:var(--muted)}\n.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:var(--pill);color:var(--pill-ink);font:500 11px var(--body);text-transform:uppercase;letter-spacing:.16em}\n.tag{display:inline-flex;align-items:center;font:500 12px var(--body);color:var(--pill-ink);background:var(--pill);border-radius:999px;padding:6px 10px}\n.shell{position:relative;padding:6px;border-radius:30px;background:var(--shell);box-shadow:var(--shell-ring)}\n.core{position:relative;height:100%;box-sizing:border-box;border-radius:24px;background:var(--core);box-shadow:var(--core-ring);overflow:hidden}\n@media (min-width:861px){.pg[data-theme=serious] .core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}\n@media (max-width:860px){.pg[data-theme=serious] .core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}\n.pbtn{display:inline-flex;align-items:center;gap:12px;min-height:52px;padding:5px 5px 5px 22px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px var(--body);cursor:pointer;border:0;transition:transform 300ms var(--spring)}\n.pbtn .ic{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 600ms var(--spring)}\n.pbtn:active{transform:scale(.98)}\n.solid{background:var(--accent);color:var(--on-accent)}.solid .ic{background:rgba(0,0,0,.12)}\n.ghost{background:var(--pill);color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}.ghost .ic{background:var(--pill)}\n.chip{min-height:44px;padding:0 18px;border-radius:999px;border:0;font:500 14px var(--body);cursor:pointer;transition:background 400ms var(--spring),color 400ms var(--spring)}\n.navlink{color:var(--ink);opacity:.8;text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:opacity 300ms var(--spring),background 300ms var(--spring)}\n.navlink.cur{opacity:1;background:var(--pill)}\n.modesw{min-height:40px;padding:0 14px;border-radius:999px;border:0;background:var(--pill);color:var(--ink);font:500 13px var(--body);cursor:pointer}\n.burger{display:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--pill);color:var(--ink);cursor:pointer;font:500 18px var(--body)}\n.mmenu{position:fixed;top:84px;left:12px;right:12px;z-index:79;padding:10px;border-radius:24px;background:var(--nav);-webkit-backdrop-filter:blur(18px);backdrop-filter:blur(18px);box-shadow:var(--nav-ring);display:flex;flex-direction:column}\n.mmenu a{color:var(--ink);text-decoration:none;font:500 20px var(--body);padding:14px 16px;border-radius:16px}\n.flink{color:var(--muted);text-decoration:none;font-size:14px;padding:6px 0;display:inline-block}\n.field{width:100%;box-sizing:border-box;min-height:52px;border:0;border-radius:16px;padding:14px 16px;font:400 16px var(--body);color:var(--ink);background:var(--field);box-shadow:inset 0 0 0 1px var(--line)}\n.field::placeholder{color:var(--faint)}\na:focus-visible,button:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid var(--accent);outline-offset:3px}\n@media (hover:hover){.navlink:hover{opacity:1;background:var(--pill)}.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}.card:hover .core{transform:translateY(-4px)}.flink:hover{color:var(--ink)}}\n.card .core{transition:transform 600ms var(--spring)}\n@media (max-width:860px){.hide-sm{display:none !important}.burger{display:inline-flex;align-items:center;justify-content:center}.pg > section{padding-left:20px !important;padding-right:20px !important}}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}\n.csplit{padding:clamp(22px,4vw,44px);display:grid;grid-template-columns:minmax(0,7fr) minmax(0,5fr);gap:48px}\n.fgrid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}\n@media (max-width:860px){.csplit{grid-template-columns:minmax(0,1fr);gap:32px}.fgrid{grid-template-columns:minmax(0,1fr)}}",
  CaseStudy: `:root{--spring:cubic-bezier(.32,.72,0,1);--expo:cubic-bezier(.19,1,.22,1)}
html{scroll-behavior:smooth}
body{margin:0;background:#07080B}
a{color:var(--g)}
::selection{background:var(--g);color:var(--on)}
@keyframes maskUp{from{transform:translateY(108%)}to{transform:none}}
@keyframes blurUp{from{opacity:0;transform:translateY(40px);filter:blur(8px)}to{opacity:1;transform:none;filter:blur(0)}}
@keyframes drift{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,50px) scale(1.15)}}
@keyframes progress{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.mask{display:inline-block;overflow:hidden;vertical-align:top;padding-bottom:.08em}
.mask-up{display:inline-block;animation:maskUp 1300ms var(--expo) both}
.enter{animation:blurUp 1000ms var(--spring) both}
.orb{animation:drift 26s var(--spring) infinite alternate}
.eyebrow{display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(var(--l),.04);box-shadow:inset 0 0 0 1px rgba(var(--l),.08);font:500 10px var(--body);text-transform:uppercase;letter-spacing:.2em;color:var(--soft)}
.shell{padding:6px;border-radius:32px;background:linear-gradient(160deg,rgba(var(--l),.09),rgba(var(--l),.02) 45%,rgba(var(--l),.04));box-shadow:inset 0 0 0 1px rgba(var(--l),.10),0 30px 60px -30px rgba(0,0,0,.7)}
.core{position:relative;height:100%;box-sizing:border-box;border-radius:26px;background:linear-gradient(165deg,rgba(28,32,42,.62),rgba(12,14,19,.55));box-shadow:inset 0 1px 0 rgba(var(--l),.16),inset 0 0 0 1px rgba(var(--l),.05);overflow:hidden}
.core::after{content:'';position:absolute;inset:0;border-radius:inherit;background:linear-gradient(120deg,rgba(var(--l),.07) 0%,rgba(var(--l),0) 32%);pointer-events:none}
@media (min-width:861px){.core{-webkit-backdrop-filter:blur(22px) saturate(150%);backdrop-filter:blur(22px) saturate(150%)}}
@media (max-width:860px){.core{background:linear-gradient(165deg,rgba(30,34,45,.82),rgba(14,16,22,.8))}}
@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-90px,60px) scale(1.18)}}
@keyframes drift2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(90px,-60px) scale(1.12)}}
.aurora{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden}
.aurora span{position:absolute;border-radius:50%;filter:blur(120px)}
.au1{width:46vw;height:46vw;left:-8vw;top:8vh;background:var(--g);opacity:.2;animation:drift1 34s var(--spring) infinite alternate}
.au2{width:40vw;height:40vw;right:-10vw;top:38vh;background:var(--a);opacity:.14;animation:drift2 40s var(--spring) infinite alternate}
.au3{width:36vw;height:36vw;left:30vw;bottom:-14vh;background:#6E7CF5;opacity:.16;animation:drift1 46s var(--spring) infinite alternate-reverse}
.grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;background-image:radial-gradient(rgba(var(--l),.7) .6px,transparent .6px);background-size:3px 3px}
main > section,main > footer{position:relative;z-index:1}
@property --ga{syntax:'<angle>';inherits:false;initial-value:0deg}
@keyframes rim{to{--ga:360deg}}
.shell{position:relative}
.shell::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:conic-gradient(from var(--ga),transparent 0deg 240deg,rgba(var(--l),.7) 300deg,rgba(61,220,151,.65) 325deg,transparent 360deg);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask:linear-gradient(#000 0 0) content-box exclude,linear-gradient(#000 0 0);opacity:0;transition:opacity 500ms var(--spring);pointer-events:none;z-index:3}
@media (hover:hover){.shell:hover::before{opacity:1;animation:rim 3.2s linear infinite}}
.kv{text-shadow:0 0 44px rgba(61,220,151,.22)}
@keyframes auA{0%{opacity:.22;translate:0 0}45%{opacity:.07;translate:0 20vh}100%{opacity:.14;translate:10vw 52vh}}
@keyframes auB{0%{opacity:.05}35%{opacity:.2}70%{opacity:.09}100%{opacity:.16;translate:-8vw -10vh}}
@keyframes auC{0%{opacity:.04}55%{opacity:.2;translate:-6vw -20vh}100%{opacity:.24;translate:4vw -40vh}}
@supports (animation-timeline: scroll()){
.au1{animation:drift1 34s var(--spring) infinite alternate,auA linear both;animation-timeline:auto,scroll(root)}
.au2{animation:drift2 40s var(--spring) infinite alternate,auB linear both;animation-timeline:auto,scroll(root)}
.au3{animation:drift1 46s var(--spring) infinite alternate-reverse,auC linear both;animation-timeline:auto,scroll(root)}
}

.pbtn{display:inline-flex;align-items:center;gap:14px;min-height:56px;padding:6px 6px 6px 26px;border-radius:999px;box-sizing:border-box;text-decoration:none;font:500 15px var(--body);cursor:pointer;border:0;transition:background 500ms var(--spring),transform 400ms var(--spring)}
.pbtn:active{transform:scale(.98)}
.pbtn .ic{width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;transition:transform 700ms var(--spring)}
.solid{background:var(--g);color:var(--on)}.solid .ic{background:rgba(7,8,11,.12)}
.ghost{background:rgba(var(--l),.04);color:var(--ink);box-shadow:inset 0 0 0 1px rgba(var(--l),.12)}.ghost .ic{background:rgba(var(--l),.08)}
.navlink{color:var(--soft);text-decoration:none;padding:10px 12px;border-radius:999px;font-size:14px;transition:color 500ms var(--spring),background 500ms var(--spring)}
.phase{border:0;text-align:left;cursor:pointer;font-family:var(--body);color:var(--ink);transition:background 500ms var(--spring),box-shadow 500ms var(--spring)}
.bar{transform-origin:left;transform:scaleX(0);transition:transform 1400ms var(--expo)}
.bars-in .bar{transform:scaleX(1)}
.readbar{transform:scaleX(0);transform-origin:left}
.rv-on [data-r]{opacity:0;transform:translateY(40px);filter:blur(8px);transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);transition-delay:calc(var(--i,0) * 70ms)}
.rv-on [data-r].in{opacity:1;transform:none;filter:blur(0)}
a:focus-visible,button:focus-visible{outline:2px solid var(--g);outline-offset:3px}
@supports (animation-timeline: scroll()){.readbar{animation:progress linear both;animation-timeline:scroll(root)}}
@media (hover:hover){
.navlink:hover{color:var(--ink);background:rgba(var(--l),.06)}
.pbtn:hover .ic{transform:translate(4px,-1px) scale(1.05)}
.phase:hover{box-shadow:inset 0 0 0 1px rgba(var(--l),.2)}
.next:hover .big{transform:translateX(12px)}
}
.next .big{transition:transform 800ms var(--spring)}
@media (max-width:860px){.hide-sm{display:none !important}
main section{padding-top:40px !important;padding-bottom:56px !important}
main section:first-of-type{padding-top:112px !important}
.kgrid,.mgrid{grid-template-columns:repeat(2,minmax(0,1fr)) !important;gap:10px !important}
.kgrid > :first-child{grid-column:span 2}
.kcore{min-height:0 !important;padding:16px !important}
.kcore .kv{font-size:32px !important;margin-top:10px !important}
.mgrid .core{padding:14px 16px !important}
.pgrid{display:flex !important;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -24px;padding:0 24px 4px;scrollbar-width:none}
.pgrid::-webkit-scrollbar{display:none}
.pgrid .phase{flex:0 0 auto;scroll-snap-align:start;padding:12px 16px !important}
.pgrid .phase span + span{font-size:19px !important}}
@media (prefers-reduced-motion: reduce){.aurora span{animation:none !important}.shell::before{display:none}*,*::before,*::after{animation-duration:.01ms !important;animation-iteration-count:1 !important;animation-delay:0s !important;transition-duration:.01ms !important;transition-delay:0s !important}.rv-on [data-r]{opacity:1;transform:none;filter:none}.bar{transform:none}}

main[data-theme=serious]{--ink:#F3EFE7;--muted:#A9AEB9;--faint:#8C929E;--soft:#C9CDD6;--faint2:#6E7480;--g:#3DDC97;--a:#F5A524;--on:#07080B;--l:255,255,255;--navbg:rgba(16,19,25,.62);--display:'Instrument Serif',serif;--dw:400;--body:'Geist',system-ui,sans-serif}
main[data-theme=playful]{--ink:#1B1A2E;--muted:#4A4860;--faint:#5C5A70;--soft:#3E3C55;--faint2:#6B6880;--g:#147A63;--a:#D9561A;--on:#FFFFFF;--l:27,26,46;--navbg:rgba(255,255,255,.85);--display:'Outfit',sans-serif;--dw:900;--body:'Outfit',sans-serif;background-color:#FFF6E5 !important;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px);background-size:24px 24px}
main[data-theme=playful] .aurora,main[data-theme=playful] .grain{display:none}
main[data-theme=playful] .shell{background:rgba(255,255,255,.55);box-shadow:inset 0 0 0 1px rgba(27,26,46,.08),0 30px 50px -34px rgba(27,26,46,.45)}
main[data-theme=playful] .core{background:#FFFFFF !important;-webkit-backdrop-filter:none !important;backdrop-filter:none !important;box-shadow:inset 0 0 0 1px rgba(27,26,46,.06)}
main[data-theme=playful] .core::after{display:none}
main[data-theme=playful] [style*="font-style:italic"]{font-style:normal !important}
main[data-theme=playful] h1,main[data-theme=playful] h2{letter-spacing:-0.045em !important}`,
  Intro: ":root{--dur-1:120ms;--dur-2:180ms;--dur-3:240ms;--dur-5:500ms;--ease-out-quad:cubic-bezier(.25,.46,.45,.94);--ease-out-quart:cubic-bezier(.165,.84,.44,1);--ease-out-expo:cubic-bezier(.19,1,.22,1);--ease-in-out-cubic:cubic-bezier(.645,.045,.355,1);--ease-in-out-quart:cubic-bezier(.77,0,.175,1);--toy:cubic-bezier(.34,1.56,.64,1)}\nbody{margin:0;background:#FFF6E5}\na{color:inherit}\n@keyframes sunRise{from{opacity:0;transform:translateY(180px) scale(.6)}to{opacity:1;transform:none}}\n@keyframes introDrop{0%{opacity:0;transform:translateY(-110vh) rotate(-25deg)}55%{opacity:1;transform:translateY(18px) rotate(6deg) scaleY(.86)}72%{transform:translateY(-16px) rotate(-3deg) scaleY(1.04)}86%{transform:translateY(4px)}100%{transform:none}}\n@keyframes pop{from{opacity:0;transform:scale(.6) translateY(20px)}to{opacity:1;transform:none}}\n@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}\n@keyframes introOut{to{opacity:0;transform:scale(1.04)}}\n@keyframes nightIn{from{transform:translateX(100%)}to{transform:none}}\n@keyframes spin{to{transform:rotate(360deg)}}\n@keyframes bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}\n@keyframes twinkle{0%,100%{opacity:.2}50%{opacity:1}}\n@keyframes floaty{0%,100%{transform:translateY(0) rotate(-6deg)}50%{transform:translateY(-10px) rotate(-2deg)}}\n.intro-sun{animation:sunRise 900ms var(--ease-out-expo) both}\n.rays{animation:spin 14s linear infinite}\n.intro-letter{display:inline-block;animation:introDrop 1000ms var(--ease-out-quad) both}\n.pop{animation:pop .7s var(--toy) both}\n.intro.leave{animation:introOut 420ms var(--ease-out-quart) forwards;pointer-events:none}\n.night-panel{animation:nightIn 800ms var(--ease-in-out-quart) both}\n.wait .night-panel,.wait .enter{animation-play-state:paused}\n.enter{animation:fadeUp var(--dur-5) var(--ease-out-quart) both}\n.bob{animation:bob 4s ease-in-out infinite}\n.moon{animation:floaty 6s ease-in-out infinite}\n.star{animation:twinkle 2.6s linear infinite}\n.door{position:relative;display:flex;flex-direction:column;justify-content:center;text-decoration:none;flex:1 1 380px;min-height:max(50vh,420px);box-sizing:border-box;padding:clamp(32px,5vw,72px);overflow:hidden}\n.door:focus-visible{outline:4px solid #FF7A3D;outline-offset:-8px}\n.door-art{transition:transform var(--dur-5) var(--ease-in-out-cubic)}\n.dim{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity var(--dur-3) ease}\n.arrow{display:inline-block;transition:transform var(--dur-2) var(--ease-out-quart)}\n.cta{transition:box-shadow var(--dur-2) var(--ease-out-quart)}\n@media (hover:hover){\n.door:hover .door-art{transform:scale(1.06)}\n.door:hover .arrow{transform:translateX(8px)}\n.doors:hover .door:not(:hover) .dim{opacity:.38}\n.door.day:hover .cta{box-shadow:7px 7px 0 #1B1A2E}\n}\n@media (max-width:760px){.door.day{padding-top:150px !important}.bottom-note{display:none !important}.or-badge{display:none !important}}\n@media (prefers-reduced-motion: reduce){*,*::before,*::after{animation:none !important;transition:none !important}}\n.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}"
};
const STATIC_HEAD = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#FFF6E5" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#07080B" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">`;
const PRELOAD = {
  playful: ["outfit-300-900-normal.woff2", "caveat-400-700-normal.woff2"],
  serious: ["instrument-serif-400-normal.woff2", "geist-300-600-normal.woff2"]
};
const preloads = (mode) => PRELOAD[mode].map((f) => `<link rel="preload" href="/fonts/${f}" as="font" type="font/woff2" crossorigin>`).join("\n");
function doc(opts) {
  return `<!doctype html>
<html lang="${opts.lang ?? "en"}" data-theme="${opts.theme}" class="${opts.htmlClass}">
<head>
${STATIC_HEAD}
${opts.head}
</head>
<body>
<div id="root">${opts.body}</div>
${opts.scripts}
</body>
</html>`;
}
function assetTags(manifest, entry, nonce) {
  const chunk = manifest[entry];
  if (!chunk) throw new Error(`Entry ${entry} missing from the client manifest. Run npm run build.`);
  const css2 = new Set(chunk.css ?? []);
  for (const imp of chunk.imports ?? []) for (const c of manifest[imp]?.css ?? []) css2.add(c);
  return [
    ...[...css2].map((c) => `<link rel="stylesheet" href="/${c}">`),
    `<script type="module" src="/${chunk.file}" nonce="${nonce}"><\/script>`
  ].join("\n");
}
function bootScript(data, nonce) {
  const intro = data.intro ? `var d=document.documentElement,h=new Date().getHours(),q=(location.search.match(/[?&]sky=(day|night)/)||[])[1];d.classList.add('intro-on','sky-'+(q||(h>=18||h<7?'night':'day')));setTimeout(function(){if(!window.__introOwned)d.classList.remove('intro-on')},6000);` : "";
  return `<script nonce="${nonce}">document.documentElement.classList.add('js');${intro}<\/script>`;
}
function dataScript(data) {
  return `<script id="__DATA__" type="application/json">${safeJson(data)}<\/script>`;
}
function createRenderer(opts) {
  const manifestPath = resolve(opts.clientDir, "manifest.json");
  let manifest = null;
  const getManifest = () => {
    if (!manifest) {
      if (!existsSync(manifestPath)) throw new Error("Client build missing. Run npm run build first.");
      manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    }
    return manifest;
  };
  const scriptsFor = async (entry, nonce, url) => {
    if (opts.vite) {
      const html = await opts.vite.transformIndexHtml(
        url,
        `<html><head></head><body><script type="module" src="/${entry}"><\/script></body></html>`
      );
      return (html.match(/<script[\s\S]*?<\/script>/g) ?? []).map((s) => s.replace("<script", `<script nonce="${nonce}"`)).join("\n");
    }
    return assetTags(getManifest(), entry, nonce);
  };
  return {
    async page(data, nonce, site, extraHead = "") {
      const body = render(data);
      const pageCss = PAGE_CSS[cssKeyFor(data)] ?? "";
      const head = [
        headHtml(headFor(data, site), nonce),
        preloads(data.mode),
        `<style>${pageCss.replace(/<\/style/gi, "<\\/style")}</style>`,
        extraHead,
        bootScript(data, nonce)
      ].join("\n");
      const scripts = [dataScript(data), await scriptsFor("src/web/entry-client.tsx", nonce, data.path)].join(
        "\n"
      );
      const htmlClass = `mode-${data.mode}`;
      return doc({ theme: data.mode, htmlClass, head, body, scripts });
    },
    async admin(nonce) {
      const head = `<title>Admin · meetoluwaseyi.com</title>
<meta name="robots" content="noindex, nofollow">`;
      const scripts = await scriptsFor("src/web/admin/entry-admin.tsx", nonce, "/admin");
      return doc({
        theme: "admin",
        htmlClass: "admin",
        head,
        body: '<p class="admin-loading">Loading…</p>',
        scripts
      });
    }
  };
}
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../..");
const clientDir = resolve(root, "dist/client");
async function main() {
  if (process.env.NODE_ENV !== "production") loadDotEnv(resolve(root, ".env"));
  let config;
  try {
    config = loadConfig();
  } catch (err) {
    if (err instanceof ConfigError) {
      console.error(err.message);
      process.exit(1);
    }
    throw err;
  }
  const log = createLogger(config.isDev ? "debug" : "info");
  const db = createDb(config.DATABASE_URL);
  if (!config.isDev) {
    const off = ["TURNSTILE_SECRET", "RESEND_API_KEY", "TELEGRAM_BOT_TOKEN", "CLOUDINARY_KEY"].filter((k) => !config[k]);
    if (off.length) log.warn("features off until their keys are set", { missing: off });
  }
  const ctx = { db, config, log, fetch: globalThis.fetch };
  try {
    await migrate(db, (m) => log.info("migration", { m }));
    if (!await getProfile(db)) log.info("loaded launch content", await seed(db));
    if (await bootstrapAdmin(ctx))
      log.warn("first admin created: sign in and set up 2FA, then remove ADMIN_INITIAL_PASSWORD");
  } catch (err) {
    log.error("database setup failed", { err });
  }
  const assets = [];
  let vite;
  if (config.isDev) {
    const { createServer } = await import("vite");
    vite = await createServer({ root, server: { middlewareMode: true }, appType: "custom" });
    assets.push(vite.middlewares);
  } else {
    const files = express.static(clientDir, {
      index: false,
      setHeaders(res, path) {
        res.setHeader(
          "Cache-Control",
          /[\\/]assets[\\/]/.test(path) ? "public, max-age=31536000, immutable" : "public, max-age=3600"
        );
      }
    });
    assets.push((req, res, next) => req.path === "/manifest.json" ? next() : files(req, res, next));
  }
  const renderer = createRenderer({ clientDir, ...vite ? { vite } : {} });
  const app = createApp({ ctx, renderer, assets });
  const server = app.listen(
    config.PORT,
    () => log.info("listening", { port: config.PORT, env: config.APP_ENV })
  );
  let closing = false;
  const shutdown = (signal) => {
    if (closing) return;
    closing = true;
    log.info("shutting down", { signal });
    server.close(() => {
      void db.end().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 1e4).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (err) => log.error("unhandled rejection", { err }));
}
void main();
//# sourceMappingURL=index.js.map
