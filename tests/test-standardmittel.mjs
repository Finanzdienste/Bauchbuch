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
  await page.locator('[data-act="standard-eintragen"]').count() === 0,
  'ohne gemerktes Mittel gibt es keine Reihe „Meine Mittel"',
);
check(
  await page.locator('[data-act="meine-mittel-zeigen"]').count() === 1,
  'stattdessen ein Satz, wo man sie anlegt',
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
check((await reihe.first().textContent()).includes('Pantoprazol 40 mg'), 'mit Name und Dosis');
check((await reihe.first().textContent()).includes('· morgens'), 'und der üblichen Zeit');
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

// Zwei Tipps: Der erste fragt, der zweite entfernt – wie beim Löschen.
await page.locator('[data-act="standard-entfernen"]').click();
await kurz();
check((await speicher()).standardMittel.length === 1
    && (await page.locator('[data-act="standard-entfernen"]').textContent()).includes('Wirklich entfernen?'),
  '„Dort entfernen" fragt beim ersten Tipp nur');
await page.locator('[data-act="standard-entfernen"]').click();
await kurz();
check((await page.locator('#toast').textContent()).includes('Rückgängig'), 'und bietet danach „Rückgängig" an');
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
// Die Uhrzeit ist leer: Eine vorbelegte 12:00 wäre mit einem Tipp gespeichert.
check(await page.locator('#bogenUhr').inputValue() === '', 'die Uhrzeit ist leer, nicht 12:00');
await page.locator('[data-act="bogen-speichern"]').click();
await kurz();
check((await speicher()).eintraege.length === vorGestern && (await page.locator('#toast').textContent()).startsWith('Um wie viel Uhr?'),
  'ohne Zeitwahl wird nichts gespeichert');
await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
const morgens = (await speicher()).eintraege.find((e) => e.am === gestern && e.mittel === 'Iberogast');
check(morgens && morgens.ungefaehr === true && morgens.tageszeit === 'morgens', 'nach „morgens" wird ungefähr am Morgen eingetragen');
await reihe.first().click();
await page.waitForTimeout(250);
await page.locator('button.bogen-zu').click();
await kurz();

/* ---------- 6. Dasselbe zweimal gemerkt, andere Dosis oder Zeit getrennt ---------- */

/*
 * Der Schalter wird hier *vor* dem Tippen umgelegt. Dann weiß der Bogen beim
 * Zeichnen noch nicht, dass „Iberogast 20 Tropfen · abends" schon gemerkt ist
 * – und nur so kommt der Fall bis zum Speicher, wo er nicht doppelt landen
 * darf.
 *
 * Die übliche Zeit gehört zum Mittel: „Iberogast 20 Tropfen" ohne Zeit (aus
 * Schritt 5) und „· abends" sind zwei Knöpfe, so wie die Tablette morgens und
 * die abends. Früher frischte das zweite Merken nur die Zeit des ersten auf.
 */
for (const dosis of ['20 Tropfen', '20 Tropfen', '40 Tropfen']) {
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
check(
  ibero.filter((x) => x.dosis === '20 Tropfen' && x.tageszeit === 'abends').length === 1,
  'genau dasselbe zweimal gemerkt ergibt einen Eintrag',
);
check(
  ibero.length === 3 && ibero.some((x) => x.dosis === '20 Tropfen' && x.tageszeit === null),
  `eine andere Zeit oder Dosis ergibt einen eigenen, der ohne Zeit bleibt (${ibero.map((x) => `${x.dosis} ${x.tageszeit}`).join(', ')})`,
);

/* ---------- 7. Bleibt, und kommt beim Zusammenführen mit ---------- */

await page.reload({ waitUntil: 'networkidle' });
s = await speicher();
check(s.standardMittel.length === 3, 'die eigenen Mittel überstehen das Neuladen');

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
  s.standardMittel.length === 4 && s.standardMittel.some((x) => x.mittel === 'L-Thyroxin'),
  `beim Zusammenführen kommen fremde Mittel dazu, doppelte nicht (${s.standardMittel.map((x) => x.mittel + ' ' + x.dosis).join(', ')})`,
);
check(
  s.standardMittel.filter((x) => x.mittel === 'Iberogast').every((x) => x.form === null),
  'ein neu gemerktes Mittel hat ausdrücklich keine Form',
);

/* ---------- 8. Die Form bei Methylphenidat ---------- */

/*
 * Die Form gehört zum Präparat und damit zum eigenen Mittel. Sie darf
 * nicht verschwinden, weil jemand unter „Mehr" die Dosis ändert oder im Bogen
 * „Dort so ändern" tippt: Daran hängt später, ob ein Säureblocker dazu passt.
 * Und sie darf nicht stehen bleiben, wenn aus dem Eintrag ein anderes Mittel
 * wird.
 */
await page.evaluate(([k, h]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'mehr',
  eintraege: [{ id: 'fr', art: 'essen', am: h, um: '07:30', was: 'Müsli', zutaten: [], portion: 'normal' }],
  tage: {},
  standardMittel: [
    { id: 'r1', mittel: 'Ritalin Adult', dosis: '20 mg', tageszeit: 'morgens', bezug: null, form: 'sodas' },
    { id: 'o1', mittel: 'Omeprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor', form: null },
  ],
})), [KEY, heute]);
await page.reload({ waitUntil: 'networkidle' });
const formVon = async (id) => ((await speicher()).standardMittel.find((x) => x.id === id) || {}).form;

await page.locator('[data-act="meinmittel-aendern"][data-id="r1"]').click();
await kurz();
await page.locator('#mmDosis').fill('30 mg');
await page.locator('[data-act="mm-speichern"]').click();
await page.waitForTimeout(250);
s = await speicher();
const r1 = s.standardMittel.find((x) => x.id === 'r1') || {};
check(r1.dosis === '30 mg' && r1.form === 'sodas',
  `die Dosis unter „Mehr" ändern lässt die Form stehen (${r1.dosis}, ${r1.form})`);

// Ein Tipp auf dem Tag-Reiter nimmt die Form mit – und nur, wenn es eine gibt.
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz();
await page.locator('[data-act="standard-eintragen"][data-id="r1"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="standard-eintragen"][data-id="o1"]').click();
await page.waitForTimeout(250);
s = await speicher();
const ritalin = s.eintraege.find((e) => e.mittel === 'Ritalin Adult');
const omep = s.eintraege.find((e) => e.mittel === 'Omeprazol');
check(ritalin && ritalin.form === 'sodas' && ritalin.dosis === '30 mg', 'ein Tipp trägt die Form des eigenen Mittels mit ein');
check(omep && !('form' in omep), 'ohne Form keine – auch kein leeres Feld');

// „Dort so ändern" ändert die Dosis und behält die Form.
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await kurz();
await page.locator('[data-act="standard-waehlen"][data-id="r1"]').click();
await kurz();
await page.locator('#bogenDosis').fill('40 mg');
await page.locator('#bogenDosis').dispatchEvent('input');
await kurz();
await page.locator('[data-act="standard-anpassen"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
s = await speicher();
const r1b = s.standardMittel.find((x) => x.id === 'r1') || {};
check(r1b.dosis === '40 mg' && r1b.form === 'sodas',
  `„Dort so ändern" ändert die Dosis und lässt die Form stehen (${r1b.dosis}, ${r1b.form})`);

// Umbenennen: Aus dem Methylphenidat wird ein anderes Mittel.
await page.evaluate(async (id) => {
  const st = await import('/js/store.js');
  st.eintragAendern(id, { essen: 'mit', essenGesetzt: Date.now() });
  st.sofortSchreiben();
}, ritalin.id);
const umbenennen = async (name) => {
  await page.locator(`[data-act="bearbeiten"][data-id="${ritalin.id}"]`).click();
  await kurz();
  await page.locator('#bogenMittel').fill(name);
  await page.locator('#bogenMittel').dispatchEvent('input');
  await kurz();
  await page.locator('[data-act="bogen-speichern"]').click();
  await page.waitForTimeout(250);
  return (await speicher()).eintraege.find((e) => e.id === ritalin.id) || {};
};
let e1 = await umbenennen('Medikinet retard');
// Die Form gehörte zu „Ritalin Adult": Beim neuen Namen gilt die, die er
// nennt (siehe Abschnitt 12). Die Essensangabe gehört zur Einnahme und bleibt.
check(e1.form === 'pellet' && e1.essen === 'mit' && e1.essenGesetzt > 0,
  `von einem Methylphenidat zum anderen: die Form folgt dem neuen Namen, die Essensangabe bleibt (${e1.form}, ${e1.essen})`);
e1 = await umbenennen('Strattera');
check(e1.form === null && e1.essen === 'mit',
  `zu einem ADHS-Mittel ohne Formen: die Form geht, die Essensangabe bleibt (${e1.form}, ${e1.essen})`);
e1 = await umbenennen('Pantoprazol');
check(e1.mittel === 'Pantoprazol' && e1.form === null && e1.essen === null && e1.essenGesetzt === null,
  `umbenannt in einen Säureblocker: Form und Essensangabe sind weg (${e1.form}, ${e1.essen}, ${e1.essenGesetzt})`);
check(await formVon('r1') === 'sodas', 'das eigene Mittel behält dabei seine Form');

/* ---------- 9. Die Form und der Hinweis zum Paar ---------- */

/*
 * Eine Kapsel mit zweierlei Kügelchen und ein Säureblocker unter „Meine
 * Mittel": Die Karte auf „Tag" (Stufe A) muss bleiben, wenn unter „Mehr" nur
 * die Dosis geändert wird. Und wer im Bogen eine andere Form wählt, kann sie
 * beim eigenen Mittel übernehmen.
 */
await page.evaluate(([k, h]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'mehr',
  eintraege: [{ id: 'fq', art: 'essen', am: h, um: '07:30', was: 'Toast', zutaten: [], portion: 'normal' }],
  tage: {},
  standardMittel: [
    { id: 'p1', mittel: 'Medikinet', dosis: '10 mg', tageszeit: 'morgens', bezug: null, form: 'pellet' },
    { id: 'p2', mittel: 'Esomeprazol', dosis: '20 mg', tageszeit: 'morgens', bezug: 'vor', form: null },
  ],
})), [KEY, heute]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="meinmittel-aendern"][data-id="p1"]').click();
await kurz();
await page.locator('#mmDosis').fill('20 mg');
await page.locator('[data-act="mm-speichern"]').click();
await page.waitForTimeout(250);
check(await formVon('p1') === 'pellet', 'die Dosis unter „Mehr" ändern lässt die Kapsel-Form stehen');
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz();
check((await page.locator('.wechsel-karte').count()) === 1
  && (await page.locator('.wechsel-karte').innerText()).includes('Kapsel mit zweierlei Kügelchen und Esomeprazol'),
  'und die Karte auf „Tag" bleibt – der Hinweis hängt an der Form, nicht an der Dosis');
// Im Bogen eine andere Form wählen und dort übernehmen.
await page.locator('[data-act="neu"][data-art="medikament"]').click();
await kurz();
await page.locator('[data-act="standard-waehlen"][data-id="p1"]').click();
await kurz();
check(await page.locator('[data-act="bogen-form"][data-id="pellet"]').getAttribute('aria-pressed') === 'true',
  'im Bogen ist die Form des eigenen Mittels vorgewählt');
check(await page.locator('[data-act="standard-form"]').count() === 0, 'solange sie gleich ist, gibt es nichts zu übernehmen');
await page.locator('[data-act="bogen-form"][data-id="sofort"]').click();
await kurz();
check(await page.locator('[data-act="standard-form"]').count() === 1, 'eine andere Form: „Form dort übernehmen"');
await page.locator('[data-act="standard-form"]').click();
await kurz();
check(await formVon('p1') === 'sofort', '„Form dort übernehmen" ändert die Form beim eigenen Mittel');
s = await speicher();
const p1 = s.standardMittel.find((x) => x.id === 'p1');
check(p1.dosis === '20 mg' && p1.tageszeit === 'morgens', 'und sonst nichts daran');
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
s = await speicher();
check(s.eintraege.some((e) => e.mittel === 'Medikinet' && e.form === 'sofort'), 'der Eintrag trägt die gewählte Form');
check(await page.locator('.wechsel-karte').count() === 0, 'mit der nicht retardierten Tablette keine Karte der Stufe A mehr');

/* ---------- 10. Die Form folgt dem Mittel ---------- */

/*
 * Die Form gehört zu einem bestimmten Präparat. Wählt man im Bogen
 * ein anderes eigenes Mittel oder benennt man eins unter „Mehr" um, darf die
 * alte Form nicht mitwandern: Aus einer Kapsel mit zweierlei Kügelchen würde
 * sonst eine Retardtablette mit Hülle, und der Hinweis zum Säureblocker
 * (Stufe A) fiele still weg. Nur eine bloße Dosisänderung behält sie (oben).
 */
await page.evaluate(([k, g]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'heute',
  eintraege: [{ id: 'fz', art: 'essen', am: g, um: '07:30', was: 'Brot', zutaten: [], portion: 'normal' }],
  tage: {},
  standardMittel: [
    { id: 'c1', mittel: 'Concerta', dosis: '18 mg', tageszeit: null, bezug: null, form: 'oros' },
    { id: 'k1', mittel: 'Medikinet', dosis: '10 mg', tageszeit: null, bezug: null, form: null },
    { id: 'r2', mittel: 'Ritalin Adult', dosis: '20 mg', tageszeit: null, bezug: null, form: 'sodas' },
  ],
})), [KEY, gestern]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await kurz();
const gestrigeMittel = async () => (await speicher()).eintraege.filter((e) => e.art === 'medikament' && e.am === gestern);
const gedrueckt = async () => page.locator('[data-act="bogen-form"][aria-pressed="true"]')
  .evaluateAll((l) => l.map((x) => x.dataset.id));

// Ein Tipp auf Concerta öffnet gestern den Bogen – mit der Form von Concerta.
await page.locator('[data-act="standard-eintragen"][data-id="c1"]').click();
await kurz();
check(JSON.stringify(await gedrueckt()) === '["oros"]', 'der Bogen nach dem Tipp auf Concerta zeigt dessen Form');
// Dann ein anderes eigenes Mittel gewählt: eins ohne Form.
await page.locator('[data-act="standard-waehlen"][data-id="k1"]').click();
await kurz();
check((await gedrueckt()).length === 0,
  `ein anderes Mittel ohne Form gewählt: keine Form mehr vorgewählt (${(await gedrueckt()).join(', ')})`);
await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
let ohneForm = (await gestrigeMittel()).find((e) => e.mittel === 'Medikinet') || {};
check(ohneForm.id && !ohneForm.form,
  `gespeichert wird das gewählte Mittel ohne die Form des ersten (${ohneForm.mittel}, ${ohneForm.form})`);

// Dasselbe mit einem Mittel, das eine eigene Form hat: dessen Form gilt.
await page.locator('[data-act="standard-eintragen"][data-id="c1"]').click();
await kurz();
await page.locator('[data-act="standard-waehlen"][data-id="r2"]').click();
await kurz();
check(JSON.stringify(await gedrueckt()) === '["sodas"]', 'ein anderes Mittel mit Form gewählt: dessen Form ist vorgewählt');
await page.locator('[data-act="zeit-tageszeit"][data-id="mittags"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
const mitForm = (await gestrigeMittel()).find((e) => e.mittel === 'Ritalin Adult') || {};
check(mitForm.form === 'sodas', `gespeichert mit der Form des gewählten Mittels (${mitForm.form})`);

// Beim Ändern eines Eintrags genauso – dort muss die alte Form ausdrücklich weg.
await page.locator(`[data-act="bearbeiten"][data-id="${mitForm.id}"]`).click();
await kurz();
await page.locator('[data-act="standard-waehlen"][data-id="k1"]').click();
await kurz();
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
ohneForm = (await speicher()).eintraege.find((e) => e.id === mitForm.id) || {};
check(ohneForm.mittel === 'Medikinet' && !ohneForm.form,
  `ein geänderter Eintrag behält die Form des alten Mittels nicht (${ohneForm.mittel}, ${ohneForm.form})`);

// Unter „Mehr" umbenannt: Die Form gehörte zum alten Namen.
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz();
const umbenennenMehr = async (id, name) => {
  await page.locator(`[data-act="meinmittel-aendern"][data-id="${id}"]`).click();
  await kurz();
  await page.locator('#mmName').fill(name);
  await page.locator('[data-act="mm-speichern"]').click();
  await page.waitForTimeout(250);
  return (await speicher()).standardMittel.find((x) => x.id === id) || {};
};
let neuName = await umbenennenMehr('r2', 'Pantoprazol');
check(neuName.mittel === 'Pantoprazol' && neuName.form === null,
  `„Ritalin Adult" in „Pantoprazol" umbenannt: die Form ist weg (${neuName.form})`);
neuName = await umbenennenMehr('c1', 'Medikinet retard');
check(neuName.mittel === 'Medikinet retard' && neuName.form === null,
  `„Concerta" in „Medikinet retard" umbenannt: keine Hülle mehr, die Form ist offen (${neuName.form})`);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz();
await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
await kurz();
for (const id of ['r2', 'c1']) {
  await page.locator(`[data-act="standard-eintragen"][data-id="${id}"]`).click();
  await page.waitForTimeout(250);
}
s = await speicher();
const heutige = s.eintraege.filter((e) => e.art === 'medikament' && e.am === heute);
check(heutige.length === 2 && heutige.every((e) => !('form' in e)),
  `danach trägt der Tipp keine alte Form ein (${heutige.map((e) => `${e.mittel}: ${e.form}`).join(', ')})`);

/*
 * Ein eigenes Mittel mit einer Form, die nicht zu seinem Namen passt – aus
 * einem älteren Stand oder einer Sicherung: Der Tipp trägt sie nicht ein. Eine
 * Form gibt es nur bei Methylphenidat.
 */
await page.evaluate(([k]) => {
  const st = JSON.parse(localStorage.getItem(k));
  st.standardMittel = [{ id: 'x1', mittel: 'Omeprazol', dosis: '20 mg', tageszeit: null, bezug: null, form: 'pellet' }];
  localStorage.setItem(k, JSON.stringify(st));
}, [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="standard-eintragen"][data-id="x1"]').click();
await page.waitForTimeout(250);
const omeprazol = (await speicher()).eintraege.find((e) => e.mittel === 'Omeprazol') || {};
check(omeprazol.id && !('form' in omeprazol), `ein Säureblocker bekommt durch den Tipp keine Form (${omeprazol.form})`);

/* ---------- 11. Nur die Form ändern ---------- */

/*
 * standardAendern() mit einer Vorlage, die nur einen Teil nennt: Was sie nicht
 * nennt, bleibt. „Form dort übernehmen" braucht genau das – ein Aufruf nur
 * mit der Form darf den Namen nicht leeren.
 */
const teil = await page.evaluate(async () => {
  const st = await import('/js/store.js');
  const id = st.zustandLesen().standardMittel[0].id;
  const r1 = st.standardAendern(id, { form: 'sofort' });
  const nachForm = { ...st.zustandLesen().standardMittel[0] };
  const r2 = st.standardAendern(id, { mittel: 'Medikinet', dosis: '20 mg' });
  const nachName = { ...st.zustandLesen().standardMittel[0] };
  return { id, r1, nachForm, r2, nachName };
});
check(teil.r1.id === teil.id && teil.nachForm.form === 'sofort' && teil.nachForm.mittel === 'Omeprazol'
  && teil.nachForm.dosis === '20 mg' && teil.nachForm.tageszeit === null,
  `nur die Form: Name, Dosis und Zeit bleiben (${JSON.stringify(teil.r1)}, ${teil.nachForm.mittel} ${teil.nachForm.dosis} ${teil.nachForm.form})`);
check(teil.r2.id === teil.id && teil.nachName.mittel === 'Medikinet' && teil.nachName.form === null,
  `ein neuer Name ohne Form: die alte Form geht mit dem alten Namen (${teil.nachName.mittel}, ${teil.nachName.form})`);

/* ---------- 12. Die Form folgt dem Namen auch beim Ändern eines Eintrags ---------- */

/*
 * Ein gespeicherter Eintrag bringt seine Form in den Bogen mit. Tippt man dort
 * einen anderen Namen ein, gehörte sie zum alten Präparat: Sie darf nicht als
 * „gewählt" stehen bleiben, sonst landet die Hülle von Concerta bei einer
 * Kapsel mit zweierlei Kügelchen – und der Hinweis der Stufe A fehlt.
 */
// Erst schreiben lassen, was oben noch aussteht – sonst überschreibt es den
// neuen Stand beim Neuladen (pagehide).
await page.waitForTimeout(300);
await page.evaluate(([k, g]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true,
  tab: 'heute',
  eintraege: [
    { id: 'cg', art: 'medikament', am: g, um: '07:30', mittel: 'Concerta', dosis: '18 mg', form: 'oros' },
    { id: 'cr', art: 'medikament', am: g, um: '19:00', mittel: 'Ritalin Adult', dosis: '10 mg', form: 'sodas' },
    { id: 'fy', art: 'essen', am: g, um: '07:10', was: 'Müsli', zutaten: [], portion: 'normal' },
  ],
  tage: {},
  standardMittel: [{ id: 'nx', mittel: 'Nexium', dosis: '20 mg', tageszeit: null, bezug: null, form: null }],
})), [KEY, gestern]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await kurz();
await page.locator('[data-act="bearbeiten"][data-id="cg"]').click();
await kurz();
check(JSON.stringify(await gedrueckt()) === '["oros"]', 'beim Ändern steht zuerst die Form des Eintrags da');
await page.locator('#bogenMittel').fill('Medikinet retard');
await kurz();
const formTeil = async () => ((await page.locator('.bogen-form').innerText()) || '').replace(/\s+/g, ' ');
check(JSON.stringify(await gedrueckt()) === '["pellet"]' && (await formTeil()).includes('vorgewählt nach dem Namen'),
  `ein anderer Name: die Form des alten Präparats gilt nicht mehr, vorgewählt wird nach dem neuen (${(await gedrueckt()).join(', ')})`);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
const umbenannt = (await speicher()).eintraege.find((e) => e.id === 'cg') || {};
check(umbenannt.mittel === 'Medikinet retard' && umbenannt.form === 'pellet',
  `gespeichert mit der Form des neuen Namens (${umbenannt.mittel}, ${umbenannt.form})`);
await page.locator('[data-act="tag-blaettern"][data-d="1"]').click();
await kurz();
check(await page.locator('.wechsel-karte').count() === 1
  && (await page.locator('.wechsel-karte').innerText()).includes('Kapsel mit zweierlei Kügelchen und Nexium'),
'und auf „Tag" steht der Hinweis der Stufe A zu Kügelchen und Säureblocker');
// Gegenproben: Derselbe Name (nur anders geschrieben) behält die Form; eine im
// Bogen selbst angetippte Form bleibt auch bei einem neuen Namen.
await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await kurz();
await page.locator('[data-act="bearbeiten"][data-id="cr"]').click();
await kurz();
await page.locator('#bogenMittel').fill('ritalin adult ');
await kurz();
check(JSON.stringify(await gedrueckt()) === '["sodas"]' && !(await formTeil()).includes('vorgewählt'),
  'derselbe Name, nur anders geschrieben: die Form des Eintrags bleibt gewählt');
await page.locator('[data-act="bogen-form"][data-id="sofort"]').click();
await kurz();
await page.locator('#bogenMittel').fill('Methylphenidat');
await kurz();
check(JSON.stringify(await gedrueckt()) === '["sofort"]', 'eine hier angetippte Form bleibt auch mit einem neuen Namen');
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
const angetippt = (await speicher()).eintraege.find((e) => e.id === 'cr') || {};
check(angetippt.mittel === 'Methylphenidat' && angetippt.form === 'sofort',
  `gespeichert mit der angetippten Form (${angetippt.mittel}, ${angetippt.form})`);

/* ---------- 13. Zwei Mittel nacheinander, mit dem Finger ---------- */

/*
 * Morgens zwei eigene Mittel hintereinander antippen, ohne zu rollen. Nach
 * dem ersten Eintrag des Tages erscheinen darüber „beschwerdefrei" und „Für
 * heute", die Reihe rückt nach unten – auf einem iPhone mit 390 Pixeln genau
 * unter die Meldung „… eingetragen." Der zweite Tipp trägt trotzdem ein: Die
 * Meldung eines gewöhnlichen Knopfs lässt Tipps durch (nur nach einer Antwort
 * auf die Rückfrage fängt sie sie ab, siehe test-rueckfrage 16g).
 */
{
  const TAG = '2026-03-10';
  const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
    + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
  const mein = (id, mittel, dosis = '') => ({ id, mittel, dosis, tageszeit: null, bezug: null });
  const stand = {
    begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
    lastBackup: { on: TAG, anzahl: 1 }, v28Gesagt: true, v29Gesagt: true, adhsAn: false, spannungAn: false, tage: {},
    standardMittel: [mein('m1', 'Ibuprofen', '400 mg'), mein('m2', 'Pantoprazol', '20 mg'), mein('m3', 'Vitamin D')],
    eintraege: [{ id: 'n1', art: 'notiz', am: '2026-03-09', um: '07:00', text: 'Notiz' }],
  };
  const reihe = [];
  let bedeckt = 0;
  let daneben = 0;
  for (const viewport of [{ width: 390, height: 844 }, { width: 393, height: 852 }]) {
    const fctx = await browser.newContext({
      viewport, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
      timezoneId: 'Europe/Berlin', locale: 'de-DE',
    });
    await fctx.addInitScript(([k, s]) => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
      try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
    }, [KEY, stand]);
    const fp = await fctx.newPage();
    fp.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
    await fp.clock.setFixedTime(new Date(`${TAG}T08:10:00+01:00`));
    await fp.goto(kopie.adresse, { waitUntil: 'networkidle' });
    await fp.waitForTimeout(200);
    const mitte = (id) => fp.$eval(`[data-act="standard-eintragen"][data-id="${id}"]`, (k) => {
      const r = k.getBoundingClientRect();
      const t = document.getElementById('toast');
      const m = t.getBoundingClientRect();
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      return { x, y, unterMeldung: t.classList.contains('an') && x > m.left && x < m.right && y > m.top && y < m.bottom };
    });
    const a = await mitte('m1');
    await fp.touchscreen.tap(a.x, a.y);
    await fp.waitForTimeout(900);
    const b = await mitte('m2');
    if (b.unterMeldung) bedeckt += 1;
    await fp.touchscreen.tap(b.x, b.y);
    await fp.waitForTimeout(400);
    const namen = await fp.evaluate(async ([k, t]) => {
      const st = await import('/js/store.js');
      st.sofortSchreiben();
      return JSON.parse(localStorage.getItem(k)).eintraege.filter((e) => e.am === t && e.art === 'medikament').map((e) => e.mittel);
    }, [KEY, TAG]);
    reihe.push(`${viewport.width}×${viewport.height}: ${namen.join(', ') || 'nichts'}${b.unterMeldung ? ' (unter der Meldung)' : ''}`);
    if (namen.join() !== 'Ibuprofen,Pantoprazol') daneben += 1;
    await fctx.close();
  }
  check(daneben === 0 && bedeckt > 0,
    `zwei Mittel nacheinander, ohne Rollen: beide eingetragen, auch wenn die Meldung des ersten über dem zweiten liegt (${reihe.join(' | ')})`);
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
