/*
 * Tagebücher für die Rechnungen der Fassung 28 – mit und ohne eingebauten
 * Effekt, mit und ohne Störwege.
 *
 * Kein Test, sondern das Werkzeug für tests/test-adhs-rechnung.mjs,
 * tests/test-spannung-rechnung.mjs und tests/test-nulltagebuch.mjs. Jedes
 * Tagebuch hängt nur am Startwert; „heute" ist der Tag nach dem letzten, damit
 * jedes Fenster abgelaufen ist.
 *
 * DIE STÖRWEGE – was ein echtes Tagebuch mitbringt und wofür es die Regeln
 * in js/vergleich.js, js/adhs.js und js/spannung.js gibt:
 *
 *   * Pausen am Wochenende und in Urlaubsblöcken – und an Wochenenden und im
 *     Urlaub sind Bauch, Kopf und Schlaf ohnehin anders.
 *   * An Tagen ohne Mittel und nach Nächten ohne Schiene wird dünner
 *     eingetragen: weniger Mahlzeiten, weniger Beschwerden.
 *   * „Zum Essen?" wird manchmal erst nach einer Beschwerde angetippt.
 *   * Nach Alkohol wird die Schiene eher vergessen – und der Kopf ist am
 *     Morgen danach ohnehin schwerer.
 *   * Einnahmen werden nachgetragen: Die eingetragene Zeit liegt später als
 *     die wirkliche.
 *
 * Wie weit sie reichen, ist verschieden – nachgeprüft mit Mutationsproben
 * gegen tests/test-nulltagebuch.mjs: Ohne den Wochentag (R6), ohne die
 * Ausnahme für Nächte nach Feier, Reise oder Alkohol und ohne die
 * Mindeststrenge der Familien (R4) täuschen diese Tagebücher wirklich Funde
 * vor. Für die Blöcke (R6b), die Eintragsdichte (R6c) und die Nacht davor
 * sind die Störwege zu schwach: Ohne diese Regeln ändern sich die Raten kaum,
 * der Nulltest merkt es nur daran, dass sie nicht mehr anschlagen. Und „Zum
 * Essen?" nach einer Beschwerde verschiebt nur die Zeit der Angabe, nicht
 * die Antwort – ohne R10 täuscht das hier nichts vor. Dass jede dieser Regeln
 * gebraucht wird, zeigt tests/test-adhs-rechnung.mjs Fall für Fall.
 *
 * Ohne Effekt hängt nichts davon am Mittel, am Essen zur Einnahme, an der
 * Schiene, an der Verspannung oder an einer Massage. Jeder Fund in einem
 * solchen Tagebuch ist ein falscher.
 *
 * Die Mittel wechseln mit dem Startwert, und kein Tagebuch enthält einen
 * Säureblocker: Kein Testtagebuch soll eine bestimmte Zusammenstellung aus
 * Mittel, Säureblocker, Massagepistole und Schiene zeigen.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { mulberry32, isoPlus } from './rechnungen.mjs';
import { ROOT } from './umgebung.mjs';

process.env.TZ = 'UTC';

/** Lädt ein Modul der App – aus BAUCHBUCH_ROOT, damit eine Kopie geprüft werden kann. */
export async function appModul(name) {
  return import(pathToFileURL(path.join(ROOT, 'js', name)).href);
}

export const GRUND = '2026-10-31';

const uhr = (min) => {
  const m = Math.max(0, Math.min(1439, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const ms = (iso, min) => Date.parse(`${iso}T00:00:00Z`) + min * 60000;
const wochenende = (iso) => [0, 6].includes(new Date(`${iso}T12:00:00Z`).getUTCDay());

/** Stimulanzien, je Startwert ein anderes. */
const STIMULANS = [
  { mittel: 'Ritalin Adult', dosis: '20 mg', form: 'sodas' },
  { mittel: 'Elvanse', dosis: '30 mg' },
  { mittel: 'Concerta', dosis: '36 mg', form: 'oros' },
  { mittel: 'Attentin', dosis: '10 mg' },
  { mittel: 'Medikinet adult', dosis: '20 mg', form: 'pellet' },
  { mittel: 'Kinecteen', dosis: '27 mg', form: 'retardtab' },
];

/**
 * Ein Tagebuch.
 *
 * @param {number} saat
 * @param {object} o
 *   tage         Länge (120)
 *   stoerwege    die Störwege oben (true)
 *   a1           eingebauter Unterschied im Bauch nach Einnahmen ohne Essen (0)
 *   kopf         [ohne, mit] – Kopfschmerz-Wahrscheinlichkeit an Tagen ohne und
 *                mit Mittel nach der Einnahmezeit (null: kein Effekt)
 *   v2           [locker, stark] – neuer Kopfschmerz am Tag nach einem lockeren
 *                bzw. stark verspannten Tag (null: kein Effekt)
 *   pause        Anteil zufälliger Tage ohne Mittel (0.12)
 *   ohneEssen    Anteil der Einnahmen mit „ohne Essen" (0.25)
 */
export function adhsTagebuch(saat, o = {}) {
  const {
    tage: anzahl = 120, stoerwege = true, a1 = 0, kopf = null, v2 = null, pause = 0.12, ohneEssen = 0.25,
  } = o;
  const r = mulberry32(saat * 2654435761 + 17);
  const ja = (p) => r() < p;
  const zahl = (von, bis) => von + Math.floor(r() * (bis - von + 1));
  const eins = (l) => l[Math.floor(r() * l.length)];
  const m = STIMULANS[saat % STIMULANS.length];
  const start = isoPlus(GRUND, -(anzahl - 1));
  const eintraege = [];
  const tage = {};
  let nr = 0;
  const id = (x) => `${x}${(nr += 1)}`;

  // Urlaub: ein oder zwei Blöcke, in denen das Mittel oft pausiert.
  const urlaub = new Set();
  if (stoerwege && ja(0.6)) {
    const bloecke = ja(0.5) ? 2 : 1;
    for (let b = 0; b < bloecke; b++) {
      const ab = zahl(5, anzahl - 15);
      const lang = zahl(5, 10);
      for (let i = 0; i < lang; i++) urlaub.add(isoPlus(start, ab + i));
    }
  }
  // Manche lassen am Wochenende weg – nicht alle.
  const wochenendPause = stoerwege && ja(0.4) ? 0.6 : 0;

  let gesternAlkohol = false;
  let gesternVerspannt = null;
  for (let i = 0; i < anzahl; i++) {
    const iso = isoPlus(start, i);
    const we = wochenende(iso);
    const imUrlaub = urlaub.has(iso);
    const tag = {};

    /* Tag ohne Mittel? Mit Grund, wie er angetippt würde. */
    let grund = null;
    if (imUrlaub && ja(0.8)) grund = 'geplant';
    else if (we && ja(wochenendPause)) grund = 'geplant';
    else if (ja(pause)) grund = eins(['vergessen', 'vergessen', 'pause', 'geplant']);
    // An schlechten Tagen lässt manch einer es weg – „wegen Beschwerden".
    const schlechterTag = ja(0.08);
    if (!grund && schlechterTag && ja(0.4)) grund = 'beschwerden';
    if (grund) tag.adhsPause = grund;
    const mitMittel = !grund;

    // Dünner eingetragen? (Störweg)
    const nachtOhne = ja(0.85) ? (ja(gesternAlkohol && stoerwege ? 0.75 : 0.25) ? 0 : 1) : null;
    const duenn = stoerwege && (!mitMittel || nachtOhne === 0) && ja(0.7);
    const notiere = (p = 1) => ja(duenn ? p * 0.5 : p);

    /* Einnahmen */
    let t1 = null;
    let essenArt = null;
    if (mitMittel) {
      const wahr = zahl(6 * 60 + 30, 8 * 60 + 30);
      // Nachgetragen: die eingetragene Zeit liegt später (Störweg).
      const eingetragen = stoerwege && ja(0.1) ? wahr + zahl(30, 120) : wahr;
      t1 = eingetragen;
      const e = {
        id: id('m'), art: 'medikament', am: iso, um: uhr(eingetragen), mittel: m.mittel, dosis: m.dosis,
        ...(m.form ? { form: m.form } : {}),
      };
      if (ja(0.12)) Object.assign(e, { um: '08:00', ungefaehr: true, tageszeit: 'morgens' });
      if (!e.ungefaehr && ja(0.75)) {
        essenArt = ja(ohneEssen) ? 'ohne' : (ja(0.2) ? 'vor' : 'mit');
        e.essen = essenArt;
        e.essenGesetzt = ms(iso, eingetragen) + zahl(1, 40) * 60000;
      }
      eintraege.push(e);
      // Eine zweite Gabe am Mittag – an den meisten Tagen, zu wechselnder Zeit.
      if (ja(0.65)) {
        eintraege.push({
          id: id('m'), art: 'medikament', am: iso, um: uhr(zahl(11 * 60 + 30, 15 * 60 + 30)), mittel: m.mittel, dosis: m.dosis,
        });
      }
    }

    /* Mahlzeiten – zur Angabe passend, ein paar widersprechen */
    const mahlzeiten = [];
    const essen = (min, extra = {}) => {
      // Alkohol wird eingetragen – die Regel in js/spannung.js kann nur
      // ausnehmen, was dasteht.
      if (!extra.alkohol && !notiere(0.95)) return null;
      const zutaten = ['kaffee', 'fett', 'scharf', 'milch', 'vollkorn'].filter(() => ja(0.2))
        .map((z) => ({ id: z, rolle: 'haupt' }));
      if (extra.alkohol) zutaten.push({ id: 'alkohol', rolle: 'getraenk' });
      const e = { id: id('e'), art: 'essen', am: iso, um: uhr(min), was: 'Essen', zutaten, portion: 'normal' };
      eintraege.push(e);
      mahlzeiten.push({ e, min });
      return e;
    };
    if (essenArt === 'mit') essen(t1 + zahl(-20, 10));
    else if (essenArt === 'vor') essen(t1 + zahl(20, 55));
    else if (essenArt === 'ohne') { if (ja(0.9)) essen(t1 + zahl(140, 220)); else essen(t1 + zahl(10, 50)); }
    else if (ja(0.8)) essen(zahl(7 * 60, 9 * 60));
    if (ja(0.8)) essen(zahl(12 * 60, 13 * 60 + 30));
    const alkohol = ja(stoerwege && we ? 0.35 : 0.12);
    if (ja(0.85)) essen(zahl(18 * 60, 20 * 60 + 45), { alkohol });

    /* Beschwerden – im Nulltagebuch unabhängig von Mittel und Essen */
    const grundP = 0.18 + (stoerwege && we ? 0.08 : 0) + (stoerwege && imUrlaub ? -0.06 : 0) + (schlechterTag ? 0.4 : 0);
    let fensterMax = 0;
    mahlzeiten.forEach(({ min }) => {
      if (!ja(grundP)) return;
      const bmin = min + zahl(20, 180);
      const st = zahl(1, 6) + (schlechterTag ? 2 : 0);
      if (!notiere(1)) return;
      eintraege.push({ id: id('b'), art: 'beschwerde', am: iso, um: uhr(bmin), staerke: st, arten: [eins(['druck', 'brennen', 'blaehung', 'appetit'])] });
      if (t1 !== null && bmin > t1 && bmin <= t1 + 240) fensterMax = Math.max(fensterMax, st);
    });
    // Der eingebaute Unterschied nach Einnahmen ohne Essen.
    if (a1 && essenArt === 'ohne') {
      const plus = Math.min(10, fensterMax + (ja(0.5) ? Math.floor(a1) : Math.ceil(a1)));
      eintraege.push({ id: id('b'), art: 'beschwerde', am: iso, um: uhr(t1 + 100), staerke: plus, arten: ['druck'] });
    }
    // „Zum Essen?" erst nach einer Beschwerde angetippt (Störweg): Die Angabe
    // bekommt die Zeit nach der ersten Beschwerde im Fenster.
    if (stoerwege && essenArt && ja(0.3)) {
      const e = eintraege.find((x) => x.am === iso && x.art === 'medikament' && x.essen);
      const b = eintraege.filter((x) => x.am === iso && x.art === 'beschwerde')
        .map((x) => Number(x.um.slice(0, 2)) * 60 + Number(x.um.slice(3)))
        .filter((x) => x > t1).sort((a, b2) => a - b2)[0];
      if (e && b !== undefined) e.essenGesetzt = ms(iso, b + 10);
    }

    /* Kopf */
    let kopfP = 0.16 + (stoerwege && we ? 0.08 : 0) + (stoerwege && gesternAlkohol ? 0.2 : 0)
      + (stoerwege && imUrlaub ? -0.06 : 0);
    if (kopf) kopfP = mitMittel ? kopf[1] : kopf[0];
    const verspanntGestern = gesternVerspannt;
    if (v2 && verspanntGestern !== null && verspanntGestern !== 2) {
      kopfP = verspanntGestern >= 3 ? v2[1] : v2[0];
    }
    if (ja(Math.max(0, Math.min(1, kopfP))) && notiere(1)) {
      const kmin = kopf ? zahl(10 * 60 + 30, 19 * 60) : zahl(6 * 60, 20 * 60);
      const k = {
        id: id('k'), art: 'kopf', am: iso, um: uhr(kmin), staerke: zahl(2, 8),
        kopfArten: [eins(['pochend', 'drueckend', 'beidseitig', 'einseitig'])],
      };
      if (!kopf && !v2 && ja(0.2)) k.kopfArten.push('aufwachen');
      if (ja(0.6)) k.dauer = eins(['kurz', 'mittel', 'mittel', 'lang']);
      if (!kopf && !v2 && ja(0.08)) Object.assign(k, { um: '12:30', ungefaehr: true, tageszeit: 'mittags' });
      eintraege.push(k);
    }

    /* Stuhl */
    if (notiere(0.8)) eintraege.push({ id: id('s'), art: 'stuhl', am: iso, um: uhr(zahl(6 * 60, 10 * 60)), form: zahl(1, 7) });

    /* Aktivitäten: Feier am Wochenende, Massage und Wärme oft nach Verspannung */
    if (stoerwege && we && ja(0.3)) {
      eintraege.push({ id: id('a'), art: 'aktivitaet', am: iso, um: uhr(zahl(19 * 60, 22 * 60)), aktivitaeten: ['feier'] });
    }
    const nachVerspannung = verspanntGestern !== null && verspanntGestern >= 2;
    [['waerme', 0.25], ['massage', 0.2], ['massagepistole', 0.2], ['yoga', 0.18]].forEach(([a, p]) => {
      if (!ja(nachVerspannung ? p + 0.1 : p)) return;
      eintraege.push({ id: id('a'), art: 'aktivitaet', am: iso, um: uhr(zahl(16 * 60, 21 * 60)), aktivitaeten: [a] });
    });

    /* Tagesfragen */
    if (notiere(0.9)) {
      tag.stress = zahl(0, 4);
      tag.schlaf = Math.max(0, Math.min(4, zahl(0, 4) + (stoerwege && imUrlaub ? -1 : 0)));
      tag.stimmung = zahl(0, 4);
      if (ja(0.6)) tag.nachtwach = ja(0.3) ? 1 : 0;
    }
    if (ja(0.85)) tag.verspannt = zahl(0, 4);
    if (ja(0.8)) tag.kiefer = Math.max(0, Math.min(4, zahl(0, 3) + (stoerwege && gesternAlkohol ? 1 : 0)));
    if (ja(0.8)) tag.gepresst = ja(0.3) ? 1 : 0;
    if (nachtOhne !== null) tag.schiene = nachtOhne;
    if (Object.keys(tag).length) tage[iso] = tag;

    gesternAlkohol = alkohol;
    gesternVerspannt = tag.verspannt === undefined ? null : tag.verspannt;
  }

  const minuten = (u) => Number(u.slice(0, 2)) * 60 + Number(u.slice(3));
  eintraege.sort((a, b) => (a.am === b.am ? minuten(a.um) - minuten(b.um) : (a.am < b.am ? -1 : 1)));
  const heute = isoPlus(GRUND, 1);
  return {
    eintraege,
    tage,
    heute,
    jetzt: Date.parse(`${heute}T12:00:00Z`),
    fenster: 4,
    mindestFaelle: 5,
    standardMittel: [{
      id: 'sm1', mittel: m.mittel, dosis: m.dosis, tageszeit: 'morgens', bezug: null, form: m.form || null,
    }],
    mittel: m.mittel,
  };
}

/** Die Rechnungen, die der Nulltest einzeln zählt – mit Weg zu ihrem Ergebnis. */
export function rechnungenVon(a, s) {
  const raus = {};
  if (a.a1) raus.a1 = a.a1.haupt.vergleich;
  if (a.a2) Object.entries(a.a2.zeilen).forEach(([k, v]) => { raus[`a2-${k}`] = v; });
  if (a.a3) raus.a3 = a.a3;
  raus.v1a = s.v1.v1a;
  raus.v1b = s.v1.v1b;
  raus.v2 = s.v2;
  s.v3.forEach((z) => { raus[`v3-${z.id}`] = z.vergleich; });
  return raus;
}
