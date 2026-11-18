/* AdSense is restricted to published public articles, never school dashboards.
 * Privacy messages are managed through Google AdSense Privacy & messaging.
 */
(() => {
  const host = location.hostname.toLowerCase();
  const path = location.pathname.replace(/\/$/, '');
  if (!['atskolla.com', 'www.atskolla.com'].includes(host) ||
      !document.querySelector('meta[name="atskolla-public-article"][content="true"]') ||
      !/^\/artikel\/[a-z0-9-]+$/.test(path) ||
      document.getElementById('atskolla-adsense')) return;
  const tag = document.createElement('script');
  tag.id = 'atskolla-adsense'; tag.async = true; tag.crossOrigin = 'anonymous';
  tag.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0516573569377801';
  document.head.appendChild(tag);
})();
