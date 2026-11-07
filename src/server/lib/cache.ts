/**
 * How long browsers keep each kind of public file. Hashed bundles and fonts never change under the same
 * name, so they keep for a year; images for 30 days; anything else (favicon, og image) for an hour.
 */
export function cacheControlFor(path: string): string {
  if (/[\\/](assets|fonts)[\\/]/.test(path)) return 'public, max-age=31536000, immutable';
  if (/[\\/]img[\\/]/.test(path)) return 'public, max-age=2592000, stale-while-revalidate=86400';
  return 'public, max-age=3600';
}
