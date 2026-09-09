/*
 * Was diese App verschickt – und vor allem, was nicht.
 *
 * Die Zusage lautet:
 *
 *     „Gesundheitsdaten verlassen dieses Gerät nie. Das Einzige, was
 *      hinausgeht, sind die Verbesserungsvorschläge unter Ideen – und die,
 *      sobald sie eingetragen wurden."
 *
 * Der zweite Halbsatz ist neu und macht den ersten *wichtiger*, nicht
 * unwichtiger: Sobald ein Programm etwas verschicken kann, entscheidet sich an
 * genau einer Stelle, ob es das Richtige verschickt.
 *
 * Dieser Test ist der gründliche Nachweis, in vier Teilen:
 *
 *   1. BIS DAHIN NICHTS. Eintragen, blättern, auswerten, Bericht bauen – das
 *      ganze Tagebuch anfassen erzeugt **null** Anfragen.
 *   2. NICHT VOM HINSEHEN. Den Ideenreiter zu öffnen schickt nichts.
 *   3. AUF DEN KNOPF, UND SOFORT. Nach „Eintragen" geht genau eine Anfrage
 *      hinaus, an genau eine Adresse, mit genau einem Feld – und ihr Rumpf
 *      wird gegen das Tagebuch im Speicher gehalten. Taucht daraus auch nur
 *      ein Wort auf, ist der Test rot.
 *   4. UND SONST NICHTS. Kein zweiter Aufruf, solange nichts Neues dazukommt.
 *
 * Es gibt eine Vorgeschichte dazu, aus dem Schwesterprojekt: Dort meldeten die
 * Testläufe monatelang erfundene Geräte an einen echten Server, weil niemand
 * nachgesehen hatte, wohin die Aufrufe gingen. Genau deshalb wird hier nicht
 * behauptet, sondern mitgeschrieben.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const eigen = new global.URL(URL).origin;
const fremd = [];
page.on('request', (r) => {
  if (!r.url().startsWith(eigen) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) {
    fremd.push({ methode: r.method(), url: r.url(), rumpf: r.postData() });
  }
});

/*
 * Der Briefkasten wird abgefangen und nicht wirklich angerufen.
 *
 * Ein Test, der einen echten Dienst anspricht, prüft dessen Laune mit und
 * hinterlässt dort Müll. Mitgeschrieben wird trotzdem alles – die Liste oben
 * sieht die Anfrage, bevor sie hier beantwortet wird.
 */
await page.route('**/briefkasten.*/**', (route) => route.fulfill({
  status: 200,
  headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
  body: JSON.stringify({ ok: true }),
}));

// Die Uhr in die Hand nehmen, bevor die Seite lädt.
await page.clock.install();

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate((k) => localStorage.removeItem(k), KEY);
await page.reload({ waitUntil: 'networkidle' });

/* ==================== 1. Bis dahin nichts ==================== */

await page.locator('[data-act="los"]').click();
await page.waitForTimeout(150);
await page.locator('[data-act="neu"][data-art="essen"]').click();
await page.waitForTimeout(150);
await page.locator('#bogenWas').fill('Reis mit Möhren');
await page.locator('.marke[data-id="fett"]').click();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(200);

await page.locator('[data-act="neu"][data-art="beschwerde"]').click();
await page.waitForTimeout(150);
await page.locator('.stufe[data-n="5"]').click();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(200);

for (const tab of ['verlauf', 'muster', 'mehr']) {
  await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
  await page.waitForTimeout(200);
}
await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(250);
check(await page.locator('.bericht').count() === 1, 'der Bericht ist erzeugt worden');

// Der Service Worker holt beim Einrichten die ganze Liste nach – abwarten,
// sonst prüft der Test, bevor überhaupt etwas hätte falsch laufen können.
await page.waitForTimeout(1200);

check(
  fremd.length === 0,
  `das ganze Tagebuch angefasst, keine einzige Anfrage${fremd.length ? `: ${fremd.slice(0, 5).map((f) => `${f.methode} ${f.url}`).join(' | ')}` : ''}`,
);

/* ==================== 2. Der Reiter allein sendet nichts ==================== */

/*
 * Hier stand einmal die Bedenkzeit: eine Minute, in der sich ein Satz noch
 * zurücknehmen ließ. Sie ist weg, und der Grund gehört in diesen Test, weil
 * er von einer Vorsichtsmaßnahme handelt, die das Gegenteil bewirkte.
 *
 * Die Minute lief als Zeitgeber in der offenen Seite. Wer eine Idee eintippte
 * und die App zumachte – der Normalfall –, verschickte nie etwas; beim
 * nächsten Öffnen fing sie von vorn an. Angestoßen wurde außerdem nur beim
 * Zeichnen des Ideenreiters. Ein Vorschlag ging also nur hinaus, wenn jemand
 * nach dem Eintippen noch eine Minute auf diesem Reiter stehen blieb.
 * Aufgefallen ist es, als ein Zettel zum Prüfen eingetragen wurde und der
 * Kasten leer blieb – und dieser Test war grün, weil er die Bedenkzeit prüfte
 * und nicht, ob je etwas ankommt.
 *
 * Geblieben ist die Grenze, auf die es wirklich ankommt: Das Öffnen des
 * Reiters allein schickt nichts. Erst der Knopf.
 */
await page.locator('[data-act="tab"][data-tab="ideen"]').click();
await page.waitForTimeout(400);
check(fremd.length === 0, `den Ideenreiter offen, noch nichts hinausgegangen (${fremd.length})`);

/* ==================== 3. Auf den Knopf, und sofort ==================== */

await page.locator('#ideeText').fill('Die Uhrzeit sollte man schneller ändern können.');
await page.locator('[data-act="idee-neu"]').click();

/*
 * Gewartet wird auf die Anfrage, nicht auf die Uhr – und großzügig. Geprüft
 * wird, *dass* sie kommt, ohne dass jemand etwas weiter antippt; wie schnell
 * die Testmaschine ist, gehört nicht zur Zusage.
 */
for (let n = 0; n < 40 && fremd.length === 0; n++) {
  // eslint-disable-next-line no-await-in-loop
  await page.waitForTimeout(100);
}

check(fremd.length === 1, `sie geht von selbst hinaus, ohne weiteres Zutun (${fremd.length})`);

const raus = fremd[0] || {};
check(raus.methode === 'POST', 'sie geht als POST hinaus');
check(
  /^https:\/\/briefkasten\.[a-z0-9-]+\.workers\.dev\/idee$/.test(raus.url || ''),
  `an genau die eine Adresse (${raus.url})`,
);

/*
 * Der Rumpf. Hier entscheidet sich, ob die Zusage hält.
 *
 * Die interessante Prüfung ist nicht „enthält den Ideentext", sondern
 * „enthält nichts anderes": kein Feld, das ein Tagebuch tragen könnte, und
 * kein Wort aus dem, was im Speicher liegt.
 */
let rumpf = null;
try { rumpf = JSON.parse(raus.rumpf || ''); } catch { rumpf = null; }
check(!!rumpf, 'ihr Rumpf ist lesbares JSON');
check(
  !!rumpf && Object.keys(rumpf).join() === 'text',
  `und trägt genau ein Feld: text (${rumpf ? Object.keys(rumpf).join(', ') : '–'})`,
);
check(
  !!rumpf && String(rumpf.text).includes('Die Uhrzeit sollte man schneller ändern können.'),
  'darin steht die Idee',
);

const gesendet = JSON.stringify(rumpf);
for (const geheim of ['Reis mit Möhren', 'staerke', 'eintraege', 'beschwerde', 'notiert']) {
  check(!gesendet.includes(geheim), `und nichts aus dem Tagebuch: „${geheim}" fehlt`);
}

/*
 * Gegenprobe. Ohne sie könnte dieser Test grün sein, weil gar nichts da war,
 * was hätte hinausgehen können – die häufigste Art, sich mit einem Test
 * selbst zu betrügen.
 */
const daheim = await page.evaluate((k) => localStorage.getItem(k), KEY);
check(
  daheim.includes('Reis mit Möhren') && daheim.includes('"staerke"'),
  'das Tagebuch liegt dabei sehr wohl im Speicher – es geht nur nicht mit',
);

/* ==================== 4. Und sonst nichts ==================== */

/*
 * Ohne neuen Anlass bleibt es bei dem einen Aufruf. Ein Programm, das alle
 * paar Minuten „nur mal nachsehen" hinausruft, wäre etwas anderes als eines,
 * das schickt, was jemand geschrieben hat.
 */
await page.clock.fastForward(600000);
await page.waitForTimeout(400);
check(fremd.length === 1, `zehn Minuten später immer noch ein einziger Aufruf (${fremd.length})`);

for (const tab of ['verlauf', 'muster', 'ideen', 'mehr', 'heute']) {
  await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
  await page.waitForTimeout(150);
}
await page.clock.fastForward(120000);
await page.waitForTimeout(400);
check(fremd.length === 1, `auch Herumblättern löst nichts aus (${fremd.length})`);

/* ==================== Der Quelltext ==================== */

// In allen Modulen außer der einen Tür darf keine Adresse stehen.
const quelle = await page.evaluate(async () => {
  const dateien = ['./js/app.js', './js/store.js', './js/auswertung.js', './js/bericht.js',
    './js/daten.js', './js/datum.js', './js/text.js', './js/chart.js', './js/tresor.js',
    './js/rat.js', './js/bild.js', './js/luecken.js', './sw.js'];
  const texte = await Promise.all(dateien.map((d) => fetch(d).then((r) => r.text())));
  return texte.join('\n');
});
const adressen = quelle.match(/https?:\/\/[^\s'"`)]+/g) || [];
check(
  adressen.length === 0,
  `keine Adresse außerhalb von js/briefkasten.js${adressen.length ? `: ${[...new Set(adressen)].join(', ')}` : ''}`,
);
check(
  !/XMLHttpRequest|navigator\.sendBeacon/.test(quelle),
  'und kein Weg, der an der Sichtbarkeit vorbeiführt',
);

// Die Tür selbst: genau eine Adresse, und sie kennt den Speicher nicht.
const tuer = await page.evaluate(() => fetch('./js/briefkasten.js').then((r) => r.text()));
const inDerTuer = [...new Set(tuer.match(/https?:\/\/[^\s'"`)]+/g) || [])];
check(inDerTuer.length === 1, `in der Tür steht genau eine Adresse (${inDerTuer.length})`);
check(
  !/^\s*import\b.*store\.js/m.test(tuer),
  'und sie holt sich den Speicher nicht – sie bekommt einen fertigen Text',
);

// Auch nichts, das nur so aussieht, als bräuchte es das Netz.
const auswaerts = await page.evaluate((o) => [...document.querySelectorAll('[src],[href]')]
  .map((el) => el.getAttribute('src') || el.getAttribute('href'))
  .filter((u) => /^https?:/.test(u) && !u.startsWith(o)), eigen);
check(auswaerts.length === 0, `kein Verweis auf eine fremde Adresse${auswaerts.length ? `: ${auswaerts.join(', ')}` : ''}`);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
