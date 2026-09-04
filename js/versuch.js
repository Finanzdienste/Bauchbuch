/*
 * Der Auslassversuch: aus einem Zusammenhang einen Beleg machen.
 *
 * Alles andere in dieser App zählt, was ohnehin passiert. Das hat eine harte
 * Grenze: Wer an schlechten Tagen anders isst, findet sein Essen auffällig,
 * ohne dass es etwas damit zu tun hätte. Aus Beobachtung wird kein Beweis,
 * egal wie viele Monate man beobachtet.
 *
 * Ein Versuch dreht das um. Man lässt etwas weg und schaut, ob es besser wird –
 * und dann, und darauf kommt es an, isst man es *bewusst wieder*. Erst diese
 * zweite Hälfte macht den Unterschied: Nach zwei Wochen ohne irgendwas geht es
 * fast jedem besser, weil der Sommer kommt, der Stress nachlässt oder man
 * einfach aufmerksamer isst. Kommen die Beschwerden mit der Wiedereinführung
 * zurück, ist das schwer anders zu erklären. Genau so wird in der
 * Ernährungsmedizin gearbeitet.
 *
 * WAS DIESER VERSUCH NICHT IST: keine Verblindung, keine Kontrollgruppe, ein
 * einziger Mensch. Wer weiß, dass er heute die Milch weglässt, erwartet auch,
 * dass es besser wird. Das Ergebnis ist ein starker Hinweis und kein Nachweis –
 * und es steht in jeder Ausgabe dabei.
 *
 * Reine Rechnung. Was gestartet und abgebrochen wird, steht in js/store.js.
 */
import { plusTage, tageDazwischen } from './datum.js';
import { klassenVon } from './daten.js';
import { merkmale, tagesWert, zutatenVon } from './auswertung.js';

/** So lange wird nach der Wiedereinführung noch beobachtet. */
export const PROVOKATION_TAGE = 3;

/** Kürzer als eine Woche ist kein Versuch, länger als vier hält niemand durch. */
export const DAUER_VORSCHLAEGE = [7, 14, 21];

/**
 * Enthält diese Mahlzeit das, was weggelassen werden soll?
 *
 * Bei einem einzelnen Auslöser ist das eine Frage an die Zutatenliste, bei
 * einer Klasse eine an alle Zutaten und ihre Klassen. Die Umstände – große
 * Portion, spät gegessen – zählen mit, denn auch die kann man weglassen.
 */
export function betrifft(eintrag, art, ziel) {
  if (eintrag.art !== 'essen') return false;
  if (art === 'klasse') {
    return zutatenVon(eintrag).some((z) => klassenVon(z.id).includes(ziel));
  }
  return merkmale(eintrag).includes(ziel);
}

/**
 * In welcher Phase der Versuch gerade steckt.
 *
 *   'auslass'      Die Tage ohne. Läuft.
 *   'reif'         Die Auslasszeit ist um – jetzt kommt die Wiedereinführung.
 *   'provokation'  Wieder gegessen, es wird noch beobachtet.
 *   'fertig'       Vorbei, das Ergebnis steht.
 *   'abgebrochen'  Von Hand beendet.
 */
export function phase(v, heute) {
  if (!v) return null;
  if (v.beendet) return 'abgebrochen';
  if (v.provokation) {
    return tageDazwischen(v.provokation, heute) >= PROVOKATION_TAGE ? 'fertig' : 'provokation';
  }
  return tageDazwischen(v.start, heute) >= v.tage ? 'reif' : 'auslass';
}

/** Der wievielte Tag von wie vielen – für die Zeile auf dem Tagesreiter. */
export function versuchStand(v, heute) {
  if (!v) return null;
  const p = phase(v, heute);
  const tag = Math.min(v.tage, tageDazwischen(v.start, heute) + 1);
  return {
    phase: p,
    tag: Math.max(1, tag),
    von: v.tage,
    // Wie viele Tage noch – nach der Provokation zählt das Beobachtungsfenster.
    rest: p === 'auslass' ? Math.max(0, v.tage - tag)
      : (p === 'provokation'
        ? Math.max(0, PROVOKATION_TAGE - tageDazwischen(v.provokation, heute)) : 0),
  };
}

/** Der Durchschnitt der Tageswerte in einem Zeitraum, über notierte Tage. */
function abschnitt(eintraege, tage, von, bis) {
  const werte = [];
  const n = Math.max(0, tageDazwischen(von, bis));
  for (let i = 0; i <= n; i++) {
    const t = tagesWert(eintraege, plusTage(von, i), tage);
    if (t.notiert) werte.push(t.wert);
  }
  return {
    von,
    bis,
    tage: n + 1,
    notierte: werte.length,
    schnitt: werte.length ? werte.reduce((a, b) => a + b, 0) / werte.length : 0,
    frei: werte.filter((w) => w === 0).length,
  };
}

/**
 * Wie sauber der Versuch gelaufen ist.
 *
 * Das Tagebuch weiß es besser als die Erinnerung: Wenn in der Auslasszeit an
 * vier Tagen Milch eingetragen ist, war es keine Auslasszeit – und das gehört
 * ins Ergebnis, nicht unter den Tisch. Ein unsauberer Versuch ist kein
 * Misserfolg, er ist nur keine Antwort.
 */
function treue(eintraege, v, von, bis) {
  const mahlzeiten = eintraege.filter((e) => e.art === 'essen' && e.am >= von && e.am <= bis);
  const verstoesse = mahlzeiten.filter((e) => betrifft(e, v.art, v.ziel));
  const tage = [...new Set(verstoesse.map((e) => e.am))];
  return {
    mahlzeiten: mahlzeiten.length,
    verstoesse: verstoesse.length,
    tage: tage.length,
    // Zwei Ausrutscher in vierzehn Tagen sind menschlich; ab da wird die
    // Aussage dünn.
    sauber: tage.length <= 2,
  };
}

export const VERSUCH_URTEIL = {
  dafuer: 'spricht dafür',
  unklar: 'unklar',
  dagegen: 'spricht dagegen',
  offen: 'noch offen',
  unsauber: 'nicht auswertbar',
  zuwenig: 'zu wenige Tage',
};

/**
 * Das Ergebnis.
 *
 * Drei Zahlen tragen es: der eigene Durchschnitt *vor* dem Versuch, der
 * *während* der Auslasszeit und der *nach* der Wiedereinführung. Verglichen
 * wird gegen den eigenen Ausgangswert und nicht gegen null – dieselbe Regel wie
 * überall in dieser App, und aus demselben Grund.
 *
 * Eine ganze Stufe auf der Zehnerskala ist die Schwelle. Darunter ist es
 * Rauschen, und Rauschen als Ergebnis auszugeben wäre die eine Art, mit der so
 * ein Versuch schadet: Wer daraufhin ein Lebensmittel für immer streicht, isst
 * einseitiger, ohne dass es ihm besser geht.
 */
export function ergebnis(v, eintraege, tage, heute) {
  if (!v) return null;
  const p = phase(v, heute);
  const eintr = eintraege || [];

  const auslassBis = plusTage(v.start, v.tage - 1);
  const vorher = abschnitt(eintr, tage, plusTage(v.start, -v.tage), plusTage(v.start, -1));
  const auslass = abschnitt(eintr, tage,
    v.start, p === 'auslass' ? heute : auslassBis);
  const nachher = v.provokation
    ? abschnitt(eintr, tage, v.provokation,
      plusTage(v.provokation, PROVOKATION_TAGE - 1))
    : null;
  const t = treue(eintr, v, v.start, p === 'auslass' ? heute : auslassBis);

  const besserung = vorher.schnitt - auslass.schnitt;
  const rueckkehr = nachher ? nachher.schnitt - auslass.schnitt : null;

  let urteil = 'offen';
  let satz = '';
  if (vorher.notierte < 5 || auslass.notierte < 5) {
    urteil = 'zuwenig';
    satz = `Für einen Vergleich braucht es auf beiden Seiten mindestens fünf notierte `
      + `Tage – bisher ${vorher.notierte} davor und ${auslass.notierte} währenddessen. `
      + `Eine Lücke im Tagebuch ist kein beschwerdefreier Tag.`;
  } else if (!t.sauber) {
    urteil = 'unsauber';
    satz = `An ${t.tage} Tagen der Auslasszeit steht es doch im Tagebuch. Das ist `
      + `kein Vorwurf, aber es ist keine Antwort: Was in der Auslasszeit vorkam, `
      + `kann man nicht als weggelassen rechnen.`;
  } else if (p === 'auslass' || p === 'reif') {
    urteil = 'offen';
    satz = besserung >= 1
      ? `Bisher ${besserung.toFixed(1).replace('.', ',')} Stufen besser als davor. `
        + `Das allein beweist nichts – nach zwei Wochen ohne irgendetwas geht es `
        + `den meisten besser. Die Antwort bringt erst die Wiedereinführung.`
      : `Bisher kein deutlicher Unterschied zu den ${vorher.notierte} Tagen davor. `
        + `Der Versuch läuft weiter.`;
  } else if (nachher && nachher.notierte < 2) {
    urteil = 'offen';
    satz = 'Nach der Wiedereinführung ist noch zu wenig eingetragen. Zwei, drei Tage '
      + 'notieren, dann steht das Ergebnis hier.';
  } else if (besserung >= 1 && rueckkehr >= 1) {
    urteil = 'dafuer';
    satz = `Ohne war es ${besserung.toFixed(1).replace('.', ',')} Stufen besser, und `
      + `mit der Wiedereinführung kam es um ${rueckkehr.toFixed(1).replace('.', ',')} `
      + `Stufen zurück. Beides zusammen ist schwer anders zu erklären – das ist der `
      + `stärkste Hinweis, den ein Tagebuch hergibt.`;
  } else if (besserung >= 1) {
    urteil = 'unklar';
    satz = `Ohne war es ${besserung.toFixed(1).replace('.', ',')} Stufen besser, aber `
      + `mit der Wiedereinführung kam es nicht zurück. Das kann Zufall sein, `
      + `Gewöhnung, oder es lag an etwas anderem, das sich gleichzeitig geändert `
      + `hat. Ein zweiter Durchgang würde es klären.`;
  } else {
    urteil = 'dagegen';
    satz = `Ohne war es nicht besser (${vorher.schnitt.toFixed(1).replace('.', ',')} `
      + `davor, ${auslass.schnitt.toFixed(1).replace('.', ',')} während). Das ist ein `
      + `gutes Ergebnis: Es ist eine Sache weniger, auf die du verzichten musst.`;
  }

  return {
    phase: p,
    urteil,
    wort: VERSUCH_URTEIL[urteil],
    satz,
    vorher,
    auslass,
    nachher,
    besserung,
    rueckkehr,
    treue: t,
  };
}

/**
 * Was sich als nächstes zu prüfen lohnt.
 *
 * Vorgeschlagen wird, was in der Bilanz auffällt und oft genug vorkommt, um es
 * überhaupt weglassen zu können – Klassen vor einzelnen Zutaten, weil sich
 * hinter „Zwiebel" fast immer die ganze Klasse verbirgt und man beim Weglassen
 * einer einzelnen Zutat die übrigen weiter isst.
 */
export function vorschlaege(nachKlassen, nachAusloesern, anzahl = 4) {
  const raus = [];
  (nachKlassen || []).filter((b) => b.genug && b.differenz >= 0.8)
    .slice(0, 2).forEach((b) => raus.push({ art: 'klasse', ziel: b.id, differenz: b.differenz, faelle: b.faelle }));
  (nachAusloesern || []).filter((b) => b.genug && b.differenz >= 1
    && !['gross', 'spaet'].includes(b.id))
    .slice(0, 3).forEach((b) => raus.push({ art: 'ausloeser', ziel: b.id, differenz: b.differenz, faelle: b.faelle }));
  return raus.sort((a, b) => b.differenz - a.differenz).slice(0, anzahl);
}
