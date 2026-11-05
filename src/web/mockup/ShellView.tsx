/* eslint-disable @typescript-eslint/no-explicit-any */
// Generated from the approved mockup (Shell.dc.html) by scripts/dc2jsx.py.
// Markup only: data and behaviour live in the matching page file. Safe to edit by hand.
import { Fragment } from 'react';
import { css } from './css-text.ts';

export type V = Record<string, any>;

export function ShellView({ v }: { v: V }) {
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
        {v.main}
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
