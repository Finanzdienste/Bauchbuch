/*
 * Von selbst passiert nichts.
 *
 * tests/test-still.mjs prüft den einen Weg nach draußen: was auf Tastendruck
 * hinausgeht und was dabei nicht mitgeht. Dieser hier prüft die andere Hälfte,
 * und sie ist die wichtigere – **dass ohne Tastendruck gar nichts passiert.**
 *
 * Der Unterschied ist keine Wortklauberei. Ein Programm, das etwas verschicken
 * *kann*, ist eine Zeile davon entfernt, es auch von selbst zu tun: beim
 * Starten, beim Reiterwechsel, „nur die Ideen, wenn ohnehin Netz da ist",
 * einmal nachts zum Sichern. Jede dieser Zeilen wäre für sich harmlos gemeint
 * und würde diese App zu einer anderen machen.
 *
 * Deshalb liegt hier ein volles Tagebuch im Speicher – neunzig Tage,
 * Mahlzeiten, Beschwerden, Medikamente, Stuhlgang, Zyklus, Notizen, offene
 * Ideen – und dann wird alles angefasst, was sich anfassen lässt. Erwartet
 * wird: null Anfragen. Nicht „keine verdächtigen". Null.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const eigen = new global.URL(URL).origin;
const fremd = [];
page.on('request', (r) => {
  if (!r.url().startsWith(eigen) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) {
    fremd.push(`${r.method()} ${r.url()}`);
  }
});

/*
 * Ginge doch etwas hinaus, soll es hier hängen bleiben und nicht wirklich
 * jemanden erreichen. Ein Test, der im Fehlerfall echte Daten irgendwohin
 * schickt, ist der Fehler, den er finden soll.
 */
await page.route('**://**', (route) => {
  const ziel = route.request().url();
  if (ziel.startsWith(eigen)) return route.continue();
  return route.abort();
});

/* ---------- Ein volles Tagebuch ---------- */

const eintraege = [];
const tage = {};
for (let i = 1; i <= 90; i++) {
  const am = vorTagen(i);
  tage[am] = { notiert: true, anspannung: (i % 5) + 1, schlaf: (i % 4) + 2 };
  eintraege.push({
    id: `e${i}`, am, um: '08:00', art: 'essen', was: 'Haferbrei mit Milch',
    portion: 'normal', zutaten: [{ id: 'milch', rolle: 'haupt' }],
  });
  eintraege.push({
    id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke: (i % 8) + 1,
    arten: ['brennen', 'blaehung'], stuhlbezug: 'besser', notiz: 'nach dem Essen',
  });
  if (i % 3 === 0) {
    eintraege.push({
      id: `s${i}`, am, um: '09:00', art: 'stuhl', bristol: (i % 7) + 1, dringend: i % 6 === 0,
    });
  }
  if (i % 4 === 0) {
    eintraege.push({
      id: `m${i}`, am, um: '07:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg',
    });
  }
  if (i % 10 === 0) {
    eintraege.push({ id: `n${i}`, am, um: '20:00', art: 'notiz', text: 'Streit mit der Chefin' });
  }
}

const ZUSTAND = {
  begruesst: true,
  tab: 'heute',
  eintraege,
  tage,
  beschwerdenSeit: '2025-01',
  termine: [vorTagen(30)],
  ideen: [
    { id: 'i1', am: vorTagen(3), text: 'Mehr Platz für eigene Auslöser.', erledigt: false },
    { id: 'i2', am: vorTagen(9), text: 'Die Bristol-Bilder größer.', erledigt: false },
  ],
  ideenGeschickt: 0,
};

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, ZUSTAND]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

/* ---------- Alles anfassen ---------- */

for (const tab of ['heute', 'verlauf', 'muster', 'ruhe', 'ideen', 'mehr']) {
  await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
  await page.waitForTimeout(250);
}

// Verlauf: Zeiträume und Monate durchblättern.
await page.locator('[data-act="tab"][data-tab="verlauf"]').click();
await page.waitForTimeout(200);
for (const n of [14, 30, 90]) {
  await page.locator(`[data-act="zeitraum"][data-n="${n}"]`).click();
  await page.waitForTimeout(150);
}
await page.locator('[data-act="monat-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(150);

// Muster: die Aufklapper öffnen, damit auch die tieferen Teile rechnen.
await page.locator('[data-act="tab"][data-tab="muster"]').click();
await page.waitForTimeout(300);
const klapper = await page.locator('summary').count();
for (let i = 0; i < Math.min(klapper, 6); i++) {
  await page.locator('summary').nth(i).click();
  await page.waitForTimeout(80);
}

// Mehr: Bericht bauen, Sicherung als Text anzeigen, Mittelübersicht öffnen.
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(200);
await page.locator('[data-act="bericht"][data-n="90"]').click();
await page.waitForTimeout(400);
await page.locator('[data-act="sicherung-text"]').click();
await page.waitForTimeout(300);

// Ideen ansehen und eine neue eintragen – aber nicht abschicken.
await page.locator('[data-act="tab"][data-tab="ideen"]').click();
await page.waitForTimeout(250);
await page.locator('#ideeText').fill('Noch ein Vorschlag, der hierbleibt.');
await page.locator('[data-act="idee-neu"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 3, 'die dritte Idee steht in der Liste');

// Eine Atemübung starten und wieder abbrechen.
await page.locator('[data-act="tab"][data-tab="ruhe"]').click();
await page.waitForTimeout(200);
const uebung = page.locator('[data-act="atem-start"]').first();
if (await uebung.count()) {
  await uebung.click();
  await page.waitForTimeout(900);
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await page.waitForTimeout(200);
}

// Neu laden – auch der Start darf nichts melden.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

/* ---------- Das Ergebnis ---------- */

check(
  fremd.length === 0,
  `null Anfragen nach draußen${fremd.length ? `: ${fremd.slice(0, 6).join(' | ')}` : ''}`,
);

// Und die Ideen gelten weiterhin als nicht verschickt – sonst hätte irgendwo
// jemand gemeint, es sei schon raus.
const nachher = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(
  (nachher.ideenGeschickt || 0) === 0,
  `nichts gilt als verschickt (${nachher.ideenGeschickt || 0})`,
);
check(nachher.eintraege.length >= 90, 'und das Tagebuch ist vollzählig geblieben');

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
