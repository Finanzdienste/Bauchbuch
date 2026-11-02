/*
 * G2: Schalter ändern keine Rechnung (R0).
 *
 * „ADHS" und „Kiefer, Nacken, Schiene" entscheiden nur, was man eingeben kann
 * und was zu sehen ist. Gerechnet wird immer, sobald Daten da sind – sonst
 * änderte ein Tipp unter „Mehr" die Zahlen, und wer ein- und wieder
 * ausschaltet, sähe danach andere Funde als vorher. Geprüft wird:
 *
 *   1. adhsAuswertung() und spannungAuswertung() ergeben mit jedem Stand der
 *      Schalter dasselbe Ergebnis, Zeichen für Zeichen.
 *   2. raete() mit derselben Vorsicht beim Essen ergibt dasselbe – gleich,
 *      was sonst im Zustand steht. Der Bericht ohne Schalter ist der mit
 *      Schaltern ohne die neuen Abschnitte, Zeichen für Zeichen.
 *   3. Auf „Muster" ist mit eingeschalteten Schaltern alles gleich bis auf
 *      die beiden neuen Karten; ausgeschaltet fehlen sie.
 *   4. Was für alle gilt (Ebene 0), steht auch ohne Schalter: der Vorbehalt
 *      an einem Auslöser, der nahe am Mittel liegt.
 *   5. Mit „Kiefer, Nacken, Schiene" stehen Massage und Wärme nur gefiltert
 *      da – in der neuen Karte, nicht mehr ungefiltert unter „Was du gemacht
 *      hast". Beim Dehnen gilt das für die Kopfzeile; die Bauchzeile bleibt.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';
import { adhsTagebuch, appModul } from './adhs-daten.mjs';
import { GRUNDDATUM, isoPlus, mitNeuenAngaben, tagebuch } from './rechnungen.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_GEGENPROBE || 8561);
if (PORT < 8561 || PORT > 8569) throw new Error(`Port ${PORT} liegt außerhalb von 8561–8569`);

const { adhsAuswertung } = await appModul('adhs.js');
const { spannungAuswertung } = await appModul('spannung.js');
const { raete } = await appModul('rat.js');
const { ausloeserBilanz } = await appModul('auswertung.js');

/* ---------- 1. Die Ergebnisobjekte ---------- */

const SCHALTER = [[null, null], [true, true], [false, false], [true, false], [false, true]];
for (const saat of [3, 8, 21]) {
  const d = adhsTagebuch(saat);
  const ergebnisse = SCHALTER.map(([adhsAn, spannungAn]) => {
    const s = { ...d, adhsAn, spannungAn };
    return JSON.stringify([adhsAuswertung(s), spannungAuswertung(s)]);
  });
  check(ergebnisse.every((e) => e === ergebnisse[0]) && ergebnisse[0].length > 1000,
    `Tagebuch ${saat}: ADHS- und Kiefer-Rechnungen mit allen Ständen der Schalter zeichengleich`);
}

/* ---------- 2. Die Rat-Karte ---------- */

{
  const d = adhsTagebuch(5);
  const grund = {
    eintraege: d.eintraege, tage: d.tage, heute: GRUNDDATUM, eigene: [],
    bilanz: ausloeserBilanz(d.eintraege, { fenster: 4, mindestFaelle: 5 }),
    faktoren: {}, phasen: [], letzteMahlzeitStunden: null, mittel: [],
  };
  ['bremse', 'zusatz', undefined].forEach((v) => {
    const a = JSON.stringify(raete({ ...grund, essenVorsicht: v, adhsAn: true, spannungAn: true }));
    const b = JSON.stringify(raete({ ...grund, essenVorsicht: v, adhsAn: false }));
    check(a === b, `raete() mit essenVorsicht ${v || '(keine)'}: gleich, was sonst im Zustand steht`);
  });
}

/* ---------- 2b. Der Bericht ---------- */

/*
 * Mit den Schaltern aus fehlen ADHS-MITTEL, ESSENSRHYTHMUS und KIEFER,
 * NACKEN, SCHIENE; alles andere ist Zeichen für Zeichen dasselbe wie mit den
 * Schaltern an. Zwei Stellen hängen laut Entwurf außerdem an einem Schalter
 * und werden hier ausdrücklich herausgenommen – nur sie:
 *
 *   * unter NACH ZYKLUSPHASE Stimmung und Anspannung je Phase („ADHS"),
 *   * unter KOPFSCHMERZEN die Aufwach-Frage in ihrer Fassung mit der
 *     Schiene („Kiefer, Nacken, Schiene"); ohne Schalter steht dieselbe
 *     Frage ohne die Schiene.
 *
 * Beide kommen in den Tagebüchern unten wirklich vor – sonst wäre die
 * Ausnahme blind.
 */
const { arztBericht } = await appModul('bericht.js');
const NEUE_ABSCHNITTE = /^(ADHS-MITTEL|ESSENSRHYTHMUS|KIEFER, NACKEN, SCHIENE)( \(.*)?$/;
function umbrechen(satz, breite) {
  const zeilen = [];
  let zeile = '';
  satz.split(/\s+/).forEach((w) => {
    if (zeile && zeile.length + w.length + 1 > breite) { zeilen.push(zeile); zeile = w; } else zeile = zeile ? `${zeile} ${w}` : w;
  });
  if (zeile) zeilen.push(zeile);
  return zeilen;
}
function ohneSchalterTeile(text) {
  const raus = [];
  const zeilen = text.split('\n');
  const zaehl = { abschnitte: 0, zyklus: 0, schiene: 0 };
  for (let i = 0; i < zeilen.length; i++) {
    const z = zeilen[i];
    if (NEUE_ABSCHNITTE.test(z)) {
      zaehl.abschnitte += 1;
      while (i < zeilen.length && zeilen[i] !== '') i += 1;
      continue;
    }
    if (/^ {2}(Stimmung \(|Anspannung \(|\(Zahlen aus den Tagesfragen)/.test(z)) {
      zaehl.zyklus += 1;
      while (i + 1 < zeilen.length && zeilen[i + 1].startsWith('    ')) i += 1;
      continue;
    }
    if (z.startsWith('  - Ich trage eine Aufbissschiene und habe oft')) {
      zaehl.schiene += 1;
      let frage = z.slice(4);
      while (i + 1 < zeilen.length && zeilen[i + 1].startsWith('    ')) { i += 1; frage += ` ${zeilen[i].trim()}`; }
      umbrechen(frage.replace('Ich trage eine Aufbissschiene und habe oft', 'Ich habe oft'), 64)
        .forEach((zl, j) => raus.push(`  ${j ? '  ' : '- '}${zl}`));
      continue;
    }
    raus.push(z);
  }
  return { text: raus.join('\n'), zaehl };
}

{
  const gesehen = { abschnitte: 0, zyklus: 0, schiene: 0 };
  for (const saat of [3, 8, 21]) {
    const d = adhsTagebuch(saat);
    // Blutungstage für die Zyklusphasen und Kopfschmerzen beim Aufwachen in
    // den letzten Wochen, damit beide Ausnahmen vorkommen.
    const tage = JSON.parse(JSON.stringify(d.tage));
    for (let i = 0; i < 120; i++) if (i % 28 < 5) tage[isoPlus(d.heute, -1 - i)] = { ...(tage[isoPlus(d.heute, -1 - i)] || {}), blutung: 2 };
    const eintraege = [...d.eintraege];
    for (let i = 1; i <= 4; i++) {
      eintraege.push({ id: `aw${i}`, art: 'kopf', am: isoPlus(d.heute, -2 * i), um: '06:30', staerke: 4, kopfArten: ['aufwachen'] });
    }
    eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
    const s = { ...d, eintraege, tage };
    for (const tagezahl of [30, 90]) {
      const von = isoPlus(GRUNDDATUM, -(tagezahl - 1));
      const an = ohneSchalterTeile(arztBericht({ ...s, adhsAn: true, spannungAn: true }, von, GRUNDDATUM));
      Object.keys(gesehen).forEach((k) => { gesehen[k] += an.zaehl[k]; });
      const aus = [[null, null], [false, false]].map(([a, b]) => arztBericht({ ...s, adhsAn: a, spannungAn: b }, von, GRUNDDATUM));
      check(aus.every((t) => !t.split('\n').some((z) => NEUE_ABSCHNITTE.test(z))),
        `Tagebuch ${saat}, ${tagezahl} Tage: ohne Schalter keiner der neuen Abschnitte`);
      check(an.zaehl.abschnitte >= 2 && aus.every((t) => ohneSchalterTeile(t).text === t && t === an.text),
        `Tagebuch ${saat}, ${tagezahl} Tage: der Bericht ohne Schalter ist der mit Schaltern ohne die `
          + `${an.zaehl.abschnitte} neuen Abschnitte – Zeichen für Zeichen`);
    }
  }
  check(gesehen.zyklus >= 1 && gesehen.schiene >= 1,
    `beide Ausnahmen kommen vor (Zyklus ${gesehen.zyklus}×, Aufwach-Frage mit Schiene ${gesehen.schiene}×)`);
}

/* ---------- 3. bis 5. Die Anzeige ---------- */

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];
const HEUTE = isoPlus(GRUNDDATUM, 1);

async function muster(stand) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 800 }, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'UTC', locale: 'de-DE',
  });
  await ctx.addInitScript(([k, s]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
  }, [KEY, {
    begruesst: true, tab: 'muster', alterName: null, startbildschirmWeg: true, sicherungSpaeter: '2999-01-01',
    v28Gesagt: true, ...stand,
  }]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(e.message));
  await page.clock.setFixedTime(new Date(`${HEUTE}T12:00:00Z`));
  await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const view = document.getElementById('view');
    const ohneNeu = view.cloneNode(true);
    ohneNeu.querySelectorAll('.karte-adhs, .karte-spannung').forEach((k) => k.remove());
    return {
      adhs: view.querySelectorAll('.karte-adhs').length,
      spannung: view.querySelectorAll('.karte-spannung').length,
      rest: ohneNeu.textContent.replace(/\s+/g, ' ').trim(),
      vorbehalt: [...view.querySelectorAll('.vorbehalt-mittel')].map((p) => p.textContent.replace(/\s+/g, ' ').trim()),
      aktiv: (view.querySelector('.karte-aktiv') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
      // Die Fundzeilen von Yoga/Dehnen unter „Was du gemacht hast".
      yoga: [...view.querySelectorAll('.karte-aktiv .fund')].map((li) => li.textContent.replace(/\s+/g, ' ').trim())
        .filter((t) => t.includes('Yoga/Dehnen')),
      spannungText: (view.querySelector('.karte-spannung') || { textContent: '' }).textContent.replace(/\s+/g, ' ').trim(),
    };
  });
  await ctx.close();
  return r;
}

{
  // Das Tagebuch des Golds mit ADHS-Einnahmen und allen neuen Tagesangaben –
  // ohne Massage und Wärme, damit „Was du gemacht hast" gleich bleibt. Ebenso
  // ohne Dehnen: Dessen Kopfzeile steht mit dem Schalter gefiltert in der
  // neuen Karte (geprüft unter 5.).
  const voll = mitNeuenAngaben(tagebuch(29), 29);
  const d = { ...voll, eintraege: voll.eintraege.filter((e) => !(e.aktivitaeten || []).includes('yoga')) };
  check(voll.eintraege.length - d.eintraege.length > 5, 'das Tagebuch hatte Dehnen – herausgenommen');
  const aus = await muster({ ...d, adhsAn: null, spannungAn: null });
  const an = await muster({ ...d, adhsAn: true, spannungAn: true });
  const nein = await muster({ ...d, adhsAn: false, spannungAn: false });
  check(aus.adhs === 0 && aus.spannung === 0 && nein.adhs === 0 && nein.spannung === 0,
    'ohne Schalter (nie entschieden oder aus) keine der beiden neuen Karten');
  check(an.adhs === 1 && an.spannung === 1, 'mit beiden Schaltern beide Karten');
  check(an.rest === aus.rest && nein.rest === aus.rest && aus.rest.length > 2000,
    'alles andere auf „Muster“ ist mit und ohne Schalter Zeichen für Zeichen gleich');
}
{
  // Ebene 0: Kaffee immer zum Frühstück, das Mittel kurz danach – der
  // Vorbehalt steht auch ohne Schalter.
  const eintraege = [];
  for (let i = 1; i <= 40; i++) {
    const d = isoPlus(GRUNDDATUM, -i);
    const kaffee = i % 2 === 0;
    eintraege.push({ id: `f${i}`, art: 'essen', am: d, um: '07:15', was: 'Frühstück', portion: 'normal',
      zutaten: kaffee ? [{ id: 'kaffee', rolle: 'getraenk' }] : [] });
    if (kaffee) eintraege.push({ id: `m${i}`, art: 'medikament', am: d, um: '07:30', mittel: 'Attentin', dosis: '5 mg' });
    eintraege.push({ id: `a${i}`, art: 'essen', am: d, um: '18:30', was: 'Abend', portion: 'normal', zutaten: [] });
    if (kaffee) eintraege.push({ id: `b${i}`, art: 'beschwerde', am: d, um: '09:30', staerke: 6, arten: ['druck'] });
  }
  eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
  const r = await muster({ eintraege, tage: {}, adhsAn: null, spannungAn: null, fenster: 4, mindestFaelle: 5 });
  check(r.vorbehalt.some((t) => t.startsWith('20 von 20 Mahlzeiten mit Kaffee lagen in den 4 Stunden nach einem ADHS-Mittel')),
    `Ebene 0: der Vorbehalt am Auslöser steht ohne Schalter (${r.vorbehalt[0] || 'keiner'})`);
}
{
  // Ebene 0: Die Beschwerden des Zeitprofils liegen alle eine Dreiviertelstunde
  // nach dem Mittel – der Vorbehalt unter „Wie lange nach dem Essen".
  const eintraege = [];
  for (let i = 1; i <= 15; i++) {
    const d = isoPlus(GRUNDDATUM, -i);
    eintraege.push(
      { id: `f${i}`, art: 'essen', am: d, um: '07:00', was: 'Frühstück', portion: 'normal', zutaten: [] },
      { id: `m${i}`, art: 'medikament', am: d, um: '07:15', mittel: 'Kinecteen', dosis: '18 mg' },
      { id: `b${i}`, art: 'beschwerde', am: d, um: '08:00', staerke: 4, arten: ['druck'] },
      { id: `a${i}`, art: 'essen', am: d, um: '13:00', was: 'Mittag', portion: 'normal', zutaten: [] },
    );
  }
  eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
  const r = await muster({ eintraege, tage: {}, adhsAn: null, spannungAn: null, fenster: 4, mindestFaelle: 5 });
  check(r.vorbehalt.some((t) => t.startsWith('15 dieser 15 Beschwerden lagen zugleich in den 4 Stunden nach einem ADHS-Mittel')),
    `Ebene 0: der Vorbehalt am Zeitprofil steht ohne Schalter (${r.vorbehalt[0] || 'keiner'})`);
}
{
  // Massage und Wärme: ohne Schalter ungefiltert, mit Schalter nur gefiltert.
  const d = adhsTagebuch(11, { stoerwege: false });
  const aus = await muster({ ...d, adhsAn: null, spannungAn: null });
  const an = await muster({ ...d, adhsAn: null, spannungAn: true });
  check(/Wärme|Massage/.test(aus.aktiv) && !aus.aktiv.includes('stehen unter „Kiefer, Nacken, Schiene“'),
    'ohne den Schalter stehen Massage und Wärme unter „Was du gemacht hast“');
  check(!/Wärme \d|Massage\/Physio \d|Massagepistole \d/.test(an.aktiv)
    && an.aktiv.includes('Massage, Massagepistole und Wärme – und beim Kopfschmerz auch Yoga/Dehnen – stehen '
      + 'unter „Kiefer, Nacken, Schiene“'),
  'mit dem Schalter dort nicht mehr – nur der Hinweis, wo sie stehen');
  check(an.spannungText.includes('Nach mindestens mittel verspanntem Vortag') && /Wärme/.test(an.spannungText),
    'und in der Karte „Kiefer, Nacken, Schiene“ der gefilterte Lauf');
  check(aus.yoga.some((t) => t.includes('Kopf')) && an.yoga.length > 0 && an.yoga.every((t) => !t.includes('Kopf'))
    && /Yoga\/Dehnen/.test(an.spannungText),
  `Dehnen: ohne Schalter mit Kopfzeile, mit Schalter nur noch die Bauchzeile – der Kopf steht gefiltert in der neuen Karte (${an.yoga.join(' | ').slice(0, 80)})`);
}

check(fehler.length === 0, `keine Seitenfehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
