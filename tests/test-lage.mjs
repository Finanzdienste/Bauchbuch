/*
 * „Was Sache ist" – und wann eben nicht
 *
 * Die Zusammenfassung ganz oben ist die gefährlichste Karte der App. Sie ist
 * die einzige, die jemand mit Sicherheit liest, sie steht ohne Fallzahlen da,
 * und sie ist die einzige Stelle, an der ein Satz entstehen könnte, den keine
 * Rechnung deckt.
 *
 * Deshalb prüft diese Datei vor allem Verbote:
 *
 *   1. Was oben steht, steht unten. Kein Fund im ersten Absatz, der nicht in
 *      der Auswertung mit seinen Zahlen wiederkommt.
 *   2. Ein Scheinbefund kommt nicht nach oben. Was die Störfaktorenprüfung
 *      nicht übersteht, gehört in die Erklärung darunter, nicht in die
 *      Zusammenfassung.
 *   3. Ohne Grundlage kein beruhigender Satz. „Alles unauffällig" wäre die
 *      bequemste Lüge dieser App.
 *   4. Warnzeichen zuerst, immer.
 *   5. Höchstens fünf Sätze. Der sechste verdrängt einen, der gelesen worden
 *      wäre.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const zeigen = async (zustand) => {
  await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify(z)), [KEY, {
    begruesst: true, tab: 'muster', ...zustand,
  }]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return {
    lage: (await page.locator('.karte-lage').textContent()).replace(/\s+/g, ' '),
    alles: (await page.locator('#view').textContent()).replace(/\s+/g, ' '),
    saetze: await page.locator('.lage-satz').count(),
  };
};

/* ---------- 1. Ein echter Fund steht oben – und unten ---------- */

/*
 * Kaffee wirkt hier wirklich, unabhängig von Anspannung und Schlaf. Er muss
 * es also in den ersten Absatz schaffen; und derselbe Auslöser muss weiter
 * unten mit seinen Fallzahlen wiederauftauchen.
 */
const echt = { eintraege: [], tage: {} };
for (let i = 1; i <= 90; i++) {
  const am = vorTagen(i);
  const angespannt = i % 2 === 0;
  echt.tage[am] = { notiert: true, stress: angespannt ? 4 : 0, schlaf: angespannt ? 4 : 0 };
  const mitKaffee = i % 3 !== 0;
  echt.eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
    zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
  });
  const staerke = 1 + (angespannt ? 2 : 0) + (mitKaffee ? 4 : 0);
  echt.eintraege.push({
    id: `b${i}`, am, um: '10:00', art: 'beschwerde', staerke, arten: ['brennen'],
  });
}

const a = await zeigen(echt);
check(a.lage.includes('Was Sache ist'), 'die Karte steht ganz oben auf dem Reiter');
check(a.lage.includes('Kaffee'), 'der stärkste haltbare Fund steht im ersten Absatz');
check(
  a.lage.includes('gleicher Anspannung'),
  'mit dem Hinweis, dass er die Störfaktorenprüfung überstanden hat',
);
check(a.saetze >= 2 && a.saetze <= 5, `zwischen zwei und fünf Sätze (${a.saetze})`);

/*
 * Und die Regel, an der sich das Ganze messen lässt: Was oben steht, steht
 * unten mit seinen Zahlen. Der Auslöser muss also auch in der Fundliste
 * vorkommen, samt Fallzahlen.
 */
const untenTeil = a.alles.split('Was Sache ist')[1] || '';
check(
  untenTeil.includes('Kaffee') && /\d+ Mahlzeiten damit/.test(untenTeil),
  'und weiter unten steht derselbe Fund mit seinen Fallzahlen',
);

/* ---------- 2. Ein Scheinbefund kommt nicht nach oben ---------- */

/*
 * Jetzt dasselbe Tagebuch, aber der Kaffee wirkt nicht: Er fällt nur mit dem
 * Stress zusammen. Unten muss er vorkommen – mit der Erklärung, dass der
 * Unterschied unter gleichen Umständen verschwindet. Oben darf er nicht
 * stehen, denn dort steht kein Grund dabei.
 */
const schein = { eintraege: [], tage: {} };
for (let i = 1; i <= 90; i++) {
  const am = vorTagen(i);
  const angespannt = i % 2 === 0;
  schein.tage[am] = { notiert: true, stress: angespannt ? 4 : 0, schlaf: angespannt ? 4 : 0 };
  const mitKaffee = angespannt ? i % 8 !== 0 : i % 6 === 1;
  schein.eintraege.push({
    id: `m${i}`, am, um: '08:00', art: 'essen', was: 'Frühstück', portion: 'normal',
    zutaten: mitKaffee ? [{ id: 'kaffee', rolle: 'haupt' }] : [{ id: 'obst', rolle: 'haupt' }],
  });
  schein.eintraege.push({
    id: `b${i}`, am, um: '10:00', art: 'beschwerde',
    staerke: 1 + (angespannt ? 4 : 0), arten: ['brennen'],
  });
}

const b = await zeigen(schein);
check(
  !b.lage.includes('Am deutlichsten fällt Kaffee auf'),
  'ein Scheinbefund steht nicht in der Zusammenfassung',
);
check(
  (b.alles.split('Was Sache ist')[1] || '').includes('verschwindet'),
  'sondern unten, mit dem Urteil der Störfaktorenprüfung',
);

/* ---------- 3. Ohne Grundlage kein beruhigender Satz ---------- */

const duenn = {
  eintraege: [
    {
      id: 'm1', am: vorTagen(2), um: '12:00', art: 'essen', was: 'Suppe',
      zutaten: [{ id: 'kaffee', rolle: 'haupt' }],
    },
    { id: 'b1', am: vorTagen(2), um: '14:00', art: 'beschwerde', staerke: 8, arten: ['brennen'] },
  ],
  tage: { [vorTagen(2)]: { notiert: true } },
};
const c = await zeigen(duenn);
check(
  !/unauffällig|alles in Ordnung|kein Zusammenhang/i.test(c.lage),
  'bei zwei Eintragungen keine Entwarnung',
);
check(
  /noch nichts|noch nicht/i.test(c.lage),
  'sondern der Satz, dass es dafür noch nicht reicht',
);
check(
  c.lage.includes('heißt nicht, dass nichts da ist'),
  'und ausdrücklich: zu wenig heißt nicht unauffällig',
);

/* ---------- 4. Warnzeichen zuerst ---------- */

const warn = {
  eintraege: [
    ...duenn.eintraege,
    {
      id: 'w1', am: vorTagen(1), um: '09:00', art: 'beschwerde', staerke: 7,
      arten: ['krampf'], warnzeichen: ['blutstuhl'],
    },
  ],
  tage: { ...duenn.tage, [vorTagen(1)]: { notiert: true } },
};
const dd = await zeigen(warn);
const ersterSatz = await page.locator('.lage-satz').first().textContent();
check(
  /abgeklärt/.test(ersterSatz),
  `das Warnzeichen steht im ersten Satz (${ersterSatz.slice(0, 60)}…)`,
);
check(
  await page.locator('.lage-satz.l-warnung').count() > 0,
  'und ist als Warnung ausgezeichnet, nicht als Fund unter anderen',
);
check(!/Diagnose/i.test(dd.lage.split('.')[0]), 'ohne im ersten Satz eine Diagnose zu stellen');

/* ---------- 5. Und im Bericht, ganz oben ---------- */

const zettel = await page.evaluate(async ([e, t]) => {
  const bb = await import('./js/bericht.js');
  const alle = Object.keys(t).sort();
  return bb.arztBericht({ eintraege: e, tage: t }, alle[0], alle[alle.length - 1]);
}, [echt.eintraege, echt.tage]);

const kopf = zettel.split('\n').slice(0, 14).join(' ');
check(zettel.includes('IN KÜRZE'), 'der Bericht führt die Zusammenfassung');
check(kopf.includes('IN KÜRZE'), 'und zwar oben, nicht am Ende');
check(
  zettel.indexOf('IN KÜRZE') < zettel.indexOf('ÜBERSICHT'),
  'vor den Zahlen, die sie zusammenfasst',
);
check(
  (zettel.split('IN KÜRZE')[1] || '').split('ÜBERSICHT')[0].includes('Kaffee'),
  'mit dem Fund, um den es geht',
);
check(
  zettel.includes('dort stehen die Fallzahlen'),
  'und dem Verweis darauf, wo die Zahlen dazu stehen',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/lage.png`, fullPage: true });
await browser.close();
ende();
