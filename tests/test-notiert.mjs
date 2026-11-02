/*
 * Wann ist ein Tag notiert – und was macht ihn nicht dazu?
 *
 * Die Regel, an der in dieser App fast alles hängt: Eine Lücke ist kein
 * beschwerdefreier Tag. Wer an einem Tag nur ein Glas Wasser antippt oder
 * „Laufen" einträgt, hat über Bauch und Kopf nichts gesagt. Seit der Fassung
 * 28 gehört dazu auch ein ADHS-Mittel (K1): Die Tablette vom Morgen steht da,
 * ob der Bauch Ruhe gibt oder nicht. Und die neuen Tagesangaben – ohne
 * ADHS-Mittel, Nacken, Kiefer, Pressen, Schiene – sind Antworten, die mit
 * Bauch und Kopf erst verglichen werden sollen.
 *
 * Geprüft wird zweimal:
 *
 *   G3  an kleinen Tagebüchern, Fall für Fall, was einen Tag notiert macht;
 *   G1  als Gegenprobe über ein ganzes Tagebuch: dasselbe mit einer
 *       ADHS-Einnahme an jedem Tag und allen neuen Angaben muss in jeder
 *       Rechnung dasselbe ergeben – bis auf die wenigen Stellen, die
 *       Einnahmen zählen sollen.
 */
import { ROOT, pruefer } from './umgebung.mjs';
import {
  GOLD_SAATEN, alleRechnungen, isoPlus, mitNeuenAngaben, tagebuch,
} from './rechnungen.mjs';
import { tagesWert } from '../js/auswertung.js';
import { kopfTagesWert, kopfZahlen } from '../js/kopf.js';
import {
  ZAEHLT_NICHT, eintragZaehlt, tagZaehlt, zaehltFuerBauch,
} from '../js/wasser.js';
import {
  ADHS_GRUPPEN, STIMULANZIEN, adhsGruppe, istAdhsMittel, wissenZu,
} from '../js/mittel.js';

const { check, ende } = pruefer();

/* ---------- Die Namen ---------- */

const GRUPPE = {
  Methylphenidat: 'mph', 'Ritalin Adult': 'mph', 'Medikinet retard': 'mph', Medikinet: 'mph',
  Concerta: 'mph', Kinecteen: 'mph', 'Equasym Retard': 'mph', 'MPH retard': 'mph',
  Lisdexamfetamin: 'lisdex', 'Elvanse 30 mg': 'lisdex', Dexamfetamin: 'dex', Attentin: 'dex',
  Atomoxetin: 'atomox', Strattera: 'atomox', Guanfacin: 'guanf', Intuniv: 'guanf',
  Bupropion: 'bupro', Elontril: 'bupro', Zyban: 'bupro',
  'Atomoxetin-Gel': null, Lymphdiaral: null, Pantoprazol: null, Ibuprofen: null, '': null,
};
const falsch = Object.entries(GRUPPE).filter(([n, g]) => adhsGruppe(n) !== g);
check(falsch.length === 0, `Namen ergeben die richtige ADHS-Gruppe${falsch.length ? ` – nicht: ${falsch.map(([n]) => `${n} → ${adhsGruppe(n)}`).join(', ')}` : ''}`);
check(adhsGruppe('Lisdexamfetamin') === 'lisdex' && adhsGruppe('lisdexamfetamin dimesilat') === 'lisdex',
  'Lisdexamfetamin ist Lisdexamfetamin, nicht Dexamfetamin – obwohl der Name es enthält');
check(adhsGruppe('Lymphdiaral') === null && adhsGruppe('MPH 10') === 'mph',
  'das Kürzel MPH zählt nur am Wortanfang');
check(adhsGruppe('Methylphenidat Pflaster') === null, 'was auf der Haut bleibt, ist auch hier keines');
check(
  JSON.stringify(ADHS_GRUPPEN) === JSON.stringify(['mph', 'lisdex', 'dex', 'atomox', 'guanf'])
    && JSON.stringify(STIMULANZIEN) === JSON.stringify(['mph', 'lisdex', 'dex']),
  'ADHS-Mittel sind fünf Gruppen ohne Bupropion, Stimulanzien drei davon',
);
check(istAdhsMittel('Concerta') && istAdhsMittel('  intuniv ') && !istAdhsMittel('Elontril') && !istAdhsMittel(null),
  'istAdhsMittel: ja bei Concerta und Intuniv, nein bei Bupropion und ohne Namen');
check(istAdhsMittel('Ritalin Adult') === istAdhsMittel('RITALIN ADULT'), 'groß oder klein geschrieben ist dasselbe');
check(['Medikinet', 'Lisdexamfetamin', 'Concerta'].every((n) => wissenZu(n) === null),
  'die Wissenstexte kennen die Namen noch nicht – erkannt werden sie trotzdem');

/* ---------- Die Liste der Tagesangaben, die nichts sagen ---------- */

check(
  JSON.stringify([...ZAEHLT_NICHT].sort())
    === JSON.stringify(['adhsPause', 'gepresst', 'kiefer', 'schiene', 'verspannt', 'wasser']),
  `ZAEHLT_NICHT: Wasser und die fünf neuen Tagesangaben (${ZAEHLT_NICHT.join(', ')})`,
);

/* ---------- G3: Fall für Fall ---------- */

const T = '2026-05-12';
const essen = { id: 'e', art: 'essen', am: T, um: '08:00', was: 'Brot', zutaten: [], portion: 'normal' };
const adhs = (mittel, extra = {}) => ({ id: `m-${mittel}`, art: 'medikament', am: T, um: '07:30', mittel, dosis: '10 mg', ...extra });
const beschwerde = { id: 'b', art: 'beschwerde', am: T, um: '10:00', staerke: 4, arten: ['druck'] };
const bauch = (eintraege, tage = {}) => tagesWert(eintraege, T, tage).notiert;
const kopf = (eintraege, tage = {}) => kopfTagesWert(eintraege, T, tage).notiert;
const notierteTage = (eintraege, tage = {}) => kopfZahlen(eintraege, tage, T).notierteTage;

for (const name of ['Medikinet retard', 'Ritalin Adult', 'Elvanse', 'Strattera', 'Intuniv']) {
  const nur = [adhs(name)];
  check(!bauch(nur) && !kopf(nur) && notierteTage(nur) === 0,
    `ein Tag nur mit ${name} ist für Bauch und Kopf eine Lücke`);
}
check(!eintragZaehlt(adhs('Concerta')) && !zaehltFuerBauch(adhs('Concerta')),
  'eine ADHS-Einnahme sagt nichts über den Tag – auch nicht über den Bauch');
check(!bauch([adhs('Concerta', { form: 'oros', essen: 'mit', essenGesetzt: 1 })]),
  'auch nicht mit Form und Angabe zum Essen');
check(bauch([adhs('Medikinet retard'), beschwerde]) && kopf([adhs('Medikinet retard'), beschwerde]),
  'mit einer Beschwerde dazu ist der Tag notiert');
check(bauch([adhs('Medikinet retard'), essen]) && tagesWert([adhs('Medikinet retard'), essen], T).wert === 0,
  'mit einer Mahlzeit dazu auch – und ohne Beschwerde beschwerdefrei');
check(bauch([adhs('Bupropion')]) && kopf([adhs('Bupropion')]) && eintragZaehlt(adhs('Elontril')),
  'Bupropion allein macht den Tag notiert, wie jedes andere Mittel');
check(bauch([adhs('Pantoprazol')]) && kopf([adhs('Ibuprofen')]),
  'ein Säureblocker oder ein Schmerzmittel zählt weiter');

/*
 * Ein ADHS-Mittel, das an einem Kopfschmerz hängt (`zuKopf`), wird damit
 * nicht zu einer Angabe: Steht der Kopfschmerz am Vorabend und das Mittel
 * nach Mitternacht, bleibt der Tag des Mittels eine Lücke. Sonst entschiede
 * die Verbindung zur Zielgröße darüber, ob der Tag zählt.
 */
const vorabend = { id: 'k0', art: 'kopf', am: isoPlus(T, -1), um: '23:00', staerke: 6, kopfArten: [] };
const mitKopf = [vorabend, adhs('Ritalin Adult', { um: '00:30', zuKopf: 'k0' })];
check(!kopf(mitKopf) && !bauch(mitKopf),
  'ein ADHS-Mittel, das an einem Kopfschmerz vom Vortag hängt, macht den Tag nicht notiert');

const FELDER = {
  schiene: 1, adhsPause: 'pause', verspannt: 3, kiefer: 2, gepresst: 1,
};
for (const [feld, wert] of Object.entries(FELDER)) {
  const tage = { [T]: { [feld]: wert } };
  check(!tagZaehlt(tage[T]) && !bauch([], tage) && !kopf([], tage) && notierteTage([], tage) === 0,
    `ein Tag nur mit „${feld}" ist eine Lücke`);
  check(!tagZaehlt({ [feld]: 0 }), `auch „${feld}" mit 0`);
}
const alleFelder = { [T]: { ...FELDER, wasser: 4 } };
check(!bauch([adhs('Concerta')], alleFelder) && !kopf([adhs('Concerta')], alleFelder),
  'und alles zusammen mit einer ADHS-Einnahme ebenso');
check(bauch([], { [T]: { ...FELDER, stress: 0 } }) && kopf([], { [T]: { ...FELDER, stress: 0 } }),
  'mit einer beantworteten Tagesfrage daneben ist der Tag notiert');

/* ---------- G1: dasselbe Tagebuch mit allem Neuen ---------- */

/*
 * Was sich ändern darf: die Zahl der Medikamente je Tag und insgesamt, die
 * Mittelbilanz, im Bericht die Zeile „Medikamenteneinnahmen" und die beiden
 * Abschnitte, die Mittel aufzählen. Alles andere muss zeichengleich bleiben.
 */
const ohneMedikamente = (liste) => liste.map(({ medikamente, ...rest }) => rest);
const ohneMittelAbschnitte = (text) => {
  const raus = [];
  let weg = false;
  text.split('\n').forEach((z) => {
    if (z === 'EINGENOMMENE MITTEL' || z === 'HAT ES ETWAS BEWIRKT?') weg = true;
    if (!weg && !/^ {2}Medikamenteneinnahmen\s/.test(z)) raus.push(z);
    if (weg && z === '') weg = false;
  });
  return raus.join('\n');
};
const AUSNAHME = {
  tagesWert: ohneMedikamente,
  verlaufReihe: ohneMedikamente,
  gesamtZahlen: ({ medikamente, ...rest }) => rest,
  mittelBilanz: () => 'ausgenommen',
  arztBericht: (berichte) => berichte.map(ohneMittelAbschnitte),
};
const vergleichbar = (r) => Object.fromEntries(Object.entries(r)
  .map(([k, v]) => [k, JSON.stringify(AUSNAHME[k] ? AUSNAHME[k](v) : v)]));

for (const saat of GOLD_SAATEN) {
  const vorher = tagebuch(saat);
  const nachher = mitNeuenAngaben(vorher, saat);
  // Die Probe muss die Lücken wirklich treffen – sonst prüfte sie nur Tage,
  // die ohnehin notiert sind.
  const notiertVorher = new Set([
    ...vorher.eintraege.filter(eintragZaehlt).map((e) => e.am),
    ...Object.keys(vorher.tage).filter((iso) => tagZaehlt(vorher.tage[iso])),
  ]);
  const adhsTage = new Set(nachher.eintraege.filter((e) => istAdhsMittel(e.mittel)).map((e) => e.am));
  const luecken = [...adhsTage].filter((iso) => !notiertVorher.has(iso));
  const felder = Object.keys(FELDER).every((f) => Object.values(nachher.tage).some((t) => f in t));
  check(luecken.length >= 5 && adhsTage.size >= 110 && felder,
    `Tagebuch ${saat}: ADHS-Einnahmen an ${adhsTage.size} Tagen, davon ${luecken.length} Lücken, alle neuen Felder dabei`);

  // eslint-disable-next-line no-await-in-loop
  const a = vergleichbar(await alleRechnungen(ROOT, vorher));
  // eslint-disable-next-line no-await-in-loop
  const roh = await alleRechnungen(ROOT, nachher);
  const b = vergleichbar(roh);
  const anders = Object.keys(a).filter((k) => a[k] !== b[k]);
  check(
    anders.length === 0,
    `Tagebuch ${saat}: alle ${Object.keys(a).length} Rechnungen ergeben mit den neuen Angaben dasselbe`
      + `${anders.length ? ` – anders: ${anders.join(', ')}` : ''}`,
  );
  anders.slice(0, 3).forEach((k) => {
    let i = 0;
    while (i < a[k].length && a[k][i] === b[k][i]) i += 1;
    console.log(`     ${k}: …${a[k].slice(Math.max(0, i - 60), i + 60)}\n       mit …${b[k].slice(Math.max(0, i - 60), i + 60)}`);
  });
  // Und die Ausnahmen sind wirklich anders – sonst wäre die Probe blind.
  check(
    roh.gesamtZahlen.medikamente > vorher.eintraege.filter((e) => e.art === 'medikament').length
      && roh.arztBericht[0].includes('EINGENOMMENE MITTEL'),
    `Tagebuch ${saat}: die Einnahmen selbst werden gezählt (${roh.gesamtZahlen.medikamente} Medikamente)`,
  );
}

ende();
