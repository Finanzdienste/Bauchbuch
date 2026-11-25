/*
 * Teilen mit einer Vertrauensperson (js/teilen.js, Fassung 31).
 *
 * Die Zusage bleibt für alle, die keinen Kopplungslink öffnen: null Anfragen.
 * Mit Link geht erst nach „Ja, teilen“ etwas weg, und zwar nur an die
 * Datenbankfunktion des gekoppelten Supabase-Projekts. Unverändertes geht
 * kein zweites Mal; „Teilen beenden“ bittet um Löschen und vergisst die
 * Kopplung. Nichts davon erreicht hier wirklich jemanden: Alle fremden
 * Anfragen werden abgefangen und nur mitgeschrieben.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const eigen = new global.URL(URL).origin;

const PROJEKT = 'abcdefghijklmnopqrst';
const KOPPLUNG = 'a'.repeat(32) + 'B'.repeat(32);
const link = (o) => `${URL}#teilen=${Buffer.from(JSON.stringify(o)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
const GUT = { r: PROJEKT, k: 'sb_publishable_probeprobeprobeprobe', c: KOPPLUNG, n: 'Kim' };

const ZUSTAND = {
  begruesst: true,
  tab: 'heute',
  eintraege: [
    { id: 'e1', am: vorTagen(1), um: '08:00', art: 'essen', was: 'Haferbrei', portion: 'normal', zutaten: [] },
    { id: 'b1', am: vorTagen(1), um: '14:00', art: 'beschwerde', staerke: 5, arten: ['brennen'], notiz: 'Geheimwort' },
  ],
  tage: {},
};

async function neu({ antwort = 200 } = {}) {
  const ctx = await browser.newContext({ viewport: HANDY, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const fehler = [];
  const fremd = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.route('**://**', (route) => {
    const r = route.request();
    if (r.url().startsWith(eigen)) return route.continue();
    fremd.push({ url: r.url(), methode: r.method(), rumpf: r.postData() || '', apikey: r.headers().apikey || '' });
    return route.fulfill({ status: antwort, contentType: 'application/json', body: '1' });
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, z]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(z)); }, [KEY, ZUSTAND]);
  await page.reload({ waitUntil: 'networkidle' });
  return { ctx, page, fehler, fremd };
}

/* ---------- 1. Ohne Link: nichts ---------- */
{
  const { ctx, page, fremd, fehler } = await neu();
  await page.reload({ waitUntil: 'networkidle' });
  for (const tab of ['heute', 'mehr', 'heute']) {
    await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
    await page.waitForTimeout(200);
  }
  await page.locator('#wasserMehr').click();
  await page.waitForTimeout(4500);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  check(fremd.length === 0, `ohne Kopplungslink: null Anfragen nach draußen (${fremd.length})`);
  check(await page.locator('.teilen-frage, .teilen-karte').count() === 0, 'ohne Link: keine Teilen-Karte');
  check(fehler.length === 0, `ohne Seitenfehler (${fehler.join(' | ')})`);
  await ctx.close();
}

/* ---------- 2. Mit Link: erst fragen, „Nein“ heißt nichts ---------- */
{
  const { ctx, page, fremd } = await neu();
  await page.goto(link(GUT), { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  check(await page.locator('.teilen-frage').count() === 1, 'mit Link: die Frage steht auf „Tag“');
  check((await page.locator('.teilen-frage').innerText()).includes('mit Kim teilen'), 'die Frage nennt die Person aus dem Link');
  check(!(await page.evaluate(() => location.hash)), 'die Adresse ist wieder sauber');
  await page.waitForTimeout(4500);
  check(fremd.length === 0, `vor dem Ja: null Anfragen (${fremd.length})`);
  await page.locator('[data-act="teilen-nein"]').click();
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  check(await page.locator('.teilen-frage').count() === 0, '„Nein“: die Frage kommt nicht wieder');
  check(fremd.length === 0, `„Nein“: null Anfragen (${fremd.length})`);
  await ctx.close();
}

/* ---------- 3. „Ja“: genau der Stand, an genau das Ziel, Unverändertes nicht noch einmal ---------- */
{
  const { ctx, page, fremd, fehler } = await neu();
  await page.goto(link(GUT), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('[data-act="teilen-ja"]').click();
  await page.waitForTimeout(600);
  const ziel = `https://${PROJEKT}.supabase.co/rest/v1/rpc/bodycheck_melden`;
  check(fremd.length === 1 && fremd[0].url === ziel && fremd[0].methode === 'POST',
    `„Ja“: ein POST an die Funktion des gekoppelten Projekts (${JSON.stringify(fremd.map((f) => f.url))})`);
  let rumpf = {};
  try { rumpf = JSON.parse(fremd[0].rumpf); } catch { /* bleibt leer */ }
  check(rumpf.p_kopplung === KOPPLUNG && fremd[0].apikey === GUT.k, 'mit Kopplung und öffentlichem Schlüssel aus dem Link');
  check(Array.isArray(rumpf.p_stand && rumpf.p_stand.eintraege) && JSON.stringify(rumpf.p_stand).includes('Geheimwort'),
    'der Rumpf ist der Tagebuchstand');
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.waitForTimeout(300);
  check(fremd.length === 1, `unverändert: kein zweites Mal (${fremd.length})`);
  await page.locator('#wasserMehr').click();
  await page.waitForTimeout(4800);
  check(fremd.length === 2, `nach einer Änderung: noch einmal (${fremd.length})`);
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await page.waitForTimeout(300);
  check((await page.locator('.teilen-karte').innerText()).includes('Geteilt mit Kim'), 'unter „Mehr“ steht, mit wem geteilt wird');
  // Die Kopplung gehört zum Gerät, nicht ins Tagebuch.
  const sicherung = await page.evaluate(async () => (await import('/js/store.js')).alsJSON());
  check(!sicherung.includes(KOPPLUNG) && !sicherung.includes('supabase'), 'die Sicherung enthält die Kopplung nicht');
  page.once('dialog', (d) => d.accept());
  await page.locator('[data-act="teilen-beenden"]').click();
  await page.waitForTimeout(600);
  check(fremd.length === 3 && fremd[2].url === `https://${PROJEKT}.supabase.co/rest/v1/rpc/bodycheck_beenden`,
    '„Teilen beenden“: eine Bitte ums Löschen');
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await page.locator('#wasserMehr').click();
  await page.waitForTimeout(4800);
  check(fremd.length === 3, `danach: nichts mehr (${fremd.length})`);
  check(fehler.length === 0, `ohne Seitenfehler (${fehler.join(' | ')})`);
  await ctx.close();
}

/* ---------- 4. Ein Link mit fremdem Ziel wird nicht angenommen ---------- */
{
  const { ctx, page, fremd } = await neu();
  for (const boese of [{ ...GUT, r: 'evil.example.com/x' }, { ...GUT, c: 'kurz' }, { ...GUT, n: '' }]) {
    await page.goto(link(boese), { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    check(await page.locator('.teilen-frage').count() === 0, `kein Ziel außer einem Supabase-Projekt, nichts Unvollständiges (${Object.keys(boese).find((k) => boese[k] !== GUT[k])})`);
  }
  check(fremd.length === 0, 'und nichts geht weg');
  await ctx.close();
}

/* ---------- 5. Ohne Netz: nichts als geschickt gemerkt ---------- */
{
  const { ctx, page, fremd } = await neu({ antwort: 503 });
  await page.goto(link(GUT), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('[data-act="teilen-ja"]').click();
  await page.waitForTimeout(600);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await page.waitForTimeout(600);
  check(fremd.length >= 2, `gescheitert: beim nächsten Anlass noch einmal (${fremd.length})`);
  await ctx.close();
}

/* ---------- 6. Code in der App einfügen (Link ging in Safari auf) ---------- */
{
  const { ctx, page, fremd } = await neu();
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await page.waitForTimeout(200);
  await page.locator('.teilen-einrichten summary').click();
  await page.locator('#teilenCode').fill('kein code');
  await page.locator('[data-act="teilen-code"]').click();
  await page.waitForTimeout(200);
  check(await page.locator('.teilen-frage').count() === 0, 'ein ungültiger Code: keine Frage');
  await page.locator('.teilen-einrichten summary').click().catch(() => {});
  await page.locator('#teilenCode').fill(link(GUT));
  await page.locator('[data-act="teilen-code"]').click();
  await page.waitForTimeout(300);
  check(await page.locator('.teilen-frage').count() === 1, 'der eingefügte Link führt zur Frage auf „Tag“');
  check(fremd.length === 0, 'und noch geht nichts weg');
  await ctx.close();
}

/* ---------- 7. Die Einladung: einmal, nur mit Einträgen, ohne Ja nichts ---------- */
{
  const ctx = await browser.newContext({ viewport: HANDY, serviceWorkers: 'block' });
  await ctx.addInitScript(() => { window.__einladungProbe = true; });
  const page = await ctx.newPage();
  const fremd = [];
  await page.route('**://**', (route) => {
    const r = route.request();
    if (r.url().startsWith(eigen)) return route.continue();
    fremd.push({ url: r.url(), rumpf: r.postData() || '' });
    return route.fulfill({ status: 200, contentType: 'application/json', body: '1' });
  });
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'heute', eintraege: [], tage: {} })); }, [KEY]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check(await page.locator('.teilen-frage').count() === 0, 'Einladung: ein leeres Tagebuch wird nicht gefragt');
  await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, ZUSTAND]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check(await page.locator('.teilen-frage').count() === 1
    && (await page.locator('.teilen-frage').innerText()).includes('mit Tobi teilen'), 'Einladung: mit Einträgen steht die Frage von selbst da');
  await page.waitForTimeout(4500);
  check(fremd.length === 0, 'Einladung: vor dem Ja geht nichts weg');
  await page.locator('[data-act="teilen-nein"]').click();
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  check(await page.locator('.teilen-frage').count() === 0 && fremd.length === 0, 'Einladung: nach „Nein“ kommt sie nie wieder');
  await page.evaluate(() => localStorage.removeItem('bauchbuch.teilen.eingeladen.v1'));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  await page.locator('[data-act="teilen-ja"]').click();
  await page.waitForTimeout(600);
  let r = {};
  try { r = JSON.parse(fremd[0].rumpf); } catch { /* leer */ }
  check(fremd.length === 1 && fremd[0].url.endsWith('/rest/v1/rpc/bodycheck_melden') && /^[a-z0-9]{8,32}$/.test(r.p_geraet || ''),
    'Einladung: nach „Ja“ genau ein Versand, mit einer Zufallskennung des Geräts');
  await ctx.close();
}

await browser.close();
ende();
