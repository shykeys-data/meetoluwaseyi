// Generated from the approved mockup (CaseStudy.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function CaseStudyView({ v }: { v: V }) {
  return (
    <><main ref={v.setRoot} className={v.rootCls} data-theme={v.theme} style={css("position:relative;background:transparent;color:var(--ink);font-family:var(--body);min-height:100dvh;overflow-x:clip")}><div className="aurora" aria-hidden="true"><span className="au1" />
          <span className="au2" />
          <span className="au3" />
        </div>
        <div className="grain" aria-hidden="true" />
        <div style={css("position:fixed;top:18px;left:0;right:0;z-index:80;display:flex;justify-content:center;padding:0 16px;pointer-events:none")}><nav aria-label="Main" className="enter" style={css("position:relative;pointer-events:auto;display:flex;align-items:center;gap:4px;padding:6px 6px 6px 18px;border-radius:999px;background:var(--navbg);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(var(--l),.09),0 20px 50px -20px rgba(0,0,0,.6);overflow:hidden")}><span aria-hidden="true" className="readbar" style={css("position:absolute;left:0;right:0;bottom:0;height:2px;background:var(--g)")} />
            <a href={v.homeHref} style={css("text-decoration:none;color:var(--ink);font:var(--dw) 24px/1 var(--display);padding:8px 10px 8px 0")}>oluwaseyi<span style={css("color:var(--a)")}>.</span>
            </a>
            <a className="navlink" href="/work">{v.workLabel}</a>
            <a className="navlink hide-sm" href="https://github.com/shykeys-data/olist-ecommerce-bi">Code</a>
            <a className="pbtn ghost" href="/contact" style={css("min-height:44px;padding:0 18px;font-size:14px")}>{v.talkLabel}</a>
            <button type="button" className="navlink" onClick={v.toggleTheme} aria-label={v.switchLabel} style={css("border:0;background:transparent;cursor:pointer;font:500 14px var(--body);color:var(--a)")}>{v.switchText}</button>
          </nav></div>
        <section style={css("position:relative;padding:140px 24px 64px;overflow:hidden")} id="main-content"><div aria-hidden="true" style={css("position:absolute;top:-200px;right:-160px")}><div className="orb" style={css("width:640px;height:640px;border-radius:50%;background:var(--g);filter:blur(170px);opacity:.12")} /></div>
          <div style={css("position:relative;max-width:1200px;margin:0 auto")}><p className="enter" style={css("margin:0;animation-delay:.1s")}><span className="eyebrow">Data & BI · Case study · Olist</span></p>
            <h1 aria-label="Late parcels, early reviews." style={css("margin:26px 0 0;font-family:var(--display);font-weight:var(--dw);font-size:clamp(60px,9vw,140px);line-height:.92;letter-spacing:-0.03em")}><span className="mask" style={css("display:block")}><span className="mask-up" aria-hidden="true" style={css("animation-delay:.15s")}>Late parcels,</span></span>
              <span className="mask" style={css("display:block;font-style:italic;color:var(--g)")}><span className="mask-up" aria-hidden="true" style={css("animation-delay:.3s")}>early reviews.</span></span>
            </h1>
            <p className="enter" style={css("margin:28px 0 0;max-width:640px;font-size:19px;line-height:1.6;color:var(--muted);animation-delay:.6s")}>An end-to-end Python BI project on 99,441 real orders from Olist, Brazil’s largest marketplace. Four weeks, from nine messy CSV files to a live dashboard and an executive report.</p>
            <div className="enter mgrid" style={css("animation-delay:.75s;margin-top:40px;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:12px")}>{(v.meta ?? []).map((m: any, m_i: number) => (<Fragment key={m_i}><div className="shell"><div className="core" style={css("padding:20px 22px")}><p style={css("margin:0;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--faint2)")}>{m.k}</p>
                    <p style={css("margin:8px 0 0;font-size:15px;line-height:1.5")}>{m.v}</p>
                  </div></div></Fragment>))}</div>
          </div>
        </section>
        <section aria-labelledby="h-numbers" style={css("padding:40px 24px 80px")}><div style={css("max-width:1200px;margin:0 auto")}><h2 id="h-numbers" data-r="" style={css("margin:0 0 28px;font:var(--dw) clamp(36px,4vw,56px)/1 var(--display)")}>The numbers, <span style={css("font-style:italic;color:var(--faint)")}>quality-checked.</span>
            </h2>
            <div className="kgrid" style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,200px),1fr));gap:12px")}>{(v.kpis ?? []).map((kp: any, kp_i: number) => (<Fragment key={kp_i}><div className="shell" data-r="" style={css(`--i:${kp.i ?? ''}`)}><div className="core kcore" style={css("padding:22px;min-height:136px;display:flex;flex-direction:column;justify-content:space-between")}><p style={css("margin:0;font-size:13px;color:var(--muted)")}>{kp.l}</p>
                    <p style={css(`margin:16px 0 0;font:var(--dw) clamp(34px,3.2vw,48px)/1 var(--display);color:${kp.c ?? ''};white-space:nowrap`)} className="kv">{kp.v}</p>
                  </div></div></Fragment>))}</div>
          </div></section>
        <section aria-labelledby="h-chart" style={css("padding:40px 24px 80px")}><div style={css("max-width:1200px;margin:0 auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,380px),1fr));gap:40px;align-items:center")}><div data-r=""><span className="eyebrow">The headline finding</span>
              <h2 id="h-chart" style={css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em")}>Customers weren’t rating the product. <span style={css("font-style:italic;color:var(--g)")}>They were rating the wait.</span>
              </h2>
              <p style={css("margin:22px 0 0;max-width:460px;font-size:17px;line-height:1.65;color:var(--muted)")}>74% of reviews on late orders were written before the parcel even arrived. Even after delivery, late orders still score lower.</p>
            </div>
            <div className="shell" data-r="" style={css("--i:1")}><div className="core" ref={v.setBars} style={css("padding:clamp(22px,3vw,36px)")}><p style={css("margin:0 0 24px;font:500 11px var(--body);letter-spacing:.16em;text-transform:uppercase;color:var(--muted)")}>Average review score, out of 5</p>
                {(v.ratings ?? []).map((rt: any, rt_i: number) => (<Fragment key={rt_i}><div style={css("margin-bottom:22px")}><div style={css("display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px")}><span style={css("font-size:15px")}>{rt.l}</span>
                      <span style={css(`font:var(--dw) 30px/1 var(--display);color:${rt.c ?? ''}`)}>{rt.v}★</span>
                    </div>
                    <div style={css("height:14px;border-radius:999px;background:rgba(var(--l),.06);overflow:hidden")}><div className="bar" style={css(`width:${rt.w ?? ''};height:100%;border-radius:999px;background:${rt.c ?? ''};transition-delay:${rt.d ?? ''}`)} /></div>
                  </div></Fragment>))}
                <p style={css("margin:6px 0 0;font-size:13px;color:var(--faint2)")}>Source: Olist public dataset, my analysis (Weeks 2 and 2.1)</p>
              </div></div>
          </div></section>
        <section aria-labelledby="h-weeks" style={css("padding:40px 24px 80px")}><div style={css("max-width:1200px;margin:0 auto")}><div data-r="" style={css("margin-bottom:32px")}><span className="eyebrow">How I built it</span>
              <h2 id="h-weeks" style={css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em")}>Four weeks, <span style={css("font-style:italic;color:var(--faint)")}>five steps.</span>
              </h2>
            </div>
            <div className="pgrid" data-r="" style={css("--i:1;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:10px")} role="group" aria-label="Project steps">{(v.phases ?? []).map((ph: any, ph_i: number) => (<Fragment key={ph_i}><button type="button" className="phase" onClick={ph.pick} aria-pressed={ph.pressed} style={css(`padding:18px 20px;border-radius:20px;${ph.style ?? ''}`)}><span style={css("display:block;font:500 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--g)")}>{ph.w}</span>
                  <span style={css("display:block;margin-top:8px;font:var(--dw) 24px/1.1 var(--display)")}>{ph.t}</span>
                </button></Fragment>))}</div>
            <div className="shell" data-r="" style={css("--i:2;margin-top:14px")}><div className="core" style={css("display:grid;padding:clamp(24px,4vw,44px)")}>{(v.phases ?? []).map((ph: any, ph_i: number) => (<Fragment key={ph_i}><div aria-hidden={ph.hid} style={css(`grid-area:1/1;${ph.panel ?? ''}`)}><p style={css("margin:0;font:500 11px var(--body);letter-spacing:.14em;text-transform:uppercase;color:var(--g)")}>{ph.w}</p>
                    <h3 style={css("margin:10px 0 18px;font:var(--dw) clamp(30px,3.4vw,46px)/1.05 var(--display)")}>{ph.t}</h3>
                    <ul style={css("margin:0;padding:0;list-style:none;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:10px")}>{(ph.items ?? []).map((it: any, it_i: number) => (<Fragment key={it_i}><li style={css("padding:16px 18px;border-radius:16px;background:rgba(var(--l),.03);box-shadow:inset 0 0 0 1px rgba(var(--l),.06);font-size:15px;line-height:1.55;color:var(--soft)")}>{it.t}</li></Fragment>))}</ul>
                  </div></Fragment>))}</div></div>
          </div></section>
        <section aria-labelledby="h-recs" style={css("padding:40px 24px 80px")}><div style={css("max-width:1200px;margin:0 auto")}><div data-r="" style={css("margin-bottom:32px")}><span className="eyebrow">What Olist should do</span>
              <h2 id="h-recs" style={css("margin:20px 0 0;font:var(--dw) clamp(40px,5vw,72px)/1 var(--display);letter-spacing:-0.02em")}>Four recommendations.</h2>
            </div>
            <div style={css("display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:12px")}>{(v.recs ?? []).map((rc: any, rc_i: number) => (<Fragment key={rc_i}><div className="shell" data-r="" style={css(`--i:${rc.i ?? ''}`)}><div className="core" style={css("padding:26px;min-height:240px;display:flex;flex-direction:column")}><p style={css("margin:0;font:var(--dw) clamp(44px,4.5vw,64px)/1 var(--display);color:var(--g)")}>{rc.v}</p>
                    <h3 style={css("margin:18px 0 8px;font-size:18px;font-weight:500")}>{rc.t}</h3>
                    <p style={css("margin:0;font-size:15px;line-height:1.6;color:var(--muted)")}>{rc.b}</p>
                  </div></div></Fragment>))}</div>
          </div></section>
        <section aria-labelledby="h-honest" style={css("padding:48px 24px 112px")}><div className="shell" data-r="" style={css("max-width:1200px;margin:0 auto")}><div className="core" style={css("padding:clamp(24px,4vw,56px);display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:40px")}><div><span className="eyebrow">What didn’t survive</span>
                <h2 id="h-honest" style={css("margin:20px 0 0;font:var(--dw) clamp(36px,4vw,56px)/1.05 var(--display)")}>A finding isn’t a finding until you’ve tried to <span style={css("font-style:italic;color:var(--g)")}>break it.</span>
                </h2>
                <p style={css("margin:20px 0 0;font-size:16px;line-height:1.65;color:var(--muted)")}>Before moving on, I ran 7 checks designed to break my own conclusions. Two findings were revised in public.</p>
              </div>
              <div style={css("display:flex;flex-direction:column;gap:12px")}>{(v.revised ?? []).map((rv: any, rv_i: number) => (<Fragment key={rv_i}><div style={css("padding:20px;border-radius:20px;background:rgba(var(--l),.03);box-shadow:inset 0 0 0 1px rgba(var(--l),.06)")}><p style={css("margin:0;font-size:15px;color:var(--faint);text-decoration:line-through")}>{rv.was}</p>
                    <p style={css("margin:10px 0 0;font-size:16px;line-height:1.55")}>{rv.now}</p>
                  </div></Fragment>))}</div>
            </div></div>
          <div data-r="" style={css("max-width:1200px;margin:28px auto 0;display:flex;flex-wrap:wrap;gap:12px")}><a className="pbtn solid" href="https://github.com/shykeys-data/olist-ecommerce-bi">Code & report<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg></span>
            </a>
            <a className="pbtn ghost" href="https://www.linkedin.com/in/oluwaseyi-o-601915b5/recent-activity/all/">Follow the weekly posts<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg></span>
            </a>
            <a className="pbtn ghost" href="https://olist-bi-shykeys.streamlit.app">Live dashboard<span className="ic"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7" />
                  <path d="M8 7h9v9" />
                </svg></span>
            </a>
          </div>
        </section>
        <a className="next" href="/work" style={css("display:block;padding:96px 24px;text-decoration:none;color:var(--ink);box-shadow:inset 0 1px 0 rgba(var(--l),.06)")}><div style={css("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:24px")}><div><span className="eyebrow">Next project</span>
              <p className="big" style={css("margin:18px 0 0;font:var(--dw) clamp(52px,8vw,112px)/1 var(--display)")}>Korrect <span style={css("font-style:italic;color:var(--a)")}>Cars</span> →</p>
            </div>
            <p style={css("margin:0;max-width:360px;font-size:16px;line-height:1.6;color:var(--muted)")}>A digital-first car marketplace for Nigeria: buy, sell or exchange.</p>
          </div></a>
        <footer style={css("padding:28px 24px;font-size:14px;color:var(--faint)")}><div style={css("max-width:1200px;margin:0 auto;display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px")}><span>© 2026 Oluwaseyi Oshunwusi · Lagos, Nigeria</span>
            <a className="navlink" href="/">Back to home</a>
          </div></footer>
      </main></>
  );
}
