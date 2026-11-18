/* AdSense is restricted to published public articles, never school dashboards. */
(() => {
  const host = location.hostname.toLowerCase();
  const path = location.pathname.replace(/\/$/, '');
  if (!['atskolla.com', 'www.atskolla.com'].includes(host) ||
      !document.querySelector('meta[name="atskolla-public-article"][content="true"]') ||
      !/^\/artikel\/[a-z0-9-]+$/.test(path)) return;
  const key = 'atskolla-advertising-choice-v1';
  const read = () => { try { return localStorage.getItem(key); } catch { return null; } };
  const write = value => { try { localStorage.setItem(key, value); } catch {} };
  const load = () => {
    if (document.getElementById('atskolla-adsense')) return;
    const tag = document.createElement('script');
    tag.id = 'atskolla-adsense'; tag.async = true; tag.crossOrigin = 'anonymous';
    tag.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-0516573569377801';
    document.head.appendChild(tag);
  };
  const prompt = () => {
    if (document.getElementById('advertising-choice')) return;
    const section = document.createElement('section');
    section.id = 'advertising-choice'; section.className = 'pc-consent';
    section.setAttribute('aria-label', 'Pilihan iklan');
    const text = document.createElement('p');
    text.append('Artikel dapat menampilkan iklan Google yang menggunakan cookie. Pilihan ini hanya mengatur iklan. ');
    const privacy = document.createElement('a'); privacy.href = '/kebijakan-privasi'; privacy.textContent = 'Baca kebijakan privasi';
    text.append(privacy); section.append(text);
    const actions = document.createElement('div');
    for (const [value, label] of [['deny', 'Tanpa iklan'], ['allow', 'Izinkan iklan']]) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
      button.addEventListener('click', () => {
        write(value); section.remove(); document.body.classList.remove('pc-consent-visible');
        if (value === 'allow') load();
      }); actions.append(button);
    }
    actions.children[0].textContent = 'Tolak iklan';
    actions.children[1].textContent = 'Izinkan iklan';
    section.append(actions); document.body.append(section); document.body.classList.add('pc-consent-visible');
  };
  document.querySelectorAll('[data-advertising-settings]').forEach(button => {
    button.addEventListener('click', () => { write(''); location.reload(); });
  });
  if (read() === 'allow') load(); else if (read() !== 'deny') prompt();
})();
