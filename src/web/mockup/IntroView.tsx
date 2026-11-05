/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated from the approved mockup (Intro.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function IntroView({ v }: { v: V }) {
  return (
    <><div className={v.rootCls} style={css("position:relative;min-height:100vh;overflow:hidden;background:#FFF6E5;color:#1B1A2E;font-family:'DM Sans',sans-serif")}><a className="sr-only" ref={v.setDay} href="/" tabIndex="-1" aria-hidden="true">Playful home</a>
        <div aria-hidden="true" style={css("position:absolute;inset:0;background-color:#FFF6E5;background-image:radial-gradient(rgba(27,26,46,.09) 1.3px,transparent 1.3px);background-size:24px 24px")} />
        <p className="enter" style={css("position:absolute;inset:0;margin:0;display:flex;align-items:center;justify-content:center;font:700 clamp(28px,3vw,40px) 'Caveat',cursive;color:#1B1A2E")}>taking you in…</p>
        {v.introShow ? (<><div className={`intro ${v.introCls ?? ''}`} style={css(`position:fixed;inset:0;z-index:20;${v.introBg ?? ''};background-size:24px 24px;display:flex;align-items:center;justify-content:center;overflow:hidden`)}>{v.isNight ? (<><div aria-hidden="true" style={css("position:absolute;inset:0")}>{(v.stars ?? []).map((st: any, st_i: number) => (<Fragment key={st_i}><span className="star" style={css(`position:absolute;top:${st.y ?? ''};left:${st.x ?? ''};width:${st.s ?? ''};height:${st.s ?? ''};border-radius:50%;background:${st.c ?? ''};animation-delay:${st.d ?? ''}`)} /></Fragment>))}</div>
              <div aria-hidden="true" style={css("position:absolute;inset:0;display:flex;align-items:center;justify-content:center")}><div className="intro-sun" style={css("position:relative;width:clamp(240px,36vw,480px);aspect-ratio:1")}><div style={css("position:absolute;inset:-14%;border-radius:50%;background:radial-gradient(circle,rgba(255,210,63,.22),transparent 68%)")} />
                  <div style={css("position:absolute;inset:0;border-radius:50%;background:#FFF1C9;border:4px solid #0E0F1F;box-shadow:12px 12px 0 #FFD23F;overflow:hidden")}><span style={css("position:absolute;top:20%;left:24%;width:20%;height:20%;border-radius:50%;background:#F1DFA6")} />
                    <span style={css("position:absolute;top:58%;left:56%;width:14%;height:14%;border-radius:50%;background:#F1DFA6")} />
                    <span style={css("position:absolute;top:34%;left:64%;width:9%;height:9%;border-radius:50%;background:#F1DFA6")} />
                    <span style={css("position:absolute;top:66%;left:22%;width:8%;height:8%;border-radius:50%;background:#F1DFA6")} />
                  </div>
                </div></div>
            </>) : null}
            {v.isDay ? (<><div aria-hidden="true" style={css("position:absolute;inset:0;display:flex;align-items:center;justify-content:center")}><div className="intro-sun" style={css("position:relative;width:clamp(260px,40vw,540px);aspect-ratio:1")}><svg className="rays" viewBox="0 0 200 200" style={css("position:absolute;inset:-22%;width:144%;height:144%")}><g stroke="#FF7A3D" strokeWidth="5" strokeLinecap="round"><path d="M100 4v22" />
                      <path d="M100 174v22" />
                      <path d="M4 100h22" />
                      <path d="M174 100h22" />
                      <path d="M32 32l16 16" />
                      <path d="M152 152l16 16" />
                      <path d="M168 32l-16 16" />
                      <path d="M48 152l-16 16" />
                    </g>
                    <g stroke="#FFD23F" strokeWidth="5" strokeLinecap="round"><path d="M63 12l8 20" />
                      <path d="M129 168l8 20" />
                      <path d="M12 137l20-8" />
                      <path d="M168 71l20-8" />
                      <path d="M137 12l-8 20" />
                      <path d="M71 168l-8 20" />
                      <path d="M12 63l20 8" />
                      <path d="M168 129l20 8" />
                    </g>
                  </svg>
                  <div style={css("position:absolute;inset:0;border-radius:50%;background:#FFD23F;border:4px solid #1B1A2E;box-shadow:12px 12px 0 #1B1A2E")} />
                </div></div></>) : null}
            <div style={css("position:relative;display:flex;flex-direction:column;align-items:center;gap:8px")}><p aria-label="Oluwaseyi" style={css(`margin:0;font:800 clamp(48px,13vw,210px)/1 'Bricolage Grotesque',sans-serif;letter-spacing:-0.03em;white-space:nowrap;color:${v.introInk ?? ''};${v.introFx ?? ''}`)}>{(v.introLetters ?? []).map((il: any, il_i: number) => (<Fragment key={il_i}><span aria-hidden="true" className="intro-letter" style={css(`animation-delay:${il.d ?? ''};text-shadow:6px 6px 0 ${il.c ?? ''}`)}>{il.ch}</span></Fragment>))}</p>
              <p className="pop" style={css(`margin:0;font-family:'Caveat',cursive;font-size:clamp(22px,3vw,40px);transform:rotate(-3deg);animation-delay:1.9s;color:${v.introInk ?? ''};${v.greetFx ?? ''}`)}>{v.greeting}</p>
            </div>
            <button type="button" onClick={v.skipIntro} style={css("position:absolute;right:24px;bottom:24px;min-height:44px;padding:0 18px;border-radius:999px;border:2px solid #1B1A2E;background:#fff;color:#1B1A2E;font:700 14px 'DM Sans',sans-serif;cursor:pointer")}>Skip intro</button>
            <div style={css(`position:absolute;left:24px;bottom:24px;display:flex;gap:6px;align-items:center;font:500 12px 'DM Sans',sans-serif;color:${v.introInk ?? ''};opacity:.75`)}>Mockup preview: <button type="button" onClick={v.previewDay} style={css("min-height:32px;padding:0 12px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:inherit;font:inherit;cursor:pointer")}>Day</button>
              <button type="button" onClick={v.previewNight} style={css("min-height:32px;padding:0 12px;border-radius:999px;border:1.5px solid currentColor;background:transparent;color:inherit;font:inherit;cursor:pointer")}>Night</button>
            </div>
          </div></>) : null}
      </div></>
  );
}
