/** Only the bare ATSkolla school hostname redirects; login and dashboard paths stay local. */
export function schoolRootRedirect(hostname: string, pathname: string): string | null {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  return pathname === "/" && /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.atskolla\.com$/.test(host) && host !== "www.atskolla.com"
    ? "https://www.atskolla.com"
    : null;
}
