/*
 * Das Tagebuch löst nie etwas aus.
 *
 * Seit die App Vorschläge von selbst verschickt, ist das die Zusage, auf die
 * es ankommt – und sie ist schärfer, nicht weicher: Es gibt genau **einen**
 * Anlass für einen Aufruf nach draußen, nämlich eine neu eingetragene Idee.
 * Alles andere – neunzig Tage Mahlzeiten, Beschwerden, Medikamente,
 * Stuhlgang, Zyklus, Notizen, jede Auswertung, jeder Bericht – bleibt still,
 * egal wie lange man wartet.
 *
 * Der Unterschied ist keine Wortklauberei. Ein Programm, das etwas verschicken
 * kann, ist eine Zeile davon entfernt, mehr zu verschicken: beim Starten,
 * beim Reiterwechsel, „einmal nachts zum Sichern". Jede dieser Zeilen wäre für
 * sich harmlos gemeint und würde diese App zu einer anderen machen.
 *
 * Geprüft wird deshalb mit vollem Tagebuch und **ohne** offene Idee, über
 * sechs vorgestellte Stunden. Erwartet wird: null Anfragen. Nicht „keine
 * verdächtigen". Null. Zum vollen Tagebuch gehören auch Wasser, Aktivitäten,
 * eigene Mittel und eigene Aktivitäten – und ihre Knöpfe werden angetippt,
 * nicht nur angesehen.
 *
 * Und danach dasselbe mit Ideen, die schon draußen waren: Auch die gehen kein
 * zweites Mal.
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
  tage[am].wasser = (i % 6) + 1;
  if (i % 2 === 0) {
    eintraege.push({
      id: `a${i}`, am, um: '18:00', art: 'aktivitaet', aktivitaeten: ['gym', 'a:kletterhalle'],
      intensitaet: 'mittel', notiz: 'mit dem Verein',
    });
  }
}

const ZUSTAND = {
  begruesst: true,
  tab: 'heute',
  eintraege,
  tage,
  beschwerdenSeit: '2025-01',
  termine: [vorTagen(30)],
  ideen: [],
  ideenGeschickt: 0,
  standardMittel: [{ id: 'sm1', mittel: 'L-Thyroxin', dosis: '50 µg', tageszeit: 'morgens', bezug: 'vor' }],
  eigeneAktivitaeten: [{ id: 'a:kletterhalle', name: 'Kletterhalle' }],
};

// Die Uhr in die Hand nehmen, damit sich Stunden vorstellen lassen, ohne sie
// abzuwarten. Ein Test, der sechs Stunden schläft, wird herausgenommen.
await page.clock.install();

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, ZUSTAND]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

/* ---------- Alles anfassen ---------- */

for (const tab of ['heute', 'verlauf', 'muster', 'ruhe', 'ideen', 'mehr']) {
  await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
  await page.waitForTimeout(250);
}

// Die neueren Knöpfe auf „Tag": Wasser, Zuletzt gemacht, Meine Mittel, der
// Aktivitätsbogen, Löschen mit zwei Tipps samt „Rückgängig", Ändern.
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(200);
const tippe = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(150); };
await tippe('#wasserMehr');
await tippe('#wasserMehr');
await tippe('#wasserWeniger');
await tippe('[data-act="aktiv-schnell"]');
await tippe('[data-act="standard-eintragen"]');
await tippe('[data-act="neu"][data-art="aktivitaet"]');
await tippe('[data-act="aktiv-wahl"][data-id="laufen"]');
await tippe('[data-act="bogen-speichern"]');
const loesch = page.locator('[data-act="loeschen"]').first();
await loesch.click();
await page.waitForTimeout(100);
await loesch.click();
await page.waitForTimeout(150);
await tippe('[data-act="loeschen-zurueck"]');
await tippe('[data-act="bearbeiten"]');
await tippe('button.bogen-zu');
await tippe('[data-act="tag-blaettern"][data-d="-1"]');
// Und unter „Mehr": ein eigenes Mittel, eine eigene Aktivität, die Glasgröße.
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(200);
await tippe('[data-act="meinmittel-neu"]');
await page.locator('#mmName').fill('Iberogast');
await tippe('[data-act="mm-speichern"]');
await page.locator('#neueAktivitaet').fill('Chorprobe');
await tippe('[data-act="aktiv-neu"]');
const wegAktiv = page.locator('[data-act="aktiv-weg"][data-id="a:chorprobe"]');
await wegAktiv.click();
await page.waitForTimeout(100);
await wegAktiv.click();
await page.waitForTimeout(150);
await tippe('[data-act="entfernt-zurueck"]');
await tippe('[data-act="wasser-glas"][data-n="330"]');
{
  // Gegenprobe: Die Knöpfe gab es wirklich, und sie haben etwas getan.
  const z = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
  check(z.eintraege.filter((e) => e.art === 'aktivitaet').length >= 47 && z.standardMittel.length === 2
      && z.eigeneAktivitaeten.length === 2 && z.wasserGlas === 330
      && Object.values(z.tage).some((t) => t.wasser >= 1),
  `die neueren Teile sind angetippt worden (${z.eintraege.filter((e) => e.art === 'aktivitaet').length} Aktivitäten, ${z.standardMittel.length} Mittel)`);
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

// Den Ideen-Reiter ansehen, ohne etwas einzutragen.
await page.locator('[data-act="tab"][data-tab="ideen"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 0, 'es liegt keine Idee vor');

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

// Und dann sechs Stunden vorspulen. Wenn irgendwo eine Uhr läuft, die von
// selbst etwas hinausschickt, schlägt sie hier an.
await page.clock.fastForward(6 * 3600 * 1000);
await page.waitForTimeout(600);

/* ---------- Das Ergebnis ---------- */

check(
  fremd.length === 0,
  `null Anfragen, auch nach sechs Stunden${fremd.length ? `: ${fremd.slice(0, 6).join(' | ')}` : ''}`,
);

const nachher = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(nachher.eintraege.length >= 90, 'das Tagebuch ist vollzählig geblieben');

/* ---------- Was schon draußen war, geht nicht noch einmal ---------- */

await page.evaluate(([k, iso]) => {
  const z = JSON.parse(localStorage.getItem(k));
  z.ideen = [
    { id: 'i1', am: iso, text: 'Mehr Platz für eigene Auslöser.', erledigt: false },
    { id: 'i2', am: iso, text: 'Die Bristol-Bilder größer.', erledigt: false },
  ];
  z.ideenGeschickt = 2;
  localStorage.setItem(k, JSON.stringify(z));
}, [KEY, vorTagen(3)]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.locator('[data-act="tab"][data-tab="ideen"]').click();
await page.waitForTimeout(250);
check(await page.locator('.idee').count() === 2, 'die zwei alten Ideen stehen da');

await page.clock.fastForward(6 * 3600 * 1000);
await page.waitForTimeout(600);
check(
  fremd.length === 0,
  `was schon draußen war, geht kein zweites Mal${fremd.length ? `: ${fremd.slice(0, 3).join(' | ')}` : ''}`,
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
