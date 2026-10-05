export const sections = { expenses: '支出紀錄', balances: '分攤與還款', team: '共同記帳', backup: '備份' };
const tripIdPattern = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function parseRoute(pathname) {
  const path = pathname.replace(/\/$/, '') || '/';
  if (path === '/') return { kind: 'home' };
  if (path === '/join') return { kind: 'join' };
  const match = /^\/trips\/([^/]+)\/([^/]+)$/.exec(path);
  if (match && tripIdPattern.test(match[1]) && Object.hasOwn(sections, match[2])) return { kind: 'trip', tripId: match[1].toLowerCase(), section: match[2] };
  return { kind: 'missing' };
}
export function tripHref(id, section = 'expenses') {
  if (!tripIdPattern.test(id) || !Object.hasOwn(sections, section)) throw new Error('Invalid trip page');
  return `/trips/${id.toLowerCase()}/${section}`;
}
export function signInHref(returnTo) {
  let safe = '/';
  try {
    const url = new URL(returnTo, 'https://app.local');
    if (returnTo.startsWith('/') && !returnTo.startsWith('//') && url.origin === 'https://app.local' && parseRoute(url.pathname).kind !== 'missing') safe = url.pathname + url.search + url.hash;
  } catch {}
  return `/signin-with-chatgpt?return_to=${encodeURIComponent(safe)}`;
}
