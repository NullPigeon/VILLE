// Only resume known in-product flows after authentication.
export function citizenReturnPath(search: string, identity: string) {
  const next = new URLSearchParams(search).get('returnTo');
  if (next && next.length <= 2200 && /^\/(?:chat|world|proposals|modules\/[a-zA-Z0-9_-]+)(?:[?#]|$)/.test(next) && !/[\r\n\\]/.test(next)) return next;
  return `/citizens/${identity}`;
}
