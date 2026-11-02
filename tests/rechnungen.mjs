/*
 * Ein Tagebuch aus einem Startwert – und alle Rechnungen darüber.
 *
 * Kein Test, sondern das Werkzeug für die Vergleiche zwischen zwei Fassungen
 * (tests/gold/erzeugen.mjs, tests/test-gold.mjs, tests/test-notiert.mjs). Die
 * Frage dahinter ist immer dieselbe: Rechnet die neue Fassung über dasselbe
 * Tagebuch zeichengleich, was die alte gerechnet hat? Dafür muss beides fest
 * stehen – das Tagebuch und die Liste der Rechnungen.
 *
 *   * Das Tagebuch hängt nur am Startwert und am Grunddatum, nie an „heute".
 *     Mit vorTagen() wäre das Gold in einer Woche ein anderes Tagebuch, und
 *     der Vergleich prüfte nichts mehr.
 *   * Die Rechnungen werden per dynamischem Import aus `wurzel/js/` geladen.
 *     So lässt sich dieselbe Liste über einen anderen Stand des Codes laufen
 *     lassen – einen git worktree mit der alten Fassung –, ohne eine Zeile
 *     zu kopieren.
 *   * Gerechnet wird in UTC. Die Rechnungen arbeiten in Ortszeit, und über
 *     einen Wechsel der Sommerzeit hätte ein Tag 23 oder 25 Stunden – je nach
 *     Rechner, auf dem der Test läuft, ein anderes Ergebnis.
 *
 * Was im Tagebuch steht, ist mit Absicht alles, was die Rechnungen anfassen:
 * Mahlzeiten mit Zutaten, groß, spät und auswärts; Beschwerden mit genauer
 * und ungefährer Zeit, mit Bezug zum Essen; Kopfschmerzen mit Merkmalen,
 * Dauer, Verlauf, Wirkung und den Mitteln dazu; Stuhlgänge; ein Säureblocker,
 * Ibuprofen, Paracetamol; Aktivitäten samt einer eigenen; Tagesfragen, Zyklus,
 * Wasser; Lücken. Und mit Absicht nichts, was erst nach der Fassung 27 eine
 * Bedeutung bekommen hat – siehe tests/test-gold.mjs.
 */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

process.env.TZ = 'UTC';

/** Der letzte Tag des Tagebuchs – fest, damit das Gold nicht altert. */
export const GRUNDDATUM = '2026-10-31';
export const TAGE = 120;

/** Die Startwerte, für die das Gold gespeichert ist. */
export const GOLD_SAATEN = [12, 29];

/** Der kleine, bekannte Zufallsgenerator – gleiche Saat, gleiche Folge. */
export function mulberry32(saat) {
  let a = saat >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ein ISO-Datum plus n Tage – in UTC gerechnet, ohne die App. */
export function isoPlus(iso, n) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

const uhrText = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** Minuten nach Mitternacht über den Tag hinaus: Tag und Uhrzeit. */
function amUm(iso, min) {
  const tag = Math.floor(min / 1440);
  return { am: isoPlus(iso, tag), um: uhrText(min - tag * 1440) };
}

const ZUTATEN = ['kaffee', 'alkohol', 'scharf', 'fett', 'zitrus', 'tomate', 'zwiebel',
  'kohlensaeure', 'suess', 'milch', 'rohkost', 'huelsen', 'vollkorn', 'geraeuchert'];
const ROLLEN = ['haupt', 'haupt', 'beilage', 'topping', 'getraenk', 'wuerze'];
const BESCHWERDE_ARTEN = ['brennen', 'druck', 'oberbauch', 'uebelkeit', 'sodbrennen',
  'aufstossen', 'blaehung', 'krampf', 'saettigung', 'appetit'];
// Die Merkmale, die es in der Fassung 27 gab – nicht mehr und nicht weniger.
const KOPF_MERKMALE = ['pochend', 'drueckend', 'einseitig', 'kopfuebel', 'kopferbrechen',
  'licht', 'bewegung', 'nacken', 'aura'];
const KOPF_DAUER = ['kurz', 'mittel', 'lang', 'status'];
const KOPF_VERLAUF = ['normal', 'eingeschraenkt', 'ausgefallen'];
const WIRKUNG = ['weg', 'besser', 'nicht'];
const STUHLBEZUG = ['besser', 'schlechter', 'gleich', 'keiner'];
const SAEUREBLOCKER = ['Pantoprazol', 'Omeprazol', 'Esomeprazol'];

/**
 * Ein Tagebuch über `tage` Tage bis einschließlich `grunddatum`.
 *
 * Zurück kommt ein Zustand, wie ihn der Speicher hält – mit allem, was der
 * Bericht liest. Der letzte und der vorletzte Tag sind nie Lücken: Was „heute"
 * steht, entscheidet über die Rat-Karte, und ein leerer Tag dort würde jede
 * Probe, die an einer Lücke etwas einträgt, an dieser einen Stelle treffen.
 */
export function tagebuch(saat, { grunddatum = GRUNDDATUM, tage = TAGE } = {}) {
  const r = mulberry32(saat);
  const ja = (p) => r() < p;
  const eins = (liste) => liste[Math.floor(r() * liste.length)];
  const zahl = (von, bis) => von + Math.floor(r() * (bis - von + 1));
  const saeure = SAEUREBLOCKER[saat % SAEUREBLOCKER.length];
  const eintraege = [];
  const tagesspeicher = {};
  const start = isoPlus(grunddatum, -(tage - 1));
  // Der Zyklus: alle 27 bis 31 Tage fünf Tage Blutung.
  const blutung = new Map();
  for (let t = zahl(0, 20); t < tage; t += zahl(27, 31)) {
    [3, 3, 2, 1, 1].forEach((st, k) => blutung.set(isoPlus(start, t + k), st));
  }
  // Der Säureblocker kommt erst nach einem Drittel dazu – sonst hätte die
  // Frage „hat es etwas bewirkt?" keine Zeit davor.
  const saeureAb = isoPlus(start, Math.floor(tage / 3));

  for (let i = 0; i < tage; i++) {
    const iso = isoPlus(start, i);
    const n = (x) => `${iso}-${x}`;
    const tag = {};
    const amEnde = i >= tage - 2;
    if (blutung.has(iso)) {
      tag.blutung = blutung.get(iso);
      if (ja(0.5)) tag.regelschmerz = zahl(1, 3);
    }
    if (ja(0.6)) tag.wasser = zahl(2, 10);
    // Eine Lücke: nichts eingetragen – höchstens Wasser oder die Periode.
    if (!amEnde && ja(0.1)) {
      if (Object.keys(tag).length) tagesspeicher[iso] = tag;
      continue;
    }
    // Ein Tag nur mit Tagesfragen.
    const nurFragen = !amEnde && ja(0.05);
    if (ja(0.8) || nurFragen) {
      tag.stimmung = zahl(0, 4);
      tag.stress = zahl(0, 4);
      tag.schlaf = zahl(0, 4);
      if (ja(0.7)) tag.bewegung = zahl(0, 4);
      if (ja(0.5)) tag.nachtwach = ja(0.2) ? 1 : 0;
      if (ja(0.05)) tag.notiz = 'Viel unterwegs';
    }
    if (Object.keys(tag).length) tagesspeicher[iso] = tag;
    if (nurFragen) continue;

    const anspannung = Number(tag.stress) || 0;
    const mahlzeiten = [];
    const essen = (id, min, extra = {}) => {
      const zutaten = ZUTATEN.filter(() => ja(0.18)).map((z) => ({ id: z, rolle: eins(ROLLEN) }));
      if (ja(0.08)) zutaten.push({ id: 'x:hafer', rolle: 'haupt' });
      const e = {
        id: n(id), art: 'essen', ...amUm(iso, min), was: extra.was || 'Essen', zutaten,
        portion: ja(0.2) ? 'gross' : (ja(0.15) ? 'klein' : 'normal'),
        ...(extra.auswaerts ? { auswaerts: true } : {}),
      };
      // Mit dem Zeitknopf eingetragen: die Tageszeit statt der Minute.
      if (extra.knopf && ja(0.12)) {
        Object.assign(e, { um: extra.knopf.um, ungefaehr: true, tageszeit: extra.knopf.id });
      }
      eintraege.push(e);
      mahlzeiten.push(e);
      return e;
    };
    const frueh = ja(0.85) ? essen('m1', zahl(28, 34) * 15, { was: 'Frühstück', knopf: { id: 'morgens', um: '08:00' } }) : null;
    const mittag = ja(0.8) ? essen('m2', zahl(48, 54) * 15, { was: 'Mittag', auswaerts: ja(0.15), knopf: { id: 'mittags', um: '12:30' } }) : null;
    if (ja(0.25)) essen('m3', zahl(62, 66) * 15, { was: 'Kuchen' });
    // Abends manchmal spät – nach 20 Uhr zählt das als eigener Umstand.
    const abend = ja(0.85) ? essen('m4', zahl(72, 86) * 15, { was: 'Abendessen', auswaerts: ja(0.1), knopf: { id: 'abends', um: '19:30' } }) : null;

    // Beschwerden nach dem Essen – nach Fettem, Kaffee und großen Portionen
    // öfter und stärker, damit die Bilanz etwas zu finden hat.
    mahlzeiten.forEach((m, k) => {
      const hat = (z) => m.zutaten.some((x) => x.id === z);
      const p = 0.12 + (hat('fett') ? 0.3 : 0) + (hat('kaffee') ? 0.2 : 0)
        + (m.portion === 'gross' ? 0.15 : 0) + anspannung * 0.03;
      if (!ja(p)) return;
      const [hh, mm] = m.um.split(':').map(Number);
      const staerke = Math.min(10, zahl(1, 6) + (hat('fett') ? 2 : 0) + (anspannung >= 3 ? 1 : 0));
      const b = {
        id: n(`b${k}`), art: 'beschwerde', ...amUm(iso, hh * 60 + mm + zahl(2, 14) * 15),
        staerke, arten: [eins(BESCHWERDE_ARTEN), ...(ja(0.3) ? [eins(BESCHWERDE_ARTEN)] : [])]
          .filter((x, j, alle) => alle.indexOf(x) === j),
      };
      if (ja(0.1)) b.stuhlbezug = eins(STUHLBEZUG);
      // „Nach dem Essen" mit dem Knopf: an die Mahlzeit gebunden, eine halbe
      // Stunde danach, wie es der Bogen einträgt.
      if (!m.ungefaehr && ja(0.15)) {
        Object.assign(b, {
          ...amUm(iso, hh * 60 + mm + 30), ungefaehr: true, bezug: 'nach', bezugMahlzeit: m.id,
          tageszeit: hh < 11 ? 'morgens' : (hh < 15 ? 'mittags' : 'abends'),
        });
      } else if (ja(0.05)) {
        Object.assign(b, { um: '19:30', ungefaehr: true, tageszeit: 'abends' });
      }
      eintraege.push(b);
    });
    // Ein später Auslöser: Hülsenfrüchte zum Abend, Blähungen fünf bis sechs
    // Stunden danach – das sieht nur das Zeitprofil.
    if (abend && abend.zutaten.some((x) => x.id === 'huelsen') && !abend.ungefaehr && ja(0.7)) {
      const [hh, mm] = abend.um.split(':').map(Number);
      eintraege.push({
        id: n('bs'), art: 'beschwerde', ...amUm(iso, hh * 60 + mm + zahl(20, 26) * 15),
        staerke: zahl(4, 7), arten: ['blaehung'],
      });
    }

    // Der Säureblocker am Morgen, oft mit dem Knopf „vor dem Frühstück".
    if (iso >= saeureAb && ja(0.8)) {
      const e = { id: n('p'), art: 'medikament', am: iso, um: '07:00', mittel: saeure, dosis: '40 mg' };
      if (frueh && !frueh.ungefaehr && ja(0.3)) {
        const [hh, mm] = frueh.um.split(':').map(Number);
        Object.assign(e, {
          um: uhrText(hh * 60 + mm - 30), ungefaehr: true, tageszeit: 'morgens', bezug: 'vor', bezugMahlzeit: frueh.id,
        });
      }
      eintraege.push(e);
    }
    // Ibuprofen ohne Kopfschmerz – gegen etwas anderes genommen.
    if (ja(0.05)) {
      eintraege.push({ id: n('i'), art: 'medikament', am: iso, um: '10:00', mittel: 'Ibuprofen', dosis: '400 mg' });
    }

    // Kopfschmerz, oft mit einem Mittel dazu.
    if (ja(blutung.has(iso) ? 0.35 : 0.18)) {
      const min = zahl(32, 80) * 15;
      const k = {
        id: n('k'), art: 'kopf', ...amUm(iso, min), staerke: zahl(2, 9),
        kopfArten: KOPF_MERKMALE.filter(() => ja(0.3)),
      };
      if (ja(0.8)) k.dauer = eins(KOPF_DAUER);
      if (ja(0.7)) k.verlauf = eins(KOPF_VERLAUF);
      if (ja(0.1)) Object.assign(k, { um: '12:30', ungefaehr: true, tageszeit: 'mittags' });
      if (ja(0.65)) {
        k.mittelWirkung = eins(WIRKUNG);
        eintraege.push({
          id: n('km'), art: 'medikament', ...amUm(iso, min + 10),
          mittel: ja(0.6) ? 'Ibuprofen' : 'Paracetamol', dosis: ja(0.5) ? '400 mg' : '500 mg', zuKopf: k.id,
        });
      }
      eintraege.push(k);
    }

    if (ja(0.8)) {
      const s = { id: n('s'), art: 'stuhl', ...amUm(iso, zahl(26, 40) * 15), form: zahl(1, 7) };
      if (ja(0.1)) s.dringend = true;
      if (ja(0.05)) s.unvollstaendig = true;
      eintraege.push(s);
    }

    // Aktivitäten am Abend, eine davon selbst angelegt.
    [['gym', 0.2], ['yoga', 0.1], ['sauna', 0.05], ['laufen', 0.15], ['a:klettern', 0.08]]
      .forEach(([id, p], j) => {
        if (!ja(p)) return;
        const a = {
          id: n(`a${j}`), art: 'aktivitaet', ...amUm(iso, zahl(68, 80) * 15), aktivitaeten: [id],
          intensitaet: ja(0.5) ? eins(['leicht', 'mittel', 'hart']) : null,
        };
        if (ja(0.2)) Object.assign(a, { um: '19:30', ungefaehr: true, tageszeit: 'abends' });
        eintraege.push(a);
      });
    if (ja(0.05)) eintraege.push({ id: n('n'), art: 'notiz', ...amUm(iso, 21 * 60), text: 'Ruhiger Tag' });
  }

  sortiere(eintraege);

  const gewicht = [];
  for (let t = 0; t < tage; t += 14) {
    gewicht.unshift({ am: isoPlus(start, t), kg: Math.round((64 + r() * 2 - t / 60) * 10) / 10 });
  }

  return {
    eintraege,
    tage: tagesspeicher,
    fenster: 4,
    mindestFaelle: 5,
    eigeneAusloeser: [{ id: 'x:hafer', name: 'Hafer' }],
    eigeneAktivitaeten: [{ id: 'a:klettern', name: 'Klettern' }],
    standardMittel: [
      { id: 'sm-saeure', mittel: saeure, dosis: '40 mg', tageszeit: 'morgens', bezug: 'vor' },
      { id: 'sm-ibu', mittel: 'Ibuprofen', dosis: '400 mg', tageszeit: null, bezug: null },
    ],
    tagesfragen: ['stimmung', 'stress', 'schlaf', 'bewegung', 'blutung', 'sex', 'nachtwach'],
    termine: [isoPlus(grunddatum, -45)],
    befunde: [],
    gewicht,
    abnehmenGewollt: false,
    beschwerdenSeit: '2025-11',
    kueche: [],
    versuch: null,
    versuche: [],
    provokation: null,
    provokationen: [],
    stufenplan: null,
    stufenplaene: [],
    wasserGlas: 250,
    wasserZeigen: true,
  };
}

const minuten = (um) => {
  const [h, m] = String(um).split(':').map(Number);
  return h * 60 + m;
};

/** Nach Tag und Uhrzeit, wie der Speicher die Liste hält. */
function sortiere(eintraege) {
  return eintraege.sort((a, b) => (a.am === b.am ? minuten(a.um) - minuten(b.um) : (a.am < b.am ? -1 : 1)));
}

/*
 * ADHS-Mittel für mitNeuenAngaben(): je Startwert ein anderes, damit kein
 * Test immer dieselbe Zusammenstellung von Mitteln zeigt.
 */
const ADHS_BEISPIELE = [
  { mittel: 'Medikinet retard', dosis: '10 mg', form: 'pellet' },
  { mittel: 'Ritalin Adult', dosis: '20 mg', form: 'sodas' },
  { mittel: 'Concerta', dosis: '18 mg', form: 'oros' },
  { mittel: 'Elvanse', dosis: '30 mg' },
  { mittel: 'Attentin', dosis: '5 mg' },
  { mittel: 'Strattera', dosis: '40 mg' },
  { mittel: 'Intuniv', dosis: '1 mg' },
  { mittel: 'Kinecteen', dosis: '18 mg', form: 'retardtab' },
  { mittel: 'Methylphenidat', dosis: '10 mg', form: 'unbekannt' },
];

/**
 * Dasselbe Tagebuch mit allem, was die Fassung 28 neu speichert: an jedem Tag
 * vom ersten Eintrag bis zum letzten Tag – Lücken eingeschlossen – eine
 * ADHS-Einnahme (mit Form, Essensangabe und Zeitpunkt der Angabe, genau oder
 * mit dem Zeitknopf), an manchen eine zweite, und die neuen Tagesangaben.
 *
 * Nichts davon ist eine Angabe über Bauch oder Kopf. Jede Rechnung, die dabei
 * etwas anderes ergibt als ohne, zählt etwas mit, das sie nicht zählen darf
 * (siehe tests/test-notiert.mjs).
 */
export function mitNeuenAngaben(daten, saat) {
  const r = mulberry32(saat * 7919 + 1);
  const ja = (p) => r() < p;
  const zahl = (von, bis) => von + Math.floor(r() * (bis - von + 1));
  const m = ADHS_BEISPIELE[saat % ADHS_BEISPIELE.length];
  const eintraege = daten.eintraege.map((e) => ({ ...e }));
  const tage = JSON.parse(JSON.stringify(daten.tage));
  const erster = daten.eintraege[0].am;
  const letzter = daten.eintraege[daten.eintraege.length - 1].am;
  const fruehstueck = new Map(daten.eintraege
    .filter((e) => e.art === 'essen' && !e.ungefaehr && minuten(e.um) < 11 * 60)
    .map((e) => [e.am, e]));
  const ms = (iso, um) => Date.parse(`${iso}T${um}:00Z`);
  for (let iso = erster; iso <= letzter; iso = isoPlus(iso, 1)) {
    const e = {
      id: `${iso}-adhs1`, art: 'medikament', am: iso, um: uhrText(zahl(26, 36) * 15),
      mittel: m.mittel, dosis: m.dosis, ...(m.form ? { form: m.form } : {}),
    };
    const f = fruehstueck.get(iso);
    if (f && ja(0.25)) {
      Object.assign(e, {
        um: uhrText(minuten(f.um) + 10), ungefaehr: true, tageszeit: 'morgens', bezug: 'beim', bezugMahlzeit: f.id,
      });
    } else if (ja(0.15)) {
      Object.assign(e, { um: '08:00', ungefaehr: true, tageszeit: 'morgens' });
    }
    if (ja(0.6)) {
      e.essen = ['mit', 'vor', 'ohne'][zahl(0, 2)];
      e.essenGesetzt = ms(iso, e.um) + zahl(-10, 180) * 60000;
    }
    eintraege.push(e);
    if (ja(0.3)) {
      eintraege.push({
        id: `${iso}-adhs2`, art: 'medikament', am: iso, um: uhrText(zahl(48, 54) * 15), mittel: m.mittel, dosis: m.dosis,
      });
    }
    const tag = { ...(tage[iso] || {}) };
    if (ja(0.7)) tag.verspannt = zahl(0, 4);
    if (ja(0.7)) tag.kiefer = zahl(0, 4);
    if (ja(0.7)) tag.gepresst = zahl(0, 1);
    if (ja(0.7)) tag.schiene = zahl(0, 1);
    if (ja(0.1)) tag.adhsPause = ['pause', 'geplant', 'vergessen', 'beschwerden'][zahl(0, 3)];
    if (Object.keys(tag).length) tage[iso] = tag;
  }
  return {
    ...daten,
    eintraege: sortiere(eintraege),
    tage,
    standardMittel: [...daten.standardMittel, {
      id: 'sm-adhs', mittel: m.mittel, dosis: m.dosis, tageszeit: 'morgens', bezug: null, form: m.form || null,
    }],
  };
}

/** Lädt ein Modul aus wurzel/js – jede Wurzel bekommt ihre eigenen Module. */
async function modul(wurzel, name) {
  return import(pathToFileURL(path.join(wurzel, 'js', name)).href);
}

/**
 * Alle Rechnungen über ein Tagebuch, mit dem Code unter `wurzel`.
 *
 * Die ersten zwanzig sind die aus tests/test-wasser.mjs, dazu alles, was die
 * Reiter „Muster" und „Verlauf" und der Bericht sonst noch rechnen. Jede
 * Rechnung wird mit festen Argumenten aufgerufen: `heute` ist das Grunddatum,
 * und wo eine Rechnung die Uhr liest, bekommt sie eine feste.
 *
 * @returns {Promise<Record<string, unknown>>} Name der Rechnung → Ergebnis
 */
export async function alleRechnungen(wurzel, daten, { heute = GRUNDDATUM, tage: anzahl = TAGE } = {}) {
  const [
    aus, kri, kopf, stuhl, unter, schicht, zyk, rat, bild, zuf, ber, zeit, ww, akt, ans, mit, dat, dn,
  ] = await Promise.all([
    'auswertung.js', 'kriterien.js', 'kopf.js', 'stuhl.js', 'unterleib.js', 'schichten.js',
    'zyklus.js', 'rat.js', 'bild.js', 'zufall.js', 'bericht.js', 'zeitprofil.js',
    'wechselwirkung.js', 'aktivitaet.js', 'ansprechen.js', 'mittel.js', 'datum.js', 'daten.js',
  ].map((m) => modul(wurzel, m)));

  const { eintraege, tage } = daten;
  const von = isoPlus(heute, -(anzahl - 1));
  // Ein Tag vor dem Tagebuch und einer danach gehören mit dazu – dort muss
  // jede Rechnung „nichts" sagen.
  const alleTage = Array.from({ length: anzahl + 2 }, (_, i) => isoPlus(von, i - 1));
  const tagesWert = aus.tagesWert;
  // Wie die App: Ein ADHS-Mittel hat seine Gruppe, auch ohne Wissenstext.
  // Eine Fassung ohne adhsGruppe kennt keine – dort bleibt es null.
  const gruppeVon = (name) => {
    const g = mit.wissenZu(name);
    return g ? g.id : (mit.adhsGruppe ? mit.adhsGruppe(name) : null);
  };
  const istNsar = (name) => ['nsar', 'kombi'].includes(gruppeVon(name));
  const istSaeuremittel = (name) => ['ppi', 'h2', 'antazida', 'alginat'].includes(gruppeVon(name));
  const name = (id) => dn.ausloeserName(id, daten.eigeneAusloeser);
  const opt = { fenster: daten.fenster, mindestFaelle: daten.mindestFaelle, eigene: daten.eigeneAusloeser };
  const bilanz = aus.ausloeserBilanz(eintraege, opt);
  const bewertet = aus.bewerteteMahlzeiten(eintraege, daten.fenster);
  const fenster = zeit.fensterWerte(eintraege);
  const merkmalIds = [...dn.ALLE_AUSLOESER.map((a) => a.id), ...daten.eigeneAusloeser.map((a) => a.id)];
  const genugIds = bilanz.filter((b) => b.genug).map((b) => b.id);
  const km = kopf.kopfMittel(eintraege, gruppeVon, heute);
  const phasen = zyk.phasenBilanz(eintraege, tage, tagesWert);
  // „Jetzt" für die Aktivitäten: der Mittag nach dem letzten Tag.
  const jetzt = dat.zeitpunkt(isoPlus(heute, 1), '12:00');
  // Der Bericht ohne Fußzeile: Sie ist fester Text und sagt über die
  // Rechnungen nichts.
  const bericht = (b) => ber.arztBericht(daten, isoPlus(heute, -(b - 1)), heute).split('\n---\n')[0];

  return {
    tagesWert: alleTage.map((iso) => tagesWert(eintraege, iso, tage)),
    verlaufReihe: aus.verlaufReihe(eintraege, von, heute, tage),
    gesamtZahlen: aus.gesamtZahlen(eintraege, tage, von, heute),
    serieOhne: aus.serieOhne(eintraege, tage, heute),
    trend: aus.trend(eintraege, tage, heute, 14),
    faktorBilanz: ['stress', 'schlaf', 'stimmung', 'bewegung', 'nachtwach']
      .map((id) => aus.faktorBilanz(eintraege, tage, id, tagesWert)),
    kriterien: kri.kriterien({
      eintraege, tage, heute, beschwerdenSeit: daten.beschwerdenSeit, istSaeuremittel,
    }),
    kopfTagesWert: alleTage.map((iso) => kopf.kopfTagesWert(eintraege, iso, tage)),
    kopfZahlen: kopf.kopfZahlen(eintraege, tage, heute),
    kopfNachPhase: kopf.kopfNachPhase(eintraege, tage),
    kopfUmPeriode: kopf.kopfUmPeriode(eintraege, tage, heute),
    bauchAnKopfTagen: kopf.bauchAnKopfTagen(eintraege, tage, tagesWert),
    kopfUmstaende: kopf.kopfUmstaende(eintraege, tage, aus.faktorBilanz, zuf.zufallsSpielraum),
    stuhlZahlen: stuhl.stuhlZahlen(eintraege, tage),
    schmerzVergleich: stuhl.schmerzVergleich(eintraege, tage, ['krampf']),
    unterleibsBild: unter.unterleibsBild(eintraege, tage, tagesWert),
    haeltStand: merkmalIds.map((id) => schicht.haeltStand(bewertet, id, tage, {
      kopfTage: kopf.kopfTageVon(eintraege),
    })),
    phasenBilanz: phasen,
    raete: rat.raete({
      eintraege, tage, heute, eigene: daten.eigeneAusloeser, bilanz,
      faktoren: Object.fromEntries(['stress', 'schlaf', 'stimmung']
        .map((id) => [id, aus.faktorBilanz(eintraege, tage, id, tagesWert)])),
      phasen, letzteMahlzeitStunden: null, mittel: [],
    }),
    bildLesen: bild.bildLesen({ eintraege, tage, bilanz, name, istNsar }),
    ausloeserBilanz: bilanz,
    klassenBilanz: aus.klassenBilanz(eintraege, { fenster: daten.fenster }),
    zeitProfil: merkmalIds.map((id) => zeit.zeitProfil(fenster, id)),
    zeitBild: zeit.zeitBild(eintraege),
    spaeteFunde: zeit.spaeteFunde(fenster, merkmalIds, daten.fenster),
    nsarNachwirkung: kopf.nsarNachwirkung(eintraege, tage, km.nsarTage, km.kopfTageOhneNsar, tagesWert),
    kopfMittel: km,
    kopfMonate: kopf.kopfMonate(eintraege, tage, gruppeVon, heute),
    mittelBilanz: ans.mittelBilanz(eintraege, tage, { heute, gruppeVon }),
    aktivitaetBilanz: akt.aktivitaetBilanz(eintraege, tage, {
      fenster: daten.fenster, mindestFaelle: daten.mindestFaelle, jetzt,
    }),
    wasserVergleich: stuhl.wasserVergleich(eintraege, tage),
    phasenUrteil: ww.phasenUrteil(phasen, tage),
    phasenWirkung: genugIds.map((id) => ww.phasenWirkung(bewertet, id, tage, genugIds.length)),
    arztBericht: [30, 90].map(bericht),
  };
}

/**
 * Steht in einem Ergebnis überhaupt etwas? Ein Gold aus lauter leeren Listen
 * prüfte nur, dass beide Fassungen nichts finden.
 */
export function nichtLeer(x) {
  if (x === null || x === undefined) return false;
  if (typeof x === 'string') return x.length > 0;
  if (typeof x !== 'object') return true;
  const werte = Array.isArray(x) ? x : Object.values(x);
  return werte.some(nichtLeer);
}
