/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component } from 'react';
import { SeriousHomeView } from '../mockup/SeriousHomeView.tsx';
import type { PageData } from '../../shared/page.ts';
import type { PublicProject } from '../../shared/schemas.ts';
import { prefersReducedMotion } from '../lib/mode.ts';
import { ContactForm } from '../blocks/ContactForm.tsx';
import { DAY_DEFS, PILLARS, PROGRAMS, PHRASES, TICKER, WORDS, MANIFESTO } from '../content/serious.ts';

/** Serious homepage: glass over a living aurora, spotlight cursor and magnetic buttons on desktop. Ported from the mockup. */
type Props = { data: PageData };

const AMBER = '#F5A524';
const GREEN = '#3DDC97';

const rot = (n: number, cur: number, i: number) => {
  const k = (i - cur + n) % n;
  if (k === 0) return { st: 'opacity:1;transform:none;filter:blur(0)', hid: false };
  if (k === n - 1) return { st: 'opacity:0;transform:translateY(-70%);filter:blur(6px)', hid: true };
  return { st: 'opacity:0;transform:translateY(70%);filter:blur(6px)', hid: true };
};

function card(p: PublicProject) {
  const data = p.pillars.includes('data');
  const href = p.caseStudy ? `/work/${p.slug}` : (p.links.live ?? p.links.book ?? p.links.repo ?? '/work');
  const cta = p.caseStudy ? 'Read case study' : p.links.live ? `Visit ${new URL(p.links.live).hostname.replace(/^www\./, '')}` : p.links.book ? 'Read the free book' : p.links.repo ? 'View on GitHub' : 'See the work';
  return {
    pillars: p.pillars,
    label: data ? 'Data & BI' : p.pillars.includes('community') ? 'Community' : 'Venture',
    title: p.title,
    mark: p.mark || (p.slug === 'olist-ecommerce-bi' ? '99,441 orders' : p.title),
    color: data ? GREEN : AMBER,
    coverBg: data ? '#0B1712' : '#17120B',
    blurb: p.summary,
    tags: p.stack.slice(0, 3).map((t) => ({ t })),
    href,
    cta,
  };
}

export class SeriousHome extends Component<Props, any> {
  [key: string]: any;

  constructor(props: Props) {
    super(props);
    this.state = { toast: false, w: 0, tk: 0, acc: 0, day: null, today: 0, n1: 0, n2: 0, n3: 0, n4: 0, fine: false, hot: false, moved: false, menu: false, rvOn: false };
  }

  scan() {
    if (!this.io || !this.root) return;
    this.seen = this.seen || new WeakSet();
    this.root.querySelectorAll('[data-r]').forEach((el: Element) => {
      if (!this.seen.has(el)) {
        this.seen.add(el);
        this.io.observe(el);
      }
    });
  }

  override componentDidMount() {
    const win = window;
    const mq = (q: string) => !!(win.matchMedia && win.matchMedia(q).matches);
    this.reduce = prefersReducedMotion();
    const fine = mq('(hover: hover) and (pointer: fine)') && !this.reduce;
    let today = 0;
    try {
      const wd = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Africa/Lagos' }).format(new Date());
      today = Math.max(0, ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(wd));
    } catch {
      /* default Monday */
    }
    this.setState({ today, fine });
    if (win.IntersectionObserver && !this.reduce) {
      this.io = new win.IntersectionObserver(
        (es) =>
          es.forEach((x) => {
            if (x.isIntersecting) {
              x.target.classList.add('in');
              this.io.unobserve(x.target);
            }
          }),
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      this.setState({ rvOn: true }, () => this.scan());
    }
    this.t1 = setInterval(() => this.setState((s: any) => ({ w: ((s.w || 0) + 1) % WORDS.length })), 2800);
    this.t2 = setInterval(() => this.setState((s: any) => ({ tk: ((s.tk || 0) + 1) % TICKER.length })), 3400);
    this.mx = win.innerWidth / 2;
    this.my = win.innerHeight / 3;
    this.sx = this.mx;
    this.sy = this.my;
    this.rx = this.mx;
    this.ry = this.my;
    this.rs = 1;
    this.lastY = win.scrollY || 0;
    this.navHidden = false;
    this.onMove = (e: PointerEvent) => {
      this.mx = e.clientX;
      this.my = e.clientY;
      const t = e.target as Element | null;
      const hot = !!(t && t.closest && t.closest('a,button,input,textarea,label,[tabindex]'));
      if (hot !== this.state.hot) this.setState({ hot });
      if (!this.state.moved) this.setState({ moved: true });
    };
    if (fine) win.addEventListener('pointermove', this.onMove, { passive: true });
    const loop = () => {
      const y = win.scrollY || 0;
      if (!this.reduce) {
        this.sx += (this.mx - this.sx) * 0.06;
        this.sy += (this.my - this.sy) * 0.06;
        if (this.spot) this.spot.style.transform = 'translate3d(' + (this.sx - 450).toFixed(1) + 'px,' + (this.sy - 450).toFixed(1) + 'px,0)';
        this.rx += (this.mx - this.rx) * 0.2;
        this.ry += (this.my - this.ry) * 0.2;
        this.rs += ((this.state.hot ? 1.7 : 1) - this.rs) * 0.16;
        if (this.ring) this.ring.style.transform = 'translate3d(' + this.rx.toFixed(1) + 'px,' + this.ry.toFixed(1) + 'px,0) scale(' + this.rs.toFixed(3) + ')';
        if (this.orbA) this.orbA.style.transform = 'translate3d(0,' + (y * 0.25).toFixed(1) + 'px,0)';
        if (this.orbB) this.orbB.style.transform = 'translate3d(0,' + (y * -0.12).toFixed(1) + 'px,0)';
      }
      if (this.nav && !this.state.menu) {
        const down = y > this.lastY + 4;
        const up = y < this.lastY - 4;
        if (down && y > 280 && !this.navHidden) {
          this.navHidden = true;
          this.nav.style.transform = 'translateY(-220%)';
        }
        if ((up || y < 120) && this.navHidden) {
          this.navHidden = false;
          this.nav.style.transform = 'none';
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
      const step = (now: number) => {
        const p = this.reduce ? 1 : Math.min(1, (now - start) / 1800);
        const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        this.setState({ n1: Math.round(99 * e), n2: Math.round(25 * e), n3: Math.round(7 * e), n4: Math.round(12 * e) });
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
        { threshold: 0.25 },
      );
      this.io2.observe(this.stats);
    } else countUp();
  }

  override componentDidUpdate() {
    this.scan();
  }

  override componentWillUnmount() {
    clearInterval(this.t1);
    clearInterval(this.t2);
    clearTimeout(this.tt2);
    window.cancelAnimationFrame(this.raf);
    window.cancelAnimationFrame(this.raf2);
    if (this.onMove) window.removeEventListener('pointermove', this.onMove);
    this.io?.disconnect();
    this.io2?.disconnect();
  }

  override render() {
    const s = this.state;
    const { profile, projects: all, turnstileSiteKey } = this.props.data;
    const first = profile.name.split(' ')[0] ?? 'Oluwaseyi';
    const letters = first.split('').map((ch, i) => ({ ch, d: (0.15 + i * 0.045).toFixed(3) + 's' }));
    const words = WORDS.map((t, i) => ({ t, ...rot(WORDS.length, s.w || 0, i) }));
    const ticker = TICKER.map((x, i) => ({ ...x, ...rot(TICKER.length, s.tk || 0, i) }));
    const parts = MANIFESTO.split(' ');
    const manifesto = parts.map((t, i) => ({
      t,
      p: (i / parts.length).toFixed(3),
      isFace: t === '{face}',
      isChat: t === '{chat}',
      isDeal: t === '{deal}',
      isChart: t === '{chart}',
      isWord: !['{face}', '{chat}', '{deal}', '{chart}'].includes(t),
    }));
    const acc = s.acc || 0;
    const pillars = PILLARS.map((p, i) => ({
      ...p,
      tags: p.tags.map((t) => ({ t })),
      open: i === acc,
      grow: i === acc ? 5 : 1,
      vOp: i === acc ? 0 : 1,
      fOp: i === acc ? 1 : 0,
      fTr: i === acc ? 'none' : 'translateY(24px)',
      pick: () => {
        if ((this.state.acc || 0) !== i) this.setState({ acc: i });
      },
    }));
    const projects = all.filter((p) => p.featured).slice(0, 3).map(card);
    const marquee = PROGRAMS.concat(PROGRAMS).map((t) => ({ t }));
    const marquee2 = PHRASES.concat(PHRASES, PHRASES).map((t) => ({ t }));
    const today = s.today || 0;
    const sel = s.day == null ? today : s.day;
    const days = DAY_DEFS.map((d, i) => ({ short: d.short, today: i === today, pressed: i === sel, col: i === sel ? '#F3EFE7' : '#7C8290', pick: () => this.setState({ day: i }) }));
    const panels = DAY_DEFS.map((d, i) => ({
      name: d.name,
      items: d.items,
      badge: i === today ? 'Today · live in the group' : 'On this day',
      badgeC: i === today ? GREEN : '#6E7480',
      hid: i !== sel,
      st:
        i === sel
          ? 'opacity:1;transform:none;filter:blur(0);visibility:visible;transition:opacity 700ms var(--spring) 80ms,transform 800ms var(--spring) 80ms,filter 700ms var(--spring) 80ms,visibility 0s'
          : 'opacity:0;transform:translateY(16px);filter:blur(6px);visibility:hidden;pointer-events:none;transition:opacity 300ms var(--spring),transform 300ms var(--spring),filter 300ms var(--spring),visibility 0s linear 300ms',
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
      pad: '28px',
      ds: '15px',
      dl: '0',
      dt: '8px',
      c: i === 0 && j.current ? GREEN : '#8C929E',
      dot: i === 0 && j.current ? GREEN : '#2A2F3A',
    }));
    const certs = profile.certificates.map((c) => ({ t: c.title }));
    const allPosts = profile.writing.flatMap((w) => w.posts.map((p) => ({ ...p, series: w.title })));
    const posts = allPosts.slice(0, 3).map((p, i) => ({ tag: p.kicker, c: i < 2 ? GREEN : AMBER, t: p.title, href: p.url, i }));
    const menu = !!s.menu;
    const menuLinks = [
      ['/work', 'Work'],
      ['/about', 'About'],
      ['/writing', 'Writing'],
      ['/contact', 'Contact'],
      ['/?mode=playful', 'Playful mode'],
    ].map(([href, t], i) => ({ href, t, i: i + 1 }));
    const magnet = (e: any) => {
      const el = e.currentTarget as HTMLElement;
      const inner = el.querySelector('.mag') as HTMLElement | null;
      if (!inner || this.reduce || !s.fine) return;
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.22;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.32;
      inner.style.transform = 'translate3d(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px,0)';
    };
    const unmagnet = (e: any) => {
      const inner = (e.currentTarget as HTMLElement).querySelector('.mag') as HTMLElement | null;
      if (inner) inner.style.transform = '';
    };
    const glow = (e: any) => {
      const el = ((e.currentTarget as HTMLElement).querySelector('.core') as HTMLElement | null) ?? (e.currentTarget as HTMLElement);
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
    };
    const form_0 = <ContactForm mode="serious" variant="home" email={profile.links.email} {...(turnstileSiteKey ? { siteKey: turnstileSiteKey } : {})} />;
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
      selX: sel * 100 + '%',
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
      rootCls: s.rvOn ? 'rv-on' : '',
      showToast: !!s.toast,
      hideToast: () => this.setState({ toast: false }),
      menuCls: 'menu' + (menu ? ' open' : ''),
      menuHidden: !menu,
      menuOpen: menu,
      menuLabel: menu ? 'Close menu' : 'Open menu',
      burgerCls: 'burger' + (menu ? ' x' : ''),
      toggleMenu: () => this.setState({ menu: !this.state.menu }),
      closeMenu: () => this.setState({ menu: false }),
      ringCls: 'ring' + (s.fine && s.moved ? ' on' : '') + (s.hot ? ' hot' : ''),
      setRoot: (el: HTMLElement | null) => {
        this.root = el;
      },
      setSpot: (el: HTMLElement | null) => {
        this.spot = el;
      },
      setRing: (el: HTMLElement | null) => {
        this.ring = el;
      },
      setNav: (el: HTMLElement | null) => {
        this.nav = el;
      },
      setOrbA: (el: HTMLElement | null) => {
        this.orbA = el;
      },
      setOrbB: (el: HTMLElement | null) => {
        this.orbB = el;
      },
      setStats: (el: HTMLElement | null) => {
        this.stats = el;
      },
      firstName: first,
    };
    return <SeriousHomeView v={v} />;
  }
}
