// Generated from the approved mockup (Work.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function WorkView({ v }: { v: V }) {
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
        <section style={css("padding:140px 24px 40px")} id="main-content"><div className="wrap"><p className="enter" style={css("margin:0")}><span className="eyebrow">{v.workEyebrow}</span></p>
            <h1 className="h1 enter" style={css("animation-delay:.08s")}>Proof, <span className="em">not promises.</span>
            </h1>
            <p className="lead enter" style={css("animation-delay:.16s")}>Communities grown, products shipped and data put to work. Every card has real numbers and a live link.</p>
            <div className="enter" style={css("animation-delay:.24s;margin-top:28px;display:flex;flex-wrap:wrap;align-items:center;gap:8px")} role="group" aria-label="Filter work">{(v.filters ?? []).map((f: any, f_i: number) => (<Fragment key={f_i}><button type="button" className="chip" onClick={f.pick} aria-pressed={f.pressed} style={css(`${f.style ?? ''}`)}>{f.label} <span style={css("opacity:.6")}>{f.count}</span>
                </button></Fragment>))}</div>
            <p className="enter" style={css("animation-delay:.3s;margin:18px 0 0;display:flex;align-items:center;gap:10px;font-size:13px;color:var(--faint)")}><span aria-hidden="true" style={css("width:8px;height:8px;border-radius:50%;background:var(--accent2)")} />Synced daily from <a href="https://github.com/shykeys-data" style={css("color:var(--ink)")}>github.com/shykeys-data</a> · last sync today, 06:00 WAT</p>
          </div></section>
        <section style={css("padding:24px 24px 104px")}>{v.empty}<div className="wrap wgrid">{(v.projects ?? []).map((p: any, p_i: number) => (<Fragment key={p_i}><article className={`card shell ${p.cls ?? ''}`}><div className="core" style={css("display:flex;flex-direction:column")}><div style={css(`position:relative;height:${p.coverH ?? ''};overflow:hidden;background:${p.cover ?? ''};display:flex;align-items:flex-end;padding:20px 22px;box-sizing:border-box`)}><span aria-hidden="true" style={css(`position:absolute;right:-50px;top:-50px;width:220px;height:220px;border-radius:50%;background:${p.color ?? ''};filter:blur(60px);opacity:.35`)} />
                    <span className="tag" style={css("position:absolute;top:16px;left:18px")}>{p.label}</span>
                    {p.synced ? (<><span className="tag" style={css("position:absolute;top:16px;right:18px")}>From GitHub</span></>) : null}
                    <span style={css(`position:relative;font-family:var(--display);font-weight:var(--dw);letter-spacing:var(--dls);font-size:clamp(32px,3.2vw,46px);line-height:1;color:${p.markInk ?? ''};white-space:nowrap`)}>{p.mark}</span>
                  </div>
                  <div style={css("padding:20px 22px 22px;display:flex;flex-direction:column;gap:10px;flex:1")}><h2 style={css("margin:0;font:600 20px var(--body);letter-spacing:-0.01em")}>{p.title}</h2>
                    <p style={css("margin:0;font-size:15px;line-height:1.55;color:var(--muted)")}>{p.blurb}</p>
                    <div style={css("display:flex;flex-wrap:wrap;gap:6px;margin-top:2px")}>{(p.tags ?? []).map((t: any, t_i: number) => (<Fragment key={t_i}><span className="tag">{t.t}</span></Fragment>))}</div>
                    <div style={css("margin-top:auto;padding-top:10px;display:flex;flex-wrap:wrap;gap:8px")}>{(p.links ?? []).map((lk: any, lk_i: number) => (<Fragment key={lk_i}><a className={`pbtn ${lk.cls ?? ''}`} href={lk.href} style={css("min-height:44px;padding:3px 3px 3px 16px;font-size:14px")}>{lk.label}<span className="ic" style={css("width:36px;height:36px")}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                              <path d="M8 7h9v9" />
                            </svg></span>
                        </a></Fragment>))}
                      {p.noLinks ? (<><span style={css("font-size:14px;color:var(--faint)")}>{p.status}</span></>) : null}
                    </div>
                  </div>
                </div></article></Fragment>))}</div></section>
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
