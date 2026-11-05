/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, type ReactNode } from 'react';
import type { PageData } from '../../shared/page.ts';
import type { Mode, PublicProject } from '../../shared/schemas.ts';
import { onModeChange, prefersReducedMotion, saveMode } from '../lib/mode.ts';
import { ContactForm } from '../blocks/ContactForm.tsx';
import { AboutView } from '../mockup/AboutView.tsx';
import { WorkView } from '../mockup/WorkView.tsx';
import { WritingView } from '../mockup/WritingView.tsx';
import { ContactView } from '../mockup/ContactView.tsx';
import { CaseStudyView } from '../mockup/CaseStudyView.tsx';
import { ShellView } from '../mockup/ShellView.tsx';

/**
 * Every page except the two homes. One layout per page; the mode only changes the theme tokens
 * (data-theme on the page root), exactly as in the mockup. Switching mode saves it for every page and tab.
 */
type Props = { data: PageData };
type Cur = 'work' | 'about' | 'writing' | 'contact' | 'none';

abstract class InnerPage extends Component<Props, any> {
  [key: string]: any;

  constructor(props: Props) {
    super(props);
    this.state = { theme: props.data.mode, menu: false, rvOn: false, ...this.initial() };
  }

  initial(): Record<string, unknown> {
    return {};
  }

  override componentDidMount() {
    this.offMode = onModeChange((m: Mode) => this.setState({ theme: m, menu: false }));
    if (this.bars && (!window.IntersectionObserver || prefersReducedMotion()))
      this.bars.classList.add('bars-in');
    else if (this.bars) {
      this.io2 = new IntersectionObserver(
        (es) => {
          if (es.some((x) => x.isIntersecting)) {
            this.bars.classList.add('bars-in');
            this.io2.disconnect();
          }
        },
        { threshold: 0.3 },
      );
      this.io2.observe(this.bars);
    }
  }

  override componentWillUnmount() {
    this.offMode?.();
    this.io2?.disconnect();
  }

  shell(cur: Cur) {
    const s = this.state;
    const p = s.theme === 'playful';
    const defs: [string, string, Cur][] = p
      ? [
          ['/work', 'Things I made', 'work'],
          ['/about', 'My story', 'about'],
          ['/writing', 'Writing', 'writing'],
        ]
      : [
          ['/work', 'Work', 'work'],
          ['/about', 'About', 'about'],
          ['/writing', 'Writing', 'writing'],
        ];
    const navLinks = defs.map(([href, label, id]) => ({
      href,
      label,
      cls: id === cur ? 'cur' : '',
      current: id === cur ? 'page' : undefined,
    }));
    const menuLinks = defs
      .map(([href, label]) => ({ href, label }))
      .concat([{ href: '/contact', label: p ? 'Say hi' : 'Contact' }]);
    return {
      theme: p ? 'playful' : 'serious',
      isPlayful: p,
      isSerious: !p,
      homeHref: '/',
      brand: p ? 'seyi' : 'oluwaseyi',
      navLinks,
      menuLinks,
      contactLabel: p ? 'Say hi' : 'Contact',
      switchText: p ? 'Serious' : 'Playful',
      switchLabel: p ? 'Switch to serious mode' : 'Switch to playful mode',
      toggleTheme: () => {
        const t: Mode = p ? 'serious' : 'playful';
        saveMode(t);
        this.setState({ theme: t });
      },
      menuOpen: !!s.menu,
      menuLabel: s.menu ? 'Close menu' : 'Open menu',
      burgerIcon: s.menu ? '×' : '≡',
      toggleMenu: () => this.setState({ menu: !s.menu }),
    };
  }
}

// ---------- Work ----------
const COVER = {
  playful: { data: '#9FE8D0', community: '#FFB38A', bd: '#FFD23F', ventures: '#D7C3F5', building: '#B9E2F7' },
  serious: {
    data: 'rgba(61,220,151,.14)',
    community: 'rgba(245,165,36,.12)',
    bd: 'rgba(245,165,36,.16)',
    ventures: 'rgba(110,124,245,.16)',
    building: 'rgba(110,124,245,.12)',
  },
} as const;
const GLOW: Record<string, string> = {
  data: '#3DDC97',
  community: '#F5A524',
  bd: '#F5A524',
  ventures: '#6E7CF5',
  building: '#6E7CF5',
};
const LABEL: Record<string, string> = {
  data: 'Data & BI',
  community: 'Community',
  bd: 'Business Dev',
  ventures: 'Venture',
  building: 'Build',
};

function projectLinks(x: PublicProject) {
  const L = (label: string, href: string, primary: boolean) => ({
    label,
    href,
    cls: primary ? 'solid' : 'ghost',
  });
  const out = [];
  if (x.caseStudy) out.push(L('Read the case study', `/work/${x.slug}`, true));
  if (x.links.live)
    out.push(
      L(
        x.caseStudy ? 'Live dashboard' : `Visit ${new URL(x.links.live).hostname.replace(/^www\./, '')}`,
        x.links.live,
        !x.caseStudy,
      ),
    );
  if (x.links.book) out.push(L('Read the free book', x.links.book, out.length === 0));
  if (x.links.repo) out.push(L(out.length ? 'Code' : 'View on GitHub', x.links.repo, out.length === 0));
  return out;
}

export class WorkPage extends InnerPage {
  override initial() {
    return { filter: 'all' };
  }
  override render() {
    const s = this.state;
    const base = this.shell('work');
    const p = base.isPlayful;
    const all = this.props.data.projects;
    const f = s.filter || 'all';
    const fdefs = p
      ? [
          ['all', 'Everything'],
          ['community', 'Community'],
          ['bd', 'Deals'],
          ['data', 'Data'],
          ['ventures', 'Building'],
        ]
      : [
          ['all', 'All'],
          ['community', 'Community'],
          ['bd', 'Business Dev'],
          ['data', 'Data & BI'],
          ['ventures', 'Ventures'],
        ];
    const on = p ? 'background:#1B1A2E;color:#FFF6E5' : 'background:#F5A524;color:#07080B';
    const off = p
      ? 'background:#fff;color:#1B1A2E;box-shadow:inset 0 0 0 1px rgba(27,26,46,.12)'
      : 'background:rgba(255,255,255,.05);color:#F3EFE7;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)';
    const filters = fdefs.map(([id, label]) => ({
      label,
      count: id === 'all' ? all.length : all.filter((x) => x.pillars.includes(id!)).length,
      pressed: f === id ? 'true' : 'false',
      style: f === id ? on : off,
      pick: () => this.setState({ filter: id }),
    }));
    const shown = all.filter((x) => f === 'all' || x.pillars.includes(f));
    const projects = shown.map((x) => {
      const pillar = x.pillars[0] ?? 'building';
      const links = projectLinks(x);
      return {
        id: x.slug,
        label: x.pillars.map((pp) => LABEL[pp] ?? pp).join(' · '),
        title: x.title,
        mark: x.mark || x.title.split(' ')[0],
        cover: (COVER[p ? 'playful' : 'serious'] as Record<string, string>)[pillar],
        color: GLOW[pillar],
        markInk: p ? '#1B1A2E' : GLOW[pillar],
        synced: false,
        blurb: x.summary,
        tags: x.stack.map((t) => ({ t })),
        links,
        noLinks: links.length === 0,
        status:
          links.length === 0
            ? x.slug === 'ratedesk'
              ? 'In development'
              : 'Write-up coming soon'
            : undefined,
        cls: f !== 'all' ? '' : x.featured && x.caseStudy ? 'f2' : x.slug === 'ratedesk' ? 'w3' : '',
        coverH: f === 'all' && x.featured && x.caseStudy ? '220px' : '150px',
      };
    });
    const empty: ReactNode =
      shown.length === 0 ? (
        <p
          role="status"
          className="wrap"
          style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}
        >
          Nothing here yet.{' '}
          <button type="button" className="chip" onClick={() => this.setState({ filter: 'all' })}>
            Show everything
          </button>
        </p>
      ) : null;
    return (
      <WorkView
        v={{
          ...base,
          filters,
          projects,
          empty,
          workEyebrow: p ? 'everything I have made' : 'Built and shipped',
        }}
      />
    );
  }
}

// ---------- About ----------
export class AboutPage extends InnerPage {
  override render() {
    const base = this.shell('about');
    const p = base.isPlayful;
    const prof = this.props.data.profile;
    const g = p ? '#147A63' : '#3DDC97';
    const jobs = prof.experience.map((j) => ({
      when: j.when,
      role: j.role,
      org: j.org,
      note: j.note,
      now: j.current && j.year >= 2024 && j.org.startsWith('WEEX'),
      hasProof: !!j.projectSlug,
      proof: j.projectSlug ? '/work' : undefined,
      proofLabel: 'See the community work',
      dot: j.current && j.org.startsWith('WEEX') ? g : p ? '#C9C3B4' : '#2A2F3A',
      c: j.current && j.org.startsWith('WEEX') ? g : 'var(--faint)',
    }));
    const stats = prof.stats.map((x) => ({ v: x.value, l: x.label }));
    const edu = prof.education.map((e) => ({ t: e.title, s: [e.org, e.year].filter(Boolean).join(' · ') }));
    const certs = prof.certificates.map((c) => ({ t: c.title }));
    const langs = prof.languages.map((l) => ({ t: l.name, s: l.level }));
    return (
      <AboutView
        v={{
          ...base,
          jobs,
          stats,
          edu,
          certs,
          langs,
          aboutEyebrow: p ? 'hi, this is me' : 'About',
          roadEyebrow: p ? 'how I got here' : 'Twelve years on the web',
        }}
      />
    );
  }
}

// ---------- Writing ----------
export class WritingPage extends InnerPage {
  override render() {
    const base = this.shell('writing');
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
        cls: cols === 3 && n % 3 === 2 && i === 0 ? 'wide' : '',
      }));
      return {
        kicker: x.kicker,
        title: x.title,
        project: x.link,
        projectLabel: x.linkLabel,
        posts,
        hasProject: !!x.link,
        cols: `repeat(${cols},minmax(0,1fr))`,
      };
    });
    return <WritingView v={{ ...base, series, wrEyebrow: p ? 'stuff I wrote' : 'Notes from the work' }} />;
  }
}

// ---------- Contact ----------
export class ContactPage extends InnerPage {
  override render() {
    const base = this.shell('contact');
    const p = base.isPlayful;
    const { profile, form, turnstileSiteKey } = this.props.data;
    const l = profile.links;
    const links = [
      { t: 'Email', h: l.email, href: `mailto:${l.email}` },
      { t: 'LinkedIn', h: '', href: l.linkedin },
      { t: 'Telegram', h: '@' + l.telegram.split('/').pop(), href: l.telegram },
      { t: 'X', h: '@' + l.x.split('/').pop(), href: l.x },
      { t: 'GitHub', h: l.github.split('/').pop(), href: l.github },
    ];
    const form_0 = (
      <ContactForm
        mode={p ? 'playful' : 'serious'}
        variant="page"
        email={l.email}
        {...(turnstileSiteKey ? { siteKey: turnstileSiteKey } : {})}
        {...(form ? { initial: form } : {})}
      />
    );
    return (
      <ContactView
        v={{ ...base, links, form_0, ctEyebrow: p ? 'come say hi' : 'Open to roles and partnerships' }}
      />
    );
  }
}

// ---------- Case study ----------
const TONE: Record<string, string> = {
  plain: 'var(--ink)',
  warn: 'var(--a)',
  bad: '#FF7A59',
  good: 'var(--g)',
};

export class CaseStudyPage extends InnerPage {
  override initial() {
    return { phase: 0 };
  }
  override render() {
    const s = this.state;
    const pr = this.props.data.project;
    const cs = pr?.caseStudy;
    if (!pr || !cs) return null;
    const pl = s.theme === 'playful';
    const cur = s.phase || 0;
    const phases = cs.steps.map((d, i) => ({
      w: d.week,
      t: d.title,
      items: d.items.map((t) => ({ t })),
      pressed: i === cur,
      hid: i !== cur,
      style:
        i === cur
          ? 'background:rgba(61,220,151,.14);box-shadow:inset 0 0 0 1px rgba(61,220,151,.5),0 0 32px -8px rgba(61,220,151,.45)'
          : 'background:rgba(var(--l),.045);box-shadow:inset 0 0 0 1px rgba(var(--l),.1)',
      panel:
        i === cur
          ? 'opacity:1;transform:none;visibility:visible;transition:opacity 600ms var(--spring) 80ms,transform 700ms var(--spring) 80ms,visibility 0s'
          : 'opacity:0;transform:translateY(14px);visibility:hidden;transition:opacity 250ms var(--spring),transform 250ms var(--spring),visibility 0s linear 250ms',
      pick: () => this.setState({ phase: i }),
    }));
    const v = {
      theme: pl ? 'playful' : 'serious',
      homeHref: '/',
      workLabel: pl ? 'Things I made' : 'All work',
      talkLabel: pl ? 'Say hi' : 'Talk to me',
      switchText: pl ? 'Serious' : 'Playful',
      switchLabel: pl ? 'Switch to serious mode' : 'Switch to playful mode',
      toggleTheme: () => {
        const t: Mode = pl ? 'serious' : 'playful';
        saveMode(t);
        this.setState({ theme: t });
      },
      meta: cs.meta.map((m) => ({ k: m.label, v: m.value })),
      kpis: cs.kpis.map((k, i) => ({ l: k.label, v: k.value, c: TONE[k.tone] ?? TONE.plain, i })),
      ratings: cs.ratings.map((r, i) => ({
        l: r.label,
        v: r.value.toFixed(1),
        w: (r.value / 5) * 100 + '%',
        c: TONE[r.tone],
        d: i * 150 + 'ms',
      })),
      phases,
      recs: cs.recommendations.map((r, i) => ({ v: r.value, t: r.title, b: r.body, i })),
      revised: cs.revised,
      rootCls: '',
      setRoot: () => {},
      setBars: (el: HTMLElement | null) => {
        this.bars = el;
      },
    };
    return <CaseStudyView v={v} />;
  }
}

// ---------- Pages the mockup doesn't show: Privacy, Thanks, 404, 500 (same chrome as Writing) ----------
export class SimplePage extends InnerPage {
  override render() {
    const base = this.shell('none');
    const { route, profile } = this.props.data;
    const email = profile.links.email;
    const box = (eyebrow: string, title: string, body: ReactNode) => (
      <section id="main-content" style={{ padding: '140px 24px 104px' }}>
        <div className="wrap">
          <p className="enter" style={{ margin: 0 }}>
            <span className="eyebrow">{eyebrow}</span>
          </p>
          <h1 className="h1 enter" style={{ animationDelay: '.08s' }}>
            {title}
          </h1>
          <div className="lead enter" style={{ animationDelay: '.16s', maxWidth: 680 }}>
            {body}
          </div>
        </div>
      </section>
    );
    const homeLinks = (
      <p style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 28 }}>
        <a className="pbtn solid" href="/">
          Go home
        </a>
        <a className="pbtn ghost" href="/work">
          See the work
        </a>
      </p>
    );
    let main: ReactNode;
    if (route === 'privacy') {
      main = box(
        'Privacy',
        'What this site keeps, and why.',
        <>
          <p>This site collects only what it needs to reply to you.</p>
          <p>
            <strong>The contact form and playful chat</strong> store your name, email, the reason you picked
            and your message. They’re used only to reply to you, never shared or sold, and never added to a
            mailing list. Messages are deleted automatically after 24 months.
          </p>
          <p>
            <strong>Your IP address</strong> is never stored. A one-way, salted fingerprint of it is kept with
            each message to stop spam and limit how often the form can be used.
          </p>
          <p>
            <strong>Cookies:</strong> two small ones remember whether you’ve seen the intro and which mode
            (playful or serious) you prefer. There are no advertising or tracking cookies, and any visit
            statistics are cookie-free.
          </p>
          <p>
            <strong>Spam protection</strong> uses Cloudflare Turnstile when you send a message. Cloudflare
            also serves the site.
          </p>
          <p>
            To see, correct or delete anything you sent, email <a href={`mailto:${email}`}>{email}</a>. This
            page follows the Nigeria Data Protection Act 2023.
          </p>
        </>,
      );
    } else if (route === 'thanks') {
      main = box(
        'Message sent',
        'Thank you. Your message is in.',
        <>
          <p>I read every message myself and usually reply within two working days.</p>
          {homeLinks}
        </>,
      );
    } else if (route === 'error') {
      main = box(
        'Something went wrong',
        'That one’s on me.',
        <>
          <p>
            The page hit an error. Please try again in a minute, or email{' '}
            <a href={`mailto:${email}`}>{email}</a>.
          </p>
          {homeLinks}
        </>,
      );
    } else {
      main = box(
        '404',
        'That page doesn’t exist.',
        <>
          <p>It may have moved, or the link has a typo.</p>
          {homeLinks}
        </>,
      );
    }
    return <ShellView v={{ ...base, main }} />;
  }
}
