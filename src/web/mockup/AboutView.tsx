/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated from the approved mockup (About.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function AboutView({ v }: { v: V }) {
  return (
    <><div className="pg" data-theme={v.theme}><div className="aurora" aria-hidden="true"><span className="au1" />
          <span className="au2" />
          <span className="au3" />
        </div>
        <div className="grain" aria-hidden="true" />
        <div style={css("position:fixed;top:16px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 12px;pointer-events:none")}><nav aria-label="Main" style={css("pointer-events:auto;display:flex;align-items:center;gap:2px;padding:6px 6px 6px 8px;border-radius:999px;background:var(--nav);-webkit-backdrop-filter:blur(16px);backdrop-filter:blur(16px);box-shadow:var(--nav-ring)")}><a href={v.homeHref} style={css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:var(--ink);font-family:var(--display);font-weight:var(--dw);font-size:22px;letter-spacing:var(--dls);padding:2px 10px 2px 0")}><img src="/img/headshot.webp" alt="" width="34" height="34" style={css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px var(--accent)")} />{v.brand}</a>
            {(v.navLinks ?? []).map((nl: any, nl_i: number) => (<Fragment key={nl_i}><a className={`navlink hide-sm ${nl.cls ?? ''}`} href={nl.href} aria-current={nl.current}>{nl.label}</a></Fragment>))}
            <a className="pbtn solid hide-sm" href="/contact" style={css("min-height:40px;padding:0 16px;font-size:14px;margin:0 4px")}>{v.contactLabel}</a>
            <button type="button" className="modesw" onClick={v.toggleTheme} aria-label={v.switchLabel}>{v.switchText}</button>
            <button type="button" className="burger" onClick={v.toggleMenu} aria-label={v.menuLabel} aria-expanded={v.menuOpen}>{v.burgerIcon}</button>
          </nav></div>
        {v.menuOpen ? (<><div className="mmenu">{(v.menuLinks ?? []).map((ml: any, ml_i: number) => (<Fragment key={ml_i}><a href={ml.href}>{ml.label}</a></Fragment>))}</div></>) : null}
        <section style={css("padding:140px 24px 56px")} id="main-content"><div className="wrap ahero"><div><p className="enter" style={css("margin:0")}><span className="eyebrow">{v.aboutEyebrow}</span></p>
              <h1 className="h1 enter" style={css("animation-delay:.08s;font-size:clamp(44px,6vw,88px)")}>Twelve years on the web, <span className="em">five in crypto.</span>
              </h1>
              <p className="lead enter" style={css("animation-delay:.16s")}>I turn curious newcomers into active traders. At WEEX I grew the community from zero to 25,000+ members in under a year. At Gate.io I helped bring P2P trading to Nigeria. I trade spot and futures myself, so I talk to users as a peer, not a marketer.</p>
              <p className="lead enter" style={css("animation-delay:.22s;margin-top:14px")}>Before crypto I built websites and ran digital marketing for Lagos businesses. Now I'm learning data analysis in public, one real dataset at a time.</p>
              <div className="enter" style={css("animation-delay:.3s;margin-top:28px;display:flex;flex-wrap:wrap;gap:10px")}><a className="pbtn solid" href="/work">See the proof<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                      <path d="M8 7h9v9" />
                    </svg></span>
                </a>
                <a className="pbtn ghost" href="/contact">Work with me<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                      <path d="M8 7h9v9" />
                    </svg></span>
                </a>
              </div>
            </div>
            <div className="shell enter" style={css("animation-delay:.2s;max-width:440px;width:100%;justify-self:end")}><div className="core" style={css("aspect-ratio:4/5")}><img src="/img/headshot.webp" alt="Oluwaseyi Oshunwusi" style={css("width:100%;height:100%;object-fit:cover;object-position:50% 30%;display:block")} /></div></div>
          </div></section>
        <section style={css("padding:24px 24px 72px")}><div className="wrap stats">{(v.stats ?? []).map((st: any, st_i: number) => (<Fragment key={st_i}><div className="shell"><div className="core" style={css("padding:22px")}><p style={css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(40px,4vw,60px);line-height:1;color:var(--accent)")}>{st.v}</p>
                  <p style={css("margin:10px 0 0;font-size:14px;line-height:1.5;color:var(--muted)")}>{st.l}</p>
                </div></div></Fragment>))}</div></section>
        <section aria-labelledby="h-road" style={css("padding:56px 24px 72px")}><div className="wrap tsplit"><div className="tpin"><span className="eyebrow">{v.roadEyebrow}</span>
              <h2 id="h-road" className="h2" style={css("margin-top:18px")}>The road <span className="em">so far.</span>
              </h2>
              <p className="lead" style={css("font-size:16px")}>From building e-commerce sites in Lagos to running crypto communities across Africa.</p>
            </div>
            <ol style={css("list-style:none;margin:0;padding:0;position:relative")} className="tl">{(v.jobs ?? []).map((jb: any, jb_i: number) => (<Fragment key={jb_i}><li style={css("position:relative;padding:0 0 30px 36px")}><span aria-hidden="true" style={css(`position:absolute;left:0;top:7px;width:13px;height:13px;border-radius:50%;background:${jb.dot ?? ''};box-shadow:0 0 0 5px var(--bg)`)} />
                  <p style={css(`margin:0;font:500 12px var(--body);letter-spacing:.12em;text-transform:uppercase;color:${jb.c ?? ''}`)}>{jb.when}</p>
                  <h3 style={css("margin:6px 0 2px;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(22px,2.2vw,30px);line-height:1.1")}>{jb.role}</h3>
                  <p style={css("margin:0 0 6px;font-size:14px;color:var(--ink);opacity:.85")}>{jb.org}</p>
                  <p style={css("margin:0;max-width:600px;font-size:15px;line-height:1.6;color:var(--muted)")}>{jb.note}</p>
                  {jb.hasProof ? (<><a href={jb.proof} style={css("display:inline-block;margin-top:8px;font-size:14px;color:var(--ink);text-underline-offset:4px")}>{jb.proofLabel} →</a></>) : null}
                </li></Fragment>))}</ol>
          </div></section>
        <section aria-labelledby="h-learn" style={css("padding:40px 24px 104px")}><div className="wrap"><h2 id="h-learn" className="h2">Learning <span className="em">never stops.</span>
            </h2>
            <div className="lgrid" style={css("margin-top:28px")}><div className="shell"><div className="core" style={css("padding:24px")}><p className="eyebrow" style={css("margin:0")}>Education</p>
                  {(v.edu ?? []).map((ed: any, ed_i: number) => (<Fragment key={ed_i}><div style={css("margin-top:16px")}><p style={css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:22px;line-height:1.2")}>{ed.t}</p>
                      <p style={css("margin:4px 0 0;font-size:14px;color:var(--muted)")}>{ed.s}</p>
                    </div></Fragment>))}
                </div></div>
              <div className="shell"><div className="core" style={css("padding:24px")}><p className="eyebrow" style={css("margin:0")}>IBM data certificates · 8</p>
                  <div style={css("margin-top:16px;display:flex;flex-wrap:wrap;gap:6px")}>{(v.certs ?? []).map((ct: any, ct_i: number) => (<Fragment key={ct_i}><span className="tag">{ct.t}</span></Fragment>))}</div>
                </div></div>
              <div className="shell"><div className="core" style={css("padding:24px")}><p className="eyebrow" style={css("margin:0")}>Languages</p>
                  {(v.langs ?? []).map((lg: any, lg_i: number) => (<Fragment key={lg_i}><div style={css("margin-top:16px;display:flex;justify-content:space-between;gap:12px;align-items:baseline")}><p style={css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:22px")}>{lg.t}</p>
                      <p style={css("margin:0;font-size:14px;color:var(--muted)")}>{lg.s}</p>
                    </div></Fragment>))}
                </div></div>
            </div>
          </div></section>
        <footer style={css("padding:40px 24px 36px;box-shadow:inset 0 1px 0 var(--line)")}><div className="wrap" style={css("display:flex;flex-wrap:wrap;gap:32px 64px;justify-content:space-between")}><div style={css("max-width:320px")}><p style={css("margin:0;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:32px")}>oluwaseyi<span style={css("color:var(--accent)")}>.</span>
              </p>
              <p style={css("margin:8px 0 0;color:var(--muted);font-size:14px;line-height:1.6")}>Community, deals, data and code. Lagos, Nigeria.</p>
            </div>
            <div style={css("display:flex;gap:48px;flex-wrap:wrap")}><div style={css("display:flex;flex-direction:column")}><p style={css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)")}>Pages</p>
                <a className="flink" href="/work">Work</a>
                <a className="flink" href="/about">About</a>
                <a className="flink" href="/writing">Writing</a>
                <a className="flink" href="/contact">Contact</a>
              </div>
              <div style={css("display:flex;flex-direction:column")}><p style={css("margin:0 0 6px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint)")}>Elsewhere</p>
                <a className="flink" href="https://www.linkedin.com/in/oluwaseyi-o-601915b5/">LinkedIn</a>
                <a className="flink" href="https://github.com/shykeys-data">GitHub</a>
                <a className="flink" href="https://x.com/shykeys101">X</a>
                <a className="flink" href="https://t.me/oluwamichael">Telegram</a>
                <a className="flink" href="mailto:shykeys@gmail.com">Email</a>
              </div>
            </div>
          </div>
          <div className="wrap" style={css("margin-top:32px;display:flex;flex-wrap:wrap;gap:12px 24px;justify-content:space-between;color:var(--faint);font-size:13px")}><span>© 2026 Oluwaseyi Oshunwusi</span>
            <span style={css("display:flex;gap:20px;flex-wrap:wrap")}><a className="flink" href="/contact#privacy" style={css("font-size:13px;padding:0")}>Privacy</a></span>
          </div>
        </footer>
      </div></>
  );
}
