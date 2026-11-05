/**
 * Structured JSON logs, one line per event, with emails and IPs masked.
 * Kept tiny on purpose: the host collects stdout/stderr into its own log files.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

const EMAIL = /([A-Za-z0-9._%+-])[A-Za-z0-9._%+-]*@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g;
const IPV4 = /\b(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}\b/g;

export function mask(text: string): string {
  return text.replace(EMAIL, '$1***@$2').replace(IPV4, '$1.$2.x.x');
}

function scrub(value: unknown): unknown {
  if (typeof value === 'string') return mask(value);
  if (value instanceof Error)
    return {
      name: value.name,
      message: mask(value.message),
      stack: value.stack?.split('\n').slice(0, 6).join('\n'),
    };
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      out[k] = /password|secret|token|totp|cookie|authorization/i.test(k) ? '[redacted]' : scrub(v);
    }
    return out;
  }
  return value;
}

export interface Logger {
  debug(msg: string, data?: object): void;
  info(msg: string, data?: object): void;
  warn(msg: string, data?: object): void;
  error(msg: string, data?: object): void;
}

export function createLogger(
  minLevel: Level = 'info',
  write: (line: string) => void = (l) => process.stdout.write(l + '\n'),
): Logger {
  const order: Level[] = ['debug', 'info', 'warn', 'error'];
  const at = order.indexOf(minLevel);
  const emit = (level: Level) => (msg: string, data?: object) => {
    if (order.indexOf(level) < at) return;
    write(
      JSON.stringify({
        t: new Date().toISOString(),
        level,
        msg: mask(msg),
        ...(data ? (scrub(data) as object) : {}),
      }),
    );
  };
  return { debug: emit('debug'), info: emit('info'), warn: emit('warn'), error: emit('error') };
}
