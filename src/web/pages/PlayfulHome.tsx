/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, type ReactNode } from 'react';
import { PlayfulHomeView } from '../mockup/PlayfulHomeView.tsx';
import type { PageData } from '../../shared/page.ts';
import type { PublicProject } from '../../shared/schemas.ts';
import { markIntroSeen, prefersReducedMotion } from '../lib/mode.ts';
import { sendContact } from '../lib/api.ts';
import { turnstileToken } from '../lib/turnstile.ts';
import {
  DAYS,
  DOING,
  LOVES,
  NOTES,
  NUMS,
  PLAYFUL_CARDS,
  ROAD,
  TAPE_NOTES,
  TAPE_WORDS,
  INTENTS,
} from '../content/playful.ts';

/**
 * Playful homepage. Behaviour ported from the approved mockup: the intro on a first visit, the living sky
 * (scroll-driven, rAF fallback), the cloud menu with lightning, the avatar snap, the pinned "one road",
 * counters and the playful chat. Visual state that must survive re-renders is applied to the DOM
 * by the rAF loop, exactly as in the mockup.
 */
type Props = { data: PageData };

const SHADOWS = ['#FF7A3D', '#2EC4A0', '#5BC0EB', '#F25F8B', '#FFD23F'];
const CARD_BG = ['#9FE8D0', '#FFB38A', '#C9F2E2', '#FFD23F', '#B9E2F7', '#F7B6CC', '#D7C3F5'];

function skyFromClock(): 'day' | 'night' {
  try {
    const q = new URLSearchParams(window.location.search).get('sky');
    if (q === 'day' || q === 'night') return q;
  } catch {
    /* ignore */
  }
  const h = new Date().getHours();
  return h >= 18 || h < 7 ? 'night' : 'day';
}

function cardFor(p: PublicProject, i: number) {
  const o = PLAYFUL_CARDS[p.slug] ?? {};
  const href = p.caseStudy ? `/work/${p.slug}` : (p.links.live ?? p.links.book ?? p.links.repo ?? '/work');
  return {
    tags: p.pillars,
    label:
      o.label ?? (p.pillars[0] === 'data' ? 'Data' : p.pillars[0] === 'community' ? 'Community' : 'Venture'),
    title: p.title,
    mark: o.mark ?? p.mark,
    bg: o.bg ?? CARD_BG[i % CARD_BG.length],
    blurb: o.blurb ?? p.summary,
    href: o.href ?? href,
    cta: o.cta ?? 'Have a look',
  };
}

export class PlayfulHome extends Component<Props, any> {
  [key: string]: any;

  constructor(props: Props) {
    super(props);
    this.state = {
      intro: props.data.intro ? 'on' : 'off',
      sky: 'day',
      toast: false,
      d: 0,
      time: 0,
      filter: 'all',
      burst: false,
      choice: null,
      typing: false,
      n1: 0,
      n2: 0,
      n3: 0,
      menu: false,
      rvOn: false,
      chatEmail: '',
      chatSending: false,
      chatError: '',
      chatSent: false,
      hour: null,
    };
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

  /** The intro plays first; when it leaves, the homepage underneath is already there. */
  playIntro() {
    clearTimeout(this.i1);
    clearTimeout(this.i2);
    const reduce = prefersReducedMotion();
    document.documentElement.classList.add('intro-on');
    this.i1 = setTimeout(() => this.setState({ intro: 'leave' }), reduce ? 900 : 2800);
    this.i2 = setTimeout(() => this.endIntro(true), reduce ? 1000 : 3350);
  }

  endIntro(showToast: boolean) {
    document.documentElement.classList.remove('intro-on');
    markIntroSeen();
    this.setState({ intro: 'off', toast: showToast });
    if (showToast) {
      clearTimeout(this.tt2);
      this.tt2 = setTimeout(() => this.setState({ toast: false }), 9000);
    }
  }

  override componentDidMount() {
    const win = window;
    this.reduce = prefersReducedMotion();
    // Clock-based bits are set after mount, so server and browser render the same first frame.
    this.setState({ sky: skyFromClock(), hour: new Date().getHours() });
    (window as unknown as { __introOwned?: boolean }).__introOwned = true;
    if (this.props.data.intro) this.playIntro();
    else document.documentElement.classList.remove('intro-on');

    if (win.IntersectionObserver && !this.reduce) {
      this.io = new win.IntersectionObserver(
        (es) => {
          es.forEach((x) => {
            if (x.isIntersecting) {
              x.target.classList.add('in');
              this.io.unobserve(x.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
      );
      this.setState({ rvOn: true }, () => this.scan());
    }
    this.timer = setInterval(() => this.setState((s: any) => ({ d: ((s.d || 0) + 1) % DOING.length })), 2400);
    this.skyY = -1;
    this.skyP = 0;
    this.skyTL = !!(win.CSS && win.CSS.supports && win.CSS.supports('animation-timeline: scroll()'));

    const loop = () => {
      const y = win.scrollY || 0;
      if (y !== this.skyY) {
        this.skyY = y;
        const de = win.document.documentElement;
        this.skyP = Math.min(1, Math.max(0, y / Math.max(1, de.scrollHeight - win.innerHeight)));
      }
      if (this.reduce || !this.skyTL)
        [this.sky, this.skyFg, this.nav, this.band].forEach((el: HTMLElement | null) => {
          if (!el) return;
          if (this.reduce) {
            const n = this.skyP > 0.5;
            if (n !== el.hasAttribute('data-night')) el.toggleAttribute('data-night', n);
          } else {
            const v = this.skyP.toFixed(4);
            if (el.style.getPropertyValue('--p') !== v) el.style.setProperty('--p', v);
          }
        });
      if (this.avaSayUntil || this.avaPolUntil) {
        const el = win.document.querySelector('.hero-art');
        const now = Date.now();
        if (el) {
          const say = now < (this.avaSayUntil || 0);
          const pol = now < (this.avaPolUntil || 0);
          if (say !== el.hasAttribute('data-say')) el.toggleAttribute('data-say', say);
          if (pol !== el.hasAttribute('data-pol')) el.toggleAttribute('data-pol', pol);
          if (!!this.avaNight !== el.hasAttribute('data-night'))
            el.toggleAttribute('data-night', !!this.avaNight);
          if (this.snapped && !el.hasAttribute('data-snapped')) el.setAttribute('data-snapped', '');
          const b = el.querySelector('.ava-say');
          if (say && b && b.textContent !== this.avaSay) b.textContent = this.avaSay;
          const c = el.querySelector('.pol-cap');
          if (this.avaCap && c && c.textContent !== this.avaCap) c.textContent = this.avaCap;
          if (!say && !pol) {
            this.avaSayUntil = 0;
            this.avaPolUntil = 0;
          }
        }
      }
      // Pinned road: size the section to the track, then map vertical scroll to sideways movement.
      const road = this.road as HTMLElement | null;
      const pin = road ? (road.closest('.road-pin') as HTMLElement | null) : null;
      if (road && pin) {
        if (
          this.roadW !== road.scrollWidth ||
          this.roadVW !== win.innerWidth ||
          this.roadVH !== win.innerHeight ||
          this.roadPin !== pin
        ) {
          this.roadW = road.scrollWidth;
          this.roadVW = win.innerWidth;
          this.roadVH = win.innerHeight;
          this.roadPin = pin;
          this.roadDist = Math.max(0, road.scrollWidth - pin.clientWidth);
          pin.style.height = win.innerHeight + this.roadDist + 'px';
          pin.classList.add('road-js');
        }
        const r = pin.getBoundingClientRect();
        const d = this.roadDist || 0;
        const q = d ? Math.min(1, Math.max(0, -r.top / d)) : 0;
        if (q !== this.roadQ) {
          this.roadQ = q;
          road.style.transform = 'translate3d(' + (-q * d).toFixed(1) + 'px,0,0)';
          const bar = pin.querySelector('.road-prog') as HTMLElement | null;
          if (bar) bar.style.setProperty('--rp', q.toFixed(4));
        }
      }
      this.raf = win.requestAnimationFrame(loop);
    };
    this.raf = win.requestAnimationFrame(loop);

    // Living cloud nav: random lightning, tap-to-strike, pointer parallax (all skipped under reduced motion).
    this.strike = (bx?: number) => {
      const nav = this.nav as HTMLElement | null;
      if (!nav || this.reduce) return;
      const x = bx == null ? 22 + Math.random() * 56 : bx;
      nav.style.setProperty('--bx', x.toFixed(1) + '%');
      const R = Math.random;
      const pts: number[][] = [[30, 0]];
      let px = 30;
      let py = 0;
      while (py < 108) {
        py = Math.min(118, py + 7 + R() * 11);
        px = Math.min(52, Math.max(8, px + (R() - 0.5) * 20));
        pts.push([px, py]);
      }
      const k = 2 + Math.floor(R() * 2);
      const fx0 = pts[k]![0]!;
      const fy0 = pts[k]![1]!;
      const dir = R() < 0.5 ? -1 : 1;
      const fork: number[][] = [[fx0, fy0]];
      let fx = fx0;
      let fy = fy0;
      for (let i = 0; i < 3; i++) {
        fx = Math.min(58, Math.max(2, fx + dir * (5 + R() * 7)));
        fy += 8 + R() * 8;
        fork.push([fx, fy]);
      }
      const toD = (a: number[][]) => 'M' + a.map((q) => q[0]!.toFixed(1) + ' ' + q[1]!.toFixed(1)).join(' L');
      const main = toD(pts);
      const br = toD(fork);
      nav.querySelectorAll('.cn-bolt .bh,.cn-bolt .bc').forEach((el) => el.setAttribute('d', main));
      nav.querySelectorAll('.cn-bolt .bbh,.cn-bolt .bbc').forEach((el) => el.setAttribute('d', br));
      const cloud = nav.querySelector('.cloudnav');
      const r = cloud ? cloud.getBoundingClientRect() : null;
      if (this.sky && r) this.sky.style.setProperty('--bxv', Math.round(r.left + (r.width * x) / 100) + 'px');
      [nav, this.sky].forEach((el: HTMLElement | null) => {
        if (!el) return;
        el.removeAttribute('data-strike');
        void el.offsetWidth;
        el.setAttribute('data-strike', '');
      });
      clearTimeout(this.st);
      this.st = setTimeout(
        () => [nav, this.sky].forEach((el: HTMLElement | null) => el && el.removeAttribute('data-strike')),
        800,
      );
    };
    const doc = win.document;
    if (!this.reduce) {
      const next = (first: boolean) => {
        const wait = (first ? 5000 : 9000) + Math.random() * 9000 * (this.skyP > 0.5 ? 0.7 : 1);
        this.lt = setTimeout(() => {
          if (!doc.hidden && !this.state.menu && this.state.intro === 'off') this.strike();
          next(false);
        }, wait);
      };
      next(true);
      this.pulse = (el: HTMLElement | null, attr: string, ms: number) => {
        if (!el) return;
        el.removeAttribute(attr);
        void el.offsetWidth;
        el.setAttribute(attr, '');
        clearTimeout(this['t' + attr]);
        this['t' + attr] = setTimeout(() => el.removeAttribute(attr), ms);
      };
      this.shoot = () => {
        const fg = this.skyFg as HTMLElement | null;
        if (!fg) return;
        fg.style.setProperty('--sx', (35 + Math.random() * 55).toFixed(1) + '%');
        fg.style.setProperty('--sy', Math.round(6 + Math.random() * 40) + 'px');
        this.pulse(fg, 'data-shoot', 1200);
      };
      const stars = () => {
        this.ss = setTimeout(
          () => {
            if (!doc.hidden && this.skyP > 0.55) this.shoot();
            stars();
          },
          6000 + Math.random() * 7000,
        );
      };
      stars();
      this.onBodyClick = (e: MouseEvent) => {
        const t = e.target as Element;
        if (!(t.closest && t.closest('.sk-b'))) return;
        if (this.skyP > 0.5) this.shoot();
        else this.pulse(this.skyFg, 'data-flare', 950);
      };
      this.onCloudClick = (e: MouseEvent) => {
        const t = e.target as Element;
        const cloud = t.closest && t.closest('.cloudnav');
        if (!cloud || t.closest('a,button')) return;
        const r = cloud.getBoundingClientRect();
        this.strike(Math.min(90, Math.max(10, ((e.clientX - r.left) / r.width) * 100)));
      };
      this.onCloudMove = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || !this.nav) return;
        const t = e.target as Element;
        const cloud = t.closest && t.closest('.cloudnav');
        if (!cloud) {
          if (this.mxOn) {
            this.mxOn = false;
            this.nav.style.setProperty('--mx', '0');
            this.nav.style.setProperty('--my', '0');
          }
          return;
        }
        const r = cloud.getBoundingClientRect();
        this.mxOn = true;
        this.nav.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(2));
        this.nav.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(2));
      };
      doc.addEventListener('click', this.onBodyClick);
      doc.addEventListener('click', this.onCloudClick);
      doc.addEventListener('pointermove', this.onCloudMove, { passive: true });
    }

    // Avatar: tilt toward the pointer, a repeating "tap me" hint, and the phone snap on tap.
    // No real camera is used: no permission prompt and no image of the visitor.
    {
      const art = () => doc.querySelector('.hero-art') as HTMLElement | null;
      const lines = [
        'Got you! Ẹ kú àbọ̀',
        'Perfect shot!',
        'You look great, abeg',
        'One more? Okay, last one',
        'Framed. Welcome in!',
      ];
      let n = 0;
      const sayFor = (el: HTMLElement, text: string, ms: number) => {
        this.avaSay = text;
        this.avaSayUntil = Date.now() + ms;
        const b = el.querySelector('.ava-say');
        if (b) b.textContent = text;
        el.setAttribute('data-say', '');
      };
      const restart = (el: HTMLElement, attr: string) => {
        el.removeAttribute(attr);
        void el.offsetWidth;
        el.setAttribute(attr, '');
      };
      this.snap = () => {
        const el = art();
        if (!el || this.snapBusy) return;
        this.snapBusy = true;
        this.snapped = true;
        el.setAttribute('data-snapped', '');
        const ct = el.querySelector('.chip-t');
        if (ct) ct.textContent = 'Snap again';
        const h = new Date().getHours();
        const night = h >= 18 || h < 7;
        this.avaNight = night;
        el.toggleAttribute('data-night', night);
        this.avaPolUntil = 0;
        el.removeAttribute('data-pol');
        if (!this.reduce) restart(el, 'data-snap');
        sayFor(el, 'Say cheese!', 900);
        const fr = doc.querySelector('.snap-frame') as HTMLElement | null;
        if (fr && !this.reduce) {
          restart(fr, 'data-on');
          setTimeout(() => fr.removeAttribute('data-on'), 1150);
        }
        const fire = () => {
          if (!this.reduce) {
            const f = doc.querySelector('.snap-flash') as HTMLElement | null;
            const r = el.getBoundingClientRect();
            if (f) {
              f.style.setProperty('--fx', Math.round(r.left + r.width * 0.426) + 'px');
              f.style.setProperty('--fy', Math.round(r.top + r.height * 0.676) + 'px');
              restart(f, 'data-on');
              setTimeout(() => f.removeAttribute('data-on'), 500);
            }
          }
          const stamp = String(h).padStart(2, '0') + ':' + String(new Date().getMinutes()).padStart(2, '0');
          this.avaCap = 'Snapped you · ' + stamp;
          const cap = el.querySelector('.pol-cap');
          if (cap) cap.textContent = this.avaCap;
          setTimeout(
            () => {
              this.avaPolUntil = Date.now() + 5400;
              restart(el, 'data-pol');
              sayFor(el, lines[n++ % lines.length]!, 2600);
            },
            this.reduce ? 0 : 140,
          );
        };
        this.snapT1 = setTimeout(fire, this.reduce ? 200 : 780);
        this.snapT2 = setTimeout(
          () => {
            el.removeAttribute('data-snap');
            this.snapBusy = false;
          },
          this.reduce ? 400 : 1750,
        );
      };
      this.onAvaClick = (e: MouseEvent) => {
        const t = e.target as Element;
        if (t.closest && t.closest('.ava-hit,.ava-chip,.ava-note')) this.snap();
      };
      doc.addEventListener('click', this.onAvaClick);
      if (!this.reduce) {
        this.onAvaMove = (e: PointerEvent) => {
          if (e.pointerType !== 'mouse') return;
          const el = art();
          if (!el) return;
          const r = el.getBoundingClientRect();
          const near =
            e.clientX > r.left - 200 &&
            e.clientX < r.right + 200 &&
            e.clientY > r.top - 200 &&
            e.clientY < r.bottom + 200;
          const tx = near ? Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)) : 0;
          const ty = near ? Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1)) : 0;
          el.style.setProperty('--tx', tx.toFixed(2));
          el.style.setProperty('--ty', ty.toFixed(2));
        };
        doc.addEventListener('pointermove', this.onAvaMove, { passive: true });
        const hint = (wait: number) => {
          this.hintT = setTimeout(() => {
            const el = art();
            if (!el || this.snapped) return;
            const r = el.getBoundingClientRect();
            const visible = r.bottom > 80 && r.top < win.innerHeight - 80;
            if (visible && !doc.hidden && this.state.intro === 'off') {
              restart(el, 'data-hint');
              this.hints = (this.hints || 0) + 1;
              sayFor(el, this.hints % 2 ? 'Tap me, I’ll snap you!' : 'Psst... say cheese?', 2600);
              setTimeout(() => el.removeAttribute('data-hint'), 950);
            }
            hint(14000);
          }, wait);
        };
        hint(this.props.data.intro ? 3500 + 3400 : 3500);
      }
    }

    const countUp = () => {
      if (this.counted) return;
      this.counted = true;
      const start = win.performance.now();
      const step = (now: number) => {
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
        { threshold: 0.25 },
      );
      this.io2.observe(this.stats);
    } else countUp();
  }

  override componentDidUpdate() {
    this.scan();
  }

  override componentWillUnmount() {
    for (const t of ['timer']) clearInterval(this[t]);
    for (const t of [
      'bt',
      'bt2',
      'tt',
      'tt2',
      'i1',
      'i2',
      'i3',
      'lt',
      'st',
      'ss',
      'hintT',
      'snapT1',
      'snapT2',
    ])
      clearTimeout(this[t]);
    window.cancelAnimationFrame(this.raf);
    window.cancelAnimationFrame(this.raf2);
    const doc = document;
    for (const [type, fn] of [
      ['click', this.onAvaClick],
      ['click', this.onCloudClick],
      ['click', this.onBodyClick],
      ['pointermove', this.onAvaMove],
      ['pointermove', this.onCloudMove],
    ] as const) {
      if (fn) doc.removeEventListener(type, fn);
    }
    if (this.io) this.io.disconnect();
    if (this.io2) this.io2.disconnect();
  }

  async sendChat(intent: string, label: string) {
    const email = String(this.state.chatEmail || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      this.setState({ chatError: 'That email doesn’t look right. Mind checking it?' });
      return;
    }
    this.setState({ chatSending: true, chatError: '' });
    const local = email.split('@')[0] ?? '';
    const token = await turnstileToken(this.props.data.turnstileSiteKey);
    const r = await sendContact({
      name: local.length >= 2 ? local.slice(0, 80) : 'Chat visitor',
      email,
      intent: intent as never,
      message: `Picked “${label}” in the playful chat. Reply to this email to continue.`,
      source: 'chat',
      website: '',
      ...(token ? { turnstileToken: token } : {}),
    });
    this.setState(
      r.ok ? { chatSending: false, chatSent: true } : { chatSending: false, chatError: r.error.message },
    );
  }

  renderVals() {
    const s = this.state || {};
    const data = this.props.data;
    const rot = (n: number, cur: number, i: number) => {
      const k = (i - cur + n) % n;
      if (k === 0) return { st: 'opacity:1;transform:none;filter:blur(0)', hid: false };
      if (k === n - 1) return { st: 'opacity:0;transform:translateY(-70%);filter:blur(6px)', hid: true };
      return { st: 'opacity:0;transform:translateY(70%);filter:blur(6px)', hid: true };
    };
    const first = data.profile.name.split(' ')[0] ?? 'Oluwaseyi';
    // Letters are inline-block spans, so the space must be non-breaking or it collapses.
    const line1 = "Hi, I'm"
      .split('')
      .map((ch, i) => ({ ch: ch === ' ' ? '\u00A0' : ch, d: (0.1 + i * 0.05).toFixed(2) + 's' }));
    const line2 = first
      .split('')
      .map((ch, i) => ({ ch, d: (0.65 + i * 0.06).toFixed(2) + 's', c: SHADOWS[i % SHADOWS.length] }));
    const doing = DOING.map((x, i) => ({ ...x, ...rot(DOING.length, s.d || 0, i) }));
    const palette = ['#FF7A3D', '#FFD23F', '#2EC4A0', '#5BC0EB', '#F25F8B', '#1B1A2E'];
    const confetti = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
      const dist = 90 + ((i * 37) % 110);
      return {
        x: Math.round(Math.cos(a) * dist) + 'px',
        y: Math.round(Math.sin(a) * dist - 40) + 'px',
        r: ((i * 53) % 540) - 270 + 'deg',
        s: 8 + (i % 4) * 3 + 'px',
        h: (i % 2 ? 8 : 14) + 'px',
        br: i % 3 === 0 ? '50%' : '3px',
        col: palette[i % palette.length],
        d: ((i % 5) * 0.02).toFixed(2) + 's',
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
      isC: l.k === 'C',
      isD: l.k === 'D',
      isDa: l.k === 'Da',
      isB: l.k === 'B',
    }));
    const ti = s.time || 0;
    const times = DAYS.map((d, i) => ({
      t: d.t,
      pressed: i === ti,
      pick: () => this.setState({ time: i }),
      style: i === ti ? 'background:#1B1A2E;color:#FFF6E5' : 'background:rgba(255,255,255,.85);color:#1B1A2E',
    }));
    const projects = data.projects
      .slice(0, 4)
      .map((p, i) => ({ ...cardFor(p, i), top: 110 + i * 26 + 'px', z: i + 1 }));
    const nums = NUMS.map((n, i) => ({ ...n, v: n.live ? `${[s.n1, s.n2, s.n3][i] || 0}${n.v}` : n.v, i }));
    const ch = INTENTS.find((x) => x.id === s.choice);
    const intents = INTENTS.map((x) => ({
      label: x.label,
      bg: x.bg,
      pick: () => {
        clearTimeout(this.tt);
        this.setState({ choice: x.id, typing: true, chatSent: false, chatError: '' });
        this.tt = setTimeout(() => this.setState({ typing: false }), 1300);
      },
    }));
    const intro = s.intro || 'off';
    const night = s.sky === 'night';
    const hr: number = s.hour ?? 10;
    const greeting = night
      ? hr >= 17 && hr < 22
        ? 'good evening, welcome in!'
        : 'up late? welcome in!'
      : hr < 12
        ? 'good morning, welcome in!'
        : hr < 17
          ? 'good afternoon, welcome in!'
          : 'hey, welcome in!';
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
      [30, 48],
    ];
    const stars = starPts.map((p, i) => ({
      x: p[0] + '%',
      y: p[1] + '%',
      s: (i % 3 === 0 ? 4 : 2) + 'px',
      c: i % 4 === 0 ? '#FFD23F' : '#FFF6E5',
      d: ((i * 0.37) % 2.6).toFixed(2) + 's',
    }));
    const introLetters = first
      .split('')
      .map((c, i) => ({ ch: c, d: (0.55 + i * 0.08).toFixed(2) + 's', c: SHADOWS[i % SHADOWS.length] }));
    const menu = !!s.menu;
    const menuLinks = [
      ['/work', 'Things I made'],
      ['/about', 'My story'],
      ['/writing', 'Writing'],
      ['/contact', 'Say hi'],
      ['/?mode=serious', 'Serious mode'],
    ].map(([href, t], i) => ({ href, t, i: i + 1 }));
    const chatStatus: ReactNode = s.chatSent ? (
      <p
        id="hi-status"
        role="status"
        className="msg"
        style={{
          margin: '8px 0 0',
          alignSelf: 'flex-start',
          padding: '12px 16px',
          borderRadius: '22px 22px 22px 6px',
          background: '#FFD23F',
          fontSize: 16,
        }}
      >
        Got it! I’ll be in touch soon.
      </p>
    ) : (
      <p
        id="hi-status"
        role={s.chatError ? 'alert' : 'status'}
        style={{ margin: '6px 0 0', fontSize: 14, color: '#B42318', minHeight: s.chatError ? undefined : 0 }}
      >
        {s.chatError}
      </p>
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
      choiceLabel: ch ? ch.label : '',
      typing: !!(ch && s.typing),
      replied: !!(ch && !s.typing),
      reply: ch ? ch.reply : '',
      chatEmail: s.chatEmail,
      onChatEmail: (e: { target: HTMLInputElement }) =>
        this.setState({ chatEmail: e.target.value, chatError: '' }),
      chatInvalid: !!s.chatError,
      chatSending: !!s.chatSending,
      chatSendLabel: s.chatSending ? 'Sending…' : s.chatSent ? 'Sent' : 'Send',
      sendChat: () => ch && !s.chatSending && !s.chatSent && void this.sendChat(ch.id, ch.label),
      chatStatus,
      resetChat: () => this.setState({ choice: null, typing: false, chatSent: false, chatError: '' }),
      isNight: night,
      isDay: !night,
      stars,
      greeting,
      introBg: night
        ? 'background-color:#14152B;background-image:radial-gradient(rgba(255,246,229,.07) 1.3px,transparent 1.3px)'
        : 'background-color:#FFF6E5;background-image:radial-gradient(rgba(27,26,46,.08) 1.3px,transparent 1.3px)',
      introInk: night ? '#FFF6E5' : '#1B1A2E',
      introFx: night ? '-webkit-text-stroke:10px #14152B;paint-order:stroke fill' : '',
      greetFx: night ? 'padding:2px 18px;border-radius:999px;background:#14152B' : '',
      showToast: !!s.toast && intro === 'off',
      hideToast: () => this.setState({ toast: false }),
      introShow: intro !== 'off',
      introCls: intro === 'leave' ? 'leave' : '',
      heroClass: '',
      introLetters,
      skipIntro: () => {
        clearTimeout(this.i1);
        clearTimeout(this.i2);
        this.setState({ intro: 'leave' });
        this.i2 = setTimeout(() => this.endIntro(true), 560);
      },
      replayIntro: () => {
        clearTimeout(this.i3);
        window.scrollTo({ top: 0 });
        this.setState({ intro: 'off', toast: false });
        this.i3 = setTimeout(() => {
          this.setState({ intro: 'on' });
          this.playIntro();
        }, 30);
      },
      rootCls: s.rvOn ? 'rv-on' : '',
      menuCls: 'menu' + (menu ? ' open' : ''),
      menuHidden: !menu,
      menuOpen: menu,
      menuLabel: menu ? 'Close menu' : 'Open menu',
      burgerCls: 'burger' + (menu ? ' x' : ''),
      menuLinks,
      toggleMenu: () => this.setState({ menu: !this.state.menu }),
      closeMenu: () => this.setState({ menu: false }),
      setRoot: (el: HTMLElement | null) => {
        this.root = el;
      },
      setNav: (el: HTMLElement | null) => {
        this.nav = el;
      },
      setSky: (el: HTMLElement | null) => {
        this.sky = el;
      },
      setSkyFg: (el: HTMLElement | null) => {
        this.skyFg = el;
      },
      setBand: (el: HTMLElement | null) => {
        this.band = el;
      },
      setStats: (el: HTMLElement | null) => {
        this.stats = el;
      },
      setRoad: (el: HTMLElement | null) => {
        this.road = el;
      },
    };
  }

  override render() {
    return <PlayfulHomeView v={this.renderVals()} />;
  }
}
