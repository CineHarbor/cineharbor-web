// Keep the deployed domain compatible while allowing explicit self-hosted origins.
const DEFAULT_HOSTS = 'hkcu.qzz.io,*.hkcu.qzz.io,localhost,127.0.0.1,[::1]';

export function normalizeHost(value: string | null): string {
  if (!value || /[\s\\/@?#,]/.test(value)) return '';
  try {
    const url = new URL(`http://${value}`);
    if (url.pathname !== '/' || url.username || url.password) return '';
    return url.hostname.toLowerCase();
  } catch {
    return '';
  }
}

export function isAllowedHost(
  host: string,
  configured = process.env.CINEHARBOR_ALLOWED_HOSTS ?? DEFAULT_HOSTS
): boolean {
  if (!host) return false;
  return configured.split(',').some((entry) => {
    const item = entry.trim().toLowerCase();
    const wildcard = item.startsWith('*.');
    const allowed = normalizeHost(wildcard ? item.slice(2) : item);
    if (!allowed || (item.includes('*') && !wildcard)) return false;
    return wildcard ? host.endsWith(`.${allowed}`) : host === allowed;
  });
}
