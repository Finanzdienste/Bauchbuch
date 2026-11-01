/*
 * Einträge nachträglich ändern – und sicher löschen.
 *
 * Geprüft wird so, wie es auf dem iPhone bedient wird (Kennung von Safari
 * unter iOS 26, als App auf dem Home-Bildschirm, 320 Pixel breit):
 *
 *    1. Jede Zeile zeigt, dass sie sich öffnen lässt: „›", ein Satz über der
 *       Liste, „… ändern" für VoiceOver – und die Anleitung sagt es auch.
 *    2. Der geöffnete Bogen heißt „Kopfschmerz ändern", der Knopf „Ändern".
 *    3. Löschen mit zwei Tipps, in der Zeile und im Bogen. Danach „Gelöscht."
 *       mit „Rückgängig", das auch zurückholt, was mitgerückt ist – und nichts
 *       überschreibt, was in der Zwischenzeit geändert wurde.
 *    4. Kein leeres oder künftiges Datum, keine leere Uhrzeit – beim Anlegen
 *       und beim Ändern; auch nicht an der Ansicht vorbei.
 *    5. „Dazu genommen?" auch beim Ändern, ohne Doppelte; die Mittel rücken
 *       mit, wenn der Kopfschmerz einen anderen Tag oder eine andere Zeit
 *       bekommt.
 *    6. Zeitknöpfe und Nachziehen beim Ändern jeder Art.
 *    7. Sicherung und alte Stände: das neue Feld kommt mit, alte laden.
 *
 * Mit BAUCHBUCH_PRUEFLING=<ordner> läuft der Browserteil gegen eine
 * (veränderte) Kopie der App – so lässt sich prüfen, dass er einen
 * eingebauten Fehler bemerkt.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
// Eigener Bereich 8421–8429; die Bereiche darunter haben andere Tests.
const PORT = Number(process.env.BAUCHBUCH_PORT_AENDERN || 8421);
if (PORT < 8421 || PORT > 8429) throw new Error(`Port ${PORT} liegt außerhalb von 8421–8429`);

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 640 };

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: SCHMAL, userAgent: IPHONE, serviceWorkers: 'block', hasTouch: true, isMobile: true,
});
await ctx.addInitScript(() => {
  Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
});
const page = await ctx.newPage();
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const heute = vorTagen(0);
const gestern = vorTagen(1);
const vorgestern = vorTagen(2);
const morgen = vorTagen(-1);
const kurz = (ms = 150) => page.waitForTimeout(ms);
const speicher = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const sauber = (t) => String(t || '').replace(/\s+/g, ' ').trim();
const meldung = async () => sauber(await page.locator('#toast').textContent());
const toastLeeren = () => page.evaluate(() => { document.getElementById('toast').textContent = ''; });
const eintrag = async (id) => (await speicher()).eintraege.find((e) => e.id === id) || null;
const zeile = (id) => page.locator(`[data-act="bearbeiten"][data-id="${id}"]`);
const weg = (id) => page.locator(`[data-act="loeschen"][data-id="${id}"]`);
const tippe = async (act, id) => {
  await page.locator(`[data-act="${act}"][data-id="${id}"]`).first().click();
  await kurz();
};
const oeffne = async (id) => { await zeile(id).click(); await kurz(200); };
const neu = async (art) => { await page.locator(`[data-act="neu"][data-art="${art}"]`).click(); await kurz(); };
const speichern = async () => { await page.locator('[data-act="bogen-speichern"]').click(); await kurz(300); };
const zu = async () => { await page.locator('button.bogen-zu').click(); await kurz(); };
const zuTag = async (iso) => { await page.locator('.tag-datum').fill(iso); await kurz(200); };
const uhr = () => page.locator('#bogenUhr').inputValue();
const ohneQuerscrollen = async (wo) => {
  const m = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  check(m[0] <= m[1], `${wo}: nichts ragt über den Rand (${m[0]} ≤ ${m[1]})`);
};
/** Der Speicher selbst, im Seitenkontext – dieselbe Instanz, die die App benutzt. */
const imSpeicher = (fn, arg) => page.evaluate(async ([quelle, a]) => {
  const store = await import(new URL('js/store.js', location.href).href);
  // eslint-disable-next-line no-new-func
  return new Function('store', 'a', `return (${quelle})(store, a);`)(store, a);
}, [fn.toString(), arg]);

const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
};
async function setze(stand) {
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, { ...GRUND, ...stand }]);
  await page.reload({ waitUntil: 'networkidle' });
  await kurz(250);
}
const essen = (id, am, um, extra = {}) => ({ id, art: 'essen', am, um, was: id, zutaten: [], portion: 'normal', ...extra });

/*
 * Ein Tag, wie ihn eine Fassung von vor diesem Schritt geschrieben hat: Das
 * Ibuprofen kam über „Dazu genommen?" zur selben Minute, ohne `zuKopf` – das
 * Feld gab es damals nicht. Der Säureblocker zur selben Minute ist keins.
 */
const ALTER_TAG = [
  essen('f1', heute, '08:00', { was: 'Haferbrei mit Banane', zutaten: [{ id: 'kaffee', rolle: 'haupt' }] }),
  { id: 'k1', art: 'kopf', am: heute, um: '10:15', staerke: 6, kopfArten: ['pochend'] },
  { id: 'm1', art: 'medikament', am: heute, um: '10:15', mittel: 'Ibuprofen', dosis: '400 mg' },
  { id: 'p1', art: 'medikament', am: heute, um: '10:15', mittel: 'Pantoprazol', dosis: '20 mg' },
  { id: 'b1', art: 'beschwerde', am: heute, um: '12:30', staerke: 4, arten: ['brennen'], ungefaehr: true, tageszeit: 'mittags' },
  { id: 's1', art: 'stuhl', am: heute, um: '14:00', form: 4 },
  { id: 'n1', art: 'notiz', am: heute, um: '16:00', text: 'Lange Wanderung' },
];

/* ==================== 1. Man sieht, dass sich eine Zeile öffnen lässt ==================== */

await setze({ eintraege: ALTER_TAG, zuletztMittel: ['Ibuprofen', 'Sumatriptan', 'Pantoprazol'] });
console.log('— 1. Sichtbar');
check(sauber(await page.locator('.strang-tipp').textContent()) === 'Tipp auf einen Eintrag, um ihn zu ändern.',
  'über der Liste steht „Tipp auf einen Eintrag, um ihn zu ändern."');
const auf = await page.locator('.strang-text').evaluateAll((l) => l.map((b) => {
  const z = b.querySelector('.strang-auf');
  return z ? `${z.textContent.trim()}|${z.getAttribute('aria-hidden')}` : '';
}));
check(auf.length === 7 && auf.every((x) => x === '›|true'), `jede der sieben Zeilen trägt ein „›", für VoiceOver verborgen (${auf.join(' ')})`);
const labels = await page.locator('.strang-text').evaluateAll((l) => Object.fromEntries(l.map((b) => [b.dataset.id, b.getAttribute('aria-label')])));
check(labels.k1 === 'Kopfschmerz, Stärke 6, um 10:15 ändern', `VoiceOver liest „${labels.k1}"`);
check(labels.b1 === 'Beschwerden, Stärke 4, um etwa 12:30 ändern', `eine ungefähre Zeit heißt „etwa" (${labels.b1})`);
check(labels.m1 === 'Medikament, Ibuprofen 400 mg, um 10:15 ändern', `ein Mittel mit Dosis (${labels.m1})`);
check(labels.f1 === 'Mahlzeit, „Haferbrei mit Banane“, um 08:00 ändern', `eine Mahlzeit mit ihrem Namen (${labels.f1})`);
check(labels.s1 === 'Stuhlgang, Typ 4, um 14:00 ändern' && labels.n1 === 'Notiz, „Lange Wanderung“, um 16:00 ändern',
  `Stuhlgang und Notiz (${labels.s1} / ${labels.n1})`);
const wegLabels = await page.locator('[data-act="loeschen"]').evaluateAll((l) => Object.fromEntries(l.map((b) => [b.dataset.id, b.getAttribute('aria-label')])));
check(Object.keys(labels).every((id) => wegLabels[id] === labels[id].replace(/ ändern$/, ' löschen')),
  `jedes × sagt, welchen Eintrag es löscht (${wegLabels.k1})`);
check((await page.locator('[data-act="loeschen"]').first().textContent()).trim() === '×', 'sichtbar steht weiter ein ×');
await ohneQuerscrollen('Liste mit „›" auf 320 Pixeln');
await zuTag(gestern);
check(await page.locator('.strang-tipp').count() === 0, 'an einem leeren Tag steht der Satz nicht');
await zuTag(heute);

// Die Anleitung unter „Mehr" sagt es auch.
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await kurz(200);
await page.locator('[data-act="anleitung"]').first().click();
await kurz(200);
const anleitung = sauber(await page.locator('#anleitung-aendern').textContent().catch(() => ''));
check(anleitung.includes('Tipp auf einen Eintrag') && anleitung.includes('Ändern'),
  'in der Anleitung steht, wie man einen Eintrag ändert');
check(anleitung.includes('„Löschen?“') && anleitung.includes('Rückgängig'), 'und wie Löschen und Rückgängig gehen');
await ohneQuerscrollen('Anleitung');
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await kurz(200);

/* ==================== 2. Der Bogen sagt, dass man ändert ==================== */

console.log('— 2. Überschrift');
const NAMEN = { f1: 'Mahlzeit', b1: 'Beschwerden', k1: 'Kopfschmerz', s1: 'Stuhlgang', m1: 'Medikament', n1: 'Notiz' };
for (const [id, name] of Object.entries(NAMEN)) {
  await oeffne(id);
  const titel = sauber(await page.locator('.bogen-kopf h2').textContent());
  const aria = await page.locator('.bogen').getAttribute('aria-label');
  const knopfText = sauber(await page.locator('[data-act="bogen-speichern"]').textContent());
  const wegText = sauber(await page.locator('[data-act="bogen-loeschen"]').textContent().catch(() => ''));
  check(titel.endsWith(`${name} ändern`) && aria === `${name} ändern` && knopfText === 'Ändern' && wegText === 'Eintrag löschen',
    `${name}: „${titel}", für VoiceOver „${aria}", unten „${knopfText}" und „${wegText}"`);
  if (id === 'k1') {
    await ohneQuerscrollen('Bogen „Kopfschmerz ändern"');
    await page.screenshot({ path: `${SHOT}/aendern-kopf.png` });
  }
  await zu();
}
await neu('kopf');
check(sauber(await page.locator('.bogen-kopf h2').textContent()).endsWith('Kopfschmerz')
  && await page.locator('.bogen').getAttribute('aria-label') === 'Kopfschmerz eintragen'
  && await page.locator('[data-act="bogen-loeschen"]').count() === 0
  && sauber(await page.locator('[data-act="bogen-speichern"]').textContent()) === 'Eintragen',
'ein neuer Eintrag heißt weiter „Kopfschmerz", „Eintragen", ohne Löschknopf');
await zu();

/* ==================== 3. Löschen mit zwei Tipps ==================== */

console.log('— 3. Löschen');
await weg('b1').click();
await kurz();
check((await speicher()).eintraege.length === 7, 'der erste Tipp aufs × löscht nichts');
check(sauber(await weg('b1').textContent()) === 'Löschen?'
  && (await weg('b1').getAttribute('aria-label')) === 'Löschen? Noch einmal tippen.',
'er fragt „Löschen?" – sichtbar und für VoiceOver');
check(await weg('b1').evaluate((el) => el.classList.contains('frage')), 'und ist dabei als Frage gekennzeichnet');
await ohneQuerscrollen('Zeile mit „Löschen?"');
await page.locator('.strang').screenshot({ path: `${SHOT}/aendern-frage.png` });
// Eine andere Zeile antippen: Die erste Frage fällt zurück, gelöscht wird nichts.
await weg('s1').click();
await kurz();
check(sauber(await weg('b1').textContent()) === '×' && sauber(await weg('s1').textContent()) === 'Löschen?'
  && (await speicher()).eintraege.length === 7,
'ein Tipp aufs × einer anderen Zeile fragt dort – die erste Frage fällt zurück, nichts ist gelöscht');
await page.waitForTimeout(4300);
check(sauber(await weg('s1').textContent()) === '×'
  && (await weg('s1').getAttribute('aria-label')) === 'Stuhlgang, Typ 4, um 14:00 löschen',
'nach vier Sekunden ohne zweiten Tipp steht wieder das ×');
await weg('s1').click();
await kurz();
check((await speicher()).eintraege.length === 7, 'danach fragt der nächste Tipp wieder, statt zu löschen');
await toastLeeren();
const sVorher = await eintrag('s1');
await weg('s1').click();
await kurz(300);
check(!(await eintrag('s1')), 'der zweite Tipp löscht');
check((await meldung()).startsWith('Gelöscht.') && sauber(await page.locator('.toast-knopf').textContent()) === 'Rückgängig',
  `Meldung „Gelöscht." mit „Rückgängig" (${await meldung()})`);
const kasten = await page.locator('#toast').boundingBox();
check(kasten && kasten.x >= 0 && kasten.x + kasten.width <= 320, 'die Meldung mit Knopf passt auf 320 Pixel');
await page.screenshot({ path: `${SHOT}/aendern-geloescht.png` });
await page.locator('.toast-knopf').click();
await kurz(300);
const sZurueck = await eintrag('s1');
check(sZurueck && JSON.stringify(sZurueck) === JSON.stringify(sVorher), 'Rückgängig holt ihn genau so zurück, mit derselben Kennung');
check((await meldung()) === 'Zurückgeholt.' && await page.locator('.toast-knopf').count() === 0, '„Zurückgeholt." – ohne Knopf');

// Mit der Tastatur: Der Fokus bleibt auf dem Knopf, der gerade fragt.
await weg('n1').focus();
await page.keyboard.press('Enter');
await kurz();
check(await weg('n1').evaluate((el) => el === document.activeElement) && sauber(await weg('n1').textContent()) === 'Löschen?',
  'mit der Tastatur: Enter fragt, und der Fokus bleibt auf dem Knopf');
await page.keyboard.press('Enter');
await kurz(300);
check(!(await eintrag('n1')), 'ein zweites Enter löscht');
// Der Knopf verschwindet mit der Meldung – nichts Unsichtbares bleibt antippbar.
await page.waitForTimeout(8300);
check(await page.locator('.toast-knopf').count() === 0
  && await page.evaluate(() => getComputedStyle(document.getElementById('toast')).pointerEvents) === 'none',
'nach acht Sekunden ist „Rückgängig" mit der Meldung weg');

// Aus dem Bogen: „Eintrag löschen", auch mit Rückfrage.
await oeffne('b1');
await page.locator('[data-act="bogen-loeschen"]').click();
await kurz();
check(sauber(await page.locator('[data-act="bogen-loeschen"]').textContent()) === 'Wirklich löschen?'
  && await page.locator('.bogen').count() === 1 && !!(await eintrag('b1')),
'im Bogen fragt „Eintrag löschen" erst „Wirklich löschen?"');
await zu();
await oeffne('b1');
check(sauber(await page.locator('[data-act="bogen-loeschen"]').textContent()) === 'Eintrag löschen',
  'geschlossen und wieder geöffnet, fragt er nicht mehr');
await page.locator('[data-act="bogen-loeschen"]').click();
await kurz();
await page.locator('[data-act="bogen-loeschen"]').click();
await kurz(300);
check(await page.locator('.bogen').count() === 0 && !(await eintrag('b1')), 'der zweite Tipp löscht und schließt den Bogen');
check((await meldung()).startsWith('Gelöscht.') && await page.locator('.toast-knopf').count() === 1, 'auch hier mit „Rückgängig"');
await page.locator('.toast-knopf').click();
await kurz(300);
check(!!(await eintrag('b1')), 'und Rückgängig holt ihn zurück');

// Ein Kopfschmerz mit Mittel: Das Mittel bleibt, und die Meldung sagt es.
await weg('k1').click();
await weg('k1').click();
await kurz(300);
check(!(await eintrag('k1')) && !!(await eintrag('m1')) && (await meldung()).includes('Ibuprofen bleibt eingetragen'),
  `der Kopfschmerz ist weg, sein Ibuprofen nicht – und das steht da (${await meldung()})`);
await page.locator('.toast-knopf').click();
await kurz(300);
check(!!(await eintrag('k1')), 'Rückgängig: der Kopfschmerz ist wieder da');

/*
 * Eine Mahlzeit löschen zieht ungefähre Einträge an die Tageszeit; Rückgängig
 * holt beides zurück – aber nicht über etwas, das inzwischen geändert wurde.
 */
await setze({
  eintraege: [
    essen('fr', heute, '08:15'),
    { id: 'tab', art: 'medikament', am: heute, um: '07:45', mittel: 'L-Thyroxin', ungefaehr: true, tageszeit: 'morgens', bezug: 'vor', bezugMahlzeit: 'fr' },
    { id: 'tab2', art: 'medikament', am: heute, um: '08:45', mittel: 'Pantoprazol', ungefaehr: true, tageszeit: 'morgens', bezug: 'nach', bezugMahlzeit: 'fr' },
  ],
});
const tabVorher = await eintrag('tab');
await weg('fr').click();
await weg('fr').click();
await kurz(300);
check((await eintrag('tab')).um === '07:30' && (await meldung()).includes('an die Tageszeit angepasst'),
  `die Mahlzeit gelöscht: die Tablette rückt an die Tageszeit (${(await eintrag('tab')).um}) und die Meldung sagt es`);
await page.locator('.toast-knopf').click();
await kurz(300);
check(JSON.stringify(await eintrag('tab')) === JSON.stringify(tabVorher) && !!(await eintrag('fr')),
  'Rückgängig: Mahlzeit zurück, die Tablette wieder um 07:45 an ihr');
await weg('fr').click();
await weg('fr').click();
await kurz(300);
// Wer in der Zwischenzeit etwas ändert, behält es.
await imSpeicher((store) => store.eintragAendern('tab2', { um: '09:05', ungefaehr: false, tageszeit: null, bezug: null, bezugMahlzeit: null }));
await kurz(100);
await page.locator('.toast-knopf').click();
await kurz(300);
check((await eintrag('tab')).um === '07:45' && (await eintrag('tab2')).um === '09:05' && !(await eintrag('tab2')).ungefaehr,
  'Rückgängig überschreibt nicht, was inzwischen von Hand geändert wurde');

/* ==================== 4. Kein leeres und kein künftiges Datum ==================== */

console.log('— 4. Datum und Uhrzeit');
await setze({ eintraege: [{ id: 'b1', art: 'beschwerde', am: heute, um: '12:30', staerke: 4, arten: [] }] });
const anzahl = async () => (await speicher()).eintraege.length;
// Anlegen
await neu('beschwerde');
await page.locator('#bogenTag').fill('');
await toastLeeren();
await speichern();
check(await page.locator('.bogen').count() === 1 && await anzahl() === 1, 'neu, Datum geleert: nicht gespeichert, der Bogen bleibt offen');
check((await meldung()) === 'Welcher Tag? Bitte ein Datum wählen.', `und sagt, was fehlt (${await meldung()})`);
check(await page.locator('#bogenTag').getAttribute('aria-invalid') === 'true', 'das Datumsfeld ist als falsch markiert');
const t = await page.locator('#toast').boundingBox();
const k = await page.locator('[data-act="bogen-speichern"]').boundingBox();
check(t && k && t.y + t.height <= k.y, 'die Meldung liegt bei offenem Bogen nicht auf „Eintragen"');
await page.screenshot({ path: `${SHOT}/aendern-datum-leer.png` });
await page.locator('#bogenTag').fill(morgen);
check(await page.locator('#bogenTag').getAttribute('aria-invalid') === null, 'wer das Feld anfasst, bekommt die Markierung abgenommen');
await toastLeeren();
await speichern();
check(await page.locator('.bogen').count() === 1 && await anzahl() === 1 && (await meldung()).includes('in der Zukunft'),
  `neu, Datum morgen: nicht gespeichert (${await meldung()})`);
await page.locator('#bogenTag').fill(heute);
await page.locator('#bogenUhr').fill('');
await toastLeeren();
await speichern();
check(await page.locator('.bogen').count() === 1 && await anzahl() === 1 && (await meldung()).startsWith('Um wie viel Uhr?')
  && await page.locator('#bogenUhr').getAttribute('aria-invalid') === 'true',
`neu, Uhrzeit geleert: nicht gespeichert (${await meldung()})`);
await tippe('zeit-tageszeit', 'abends');
await speichern();
check(await page.locator('.bogen').count() === 0 && await anzahl() === 2, 'mit einem Zeitknopf statt der Uhrzeit geht es');
// Ändern
await oeffne('b1');
await page.locator('#bogenTag').fill('');
await toastLeeren();
await speichern();
check(await page.locator('.bogen').count() === 1 && (await eintrag('b1')).am === heute && (await meldung()).startsWith('Welcher Tag?'),
  'ändern, Datum geleert: nichts gespeichert, der Eintrag bleibt an seinem Tag');
await page.locator('#bogenTag').fill(morgen);
await speichern();
check(await page.locator('.bogen').count() === 1 && (await eintrag('b1')).am === heute, 'ändern, Datum morgen: nichts gespeichert');
await page.locator('#bogenTag').fill(heute);
await page.locator('#bogenUhr').fill('');
await speichern();
check(await page.locator('.bogen').count() === 1 && (await eintrag('b1')).um === '12:30', 'ändern, Uhrzeit geleert: nichts gespeichert');
await page.keyboard.press('Escape');
await kurz();
const kopfzeile = sauber(await page.locator('.tagkopf h2').textContent());
check(kopfzeile === 'heute' && await zeile('b1').count() === 1, `der Tageskopf zeigt „${kopfzeile}", der Eintrag steht da`);
// Das Datumsfeld oben geleert: Der Tag bleibt, wo er war.
await page.locator('.tag-datum').fill('');
await kurz();
check(!/undefined|NaN/.test(await page.locator('.tagkopf h2').textContent()), 'ein geleertes Datum oben ergibt kein „undefined, NaN"');
// An der Ansicht vorbei: Der Speicher nimmt kein leeres Datum an.
const vorbei = await imSpeicher((store) => {
  const id = store.eintragen({ art: 'notiz', text: 'x', am: '', um: '' });
  const angelegt = { ...store.eintragVon(id) };
  store.eintragAendern(id, { am: '', um: '25:99', text: 'y' });
  const geaendert = { ...store.eintragVon(id) };
  store.eintragLoeschen(id);
  return { angelegt, geaendert };
});
check(vorbei.angelegt.am === heute && /^\d\d:\d\d$/.test(vorbei.angelegt.um),
  `der Speicher legt mit leerem Datum und leerer Uhrzeit heute und jetzt an (${vorbei.angelegt.am} ${vorbei.angelegt.um})`);
check(vorbei.geaendert.am === heute && vorbei.geaendert.um === vorbei.angelegt.um && vorbei.geaendert.text === 'y',
  'und ändert kein Datum in ein leeres und keine Uhrzeit in 25:99 – der Rest kommt an');

/* ==================== 5. „Dazu genommen?" beim Ändern ==================== */

console.log('— 5. Kopfschmerz ändern');
await setze({
  eintraege: ALTER_TAG,
  zuletztMittel: ['Ibuprofen', 'Sumatriptan', 'Pantoprazol'],
  standardMittel: [{ id: 'sm1', mittel: 'Sumatriptan', dosis: '50 mg', tageszeit: null, bezug: null }],
});
await oeffne('k1');
const schon = sauber(await page.locator('.kopf-schon').textContent().catch(() => ''));
check(schon.includes('Ibuprofen 400 mg um 10:15') && !schon.includes('Pantoprazol'),
  `beim Ändern steht da, was schon eingetragen ist – das alte Ibuprofen, nicht der Säureblocker (${schon})`);
check(schon.includes('rückt es mit'), 'und dass es bei Tag oder Uhrzeit mitrückt');
let dazu = await page.locator('[data-act="kopf-dazu"]').evaluateAll((l) => l.map((b) => b.dataset.id));
check(dazu.join() === 'Sumatriptan', `angeboten wird nur, was noch fehlt (${dazu.join(', ')})`);
await tippe('kopf-dazu', 'Sumatriptan');
check(await page.locator('[data-act="kopf-dazu"][data-id="Sumatriptan"]').getAttribute('aria-pressed') === 'true', 'die Wahl ist markiert');
await speichern();
let s = await speicher();
let suma = s.eintraege.filter((e) => e.art === 'medikament' && e.mittel === 'Sumatriptan');
check(suma.length === 1 && suma[0].am === heute && suma[0].um === '10:15' && suma[0].dosis === '50 mg' && suma[0].zuKopf === 'k1',
  `ein Tipp beim Ändern legt das Mittel an: zur Zeit des Kopfschmerzes, mit Dosis, mit ihm verknüpft (${JSON.stringify(suma[0] || {})})`);
check((await meldung()).startsWith('Geändert, mit Sumatriptan.'), `Meldung „${await meldung()}"`);
await oeffne('k1');
dazu = await page.locator('[data-act="kopf-dazu"]').evaluateAll((l) => l.map((b) => b.dataset.id));
check(dazu.length === 0 && sauber(await page.locator('.kopf-schon').textContent()).includes('Sumatriptan 50 mg'),
  'noch einmal geöffnet: beide stehen unter „Schon eingetragen", angeboten wird keins mehr');
check(sauber(await page.locator('.kopf-schon').textContent()).endsWith('rücken sie mit.'), 'bei zweien heißt es „rücken sie mit"');
await speichern();
check((await speicher()).eintraege.filter((e) => e.art === 'medikament').length === 3, 'noch einmal gespeichert: nichts doppelt');

// Tag und Uhrzeit ändern: Die Mittel rücken mit, der Säureblocker nicht.
await oeffne('k1');
await page.locator('#bogenUhr').fill('09:00');
await page.locator('#bogenTag').fill(gestern);
await kurz();
await speichern();
s = await speicher();
let m1 = s.eintraege.find((e) => e.id === 'm1');
suma = s.eintraege.find((e) => e.mittel === 'Sumatriptan');
const p1 = s.eintraege.find((e) => e.id === 'p1');
check(m1.am === gestern && m1.um === '09:00' && m1.zuKopf === 'k1',
  `das alte Ibuprofen rückt mit auf gestern, 09:00, und ist jetzt ausdrücklich verknüpft (${m1.am} ${m1.um} ${m1.zuKopf})`);
check(suma.am === gestern && suma.um === '09:00', 'das neue Sumatriptan auch');
check(p1.am === heute && p1.um === '10:15' && !p1.zuKopf, 'der Säureblocker zur selben Minute bleibt, wo er war');
check(/Ibuprofen und Sumatriptan sind mitgerückt\.$/.test(await meldung()), `die Meldung sagt es (${await meldung()})`);
check(sauber(await page.locator('.tagkopf h2').textContent()) === 'gestern', 'der Tag-Reiter springt auf gestern');

// Ein Mittel mit eigener Zeit wechselt nur den Tag.
await oeffne(suma.id);
await page.locator('#bogenUhr').fill('11:30');
await speichern();
await oeffne('k1');
await tippe('zeit-tageszeit', 'abends');
await page.locator('#bogenTag').fill(vorgestern);
await kurz();
await speichern();
s = await speicher();
m1 = s.eintraege.find((e) => e.id === 'm1');
suma = s.eintraege.find((e) => e.mittel === 'Sumatriptan');
check(m1.am === vorgestern && m1.um === '19:30' && m1.ungefaehr === true && m1.tageszeit === 'abends',
  `mit Zeitknopf: das Ibuprofen bekommt „abends" mit (${m1.um}, ${m1.tageszeit})`);
check(suma.am === vorgestern && suma.um === '11:30', `das Sumatriptan mit eigener Zeit wechselt nur den Tag (${suma.am} ${suma.um})`);

// Zwei Kopfschmerzen an einem Tag: Was zum ersten gehört, gehört nicht zum zweiten.
await imSpeicher((store, am) => store.eintragen({ id: 'k2', art: 'kopf', am, um: '21:00', staerke: 5 }), vorgestern);
await kurz(300);
await oeffne('k2');
dazu = await page.locator('[data-act="kopf-dazu"]').evaluateAll((l) => l.map((b) => b.dataset.id));
check(dazu.includes('Ibuprofen') && dazu.includes('Sumatriptan'), `beim zweiten Anfall des Tages sind beide wieder wählbar (${dazu.join(', ')})`);
await tippe('kopf-dazu', 'Ibuprofen');
await speichern();
s = await speicher();
check(s.eintraege.filter((e) => e.mittel === 'Ibuprofen' && e.zuKopf === 'k2' && e.um === '21:00').length === 1,
  'und ein Tipp legt eins für den zweiten an');

// Beim Anlegen trägt das Mittel die Kennung des neuen Kopfschmerzes.
await zuTag(heute);
await neu('kopf');
await page.locator('[data-act="staerke"][data-n="5"]').click();
await tippe('kopf-dazu', 'Ibuprofen');
await speichern();
s = await speicher();
const k3 = s.eintraege.find((e) => e.art === 'kopf' && e.am === heute);
check(k3 && s.eintraege.some((e) => e.art === 'medikament' && e.mittel === 'Ibuprofen' && e.zuKopf === k3.id && e.um === k3.um),
  'beim Anlegen: das Mittel trägt die Kennung des neuen Kopfschmerzes');
check(k3 && k3.dazuMittel === undefined && k3.zuKopf === undefined, 'der Kopfschmerz selbst trägt keine Liste und keine Kennung');

/* ==================== 6. Zeitknöpfe und Nachziehen beim Ändern ==================== */

console.log('— 6. Zeitknöpfe');
const ARTEN = {
  essen: { was: 'Brot', zutaten: [], portion: 'normal' },
  beschwerde: { staerke: 3, arten: [] },
  kopf: { staerke: 4, kopfArten: [] },
  stuhl: { form: 4 },
  medikament: { mittel: 'Iberogast', dosis: '20 Tropfen' },
  notiz: { text: 'Spaziergang' },
};
for (const [art, felder] of Object.entries(ARTEN)) {
  const mitBezug = ['beschwerde', 'medikament'].includes(art);
  const x = {
    id: 'x', art, am: gestern, ...felder, ungefaehr: true, tageszeit: 'morgens',
    ...(mitBezug ? { um: '08:10', bezug: 'nach', bezugMahlzeit: 'fr' } : { um: '08:00' }),
  };
  await setze({ eintraege: [essen('fr', gestern, '07:40'), x] });
  await zuTag(gestern);
  await oeffne('x');
  const morgens = await page.locator('[data-act="zeit-tageszeit"][data-id="morgens"]').getAttribute('aria-pressed');
  const nach = mitBezug ? await page.locator('[data-act="zeit-bezug"][data-id="nach"]').getAttribute('aria-pressed') : 'true';
  check(morgens === 'true' && nach === 'true', `${art}: beim Ändern sind die gewählten Knöpfe markiert`);
  await tippe('zeit-tageszeit', 'abends');
  const soll = mitBezug ? '20:00' : '19:30';
  check(await uhr() === soll, `${art}: „abends" setzt ${soll} (${await uhr()})`);
  await speichern();
  s = await speicher();
  const y = s.eintraege.filter((e) => e.art === art && e.id !== 'fr');
  check(y.length === 1 && y[0].id === 'x' && y[0].um === soll && y[0].tageszeit === 'abends' && y[0].ungefaehr === true
    && !('bezugBasis' in y[0]),
  `${art}: gespeichert als derselbe Eintrag, abends, ungefähr, ohne Hilfswert (${y.map((e) => `${e.id} ${e.um} ${e.tageszeit}`).join('; ')})`);
}

// Beim Ändern rechnet „vor dem Essen" von derselben Grundzeit wie beim Anlegen.
await setze({
  eintraege: [{ id: 'bn', art: 'beschwerde', am: gestern, um: '09:30', staerke: 3, arten: [], ungefaehr: true, tageszeit: null, bezug: 'nach', bezugMahlzeit: null }],
});
await zuTag(gestern);
await oeffne('bn');
await tippe('zeit-bezug', 'vor');
check(await uhr() === '08:30', `„nach dem Essen" (09:30) beim Ändern auf „vor dem Essen": 08:30, eine Stunde früher (${await uhr()})`);
await speichern();
check((await eintrag('bn')).um === '08:30' && (await eintrag('bn')).bezug === 'vor', 'und so gespeichert');

// Eine Mahlzeit ändern: Was an ihr hängt, rückt mit; eine genaue Zeit bleibt.
await setze({
  eintraege: [
    essen('fr', gestern, '07:40'),
    { id: 'tab', art: 'medikament', am: gestern, um: '07:10', mittel: 'L-Thyroxin', ungefaehr: true, tageszeit: 'morgens', bezug: 'vor', bezugMahlzeit: 'fr' },
    { id: 'genau', art: 'medikament', am: gestern, um: '07:00', mittel: 'Pantoprazol' },
  ],
});
await zuTag(gestern);
await oeffne('fr');
await page.locator('#bogenUhr').fill('09:00');
await speichern();
check((await eintrag('tab')).um === '08:30' && (await eintrag('tab')).bezugMahlzeit === 'fr' && (await eintrag('genau')).um === '07:00',
  `Frühstück auf 09:00 geändert: die Tablette rückt auf 08:30, die genaue bleibt um 07:00 (${(await eintrag('tab')).um})`);
check((await meldung()).includes('an die Mahlzeit angepasst'), `mit Meldung (${await meldung()})`);
await oeffne('fr');
await page.locator('#bogenTag').fill(vorgestern);
await kurz();
await speichern();
check((await eintrag('tab')).um === '07:30' && !(await eintrag('tab')).bezugMahlzeit,
  `das Frühstück auf einen anderen Tag geändert: die Tablette rechnet wieder mit der Tageszeit (${(await eintrag('tab')).um})`);

/* ==================== 7. Sicherung und alte Stände ==================== */

console.log('— 7. Sicherung');
// Ein alter Stand (ohne zuKopf) lädt, und die alte Verknüpfung gilt.
await setze({ eintraege: ALTER_TAG, zuletztMittel: ['Ibuprofen'] });
check(await page.locator('.strang-zeile').count() === 7, 'ein Stand aus der Fassung davor lädt mit allen sieben Einträgen');
await oeffne('k1');
check(sauber(await page.locator('.kopf-schon').textContent().catch(() => '')).includes('Ibuprofen'),
  'sein über „Dazu genommen?" angelegtes Ibuprofen gilt als dazugehörig');
await page.locator('#bogenUhr').fill('11:00');
await speichern();
const json = await imSpeicher((store) => store.alsJSON());
const gesichert = JSON.parse(json).eintraege.find((e) => e.id === 'm1');
check(gesichert && gesichert.zuKopf === 'k1' && gesichert.um === '11:00', 'die Sicherung nimmt die Verknüpfung mit');
// In ein leeres Tagebuch eingelesen …
await setze({ eintraege: [] });
await imSpeicher((store, text) => store.einlesen(text), json);
await kurz(300);
s = await speicher();
check(s.eintraege.find((e) => e.id === 'm1')?.zuKopf === 'k1', 'eingelesen in ein leeres Tagebuch: die Verknüpfung ist da');
// … und mit einem vollen zusammengeführt.
await setze({ eintraege: [essen('anders', gestern, '12:00')] });
const ergebnis = await imSpeicher((store, text) => store.einlesen(text), json);
await kurz(300);
s = await speicher();
check(ergebnis.zusammengefuehrt && s.eintraege.length === 8 && s.eintraege.find((e) => e.id === 'm1')?.zuKopf === 'k1',
  `zusammengeführt: alle da, die Verknüpfung auch (${s.eintraege.length})`);
// Löschen und Rückgängig lassen das Rückgängig des Einlesens stehen.
await page.reload({ waitUntil: 'networkidle' });
await kurz(250);
await weg('n1').click();
await weg('n1').click();
await kurz(300);
await page.locator('.toast-knopf').click();
await kurz(300);
const vorherDa = await imSpeicher((store) => store.vorherDa());
check(vorherDa && vorherDa.anzahl === 1, `der Stand von vor dem Einlesen lässt sich danach noch zurückholen (${JSON.stringify(vorherDa)})`);
// Eine alte Sicherung als Text, wie sie eine frühere Fassung geschrieben hat.
await setze({ eintraege: [] });
const alteSicherung = JSON.stringify({ eintraege: ALTER_TAG, tage: {}, zuletztMittel: ['Ibuprofen'], fenster: 4 }, null, 2);
// Wie „Datei einlesen" in der App: danach gleich ins Tagebuch, nicht zur Begrüßung.
await imSpeicher((store, text) => { store.einlesen(text); store.einstellen('begruesst', true); }, alteSicherung);
await page.reload({ waitUntil: 'networkidle' });
await kurz(250);
await oeffne('k1');
check(await page.locator('[data-act="kopf-dazu"][data-id="Ibuprofen"]').count() === 0
  && sauber(await page.locator('.kopf-schon').textContent().catch(() => '')).includes('Ibuprofen'),
'eine alte Sicherung: Ibuprofen steht als eingetragen da und wird nicht noch einmal angeboten');
await zu();

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
