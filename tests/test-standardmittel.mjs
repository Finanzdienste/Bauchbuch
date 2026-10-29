/*
 * Die eigenen Mittel: einmal mit Dosis und üblicher Zeit gemerkt, danach mit
 * einem Tipp eingetragen.
 *
 * Geprüft wird der ganze Weg – merken, auf
 * dem Tag-Reiter mit einem Tipp eintragen (auch nachträglich für gestern),
 * im Bogen auswählen, wieder entfernen –, und dass die übliche Zeit an der
 * Mahlzeit des richtigen Tages einrastet, nicht an einer erfundenen.
 */
import { chromium } from 'playwright';
import { ROOT, KEY, HANDY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING || ROOT;

const kopie = await kopieServer(PRUEFLING, 8271, { maxAge: 0 });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: HANDY, serviceWorkers: 'block' });
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const heute = vorTagen(0);
const gestern = vorTagen(1);
await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
await page.evaluate(([k, h, g]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'heute',
  eintraege: [
    { id: 'fh', art: 'essen', am: h, um: '07:45', was: 'Haferbrei', zutaten: [], portion: 'normal' },
    { id: 'fg', art: 'essen', am: g, um: '08:20', was: 'Brot', zutaten: [], portion: 'normal' },
  ],
})), [KEY, heute, gestern]);
await page.reload({ waitUntil: 'networkidle' });

const speicher = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const kurz = () => page.waitForTimeout(150);

/* ---------- 1. Merken, mit Dosis und Zeit ---------- */

check(
  !(await page.locator('#view').textContent()).includes('Meine Mittel'),
  'ohne gemerktes Mittel gibt es keine Reihe „Meine Mittel"',
);

await page.locator('[data-act="neu"][data-art="medikament"]').click();
await kurz();
await page.locator('#bogenMittel').fill('Pantoprazol');
await page.locator('#bogenDosis').fill('40 mg');
await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').click();
await kurz();
await page.locator('[data-act="zeit-bezug"][data-id="vor"]').click();
await kurz();
check(await page.locator('#bogenUhr').inputValue() === '07:15', 'vor dem Frühstück um 07:45 heißt 07:15');
check(await page.locator('[data-act="standard-umschalten"]').count() === 1, 'der Bogen bietet an, das Mittel zu merken');
await page.locator('[data-act="standard-umschalten"]').click();
await kurz();
check(
  await page.locator('[data-act="standard-umschalten"]').getAttribute('aria-pressed') === 'true',
  'und zeigt, dass es gemerkt wird',
);
check(
  await page.locator('#bogenMittel').inputValue() === 'Pantoprazol' && await page.locator('#bogenDosis').inputValue() === '40 mg',
  'Name und Dosis überstehen das Umschalten',
);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);

let s = await speicher();
check(s.standardMittel.length === 1, 'ein Mittel steht in „Meine Mittel"');
const pp = s.standardMittel[0] || {};
check(
  pp.mittel === 'Pantoprazol' && pp.dosis === '40 mg' && pp.tageszeit === 'morgens' && pp.bezug === 'vor',
  `mit Dosis und üblicher Zeit (${JSON.stringify({ m: pp.mittel, d: pp.dosis, t: pp.tageszeit, b: pp.bezug })})`,
);

/* ---------- 2. Auf dem Tag-Reiter ---------- */

const reihe = page.locator('[data-act="standard-eintragen"]');
check(await reihe.count() === 1, 'auf dem Tag-Reiter steht die Reihe „Meine Mittel"');
check((await reihe.first().textContent()).includes('Pantoprazol · 40 mg'), 'mit Name und Dosis');
check((await reihe.first().textContent()).includes('✓'), 'und einem Häkchen, weil es heute schon eingetragen ist');

/* ---------- 3. Gestern nachtragen, mit einem Tipp ---------- */

await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await kurz();
check(!(await reihe.first().textContent()).includes('✓'), 'gestern steht es noch nicht – kein Häkchen');
await reihe.first().click();
await page.waitForTimeout(250);
s = await speicher();
const gestrige = s.eintraege.filter((e) => e.art === 'medikament' && e.am === gestern);
check(gestrige.length === 1, 'ein Tipp legt den Eintrag für gestern an');
const g = gestrige[0] || {};
check(
  g.mittel === 'Pantoprazol' && g.dosis === '40 mg',
  `mit Name und Dosis (${g.mittel} ${g.dosis})`,
);
check(
  g.um === '07:50' && g.ungefaehr === true && g.tageszeit === 'morgens' && g.bezug === 'vor' && g.bezugMahlzeit === 'fg',
  `vor dem Frühstück von gestern um 08:20, also ≈07:50 (${g.um}, ${g.bezugMahlzeit})`,
);
check(!('bezugBasis' in g), 'ohne Hilfswerte im Speicher');
check((await page.locator('#toast').textContent()).includes('≈07:50'), 'die Meldung nennt die Zeit');
check((await reihe.first().textContent()).includes('✓'), 'danach mit Häkchen');

await reihe.first().click();
await page.waitForTimeout(250);
s = await speicher();
check(
  s.eintraege.filter((e) => e.art === 'medikament' && e.am === gestern).length === 2,
  'ein zweiter Tipp legt einen zweiten Eintrag an – manches nimmt man zweimal',
);
await page.screenshot({ path: `${SHOT}/standardmittel-tag.png` });

/* ---------- 4. Im Bogen auswählen ---------- */

await page.locator('[data-act="neu"][data-art="medikament"]').click();
await kurz();
check(await page.locator('[data-act="standard-waehlen"]').count() === 1, 'der Bogen zeigt „Meine Mittel" oben');
await page.locator('[data-act="standard-waehlen"]').click();
await kurz();
check(
  await page.locator('#bogenMittel').inputValue() === 'Pantoprazol' && await page.locator('#bogenDosis').inputValue() === '40 mg',
  'ein Tipp füllt Name und Dosis',
);
check(
  await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').getAttribute('aria-pressed') === 'true'
    && await page.locator('[data-act="zeit-bezug"][data-id="vor"]').getAttribute('aria-pressed') === 'true'
    && await page.locator('#bogenUhr').inputValue() === '07:50',
  'und setzt die übliche Zeit für diesen Tag',
);
check(
  (await page.locator('.standard-zeile').textContent()).includes('Steht bei deinen Mitteln'),
  'der Bogen sagt, dass es schon gemerkt ist',
);
await page.screenshot({ path: `${SHOT}/standardmittel-bogen.png` });

await page.locator('[data-act="standard-entfernen"]').click();
await kurz();
await page.locator('button.bogen-zu').click();
await kurz();
s = await speicher();
check(s.standardMittel.length === 0, '„Dort entfernen" nimmt es aus den eigenen Mitteln');
check(
  s.eintraege.filter((e) => e.art === 'medikament').length === 3,
  'die schon eingetragenen Einnahmen bleiben',
);
check(await reihe.count() === 0, 'und die Reihe auf dem Tag-Reiter ist weg');

/* ---------- 5. Ohne übliche Zeit ---------- */

await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
await kurz();
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await kurz();
await page.locator('#bogenMittel').fill('Iberogast');
await page.locator('#bogenDosis').fill('20 Tropfen');
await page.locator('[data-act="standard-umschalten"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
s = await speicher();
check(
  s.standardMittel.length === 1 && s.standardMittel[0].tageszeit === null && s.standardMittel[0].bezug === null,
  'ein Mittel ohne gewählte Zeit wird ohne übliche Zeit gemerkt',
);

// Heute: ein Tipp trägt mit der jetzigen Uhrzeit ein, genau, nicht ungefähr.
const vorher = s.eintraege.length;
await reihe.first().click();
await page.waitForTimeout(250);
s = await speicher();
const jetzt = s.eintraege.find((e) => e.art === 'medikament' && e.mittel === 'Iberogast' && e.am === heute
  && e !== s.eintraege[0] && s.eintraege.length === vorher + 1);
check(s.eintraege.length === vorher + 1, 'heute trägt ein Tipp sofort ein');
check(jetzt && !jetzt.ungefaehr, 'mit der jetzigen Uhrzeit, nicht als ungefähr');

// Gestern: ohne übliche Zeit gibt es keine erfundene Mittagszeit, sondern den Bogen.
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await kurz();
const vorGestern = (await speicher()).eintraege.length;
await reihe.first().click();
await page.waitForTimeout(250);
check((await speicher()).eintraege.length === vorGestern, 'gestern ohne übliche Zeit: nichts wird still eingetragen');
check(
  await page.locator('#bogenMittel').inputValue() === 'Iberogast'
    && await page.locator('#bogenDosis').inputValue() === '20 Tropfen',
  'stattdessen öffnet sich der Bogen, mit Name und Dosis',
);
await page.locator('button.bogen-zu').click();
await kurz();

/* ---------- 6. Dasselbe zweimal gemerkt, andere Dosis getrennt ---------- */

/*
 * Der Schalter wird hier *vor* dem Tippen umgelegt. Dann weiß der Bogen beim
 * Zeichnen noch nicht, dass „Iberogast · 20 Tropfen" schon gemerkt ist – und
 * nur so kommt der Fall bis zum Speicher, wo er nicht doppelt landen darf.
 */
for (const dosis of ['20 Tropfen', '40 Tropfen']) {
  await page.locator('[data-act="neu"][data-art="medikament"]').click();
  await kurz();
  await page.locator('[data-act="standard-umschalten"]').click();
  await kurz();
  await page.locator('#bogenMittel').fill('Iberogast');
  await page.locator('#bogenDosis').fill(dosis);
  await page.locator('[data-act="zeit-tageszeit"][data-id="abends"]').click();
  await kurz();
  await page.locator('[data-act="bogen-speichern"]').click();
  await page.waitForTimeout(250);
}
s = await speicher();
const ibero = s.standardMittel.filter((x) => x.mittel === 'Iberogast');
check(ibero.length === 2, `dieselbe Dosis zweimal gemerkt ergibt einen Eintrag, eine andere Dosis einen zweiten (${ibero.length})`);
check(
  (ibero.find((x) => x.dosis === '20 Tropfen') || {}).tageszeit === 'abends',
  'und beim schon gemerkten wird nur die übliche Zeit aufgefrischt',
);

/* ---------- 7. Bleibt, und kommt beim Zusammenführen mit ---------- */

await page.reload({ waitUntil: 'networkidle' });
s = await speicher();
check(s.standardMittel.length === 2, 'die eigenen Mittel überstehen das Neuladen');

const fremd = JSON.stringify({
  eintraege: [{ id: 'x1', art: 'notiz', am: gestern, um: '09:00', text: 'von woanders' }],
  standardMittel: [
    { id: 'a', mittel: 'Iberogast', dosis: '20 Tropfen', tageszeit: null, bezug: null },
    { id: 'b', mittel: 'L-Thyroxin', dosis: '50 µg', tageszeit: 'morgens', bezug: 'vor' },
  ],
});
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
await page.locator('[data-act="einfuegen-auf"]').click();
await kurz();
await page.locator('[data-act="einfuegen-text"]').fill(fremd);
await page.locator('[data-act="einfuegen-los"]').click();
await page.waitForTimeout(300);
s = await speicher();
check(
  s.standardMittel.length === 3 && s.standardMittel.some((x) => x.mittel === 'L-Thyroxin'),
  `beim Zusammenführen kommen fremde Mittel dazu, doppelte nicht (${s.standardMittel.map((x) => x.mittel + ' ' + x.dosis).join(', ')})`,
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
