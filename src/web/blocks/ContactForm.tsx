import { useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { INTENTS, type Intent, type Mode } from '../../shared/constants.ts';
import { sendContact } from '../lib/api.ts';
import { turnstileToken } from '../lib/turnstile.ts';

/**
 * The real contact form. Without JavaScript it is a normal form that posts to /contact and lands on
 * /contact/thanks (or comes back with errors). With JavaScript it validates with the same shared schema
 * as the server, keeps what the visitor typed, moves focus to the first error, and can't be sent twice.
 */
const HINTS: Record<Intent, string> = {
  partner: 'Your project, the market you want to reach, and your timeline…',
  hire: 'The role, the team, and what success looks like in six months…',
  collab: 'What you want to build, and where I fit in…',
  hi: 'Say hello…',
};

function labels(mode: Mode): Record<Intent, string> {
  return mode === 'playful'
    ? { partner: 'Let’s partner', hire: 'I’m hiring', collab: 'Build something', hi: 'Just say hi' }
    : { partner: 'Partner', hire: 'Hire', collab: 'Collaborate', hi: 'Just say hi' };
}

const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

export interface ContactFormProps {
  mode: Mode;
  variant: 'page' | 'home';
  siteKey?: string;
  initial?: { values: Record<string, string>; errors: Record<string, string> };
  email: string;
}

type Status = 'idle' | 'sending' | 'sent';

export function ContactForm({ mode, variant, siteKey, initial, email }: ContactFormProps) {
  const playful = mode === 'playful';
  const init = initial?.values ?? {};
  const [intent, setIntent] = useState<Intent>(
    (INTENTS as readonly string[]).includes(init.intent ?? '') ? (init.intent as Intent) : 'partner',
  );
  const [errors, setErrors] = useState<Record<string, string>>(initial?.errors ?? {});
  const [status, setStatus] = useState<Status>('idle');
  const formRef = useRef<HTMLFormElement>(null);
  const on: CSSProperties = playful
    ? { background: '#1B1A2E', color: '#FFF6E5' }
    : { background: '#F5A524', color: '#07080B', boxShadow: 'none' };
  const off: CSSProperties = playful
    ? { background: '#fff', color: '#1B1A2E', boxShadow: 'inset 0 0 0 1px rgba(27,26,46,.12)' }
    : {
        background: 'rgba(255,255,255,.05)',
        color: '#F3EFE7',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.1)',
      };
  const labelStyle: CSSProperties =
    variant === 'home'
      ? { fontSize: 13, color: '#A9AEB9' }
      : { display: 'block', marginBottom: 6, fontSize: 13, color: 'var(--muted)' };
  const errStyle: CSSProperties = {
    margin: '6px 0 0',
    fontSize: 13.5,
    color: playful ? '#B42318' : '#FF8A7A',
  };

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status !== 'idle') return;
    const fd = new FormData(e.currentTarget);
    const raw = Object.fromEntries(
      ['name', 'email', 'message', 'website'].map((k) => [k, String(fd.get(k) ?? '')]),
    );
    setStatus('sending'); // blocks a second submit while the rules load
    // The shared rules (same as the server) load only when someone actually sends, keeping pages light.
    const { ContactInputSchema } = await import('../../shared/schemas.ts');
    const parsed = ContactInputSchema.safeParse({ ...raw, intent, source: 'form' });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0] ?? '_')] ??= i.message;
      setStatus('idle');
      setErrors(next);
      focusFirst(next);
      return;
    }
    setErrors({});
    const token = await turnstileToken(siteKey);
    const r = await sendContact({ ...parsed.data, ...(token ? { turnstileToken: token } : {}) });
    if (r.ok) {
      setStatus('sent');
      return;
    }
    setStatus('idle');
    const next = r.error.fields ?? { _: r.error.message };
    setErrors(next);
    focusFirst(next);
  }

  function focusFirst(errs: Record<string, string>) {
    const first = ['name', 'email', 'message'].find((k) => errs[k]);
    const el = first
      ? formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)
      : formRef.current?.querySelector<HTMLElement>('[role="alert"]');
    el?.focus();
  }

  if (status === 'sent') {
    return (
      <div
        role="status"
        tabIndex={-1}
        ref={(el) => el?.focus()}
        className="sent-panel"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          padding: '28px 24px',
          borderRadius: 24,
          background: playful ? '#9FE8D0' : 'rgba(61,220,151,.1)',
          boxShadow: playful ? 'none' : 'inset 0 0 0 1px rgba(61,220,151,.35)',
        }}
      >
        <p
          style={{
            margin: 0,
            font: playful ? "800 28px 'Outfit',sans-serif" : "400 30px 'Instrument Serif',serif",
          }}
        >
          {playful ? 'Yay, message sent!' : 'Thank you. Your message is in.'}
        </p>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6 }}>
          I read every message myself and usually reply within two working days.
        </p>
      </div>
    );
  }

  const field = (name: 'name' | 'email', label: string, type: string, placeholder: string, auto: string) => {
    const input = (
      <input
        id={`c-${name}`}
        className="field"
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={auto}
        defaultValue={init[name] ?? ''}
        required
        maxLength={name === 'name' ? 80 : 254}
        aria-invalid={!!errors[name]}
        aria-describedby={errors[name] ? `c-${name}-err` : undefined}
      />
    );
    return (
      <div style={variant === 'home' ? { display: 'flex', flexDirection: 'column', gap: 4 } : undefined}>
        <label htmlFor={`c-${name}`} style={labelStyle}>
          {label}
        </label>
        {variant === 'home' ? <div className="fieldwrap">{input}</div> : input}
        {errors[name] ? (
          <p id={`c-${name}-err`} style={errStyle}>
            {errors[name]}
          </p>
        ) : null}
      </div>
    );
  };

  const message = (
    <textarea
      id="c-msg"
      className="field"
      name="message"
      rows={variant === 'home' ? 4 : 5}
      placeholder={HINTS[intent]}
      style={{ resize: 'vertical' }}
      defaultValue={init.message ?? ''}
      required
      maxLength={2000}
      aria-invalid={!!errors.message}
      aria-describedby={errors.message ? 'c-msg-err' : undefined}
    />
  );
  const L = labels(mode);
  const sending = status === 'sending';

  return (
    <form
      ref={formRef}
      method="post"
      action="/contact"
      noValidate
      onSubmit={onSubmit}
      aria-label="Contact form"
      style={{ display: 'flex', flexDirection: 'column', gap: variant === 'home' ? 22 : 16 }}
    >
      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend
          style={{
            padding: 0,
            marginBottom: 12,
            font: "500 11px var(--body, 'Geist'),sans-serif",
            letterSpacing: '.16em',
            textTransform: 'uppercase',
            color: variant === 'home' ? '#A9AEB9' : 'var(--faint)',
          }}
        >
          I’d like to
        </legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {INTENTS.map((id) => (
            <label
              key={id}
              className="chip"
              style={{ ...(intent === id ? on : off), cursor: 'pointer', position: 'relative' }}
            >
              <input
                type="radio"
                name="intent"
                value={id}
                checked={intent === id}
                onChange={() => setIntent(id)}
                style={srOnly}
              />
              {L[id]}
            </label>
          ))}
        </div>
      </fieldset>
      <div
        className={variant === 'page' ? 'fgrid' : undefined}
        style={
          variant === 'home'
            ? {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))',
                gap: 20,
              }
            : undefined
        }
      >
        {field('name', 'Name', 'text', 'Your name', 'name')}
        {field('email', 'Email', 'email', 'you@company.com', 'email')}
      </div>
      <div style={variant === 'home' ? { display: 'flex', flexDirection: 'column', gap: 4 } : undefined}>
        <label htmlFor="c-msg" style={labelStyle}>
          Message
        </label>
        {variant === 'home' ? <div className="fieldwrap">{message}</div> : message}
        {errors.message ? (
          <p id="c-msg-err" style={errStyle}>
            {errors.message}
          </p>
        ) : null}
      </div>
      {/* Honeypot: people never see or fill this; bots usually do. */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}
      >
        <label htmlFor="c-website">Website</label>
        <input id="c-website" name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
      {errors._ ? (
        <p role="alert" tabIndex={-1} style={{ ...errStyle, fontSize: 15 }}>
          {errors._.startsWith('That didn’t go through')
            ? errors._
            : `${errors._} You can also email ${email}.`}
        </p>
      ) : null}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 16,
          marginTop: variant === 'home' ? 6 : 0,
        }}
      >
        <button type="submit" className="pbtn solid" disabled={sending} aria-busy={sending}>
          {sending ? 'Sending…' : 'Send my message'}
          <span className="ic">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17L17 7" />
              <path d="M8 7h9v9" />
            </svg>
          </span>
        </button>
        <span
          style={{
            fontSize: 13,
            lineHeight: 1.5,
            color: variant === 'home' ? '#8C929E' : 'var(--faint)',
            maxWidth: 340,
          }}
        >
          Your details are only used to reply to you. Nothing is shared or added to a mailing list.{' '}
          <a href="/privacy">Privacy</a>
        </span>
      </div>
    </form>
  );
}
