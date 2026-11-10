/*
 * Kiefer, Nacken, Schiene: was mit Kopfschmerz zusammen öfter oder seltener
 * kommt – als Zahlen fürs Gespräch, ohne Urteil über eine Behandlung.
 *
 * Die Rechnungen der Familie „Kiefer und Nacken":
 *
 *   V1   Nächte mit gegen ohne Schiene: Kopf am Morgen (V1a), Kiefer am
 *        Morgen (V1b).
 *   V2   Nach einem stark verspannten Tag gegen nach einem lockeren: ein
 *        neuer Kopfschmerz am nächsten Tag?
 *   V3   Massage, Massagepistole, Wärme, Dehnen nach einem mindestens mittel
 *        verspannten Vortag: Kopfschmerz in den 24 Stunden danach – über
 *        aktivitaetBilanz in js/aktivitaet.js mit einem Filter.
 *   V4   Kopfschmerztage vor und seit dem ersten Eintrag einer solchen
 *        Aktivität – nur beschrieben.
 *   V5   Kiefer am Morgen nach Nächten mit „Nachts davon wach" – nur
 *        beschrieben.
 *
 * Und was nur als Zahl dasteht, weil es am selben Tag passiert (R7):
 * Nacken an Kopfschmerztagen, die Merkmale am Kiefer, wie oft gepresst.
 *
 * Zwei Fallen, die hier besonders nahe liegen und deshalb ausdrücklich
 * geschlossen sind:
 *
 *   * Eine fehlende Antwort zur Schiene ist keine Nacht ohne Schiene (R2).
 *     Wer die Frage nur beantwortet, wenn er sie getragen hat, hätte sonst
 *     lauter Nächte „ohne", in denen es ihm nicht schlechter ging.
 *   * Nach einer Feier, einer Reise oder Alkohol wird die Schiene womöglich
 *     eher vergessen (eine Annahme der App) – und gerade dann kann der Kopf
 *     am nächsten Morgen aus anderen Gründen schwerer sein: Alkohol kann
 *     nach einigen Stunden einen Kopfschmerz auslösen (ICHD-3, 2018,
 *     8.1.4.2: binnen 5 bis 12 Stunden), und ein unregelmäßiger
 *     Schlafrhythmus zählt zu den möglichen Auslösern einer Migräne
 *     (gesund.bund.de/migraene, Stand 21.12.2022, Auslöser). Diese
 *     Nächte zählen auf keiner Seite.
 *
 * Rein, wie js/adhs.js: alles als Argument, nichts gespeichert, keine
 * Schalter. Ob etwas davon zu sehen ist, entscheidet js/app.js (R0).
 */
import {
  KNOPF_TAGESZEIT, fmtDatum, minutenAmTag, plusTage, tageDazwischen, tageszeitVon, zeitpunkt,
} from './datum.js';
import { fmtZahl } from './text.js';
import { eintragZaehlt, tagZaehlt } from './wasser.js';
import { zutatenVon } from './auswertung.js';
import { aktivitaetBilanz, aktivitaetVon, aktivitaetenVon } from './aktivitaet.js';
import { herueberreichend, kopfEintraege, nullEins } from './kopf.js';
import { adhsEinnahmen } from './adhs.js';
import {
  ZIEL_BAUCH, ZIEL_KOPF, eintraegeNachTag, familienVergleiche, tagNotiertOhne, vergleichRoh, vergleichUrteilen,
} from './vergleich.js';

/** Mindestfälle je Seite. */
export const SPANNUNG_MINDEST = { v1a: 12, v1b: 8, v2: 12, v2gut: 4, v5: 8, v4: 20 };

/** Was V3 filtert: die Aktivitäten, die man bei Verspannung anwendet, und das Dehnen. */
export const V3_IDS = ['massagepistole', 'massage', 'waerme', 'yoga'];

/** Ohne Einnahme am Morgen gilt ein Kopfschmerz vor 9 Uhr als „am Morgen". */
const MORGEN_BIS = 9 * 60;

/*
 * Was als Einnahme am Morgen gilt: das Fenster des Zeitknopfs „morgens"
 * (5 bis 11 Uhr, js/datum.js). Nur eine Einnahme in diesem Fenster
 * verschiebt die Grenze für „Kopf am Morgen" – eine am Abend, wie sie bei
 * Guanfacin oder Atomoxetin vorkommt, machte sonst einen Kopfschmerz am
 * Nachmittag zu einem am Morgen. Ebenso eine nach Mitternacht: Wer die
 * Abenddosis um 00:30 mit „jetzt genommen" einträgt, hat sie am neuen Tag
 * stehen, und jeder Kopfschmerz am Morgen wäre sonst „kein Kopf am Morgen".
 */
const MORGEN_EINNAHME_VON = KNOPF_TAGESZEIT.morgens.von;
const MORGEN_EINNAHME_BIS = KNOPF_TAGESZEIT.morgens.bis;

/** Nach diesen Aktivitäten zählt die Nacht auf keiner Seite. */
const NACHT_STOERT = ['feier', 'unterwegs'];

/*
 * Kein Satz über Zweck oder Nutzen der Schiene: Dafür fand sich keine
 * erreichbare Quelle, und das beurteilt die Zahnarztpraxis, nicht ein
 * Tagebuch. Der Satz sagt nur, was der Vergleich zeigen kann.
 */
const SCHIENE_IMMER = 'Wozu die Schiene im Einzelfall gedacht ist und ob sie nützt, kann ein Tagebuch '
  + 'nicht zeigen – das beurteilt die Zahnarztpraxis. Ein Vergleich hier zeigt nur, ob sich Kopf oder '
  + 'Kiefer am Morgen nach Nächten mit und ohne Schiene unterscheiden.';

const V2_VORBOTE = 'Nackenschmerz kann auch ein Vorbote sein; ob Verspannung den Kopfschmerz macht oder '
  + 'ankündigt, kann ein Tagebuch nicht trennen.';

const spZahl = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));
const spSchnitt = (l) => (l.length ? l.reduce((s, x) => s + x, 0) / l.length : 0);
const spFeld = (tage, iso, feld) => spZahl(((tage || {})[iso] || {})[feld]);

/** Nach einem solchen Tag zählt die Nacht nicht: Feier, Reise, Alkohol. */
function nachtGestoert(amVortag) {
  return amVortag.some((e) => (e.art === 'aktivitaet' && aktivitaetenVon(e).some((id) => NACHT_STOERT.includes(id)))
    || (e.art === 'essen' && zutatenVon(e).some((z) => z.id === 'alkohol')));
}

/**
 * V1a: Kopf am Morgen. Ein Kopfschmerz mit „Schon beim Aufwachen da" – oder
 * einer mit genauer Zeit vor der ersten Einnahme eines ADHS-Mittels am
 * Morgen, ohne Einnahme am Morgen vor 9 Uhr. Ein Kopfschmerz nur mit
 * „morgens" und ohne das Merkmal lässt offen, ob er beim Aufwachen schon da
 * war: Der Tag zählt dann nicht (R3), statt geraten zu werden.
 *
 * Als Grenze zählt nur eine Einnahme am Morgen, nicht einfach die erste des
 * Tages. Guanfacin kann laut Fachinformation morgens oder abends genommen
 * werden (Intuniv, FI 020868, Stand 09/2026, 4.2), und bei Atomoxetin kommt
 * eine zweite Teilgabe am späten Nachmittag oder frühen Abend vor
 * (Atomoxetin-ratiopharm, FI 022556, Stand 09/2024, 4.2); mit einer
 * Einnahme um 20 Uhr wäre sonst jeder Kopfschmerz am Nachmittag einer „am
 * Morgen" geworden – mit Urteil und Frage für die Praxis.
 *
 * Ist die Einnahme am Morgen nur ungefähr („morgens"), steht die Grenze
 * irgendwo zwischen 5 und 11 Uhr (vor einer genauen Einnahme am Morgen). Ein
 * genauer Kopfschmerz in dieser Zeit kann davor oder danach liegen: offen,
 * wie bei einem ungefähren Kopfschmerz (R3). Sicher davor ist nur, was vor
 * 5 Uhr begann.
 *
 * @param morgen  { fest, offen } – die früheste genaue Einnahme am Morgen
 *                in Minuten (oder null) und ob es eine ungefähre am Morgen gab
 */
function morgenKopf(amTag, morgen) {
  const koepfe = kopfEintraege(amTag);
  if (koepfe.some((k) => (k.kopfArten || []).includes('aufwachen'))) return 1;
  const fest = morgen && morgen.fest !== null ? morgen.fest : null;
  const genau = koepfe.filter((k) => !k.ungefaehr).map((k) => minutenAmTag(k.um));
  if (morgen && morgen.offen) {
    const sicherDavor = Math.min(fest !== null ? fest : Infinity, MORGEN_EINNAHME_VON);
    if (genau.some((m) => m < sicherDavor)) return 1;
    if (genau.some((m) => m < (fest !== null ? fest : MORGEN_EINNAHME_BIS))) return null;
  } else if (genau.some((m) => m < (fest !== null ? fest : MORGEN_BIS))) {
    return 1;
  }
  if (koepfe.some((k) => k.ungefaehr && tageszeitVon(k) === 'morgens')) return null;
  return 0;
}

/*
 * Die Einnahmen am Morgen je Tag: die früheste genaue oder gebundene
 * zwischen 5 und 11 Uhr (`fest`, Minuten seit Mitternacht) und ob eine
 * ungefähre „morgens" dabei war (`offen`). Einnahmen davor oder später am Tag
 * spielen für „Kopf am Morgen" keine Rolle.
 */
function morgenEinnahmen(einnahmen) {
  const raus = new Map();
  einnahmen.forEach((x) => {
    const iso = x.e.am;
    const m = raus.get(iso) || { fest: null, offen: false };
    if (x.zeitArt === 'ungefaehr') {
      if (tageszeitVon(x.e) === 'morgens') m.offen = true;
    } else {
      const min = (x.t - zeitpunkt(iso, '00:00')) / 60000;
      const amMorgen = min >= MORGEN_EINNAHME_VON && min < MORGEN_EINNAHME_BIS;
      if (amMorgen && (m.fest === null || min < m.fest)) m.fest = min;
    }
    raus.set(iso, m);
  });
  return raus;
}

/** Die Seiten von V1 als Satzanfang – es geht um Nächte, nicht um Tage. */
const V1_SEITEN = { mit: 'Die Nächte mit Schiene', ohne: 'Die Nächte ohne Schiene' };

function v1Rechnen(liste, tage, heute, einnahmen) {
  const nachTag = eintraegeNachTag(liste);
  const am = (iso) => nachTag.get(iso) || [];
  const morgenNachTag = morgenEinnahmen(einnahmen);
  const naechte = Object.keys(tage || {}).filter((iso) => (!heute || iso <= heute)
    && [0, 1].includes(spFeld(tage, iso, 'schiene'))).sort();
  const v1a = { mit: [], ohne: [] };
  const v1b = { mit: [], ohne: [] };
  let getragen = 0;
  let nicht = 0;
  let gestoert = 0;
  let unklar = 0;
  let herueber = 0;
  naechte.forEach((iso) => {
    const mit = spFeld(tage, iso, 'schiene') === 1;
    if (mit) getragen += 1; else nicht += 1;
    if (nachtGestoert(am(plusTage(iso, -1)))) { gestoert += 1; return; }
    const seite = mit ? 'mit' : 'ohne';
    // Kopf am Morgen erst ab gestern: Heute kann ein Kopfschmerz mit „Schon
    // beim Aufwachen da" noch kommen, und bis dahin zählte die Nacht als 0 –
    // eine Lücke als „kein Kopf" (R1), wie in A2 bis A4 und V2. Der Kiefer
    // am Morgen ist eine Antwort und zählt sofort.
    if ((!heute || iso < heute) && tagNotiertOhne(liste, tage, iso, ZIEL_KOPF)) {
      if (herueberreichend(liste, iso)) herueber += 1;
      else {
        const w = morgenKopf(am(iso), morgenNachTag.get(iso) || null);
        if (w === null) unklar += 1;
        else v1a[seite].push({ iso, wert: w });
      }
    }
    const kiefer = spFeld(tage, iso, 'kiefer');
    if (kiefer !== null) v1b[seite].push({ iso, wert: kiefer });
  });
  // Ohne Angabe: notierte Tage ab der ersten Antwort, an denen sie fehlt.
  let ohneAngabe = 0;
  if (naechte.length) {
    const ende = heute || naechte[naechte.length - 1];
    const n = tageDazwischen(naechte[0], ende);
    const beantwortet = new Set(naechte);
    for (let i = 0; i <= n; i++) {
      const iso = plusTage(naechte[0], i);
      if (beantwortet.has(iso)) continue;
      if (am(iso).some(eintragZaehlt) || tagZaehlt((tage || {})[iso])) ohneAngabe += 1;
    }
  }
  const dichte = { eintraege: liste, tage, istZiel: ZIEL_BAUCH, ohneFelder: ['schiene', 'kiefer'] };
  return {
    getragen,
    nicht,
    ohneAngabe,
    gestoert,
    unklar,
    herueber,
    v1a: vergleichRoh({ ...v1a, mindest: SPANNUNG_MINDEST.v1a, name: 'Schiene', seiten: V1_SEITEN, dichte }),
    v1b: vergleichRoh({ ...v1b, mindest: SPANNUNG_MINDEST.v1b, name: 'Schiene', seiten: V1_SEITEN, dichte }),
  };
}

/**
 * V2: Nach einem stark verspannten Tag (stark oder sehr stark) gegen nach
 * einem lockeren (locker oder leicht) – kam am nächsten Tag ein neuer
 * Kopfschmerz? „Mittel" zählt auf keiner Seite. Ein Tag, an dem schon
 * Kopfschmerz war, zählt nicht: Dann ginge es um denselben Kopfschmerz, und
 * die Verspannung könnte zum Anfall gehören. Bei einer Migräne kann
 * Nackensteifigkeit vor dem Kopfschmerz und nach seinem Abklingen auftreten,
 * danach bis zu 48 Stunden; beim Spannungskopfschmerz nimmt die
 * Druckempfindlichkeit der Kopf- und Nackenmuskeln während des Kopfschmerzes
 * zu (ICHD-3, 2018, Einleitung zu Kapitel 1, Kommentar zu 1.1, Einleitung zu
 * Kapitel 2). Das gilt auch für einen Kopfschmerz vom Vorabend, der in den
 * Tag hineinreicht (herueberreichend in js/kopf.js) – gerade dann kann die
 * Verspannung noch zum Anfall gehören.
 *
 * Am Tag danach braucht es diese Prüfung nicht mehr: Hineinreichen könnte
 * dort nur ein Kopfschmerz vom verspannten Tag selbst, und solche Tage sind
 * schon weg.
 */
function v2Rechnen(liste, tage, heute) {
  const nachTag = eintraegeNachTag(liste);
  const am = (iso) => nachTag.get(iso) || [];
  const seiten = { mit: [], ohne: [] };
  const gut = { mit: [], ohne: [] };
  const stress = { mit: [], ohne: [] };
  let kopfAmTag = 0;
  Object.keys(tage || {}).sort().forEach((iso) => {
    const v = spFeld(tage, iso, 'verspannt');
    if (v === null || v === 2) return;
    const morgen = plusTage(iso, 1);
    if (heute && morgen >= heute) return;
    const seite = v >= 3 ? 'mit' : 'ohne';
    if (!tagNotiertOhne(liste, tage, iso, ZIEL_KOPF)) return;
    if (kopfEintraege(am(iso)).length || herueberreichend(am(plusTage(iso, -1)), iso)) {
      kopfAmTag += 1;
      return;
    }
    if (!tagNotiertOhne(liste, tage, morgen, ZIEL_KOPF)) return;
    const wert = kopfEintraege(am(morgen)).length ? 1 : 0;
    seiten[seite].push({ iso, wert });
    const s = spFeld(tage, iso, 'stress');
    if (s !== null) stress[seite].push(s);
    const schlaf = spFeld(tage, morgen, 'schlaf');
    if (schlaf !== null && schlaf <= 1) gut[seite].push(wert);
  });
  return {
    roh: vergleichRoh({
      ...seiten,
      mindest: SPANNUNG_MINDEST.v2,
      name: 'starke Verspannung',
      seiten: { mit: 'Die stark verspannten Tage', ohne: 'Die lockeren Tage' },
      dichte: { eintraege: liste, tage, istZiel: ZIEL_BAUCH, ohneFelder: ['verspannt'] },
    }),
    gut: {
      genug: gut.mit.length >= SPANNUNG_MINDEST.v2gut && gut.ohne.length >= SPANNUNG_MINDEST.v2gut,
      mit: { n: gut.mit.length, k: gut.mit.filter((x) => x === 1).length },
      ohne: { n: gut.ohne.length, k: gut.ohne.filter((x) => x === 1).length },
    },
    stress: { mit: spSchnitt(stress.mit), ohne: spSchnitt(stress.ohne) },
    kopfAmTag,
  };
}

/**
 * V3: Kopfschmerz in den 24 Stunden nach Massage, Massagepistole, Wärme oder
 * Dehnen – nur nach einem Vortag, der mindestens mittel verspannt war. Der
 * Filter fragt nach dem Vortag, weil die Verspannung vor der Massage
 * feststehen muss: Am selben Tag wäre sie womöglich schon die Folge davon,
 * dass sich ein Kopfschmerz anbahnt.
 */
export function v3Filter(tage) {
  return (iso) => {
    const v = spFeld(tage, plusTage(iso, -1), 'verspannt');
    return v !== null && v >= 2;
  };
}

function v3Rechnen(liste, tage, { fenster, mindestFaelle, jetzt }) {
  const zeilen = aktivitaetBilanz(liste, tage, {
    fenster, mindestFaelle, jetzt, tagFilter: v3Filter(tage), nurIds: V3_IDS,
  });
  return zeilen.map((z) => {
    const k = z.kopf;
    // Die Werte sind 0 oder 1 – aus den Zählungen lassen sie sich genau
    // wiederherstellen, und mit ihnen der Spielraum der Familie.
    const werte = (n, treffer) => nullEins(n, n ? treffer / n : 0);
    const mitW = werte(k.faelle, k.mitTreffer);
    const ohneW = werte(k.gegenFaelle, k.ohneTreffer);
    const tageMit = (k.tage && k.tage.mit) || [];
    const tageOhne = (k.tage && k.tage.ohne) || [];
    return {
      id: z.id,
      anzahl: z.anzahl,
      roh: vergleichRoh({
        mit: tageMit.map((iso, i) => ({ iso, wert: mitW[i] })),
        ohne: tageOhne.map((iso, i) => ({ iso, wert: ohneW[i] })),
        mindest: k.mindest,
        name: aktivitaetVon(z.id).name,
        dichte: { eintraege: liste, tage, istZiel: ZIEL_BAUCH },
      }),
    };
  });
}

/* V4: wie es vorher hieß – je Aktivität das Verb für den Satz. */
const V4_VERB = { massagepistole: 'mit der Massagepistole massiert', massage: 'massiert', waerme: 'gewärmt' };

/**
 * V4: Kopfschmerztage je 30 notierte Tage vor und seit dem ersten Eintrag
 * einer Aktivität, die man bei Verspannung anwendet. Nur beschrieben: Ein
 * Vorher-Nachher-Vergleich hat keine eigene Vergleichsgruppe (ICH E10,
 * CPMP/ICH/364/96: „baseline-controlled studies … have no internal
 * control"). Beschwerden schwanken auch ohne Zutun, und nach einer
 * schlechten Phase kann es von selbst besser werden (Regression zur Mitte;
 * EMA/CHMP/970057/2011, 6.2.2: „the fluctuating and flaring character of
 * the disease"). Wer mit etwas anfängt, während es gerade schlecht ist,
 * sieht danach womöglich eine Besserung, die nicht von der Aktivität kommt.
 */
function v4Rechnen(liste, tage, heute) {
  if (!heute) return [];
  const nachTag = eintraegeNachTag(liste);
  const notiert = (iso) => (nachTag.get(iso) || []).some(eintragZaehlt) || tagZaehlt((tage || {})[iso]);
  const kopfTag = (iso) => kopfEintraege(nachTag.get(iso) || []).length > 0;
  const alleTage = [...liste.map((e) => e.am), ...Object.keys(tage || {})].sort();
  const beginn = alleTage[0];
  const raus = [];
  Object.keys(V4_VERB).forEach((id) => {
    const mit = liste.filter((e) => aktivitaetenVon(e).includes(id)).map((e) => e.am).sort();
    if (!mit.length) return;
    const erster = mit[0];
    const seit = tageDazwischen(erster, heute) + 1;
    if (seit < 31) return;
    const laenge = Math.min(seit, 90);
    const zaehle = (von, bis) => {
      let n = 0;
      let k = 0;
      for (let iso = von; iso <= bis; iso = plusTage(iso, 1)) {
        if (iso < beginn) continue;
        if (!notiert(iso)) continue;
        n += 1;
        if (kopfTag(iso)) k += 1;
      }
      return { notiert: n, kopfTage: k, je30: n ? (k / n) * 30 : 0 };
    };
    const vorher = zaehle(plusTage(erster, -laenge), plusTage(erster, -1));
    const seitdem = zaehle(erster, heute);
    if (vorher.notiert < SPANNUNG_MINDEST.v4 || seitdem.notiert < SPANNUNG_MINDEST.v4) return;
    const name = aktivitaetVon(id).name;
    raus.push({
      id,
      erster,
      vorher,
      seitdem,
      satz: `Kopfschmerztage je 30 notierte Tage: vor dem ersten Eintrag „${name}“ (${fmtDatum(erster)}) `
        + `${fmtZahl(vorher.je30)}, seitdem ${fmtZahl(seitdem.je30)}. Ob vorher schon ${V4_VERB[id]} wurde, `
        + 'weiß Body Check nicht. Beschwerden schwanken auch von selbst: Wird etwas begonnen, während es '
        + 'gerade schlecht ist, kann eine Besserung danach auch ohne den neuen Anfang kommen.',
    });
  });
  return raus;
}

/**
 * V5: der Kiefer am Morgen nach Nächten mit und ohne „Nachts davon wach".
 * Beide Angaben gelten der Nacht davor – dieselbe Nacht, keine Richtung.
 *
 * Was den Schlaf stören kann, nach gesund.bund.de/schlafstoerungen (Stand
 * 04.04.2025, Ursachen): unter anderem Zähneknirschen, Schmerzen und
 * nächtlicher Harndrang. Zum Zusammenhang von nächtlichem Reflux und
 * Knirschen war keine Quelle im Volltext erreichbar; der Satz sagt dazu
 * deshalb nichts.
 */
function v5Rechnen(tage, heute) {
  const seiten = { mit: [], ohne: [] };
  Object.keys(tage || {}).forEach((iso) => {
    if (heute && iso > heute) return;
    const wach = spFeld(tage, iso, 'nachtwach');
    const kiefer = spFeld(tage, iso, 'kiefer');
    if (wach === null || kiefer === null) return;
    seiten[wach >= 1 ? 'mit' : 'ohne'].push(kiefer);
  });
  const genug = seiten.mit.length >= SPANNUNG_MINDEST.v5 && seiten.ohne.length >= SPANNUNG_MINDEST.v5;
  return {
    genug,
    mit: { n: seiten.mit.length, schnitt: genug ? spSchnitt(seiten.mit) : null },
    ohne: { n: seiten.ohne.length, schnitt: genug ? spSchnitt(seiten.ohne) : null },
    satz: 'Gleiche Nacht, keine Richtung. „Nachts davon wach“ meint Beschwerden jeder Art – den Schlaf '
      + 'stören können viele Dinge, darunter Zähneknirschen, Schmerzen oder nächtlicher Harndrang. Was im '
      + 'Einzelfall dahintersteckt, kann die Praxis einordnen.',
  };
}

/**
 * R7: was am selben Tag zusammen vorkommt – nur als Zahl.
 *
 * „Sonst" sind Tage ohne Kopfschmerz, und das heißt: für den Kopf notiert,
 * ohne dass einer dasteht (R1). Ein Tag, an dem nur „Nacken/Schultern"
 * beantwortet ist, ist für den Kopf eine Lücke (ZAEHLT_NICHT in
 * js/wasser.js) – kein Tag ohne Kopfschmerz.
 */
function gleichzeitig(liste, tage, heute) {
  const nachTag = eintraegeNachTag(liste);
  const kopf = { an: [], sonst: [] };
  let gepresstJa = 0;
  let gepresstN = 0;
  Object.keys(tage || {}).forEach((iso) => {
    if (heute && iso > heute) return;
    const amTag = nachTag.get(iso) || [];
    const v = spFeld(tage, iso, 'verspannt');
    if (v !== null) {
      if (kopfEintraege(amTag).length) kopf.an.push(v);
      else if (tagNotiertOhne(liste, tage, iso, ZIEL_KOPF)) kopf.sonst.push(v);
    }
    const g = spFeld(tage, iso, 'gepresst');
    if (g !== null) {
      gepresstN += 1;
      if (g === 1) gepresstJa += 1;
    }
  });
  const merkmal = (id) => kopfEintraege(liste).filter((k) => (k.kopfArten || []).includes(id)).length;
  return {
    nacken: {
      an: { n: kopf.an.length, schnitt: spSchnitt(kopf.an) },
      sonst: { n: kopf.sonst.length, schnitt: spSchnitt(kopf.sonst) },
    },
    gepresst: { ja: gepresstJa, n: gepresstN },
    merkmale: { kauen: merkmal('kauen'), nackenbewegung: merkmal('nackenbewegung'), schlaefe: merkmal('schlaefe') },
  };
}

const spProzent = (x) => `${Math.round(x * 100)} %`;

function v1Saetze(v1, a, b) {
  const saetze = [];
  if (!a.genug && !b.genug) {
    saetze.push(`Mit Schiene ${v1.getragen} Nächte, ohne ${v1.nicht}. Wer die Schiene regelmäßig trägt, hat `
      + 'keinen Vergleich – und das ist so in Ordnung.');
  }
  if (a.genug) {
    const zahlen = `Kopf am Morgen nach Nächten mit Schiene ${spProzent(a.mit.schnitt)}, ohne `
      + `${spProzent(a.ohne.schnitt)} (${a.mit.n} gegen ${a.ohne.n} Nächte).`;
    saetze.push(['auffaellig', 'unauffaellig'].includes(a.art)
      ? `${zahlen} Das liegt über dem Zufallsspielraum (±${Math.round(a.urteil.spielraum * 100)} Prozentpunkte).`
      : `${zahlen} ${a.saetze.join(' ')}`);
  }
  if (b.genug) {
    const zahlen = `Kiefer am Morgen nach Nächten mit Schiene ${fmtZahl(b.mit.schnitt)}, ohne `
      + `${fmtZahl(b.ohne.schnitt)} (${b.mit.n} gegen ${b.ohne.n} Nächte).`;
    saetze.push(['auffaellig', 'unauffaellig'].includes(b.art)
      ? `${zahlen} Das liegt über dem Zufallsspielraum (±${fmtZahl(b.urteil.spielraum)}).`
      : `${zahlen} ${b.saetze.join(' ')}`);
  }
  if (v1.gestoert) saetze.push(`${v1.gestoert} Nächte nach Feier, Reise oder Alkohol nicht gewertet.`);
  saetze.push(SCHIENE_IMMER);
  return saetze;
}

function v2Satz(v) {
  const k1 = v.mit.n ? Math.round(v.mit.schnitt * v.mit.n) : 0;
  const k2 = v.ohne.n ? Math.round(v.ohne.schnitt * v.ohne.n) : 0;
  const zahlen = `Nach einem stark verspannten Tag kam am nächsten Tag in ${k1} von ${v.mit.n} Fällen ein `
    + `neuer Kopfschmerz, nach einem lockeren in ${k2} von ${v.ohne.n}.`;
  if (!v.genug) return '';
  if (['auffaellig', 'unauffaellig'].includes(v.art)) {
    return `${zahlen} Das liegt über dem Zufallsspielraum (±${Math.round(v.urteil.spielraum * 100)} Prozentpunkte).`;
  }
  return `${zahlen} ${v.saetze.join(' ')}`;
}

/**
 * Alle Rechnungen der Familie „Kiefer und Nacken".
 *
 * Wie bei ADHS: erst alle Seiten füllen, dann die Vergleiche mit genug Fällen
 * zählen (V1a, V1b, V2 und jede gefilterte V3-Zeile), dann urteilen – mit
 * mindestens strenge 2,5.
 *
 * @param {object} d  { eintraege, tage, heute, jetzt, fenster, mindestFaelle, standardMittel }
 */
export function spannungAuswertung({
  eintraege, tage, heute, jetzt = Date.now(), fenster = 4, mindestFaelle = 5, standardMittel = [],
} = {}) {
  const liste = (Array.isArray(eintraege) ? eintraege : [])
    .filter((e) => e && typeof e === 'object' && typeof e.am === 'string' && (!heute || e.am <= heute));
  const t = tage || {};
  const v1 = v1Rechnen(liste, t, heute, adhsEinnahmen(liste, standardMittel));
  const v2 = v2Rechnen(liste, t, heute);
  const v3 = v3Rechnen(liste, t, { fenster, mindestFaelle, jetzt });

  const genug = [v1.v1a.genug, v1.v1b.genug, v2.roh.genug, ...v3.map((z) => z.roh.genug)].filter(Boolean).length;
  const vergleiche = familienVergleiche(genug);

  const v1a = vergleichUrteilen(v1.v1a, { skala: 'anteil', schwelle: 0.2, vergleiche, richtung: 'ohne' });
  const v1b = vergleichUrteilen(v1.v1b, { skala: 'skala', schwelle: 0.5, vergleiche, richtung: 'ohne' });
  const v2v = vergleichUrteilen(v2.roh, { skala: 'anteil', schwelle: 0.2, vergleiche, richtung: 'mit' });
  const v3v = v3.map((z) => {
    const v = vergleichUrteilen(z.roh, { skala: 'anteil', schwelle: 0.2, vergleiche, richtung: 'mit' });
    const name = aktivitaetVon(z.id).name;
    let satz = '';
    if (v.genug) {
      const zahlen = `${name} nach mindestens mittel verspanntem Vortag, Kopfschmerz in 24 Stunden: mit `
        + `${spProzent(v.mit.schnitt)} (${v.mit.n} Tage), ohne ${spProzent(v.ohne.schnitt)} (${v.ohne.n} Tage).`;
      satz = ['auffaellig', 'unauffaellig'].includes(v.art)
        ? `${zahlen} Das liegt über dem Zufallsspielraum (±${Math.round(v.urteil.spielraum * 100)} Prozentpunkte).`
        : `${zahlen} ${v.saetze.join(' ')}`;
    }
    return { id: z.id, name, anzahl: z.anzahl, vergleich: v, satz };
  });

  const fragen = [];
  if (v2v.art === 'auffaellig') {
    fragen.push({
      id: 'v2',
      text: 'Nach stark verspannten Tagen kam am nächsten Tag öfter Kopfschmerz. Kann die Verspannung auch '
        + 'schon zum Kopfschmerz gehören?',
    });
  }
  if (v1a.art === 'auffaellig') {
    fragen.push({
      id: 'v1a',
      text: 'Nach Nächten ohne Schiene hatte ich öfter morgens Kopfschmerzen. Was bedeutet das?',
    });
  }

  return {
    v1: {
      getragen: v1.getragen,
      nicht: v1.nicht,
      ohneAngabe: v1.ohneAngabe,
      gestoert: v1.gestoert,
      unklar: v1.unklar,
      herueber: v1.herueber,
      v1a,
      v1b,
      saetze: v1Saetze(v1, v1a, v1b),
    },
    v2: {
      ...v2v,
      gut: v2.gut,
      stress: v2.stress,
      kopfAmTag: v2.kopfAmTag,
      satz: v2Satz(v2v),
      vorbote: V2_VORBOTE,
    },
    v3: v3v,
    v4: v4Rechnen(liste, t, heute),
    v5: v5Rechnen(t, heute),
    gleichzeitig: gleichzeitig(liste, t, heute),
    vergleiche: genug,
    familie: vergleiche,
    fragen,
  };
}
