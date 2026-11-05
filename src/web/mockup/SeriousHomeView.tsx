// Generated from the approved mockup (SeriousHome.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function SeriousHomeView({ v }: { v: V }) {
  return (
    <><main ref={v.setRoot} className={v.rootCls} style={css("position:relative;background:transparent;color:#F3EFE7;font-family:'Geist',system-ui,sans-serif;min-height:100dvh;overflow-x:clip;width:100%;max-width:100%")}><div className="aurora" aria-hidden="true"><span className="au1" />
          <span className="au2" />
          <span className="au3" />
        </div>
        <div className="grain" aria-hidden="true" />
        <div aria-hidden="true" ref={v.setSpot} style={css("position:fixed;left:0;top:0;width:900px;height:900px;border-radius:50%;background:radial-gradient(circle,rgba(245,165,36,.085) 0%,rgba(245,165,36,.025) 38%,transparent 66%);pointer-events:none;z-index:0;transform:translate3d(-450px,-450px,0)")} />
        <svg aria-hidden="true" style={css("position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;opacity:.05")}><filter id="grain"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch" /></filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
        <div aria-hidden="true" className={v.ringCls} ref={v.setRing} />
        <div ref={v.setNav} style={css("position:fixed;top:18px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none;transition:transform 700ms var(--spring)")}><nav aria-label="Main" className="enter" style={css("pointer-events:auto;display:flex;align-items:center;gap:4px;padding:6px 6px 6px 18px;border-radius:999px;background:rgba(16,19,25,.62);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.09),0 20px 50px -20px rgba(0,0,0,.6)")}><a href="#top" style={css("display:inline-flex;align-items:center;gap:10px;text-decoration:none;color:#F3EFE7;font:400 24px/1 'Instrument Serif',serif;padding:4px 10px 4px 0")}><img src="/img/headshot.webp" alt="Oluwaseyi Oshunwusi" width="34" height="34" style={css("width:34px;height:34px;border-radius:50%;object-fit:cover;object-position:50% 30%;box-shadow:0 0 0 2px rgba(245,165,36,.55)")} />oluwaseyi<span style={css("color:#F5A524")}>.</span>
            </a>
            <span className="hide-sm" aria-hidden="true" style={css("position:relative;width:7px;height:7px;margin:0 8px 0 2px")}><span className="ping" />
              <span style={css("position:absolute;inset:0;border-radius:50%;background:#3DDC97")} />
            </span>
            <a className="navlink hide-sm" href="/work">Work</a>
            <a className="navlink hide-sm" href="/about">About</a>
            <a className="navlink hide-sm" href="/writing">Writing</a>
            <a className="navlink hide-sm" href="/contact">Contact</a>
            <a className="navlink" href="/?mode=playful" style={css("color:#F5A524")}>Playful</a>
            <button type="button" className={v.burgerCls} onClick={v.toggleMenu} aria-label={v.menuLabel} aria-expanded={v.menuOpen}><span />
              <span />
            </button>
          </nav></div>
        <div className={v.menuCls} aria-hidden={v.menuHidden}><div style={css("height:100%;display:flex;flex-direction:column;justify-content:center;padding:120px clamp(24px,8vw,120px) 64px;box-sizing:border-box")}><p className="ml" style={css("--i:0;margin:0 0 28px")}><span className="eyebrow">Where to</span></p>
            {(v.menuLinks ?? []).map((ml: any, ml_i: number) => (<Fragment key={ml_i}><a className="ml" href={ml.href} onClick={v.closeMenu} style={css(`--i:${ml.i ?? ''};color:#F3EFE7;text-decoration:none;font:400 clamp(44px,7vw,96px)/1.08 'Instrument Serif',serif;letter-spacing:-0.02em;padding:4px 0`)}>{ml.t}</a></Fragment>))}
            <p className="ml" style={css("--i:7;margin:40px 0 0;color:#A9AEB9;font-size:15px")}>Community · Business Development · Data · Ventures</p>
          </div></div>
        <div style={css("position:relative;z-index:1")}><section id="top" style={css("position:relative;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:128px 24px 72px;box-sizing:border-box;text-align:center;overflow:hidden")}><div aria-hidden="true" style={css("position:absolute;inset:0;pointer-events:none")}><div ref={v.setOrbA} style={css("position:absolute;top:-160px;right:-120px")}><div className="orb1" style={css("width:640px;height:640px;border-radius:50%;background:#F5A524;filter:blur(170px);opacity:.15")} /></div>
              <div ref={v.setOrbB} style={css("position:absolute;bottom:-160px;left:-160px")}><div className="orb2" style={css("width:520px;height:520px;border-radius:50%;background:#3DDC97;filter:blur(170px);opacity:.08")} /></div>
              <div className="gridbg" style={css("position:absolute;inset:0")} />
              <div style={css("position:absolute;left:50%;top:50%;width:min(130vw,1180px);aspect-ratio:1;transform:translate(-50%,-50%)")}><div className="spin" style={css("position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)")}><span style={css("position:absolute;top:-4px;left:50%;width:8px;height:8px;margin-left:-4px;border-radius:50%;background:#F5A524;box-shadow:0 0 24px rgba(245,165,36,.9)")} /></div>
                <div className="spin-rev" style={css("position:absolute;inset:14%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)")}><span style={css("position:absolute;bottom:12%;right:6%;width:6px;height:6px;border-radius:50%;background:#3DDC97;box-shadow:0 0 18px rgba(61,220,151,.9)")} /></div>
                <div className="spin" style={css("position:absolute;inset:30%;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.04)")} />
              </div>
              <div style={css("position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,rgba(7,8,11,0) 0%,rgba(7,8,11,.35) 60%,rgba(7,8,11,.55) 95%)")} />
            </div>
            <div style={css("position:relative;width:100%;max-width:1200px")}><p className="enter" style={css("margin:0;animation-delay:.15s")}><span className="eyebrow"><span className="hide-sm">Web3 community & growth · Built in Lagos, working across Africa</span>
                  <span className="show-sm">Web3 community & growth · Africa</span>
                </span></p>
              <h1 aria-label="Oluwaseyi Oshunwusi" style={css("margin:28px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(76px,12.5vw,196px);line-height:.88;letter-spacing:-0.03em")}><span aria-hidden="true" style={css("display:block;white-space:nowrap")}>{(v.letters ?? []).map((l: any, l_i: number) => (<Fragment key={l_i}><span className="mask"><span className="mask-up" style={css(`animation-delay:${l.d ?? ''}`)}>{l.ch}</span></span></Fragment>))}</span>
                <span aria-hidden="true" className="mask" style={css("display:block;font-style:italic;color:#8C929E;font-size:.42em;letter-spacing:-0.01em;margin-top:.06em")}><span className="mask-up" style={css("animation-delay:.65s")}>Oshunwusi</span></span>
              </h1>
              <svg className="underline" aria-hidden="true" viewBox="0 0 400 24" preserveAspectRatio="none" style={css("display:block;width:min(70%,560px);height:18px;margin:4px auto 0")}><path d="M2 16C80 6 180 4 260 9s110 8 136 2" pathLength="1" fill="none" stroke="#F5A524" strokeWidth="2.5" strokeLinecap="round" /></svg>
              <p className="enter" style={css("animation-delay:.95s;margin:34px auto 0;font-family:'Instrument Serif',serif;font-size:clamp(28px,3.2vw,42px);line-height:1.15;display:flex;flex-wrap:wrap;justify-content:center;gap:0 .28em;align-items:baseline")}><span>I</span>
                <span style={css("display:inline-grid;overflow:hidden;padding:0 .04em .1em 0;text-align:left")}>{(v.words ?? []).map((wd: any, wd_i: number) => (<Fragment key={wd_i}><span aria-hidden={wd.hid} style={css(`grid-area:1/1;font-style:italic;color:${v.accent ?? ''};white-space:nowrap;transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);${wd.st ?? ''}`)}>{wd.t}</span></Fragment>))}</span>
              </p>
              <p className="enter" style={css("animation-delay:1.1s;margin:20px auto 0;max-width:620px;font-size:18px;line-height:1.65;color:#A9AEB9")}>I help exchanges and Web3 projects win in Africa. At WEEX I grew the community from zero to 25,000+ in under a year and turned 7,000+ members into active futures traders. Before that, I helped launch Gate.io P2P in Nigeria.</p>
              <div className="enter" style={css("animation-delay:1.25s;display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:40px")}><a className="pbtn solid" href="#work" onPointerMove={v.magnet} onPointerLeave={v.unmagnet}><span className="mag">See the proof<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                        <path d="M8 7h9v9" />
                      </svg></span>
                  </span></a>
                <a className="pbtn ghost" href="/contact" onPointerMove={v.magnet} onPointerLeave={v.unmagnet}><span className="mag">Work with me<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </svg></span>
                  </span></a>
              </div>
            </div>
            <div aria-hidden="true" className="hide-sm" style={css("position:absolute;bottom:20px;left:50%;transform:translateX(-50%);width:1px;height:40px;background:rgba(255,255,255,.1);overflow:hidden")}><span className="cue" style={css("position:absolute;inset:0;background:#F5A524")} /></div>
          </section>
          <section aria-label="In a sentence" className="mf" style={css("view-timeline-name:--mf;padding:136px 24px 120px")}><div style={css("max-width:1200px;margin:0 auto")}><p data-r="" style={css("margin:0 0 36px")}><span className="eyebrow">In a sentence</span></p>
              <p className="mf-text">{(v.manifesto ?? []).map((tk: any, tk_i: number) => (<Fragment key={tk_i}><span className="w" style={css(`--p:${tk.p ?? ''}`)}>{tk.isWord ? (<>{tk.t}</>) : null}
                    {tk.isFace ? (<><span aria-hidden="true" style={css("display:inline-flex;align-items:center;justify-content:center;width:1.9em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;overflow:hidden;background:#1B1F27;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)")}><img src="/img/headshot.webp" alt="" style={css("width:100%;height:100%;object-fit:cover;object-position:50% 30%")} /></span></>) : null}
                    {tk.isChat ? (<><span aria-hidden="true" style={css("display:inline-flex;align-items:center;justify-content:center;gap:.12em;width:1.7em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#1A1F29;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)")}><span className="dt" />
                        <span className="dt" style={css("animation-delay:.15s")} />
                        <span className="dt" style={css("animation-delay:.3s")} />
                      </span></>) : null}
                    {tk.isDeal ? (<><span aria-hidden="true" style={css("display:inline-flex;align-items:center;justify-content:center;width:1.7em;height:.92em;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#1A1F29;box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)")}><svg viewBox="0 0 40 20" style={css("width:1.1em;height:.55em")}><circle cx="15" cy="10" r="7" fill="none" stroke="#F5A524" strokeWidth="2" />
                          <circle cx="25" cy="10" r="7" fill="none" stroke="#F3EFE7" strokeWidth="2" />
                        </svg></span></>) : null}
                    {tk.isChart ? (<><span aria-hidden="true" style={css("display:inline-flex;align-items:flex-end;justify-content:center;gap:.06em;width:1.7em;height:.92em;padding-bottom:.2em;box-sizing:border-box;margin:0 .18em .08em 0;vertical-align:middle;border-radius:999px;background:#0F2A20;box-shadow:inset 0 0 0 1px rgba(61,220,151,.3)")}><span className="bar" style={css("width:.12em;height:.4em;background:#3DDC97;border-radius:2px")} />
                        <span className="bar" style={css("width:.12em;height:.5em;background:#3DDC97;border-radius:2px;animation-delay:.2s")} />
                        <span className="bar" style={css("width:.12em;height:.35em;background:#3DDC97;border-radius:2px;animation-delay:.4s")} />
                        <span className="bar" style={css("width:.12em;height:.55em;background:#3DDC97;border-radius:2px;animation-delay:.6s")} />
                      </span></>) : null}
                  </span></Fragment>))}</p>
            </div></section>
          <section aria-labelledby="h-sides" style={css("padding:24px 24px 96px")}><div style={css("max-width:1200px;margin:0 auto")}><div style={css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px")}><div data-r=""><span className="eyebrow">Four disciplines</span>
                  <h2 id="h-sides" style={css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em")}>Four skills, <span style={css("font-style:italic;color:#8C929E")}>one outcome: growth.</span>
                  </h2>
                </div>
                <p data-r="" style={css("--i:1;margin:0;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9")}><span className="hide-sm">Hover or tap a side to open it.</span></p>
              </div>
              <div className="acc" data-r="" style={css("--i:2")} role="list">{(v.pillars ?? []).map((pl: any, pl_i: number) => (<Fragment key={pl_i}><div className="slice shell" role="listitem" tabIndex="0" onPointerEnter={pl.pick} onClick={pl.pick} onFocus={pl.pick} aria-expanded={pl.open} style={css(`flex-grow:${pl.grow ?? ''}`)}><div className="core" style={css(`background:${pl.bg ?? ''}`)}><span aria-hidden="true" className="pnum" style={css(`position:absolute;top:24px;left:28px;font:italic 400 72px/1 'Instrument Serif',serif;color:${pl.c ?? ''};opacity:.9`)}>{pl.n}</span>
                      <span className="vlabel" aria-hidden="true" style={css(`opacity:${pl.vOp ?? ''}`)}>{pl.t}</span>
                      <div className="full" style={css(`opacity:${pl.fOp ?? ''};transform:${pl.fTr ?? ''}`)}><h3 style={css("margin:0;font:400 clamp(30px,3vw,44px)/1.05 'Instrument Serif',serif")}>{pl.t}</h3>
                        <p style={css("margin:14px 0 18px;max-width:440px;font-size:16px;line-height:1.6;color:#C9CDD6")}>{pl.b}</p>
                        <div style={css("display:flex;flex-wrap:wrap;gap:6px")}>{(pl.tags ?? []).map((t: any, t_i: number) => (<Fragment key={t_i}><span className="tag">{t.t}</span></Fragment>))}</div>
                      </div>
                    </div></div></Fragment>))}</div>
            </div></section>
          <section id="work" aria-labelledby="h-work" style={css("padding:104px 24px 96px")}><div className="wsplit"><div className="pin" style={css("position:sticky;top:120px")}><div data-r=""><span className="eyebrow">Built and shipped</span>
                  <h2 id="h-work" style={css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em")}>Proof, <span style={css("font-style:italic;color:#8C929E")}>not promises.</span>
                  </h2>
                  <p style={css("margin:24px 0 32px;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9")}>Real numbers and live links. Start with these three.</p>
                </div>
                <div data-r="" style={css("--i:1")}><a className="pbtn solid" href="/work" onPointerMove={v.magnet} onPointerLeave={v.unmagnet}><span className="mag">See all 7 projects<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                          <path d="M8 7h9v9" />
                        </svg></span>
                    </span></a></div>
                <p data-r="" style={css("--i:2;margin:24px 0 0;font-size:13px;color:#8C929E")}>New public repos join the Work page automatically from <a href="https://github.com/shykeys-data" style={css("color:#F3EFE7")}>github.com/shykeys-data</a>
                </p>
              </div>
              <div className="wgrid">{(v.projects ?? []).map((p: any, p_i: number) => (<Fragment key={p_i}><a className="card shell" href={p.href} onPointerMove={v.glow} data-r=""><div className="core"><div className="cover-life cov" style={css(`position:relative;overflow:hidden;background:${p.coverBg ?? ''}99;box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)`)}><div className="zoom" style={css("position:absolute;inset:0;display:flex;align-items:flex-end;padding:22px 24px;box-sizing:border-box")}><span aria-hidden="true" style={css(`position:absolute;right:-40px;top:-40px;width:260px;height:260px;border-radius:50%;background:${p.color ?? ''};filter:blur(70px);opacity:.22`)} />
                          <span className="mk" style={css(`position:relative;font:400 clamp(34px,3.4vw,52px)/1 'Instrument Serif',serif;color:${p.color ?? ''};white-space:nowrap`)}>{p.mark}</span>
                        </div>
                        <span style={css("position:absolute;top:20px;left:24px")} className="tag">{p.label}</span>
                      </div>
                      <div className="cbody" style={css("position:relative;padding:20px 22px 22px;display:flex;align-items:flex-end;justify-content:space-between;gap:16px")}><div><h3 style={css("margin:0;font-size:19px;font-weight:500")}>{p.title}</h3>
                          <p style={css("margin:8px 0 12px;font-size:14px;line-height:1.55;color:#A9AEB9")}>{p.blurb}</p>
                          <div style={css("display:flex;flex-wrap:wrap;gap:6px")}>{(p.tags ?? []).map((t: any, t_i: number) => (<Fragment key={t_i}><span className="tag">{t.t}</span></Fragment>))}</div>
                        </div>
                        <span className="ic" aria-label={p.cta} style={css(`flex:none;width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06);color:${p.color ?? ''}`)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                            <path d="M8 7h9v9" />
                          </svg></span>
                      </div>
                    </div></a></Fragment>))}</div>
            </div></section>
          <section id="journey" aria-labelledby="h-journey" style={css("padding:104px 24px 88px")}><div className="wsplit"><div className="pin" style={css("position:sticky;top:120px")}><div data-r=""><span className="eyebrow">Twelve years on the web</span>
                  <h2 id="h-journey" style={css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em")}>The road <span style={css("font-style:italic;color:#8C929E")}>so far.</span>
                  </h2>
                  <p style={css("margin:24px 0 28px;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9")}>Twelve years of building audiences: first for Lagos businesses online, now for crypto exchanges across Africa.</p>
                </div>
                <div data-r="" style={css("--i:1")}><a className="pbtn ghost" href="/about" onPointerMove={v.magnet} onPointerLeave={v.unmagnet}><span className="mag">The full story<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                          <path d="M8 7h9v9" />
                        </svg></span>
                    </span></a></div>
              </div>
              <ol className="jlist" style={css("list-style:none;margin:0;padding:0;position:relative")}>{(v.jobs ?? []).map((jb: any, jb_i: number) => (<Fragment key={jb_i}><li className="job" data-r="" style={css(`--i:${jb.i ?? ''};position:relative;padding:0 0 ${jb.pad ?? ''} 40px`)}><span aria-hidden="true" className="jdot" style={css(`position:absolute;left:${jb.dl ?? ''};top:${jb.dt ?? ''};width:${jb.ds ?? ''};height:${jb.ds ?? ''};border-radius:50%;background:${jb.dot ?? ''};box-shadow:0 0 0 5px #07080B`)} />
                    {jb.full ? (<><p style={css(`margin:0;font:500 12px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${jb.c ?? ''}`)}>{jb.when}</p>
                      <h3 style={css("margin:6px 0 2px;font:400 clamp(24px,2.2vw,30px)/1.1 'Instrument Serif',serif")}>{jb.role}</h3>
                      <p style={css("margin:0 0 6px;font-size:14px;color:#C9CDD6")}>{jb.org}</p>
                      <p style={css("margin:0;max-width:540px;font-size:14px;line-height:1.6;color:#A9AEB9")}>{jb.note}</p>
                    </>) : null}
                    {jb.mini ? (<><div className="jmini"><p style={css("margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#8C929E")}>{jb.when}</p>
                        <p style={css("margin:0;font-size:15px;color:#E4E1DA")}>{jb.role} <span style={css("color:#8C929E")}>· {jb.org}</span>
                        </p>
                      </div></>) : null}
                  </li></Fragment>))}</ol>
              <a href="/about" style={css("display:inline-block;margin:4px 0 0 40px;color:#F3EFE7;font-size:15px;text-underline-offset:4px")}>Six more roles, back to 2014 →</a>
            </div></section>
          <section id="rhythm" aria-labelledby="h-rhythm" style={css("padding:104px 24px 88px")}><div style={css("max-width:1200px;margin:0 auto")}><div style={css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px")}><div data-r=""><span className="eyebrow">Live from the group</span>
                  <h2 id="h-rhythm" style={css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em")}>A community that runs <span style={css("font-style:italic;color:#8C929E")}>on rhythm.</span>
                  </h2>
                </div>
                <p data-r="" style={css("--i:1;margin:0;max-width:400px;font-size:17px;line-height:1.65;color:#A9AEB9")}>WEEX Africa (Official) on Telegram. Today is marked in WAT; tap any day.</p>
              </div>
              <div className="bento" ref={v.setStats}><div className="b-a shell" data-r=""><div className="core" style={css("display:flex;flex-direction:column")}><div role="group" aria-label="Day of the week" style={css("position:relative;display:grid;grid-template-columns:repeat(7,minmax(0,1fr));padding:8px;box-shadow:inset 0 -1px 0 rgba(255,255,255,.06)")}><span aria-hidden="true" style={css(`position:absolute;top:8px;bottom:8px;left:8px;width:calc((100% - 16px) / 7);border-radius:14px;background:rgba(255,255,255,.07);transform:translateX(${v.selX ?? ''});transition:transform 700ms var(--spring)`)} />
                      {(v.days ?? []).map((dy: any, dy_i: number) => (<Fragment key={dy_i}><button type="button" className="daybtn" onClick={dy.pick} aria-pressed={dy.pressed} style={css(`color:${dy.col ?? ''}`)}>{dy.short}{dy.today ? (<><span aria-label="today" style={css("display:block;width:5px;height:5px;margin:3px auto 0;border-radius:50%;background:#3DDC97")} /></>) : null}
                        </button></Fragment>))}
                    </div>
                    <div style={css("flex:1;display:grid;padding:clamp(22px,3vw,36px)")}>{(v.panels ?? []).map((pn: any, pn_i: number) => (<Fragment key={pn_i}><div aria-hidden={pn.hid} style={css(`grid-area:1/1;${pn.st ?? ''}`)}><div style={css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:24px")}><h3 style={css("margin:0;font:400 clamp(34px,3.6vw,50px)/1 'Instrument Serif',serif")}>{pn.name}</h3>
                            <span style={css(`font:500 11px 'Geist',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${pn.badgeC ?? ''}`)}>{pn.badge}</span>
                          </div>
                          <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,190px),1fr));gap:10px")}>{(pn.items ?? []).map((it: any, it_i: number) => (<Fragment key={it_i}><div style={css("padding:18px;border-radius:18px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.05)")}><p style={css(`margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${it.c ?? ''}`)}>{it.when}</p>
                                <p style={css("margin:10px 0 6px;font-size:17px;font-weight:500")}>{it.name}</p>
                                <p style={css("margin:0;font-size:14px;line-height:1.55;color:#A9AEB9")}>{it.note}</p>
                              </div></Fragment>))}</div>
                        </div></Fragment>))}</div>
                  </div></div>
                <div className="b-s shell stat" data-r="" style={css("--i:1")}><div className="core" style={css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px")}><span className="eyebrow" style={css("align-self:flex-start")}>Data</span>
                    <div><p className="num" style={css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums")}>{v.n1}<span style={css("color:#3DDC97")}>k</span>
                      </p>
                      <p style={css("margin:10px 0 0;font-size:15px;color:#A9AEB9")}>e-commerce orders analysed</p>
                    </div>
                  </div></div>
                <div className="b-s shell stat" data-r="" style={css("--i:2")}><div className="core" style={css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px")}><span className="eyebrow" style={css("align-self:flex-start")}>Community</span>
                    <div><p className="num" style={css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums")}>{v.n2}<span style={css("color:#F5A524")}>k+</span>
                      </p>
                      <p style={css("margin:10px 0 0;font-size:15px;color:#A9AEB9")}>WEEX members, from zero in under 12 months</p>
                    </div>
                  </div></div>
                <div className="b-s shell stat" data-r=""><div className="core" style={css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px")}><span className="eyebrow" style={css("align-self:flex-start")}>Activation</span>
                    <div><p className="num" style={css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums")}>{v.n3}<span style={css("color:#F5A524")}>k+</span>
                      </p>
                      <p style={css("margin:10px 0 0;font-size:15px;color:#A9AEB9")}>members turned futures traders through live classes</p>
                    </div>
                  </div></div>
                <div className="b-s shell stat" data-r="" style={css("--i:1")}><div className="core" style={css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px")}><span className="eyebrow" style={css("align-self:flex-start")}>Since 2014</span>
                    <div><p className="num" style={css("margin:0;font:400 clamp(64px,6vw,92px)/1 'Instrument Serif',serif;font-variant-numeric:tabular-nums")}>{v.n4}<span style={css("color:#F5A524")}> yrs</span>
                      </p>
                      <p style={css("margin:10px 0 0;font-size:15px;color:#A9AEB9")}>building for the web</p>
                    </div>
                  </div></div>
                <div className="b-s shell wide" data-r="" style={css("--i:2")}><div className="core" style={css("padding:28px;display:flex;flex-direction:column;justify-content:space-between;gap:24px;min-height:200px")}><span className="eyebrow" style={css("align-self:flex-start")}>On my desk</span>
                    <div aria-live="polite" style={css("display:grid;overflow:hidden")}>{(v.ticker ?? []).map((tk: any, tk_i: number) => (<Fragment key={tk_i}><div aria-hidden={tk.hid} style={css(`grid-area:1/1;transition:opacity 700ms var(--spring),transform 800ms var(--spring),filter 700ms var(--spring);${tk.st ?? ''}`)}><p style={css(`margin:0;font:500 11px 'Geist',sans-serif;letter-spacing:.14em;text-transform:uppercase;color:${tk.c ?? ''}`)}>{tk.k}</p>
                          <p style={css("margin:10px 0 0;font:400 30px/1.1 'Instrument Serif',serif")}>{tk.v}</p>
                        </div></Fragment>))}</div>
                  </div></div>
              </div>
            </div></section>
          <section aria-label="Programs" className="marquee" style={css("padding:24px 0 96px;display:flex;flex-direction:column;gap:14px;overflow:hidden;-webkit-mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent);mask-image:linear-gradient(90deg,transparent,#000 10%,#000 90%,transparent)")}><div className="marquee-track" style={css("display:flex;gap:14px;width:max-content")}>{(v.marquee ?? []).map((m: any, m_i: number) => (<Fragment key={m_i}><span style={css("display:inline-flex;align-items:center;gap:12px;padding:16px 24px;border-radius:999px;background:rgba(255,255,255,.03);box-shadow:inset 0 0 0 1px rgba(255,255,255,.07);font-size:16px;color:#E3E0D8;white-space:nowrap")}><span style={css("width:6px;height:6px;border-radius:50%;background:#F5A524")} />{m.t}</span></Fragment>))}</div>
            <div className="marquee-rev" style={css("display:flex;gap:28px;width:max-content")}>{(v.marquee2 ?? []).map((m: any, m_i: number) => (<Fragment key={m_i}><span style={css("display:inline-flex;align-items:center;gap:28px;font:italic 400 clamp(32px,4vw,56px) 'Instrument Serif',serif;color:#4A505C;white-space:nowrap")}>{m.t}<span style={css("color:#F5A524;font-style:normal;font-size:.5em")}>✦</span>
                </span></Fragment>))}</div>
          </section>
          <section id="writing" aria-labelledby="h-writing" style={css("padding:88px 24px 104px")}><div style={css("max-width:1200px;margin:0 auto")}><div style={css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:flex-end;gap:24px;margin-bottom:48px")}><div data-r=""><span className="eyebrow">Notes from the work</span>
                  <h2 id="h-writing" style={css("margin:20px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(44px,5.5vw,80px);line-height:1;letter-spacing:-0.02em")}>Thinking <span style={css("font-style:italic;color:#8C929E")}>out loud.</span>
                  </h2>
                </div>
                <a data-r="" className="pbtn ghost" href="/writing" onPointerMove={v.magnet} onPointerLeave={v.unmagnet} style={css("--i:1")}><span className="mag">All writing<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14" />
                        <path d="M13 6l6 6-6 6" />
                      </svg></span>
                  </span></a>
              </div>
              <div className="hscroll">{(v.posts ?? []).map((po: any, po_i: number) => (<Fragment key={po_i}><a className="card shell" href={po.href} onPointerMove={v.glow} data-r="" style={css(`--i:${po.i ?? ''}`)}><div className="core" style={css("display:flex;flex-direction:column;gap:20px;min-height:250px;padding:26px")}><div style={css("position:relative;display:flex;justify-content:space-between;align-items:center")}><span className="tag" style={css(`color:${po.c ?? ''}`)}>{po.tag}</span>
                        <span style={css("font-size:12px;color:#6E7480")}>On LinkedIn</span>
                      </div>
                      <h3 style={css("position:relative;margin:0;font:400 34px/1.08 'Instrument Serif',serif")}>{po.t}</h3>
                      <span style={css("position:relative;margin-top:auto;display:flex;align-items:center;justify-content:space-between;color:#C9CDD6;font-size:14px")}>Read<span className="ic" style={css("width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.06)")}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                            <path d="M8 7h9v9" />
                          </svg></span>
                      </span>
                    </div></a></Fragment>))}</div>
            </div></section>
          <section id="contact" aria-labelledby="h-contact" style={css("position:relative;padding:120px 24px 96px;overflow:hidden")}><div aria-hidden="true" style={css("position:absolute;left:50%;top:0;transform:translateX(-50%)")}><div className="orb1" style={css("width:820px;height:520px;border-radius:50%;background:#F5A524;filter:blur(190px);opacity:.12")} /></div>
            <div style={css("position:relative;max-width:1200px;margin:0 auto")}><div style={css("text-align:center")}><p data-r="" style={css("margin:0")}><span className="eyebrow">Open for conversations</span></p>
                <h2 id="h-contact" data-r="" style={css("--i:1;margin:24px 0 0;font-family:'Instrument Serif',serif;font-weight:400;font-size:clamp(64px,10vw,168px);line-height:.92;letter-spacing:-0.03em")}>Let’s grow <span style={css("font-style:italic;color:#F5A524")}>something.</span>
                </h2>
                <p data-r="" style={css("--i:2;margin:24px auto 0;max-width:520px;font-size:18px;line-height:1.65;color:#A9AEB9")}>Hiring for community or growth? Bringing a product to Africa? Planning an AMA or campaign? Tell me what you’re working on. Messages come straight to my phone.</p>
              </div>
              <div className="shell" data-r="" style={css("--i:3;margin-top:64px")}><div className="core" style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:48px;padding:clamp(24px,4vw,48px)")}>{v.form_0}
                  <div><p style={css("margin:0 0 8px;font:500 11px 'Geist',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:#A9AEB9")}>Or find me</p>
                    <a className="lrow" href="mailto:shykeys@gmail.com"><span className="lr">shykeys@gmail.com</span>
                      <span className="ic" aria-hidden="true">↗</span>
                    </a>
                    <a className="lrow" href="https://www.linkedin.com/in/oluwaseyi-o-601915b5"><span className="lr">LinkedIn</span>
                      <span className="ic" aria-hidden="true">↗</span>
                    </a>
                    <a className="lrow" href="https://github.com/shykeys-data"><span className="lr">GitHub</span>
                      <span className="ic" aria-hidden="true">↗</span>
                    </a>
                    <a className="lrow" href="https://t.me/oluwamichael"><span className="lr">Telegram <span style={css("color:#8C929E;font-size:14px;margin-left:6px")}>@oluwamichael</span>
                      </span>
                      <span className="ic" aria-hidden="true">↗</span>
                    </a>
                    <a className="lrow" href="https://x.com/shykeys101"><span className="lr">X <span style={css("color:#8C929E;font-size:14px;margin-left:6px")}>@shykeys101</span>
                      </span>
                      <span className="ic" aria-hidden="true">↗</span>
                    </a>
                  </div>
                </div></div>
            </div>
          </section>
          <footer style={css("padding:40px 24px 32px;overflow:hidden")}><div style={css("max-width:1200px;margin:0 auto")}><p data-r="" aria-hidden="true" style={css("margin:0;font-family:'Instrument Serif',serif;font-size:clamp(72px,18vw,264px);line-height:.85;letter-spacing:-0.035em;white-space:nowrap;text-align:center")}>Oluwaseyi<span style={css("color:#F5A524")}>.</span>
              </p>
              <div style={css("display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:16px;margin-top:40px;font-size:14px;color:#8C929E")}><span>© 2026 Oluwaseyi Oshunwusi · Lagos, Nigeria</span>
                <span>Built on MongoDB, Express, React and Node</span>
                <span style={css("display:flex;gap:6px")}><a className="navlink" href="#top">Back to top</a></span>
              </div>
            </div></footer>
        </div>
        {v.showToast ? (<><div style={css("position:fixed;left:0;right:0;bottom:20px;z-index:85;display:flex;justify-content:center;padding:0 16px;pointer-events:none")}><div className="toast" role="status" style={css("pointer-events:auto;display:flex;align-items:center;gap:12px;max-width:100%;box-sizing:border-box;padding:6px 6px 6px 20px;border-radius:999px;background:rgba(16,19,25,.92);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 24px 48px -20px rgba(0,0,0,.8);font:400 14px 'Geist',sans-serif;color:#C9CDD6")}><span>After dark it's the serious side. Prefer the fun one?</span>
              <a href="/?mode=playful" style={css("flex:none;display:inline-flex;align-items:center;min-height:40px;padding:0 16px;border-radius:999px;background:#F5A524;color:#07080B;font-weight:500;text-decoration:none")}>Playful mode</a>
              <button type="button" aria-label="Dismiss" onClick={v.hideToast} style={css("flex:none;width:40px;height:40px;border-radius:50%;border:0;background:rgba(255,255,255,.06);color:#F3EFE7;font:400 18px 'Geist',sans-serif;cursor:pointer")}>×</button>
            </div></div></>) : null}
      </main></>
  );
}
