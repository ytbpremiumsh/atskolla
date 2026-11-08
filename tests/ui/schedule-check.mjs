import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4177', '--mode', 'production'], { stdio: 'pipe' });
const url = 'http://127.0.0.1:4177/tests/ui/schedule.html';
let browser;
try {
  await mkdir('ui-previews', { recursive: true });
  for (let i = 0; i < 40; i++) {
    try { if ((await fetch(url)).ok) break; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  // The fixture never authenticates or writes to a real school. PageHeader's public setting is mocked.
  await page.route('**/*.supabase.co/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"value":"true"}' }));
  await page.goto(url);
  await page.getByRole('heading', { name: 'Jadwal 7A', exact: true }).waitFor();
  assert.equal(await page.locator('td[rowspan="2"]').count(), 1, 'Long lessons should span their actual time rows');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: 'ui-previews/class-desktop.png', fullPage: true });

  await page.getByRole('button', { name: 'Tambah jadwal 7A Selasa 07:40 – 08:20', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.waitFor();
  assert.equal(await dialog.locator('#schedule-start').inputValue(), '07:40');
  assert.equal(await dialog.locator('#schedule-end').inputValue(), '08:20');
  assert.match(await dialog.getByRole('combobox', { name: 'Kelas', exact: true }).innerText(), /7A/);
  assert.match(await dialog.getByRole('combobox', { name: 'Hari', exact: true }).innerText(), /Selasa/);
  await page.screenshot({ path: 'ui-previews/class-add-dialog.png', fullPage: true });
  await dialog.getByRole('button', { name: 'Batal', exact: true }).click();
  await page.getByRole('button', { name: 'Edit Al-Quran Hadits, Senin, 07:00', exact: true }).click();
  assert.equal(await page.getByRole('dialog').locator('#schedule-end').inputValue(), '08:20');
  await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();

  await page.getByRole('button', { name: /7B.*0 jadwal/ }).click();
  await page.getByRole('heading', { name: 'Jadwal 7B', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Edit / }).count(), 0);
  assert.ok(await page.getByRole('button', { name: /^Tambah jadwal 7B/ }).count() > 0, 'Empty classes must retain usable time slots');

  await page.goto(url + '?readonly=1');
  await page.getByRole('heading', { name: 'Jadwal 7A', exact: true }).waitFor();
  assert.equal(await page.getByRole('button', { name: /^Tambah jadwal/ }).count(), 0, 'Non-admin must not see write controls');
  assert.equal(await page.getByRole('button', { name: /^Hapus jadwal/ }).count(), 0);
  await page.getByRole('button', { name: 'Detail Al-Quran Hadits, Senin, 07:00', exact: true }).click();
  await page.getByRole('dialog').waitFor();
  assert.match(await page.getByRole('dialog').innerText(), /Ahmad Fauzi/);

  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(url);
  await page.getByRole('heading', { name: 'Jadwal 7A', exact: true }).waitFor();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Mobile page must not overflow');
  assert.ok(await page.getByRole('combobox', { name: 'Kelas yang dipantau' }).isVisible());
  await page.screenshot({ path: 'ui-previews/class-mobile.png', fullPage: true });

  for (const [name, width, height] of [['desktop', 1440, 1100], ['mobile', 390, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(url + '?features=1');
    await page.getByRole('heading', { name: 'Fitur ATSkolla', exact: true }).waitFor();
    assert.equal(await page.locator('h2').count(), 4);
    assert.equal(await page.locator('li').count(), 17);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.getByText('Multi Cabang', { exact: true }).count(), 0);
    await page.screenshot({ path: `ui-previews/features-${name}.png`, fullPage: true });
  }
  assert.deepEqual(errors, [], 'Page must not raise browser errors');
  console.log('Class selection, empty slots, edit prefills, read-only access, and desktop/mobile layouts verified');
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
