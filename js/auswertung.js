/*
 * Die Rechenschicht: aus Eintragungen Muster machen.
 *
 * Reine Funktionen, keine Anzeige, kein Speicherzugriff – alles kommt als
 * Argument herein. Das ist nicht Ordnungsliebe: Diese Datei ist der einzige
 * Ort, an dem die App etwas *behauptet*, und Behauptungen über den eigenen
 * Körper muss man einzeln nachrechnen können. Genau das tut tests/rechnen.mjs.
 *
 * Die Grundfrage lautet immer gleich: Geht es nach Mahlzeiten mit einem
 * bestimmten Merkmal schlechter als nach Mahlzeiten ohne? Verglichen wird
 * also nicht gegen Null, sondern gegen den eigenen Alltag. Ohne diesen
 * Vergleich fände man bei jedem Menschen mit täglichen Beschwerden jedes
 * Lebensmittel „auffällig", das er täglich isst.
 *
 * Drei Regeln, die verhindern, dass daraus Kaffeesatzleserei wird:
 *
 *   1. Mindestens `mindestFaelle` Mahlzeiten *mit* dem Merkmal und ebenso
 *      viele *ohne*. Aus drei Fällen wird hier keine Aussage.
 *   2. Die Fallzahl steht immer daneben, auch wenn sie unbequem ist.
 *   3. Es heißt „auffällig", nicht „verursacht". Was hier herauskommt, ist
 *      ein Anhaltspunkt fürs Gespräch beim Arzt, keine Diagnose.
 */
import { plusTage, tageDazwischen, tageszeit, TAGESZEIT_NAME, zeitpunkt, stundenDazwischen } from './datum.js';
import { ALLE_AUSLOESER, KLASSEN, ROLLEN, ROLLE_VORGABE, klassenVon } from './daten.js';

/** Späte Mahlzeit ab dieser Stunde – siehe UMSTAENDE in js/daten.js. */
const SPAET_AB = 20;

/**
 * Die Zutaten einer Mahlzeit als [{ id, rolle }].
 *
 * Seit die Rolle dazugehört, stehen sie unter `zutaten`. Vorher war es eine
 * bloße Liste von IDs unter `tags`. Der Speicher rechnet alte Stände beim
 * Laden um (siehe mahlzeitFrisch in js/store.js) – die Zeile hier ist der
 * zweite Riegel, für alles, was an dieser Umrechnung vorbeikommt: eine
 * Sicherung aus einer älteren Fassung, ein von Hand gesetzter Zustand, ein
 * Test, der die Rechenschicht direkt aufruft.
 */
export function zutatenVon(eintrag) {
  if (Array.isArray(eintrag.zutaten)) {
    return eintrag.zutaten
      .filter((z) => z && typeof z.id === 'string')
      .map((z) => ({ id: z.id, rolle: z.rolle || ROLLE_VORGABE }));
  }
  if (Array.isArray(eintrag.tags)) {
    return eintrag.tags.map((id) => ({ id, rolle: ROLLE_VORGABE }));
  }
  return [];
}

/**
 * Alle Merkmale einer Mahlzeit: die Zutaten plus die beiden Umstände, die
 * sich aus Portion und Uhrzeit von selbst ergeben.
 *
 * Die Rolle spielt hier bewusst *keine* Rolle: Für die Frage „war es drin?"
 * zählt jede Zutat gleich. Was die Rolle unterscheidet, steht getrennt in
 * rollenBilanz() – und zwar mit Fallzahlen, statt still eine Gewichtung in
 * die Hauptzahl zu rechnen, die niemand nachvollziehen könnte.
 */
export function merkmale(eintrag) {
  if (eintrag.art !== 'essen') return [];
  const raus = zutatenVon(eintrag).map((z) => z.id);
  if (eintrag.portion === 'gross') raus.push('gross');
  const std = Number(String(eintrag.um || '').split(':')[0]);
  if (Number.isFinite(std) && std >= SPAET_AB) raus.push('spaet');
  return [...new Set(raus)];
}

/**
 * Die Beschwerden, die einer Mahlzeit im Zeitfenster folgen.
 *
 * `> 0` und nicht `>= 0`: Eine Beschwerde, die zur selben Minute eingetragen
 * ist wie die Mahlzeit, war schon da. Sie der Mahlzeit zuzurechnen hieße, die
 * Ursache nach der Wirkung zu suchen.
 */
export function folgende(eintraege, mahlzeit, fensterStunden) {
  const t0 = zeitpunkt(mahlzeit.am, mahlzeit.um);
  return eintraege.filter((e) => {
    if (e.art !== 'beschwerde') return false;
    const abstand = stundenDazwischen(t0, zeitpunkt(e.am, e.um));
    return abstand > 0 && abstand <= fensterStunden;
  });
}

/** Die stärkste Beschwerde im Fenster, oder 0, wenn keine kam. */
export function wertNach(eintraege, mahlzeit, fensterStunden) {
  const nach = folgende(eintraege, mahlzeit, fensterStunden);
  return nach.reduce((m, e) => Math.max(m, Number(e.staerke) || 0), 0);
}

/**
 * Die Bilanz je Auslöser.
 *
 * Ein Auslöser taucht nur auf, wenn er überhaupt vorkommt. Ob genug Fälle
 * beisammen sind, sagt `genug` – die Zeile wird trotzdem geliefert, denn „noch
 * 2 Mahlzeiten, dann kann ich etwas dazu sagen" ist eine nützliche Auskunft.
 *
 * @param {object[]} eintraege  alle Eintragungen
 * @param {{fenster: number, mindestFaelle: number, eigene: object[]}} opt
 */
/**
 * Jede Mahlzeit mit ihren Merkmalen und dem, was danach kam.
 *
 * Einmal gerechnet und dann herumgereicht: Bei einem Jahr Tagebuch und zwei
 * Dutzend Auslösern wäre das je Auslöser neu das Quadrat der Arbeit. Seit die
 * Schichtung dazugekommen ist, braucht auch js/schichten.js genau diese Liste
 * – deshalb steht sie hier für sich und nicht mehr eingebacken in die Bilanz.
 *
 * `am` liegt bewusst obenauf: Die Schichtung schlägt damit den Tag nach, an
 * dem die Mahlzeit war, ohne den ganzen Eintrag auseinandernehmen zu müssen.
 */
export function bewerteteMahlzeiten(eintraege, fenster = 4) {
  return eintraege.filter((e) => e.art === 'essen').map((m) => ({
    m,
    am: m.am,
    merkmale: new Set(merkmale(m)),
    wert: wertNach(eintraege, m, fenster),
  }));
}

export function ausloeserBilanz(eintraege, opt = {}) {
  const fenster = opt.fenster || 4;
  const mindest = opt.mindestFaelle || 5;
  const bewertet = bewerteteMahlzeiten(eintraege, fenster);
  if (!bewertet.length) return [];

  const bekannt = new Set(ALLE_AUSLOESER.map((a) => a.id));
  (opt.eigene || []).forEach((a) => bekannt.add(a.id));
  // Auch Auslöser zählen, die nur in alten Eintragungen stehen – etwa ein
  // eigener, den jemand später aus der Auswahl entfernt hat.
  bewertet.forEach((b) => b.merkmale.forEach((id) => bekannt.add(id)));

  const zeilen = [];
  bekannt.forEach((id) => {
    const mit = bewertet.filter((b) => b.merkmale.has(id));
    if (!mit.length) return;
    const ohne = bewertet.filter((b) => !b.merkmale.has(id));
    const schnitt = (liste) => (liste.length
      ? liste.reduce((s, b) => s + b.wert, 0) / liste.length : 0);
    const quote = (liste) => (liste.length
      ? liste.filter((b) => b.wert > 0).length / liste.length : 0);
    const schnittMit = schnitt(mit);
    const schnittOhne = schnitt(ohne);
    zeilen.push({
      id,
      faelle: mit.length,
      gegenFaelle: ohne.length,
      schnittMit,
      schnittOhne,
      differenz: schnittMit - schnittOhne,
      quoteMit: quote(mit),
      quoteOhne: quote(ohne),
      genug: mit.length >= mindest && ohne.length >= mindest,
      fehlt: Math.max(0, mindest - mit.length),
      zuletzt: mit[mit.length - 1].m.am,
    });
  });

  // Auffälligstes zuerst; bei gleicher Differenz die größere Fallzahl, weil
  // sie mehr wert ist.
  return zeilen.sort((a, b) => (b.differenz - a.differenz) || (b.faelle - a.faelle));
}

/**
 * Dieselbe Bilanz, aber nach Klassen statt nach einzelnen Zutaten.
 *
 * Der Grund ist die Fallzahl. „Zwiebel" kommt in einem halben Jahr vielleicht
 * zwölfmal vor – daraus wird nie eine belastbare Zahl, und die nächste Frage
 * („und Knoblauch? und Weizen?") fängt wieder bei null an. Die Klasse fasst
 * zusammen, was denselben Weg nimmt: Über alle FODMAP-reichen Mahlzeiten
 * kommen statt zwölf Fällen achtzig zusammen.
 *
 * Deshalb ist die Schwelle hier nicht dieselbe. Bei mehr Fällen fällt ein
 * kleinerer Unterschied auf, und ein halber Punkt über achtzig Mahlzeiten sagt
 * mehr als ein ganzer über zwölf. Gefordert werden trotzdem Fälle auf beiden
 * Seiten – wer *jede* Mahlzeit mit FODMAP isst, hat keine Vergleichsgruppe und
 * bekommt hier keine Zeile.
 *
 * Eine Zutat zählt für jede ihrer Klassen. Kaffee steht damit gleichzeitig bei
 * Koffein, Säure und Schließmuskel, und das ist richtig so: Er wirkt auf allen
 * drei Wegen, und welcher davon der entscheidende ist, sagt keine Statistik,
 * sondern der Auslassversuch.
 */
export function klassenBilanz(eintraege, opt = {}) {
  const fenster = opt.fenster || 4;
  // Klassen brauchen mehr Fälle, weil sie mehr hergeben – und weil eine Klasse,
  // die in fast jeder Mahlzeit steckt, sonst mit acht Gegenfällen „auffällig"
  // hieße.
  const mindest = opt.mindestFaelle || 8;
  const mahlzeiten = eintraege.filter((e) => e.art === 'essen');
  if (!mahlzeiten.length) return [];

  const bewertet = mahlzeiten.map((m) => ({
    klassen: new Set(zutatenVon(m).flatMap((z) => klassenVon(z.id))),
    wert: wertNach(eintraege, m, fenster),
  }));

  const zeilen = [];
  KLASSEN.forEach((k) => {
    const mit = bewertet.filter((b) => b.klassen.has(k.id));
    if (!mit.length) return;
    const ohne = bewertet.filter((b) => !b.klassen.has(k.id));
    const schnitt = (liste) => (liste.length
      ? liste.reduce((s, b) => s + b.wert, 0) / liste.length : 0);
    const quote = (liste) => (liste.length
      ? liste.filter((b) => b.wert > 0).length / liste.length : 0);
    const schnittMit = schnitt(mit);
    const schnittOhne = schnitt(ohne);
    zeilen.push({
      id: k.id,
      name: k.name,
      kurz: k.kurz,
      was: k.was,
      faelle: mit.length,
      gegenFaelle: ohne.length,
      schnittMit,
      schnittOhne,
      differenz: schnittMit - schnittOhne,
      quoteMit: quote(mit),
      quoteOhne: quote(ohne),
      genug: mit.length >= mindest && ohne.length >= mindest,
      fehlt: Math.max(0, mindest - mit.length),
      fehltGegen: Math.max(0, mindest - ohne.length),
    });
  });

  return zeilen.sort((a, b) => (b.differenz - a.differenz) || (b.faelle - a.faelle));
}

/**
 * Welche Zutaten eine Klasse in *diesem* Tagebuch trägt.
 *
 * Ohne diese Aufschlüsselung wäre „FODMAP ist auffällig" eine Sackgasse: Man
 * kann FODMAP nicht weglassen, man kann Zwiebeln weglassen. Zurück kommt, was
 * tatsächlich gegessen wurde, das Häufigste zuerst.
 */
export function klasseZutaten(eintraege, klasseId) {
  const zaehler = new Map();
  eintraege.filter((e) => e.art === 'essen').forEach((e) => {
    zutatenVon(e).forEach((z) => {
      if (klassenVon(z.id).includes(klasseId)) {
        zaehler.set(z.id, (zaehler.get(z.id) || 0) + 1);
      }
    });
  });
  return [...zaehler.entries()].map(([id, anzahl]) => ({ id, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

/**
 * Wie ein Ergebnis zu lesen ist. Eine halbe Stufe Unterschied ist Rauschen,
 * und es als Fund darzustellen wäre die eine Art, mit der so eine App
 * tatsächlich schaden kann: Wer daraufhin ein Lebensmittel streicht, isst
 * einseitiger, ohne dass es ihm besser geht.
 */
export function einstufung(zeile) {
  if (!zeile.genug) return 'zuwenig';
  if (zeile.differenz >= 2) return 'auffaellig';
  if (zeile.differenz >= 1) return 'moeglich';
  if (zeile.differenz <= -1) return 'unauffaellig';
  return 'neutral';
}

/**
 * Dieselbe Einordnung für Klassen – mit niedrigeren Schwellen.
 *
 * Nicht aus Großzügigkeit: Eine Klasse steckt in vielen Mahlzeiten, oft auch in
 * kleinen Mengen, und das verdünnt den Unterschied. Ein halber Punkt über
 * achtzig Mahlzeiten ist ein stabileres Ergebnis als zwei Punkte über zwölf.
 */
export function klassenEinstufung(zeile) {
  if (!zeile.genug) return 'zuwenig';
  if (zeile.differenz >= 1) return 'auffaellig';
  if (zeile.differenz >= 0.5) return 'moeglich';
  if (zeile.differenz <= -0.5) return 'unauffaellig';
  return 'neutral';
}

export const EINSTUFUNG_WORT = {
  auffaellig: 'auffällig',
  moeglich: 'möglicherweise',
  neutral: 'kein Unterschied',
  unauffaellig: 'eher unauffällig',
  zuwenig: 'zu wenige Fälle',
};

/**
 * Ein auffälliger Auslöser, aufgeschlüsselt nach der Rolle, in der er vorkam.
 *
 * Das ist die Auskunft, für die es die Rollen gibt: „Zwiebel" ist keine
 * Antwort, wenn sie achtmal die Suppe war und viermal drei Ringe obendrauf.
 * Zurück kommt jede Rolle, die überhaupt vorkam, mit ihrer Fallzahl – ohne
 * Schwelle und ohne Urteil, denn eine Aufschlüsselung hat naturgemäß kleinere
 * Zahlen als das Ganze, und wer sie liest, soll das sehen.
 */
export function rollenBilanz(eintraege, id, fensterStunden) {
  const treffer = eintraege.filter((e) => e.art === 'essen'
    && zutatenVon(e).some((z) => z.id === id));
  const raus = [];
  ROLLEN.forEach((r) => {
    const mit = treffer.filter((e) => zutatenVon(e)
      .some((z) => z.id === id && z.rolle === r.id));
    if (!mit.length) return;
    const summe = mit.reduce((sum, e) => sum + wertNach(eintraege, e, fensterStunden), 0);
    raus.push({ rolle: r.id, faelle: mit.length, schnitt: summe / mit.length });
  });
  return raus.sort((a, b) => b.schnitt - a.schnitt);
}

/* ---------- Die übrigen Faktoren ---------- */

/**
 * Wie viele Stunden vor einer Beschwerde zuletzt gegessen wurde.
 *
 * `null`, wenn an dem Tag und dem davor gar nichts eingetragen ist – dann ist
 * die Angabe nicht „lange her", sondern unbekannt, und das sind zwei
 * verschiedene Dinge.
 */
export function stundenSeitEssen(eintraege, beschwerde) {
  const t = zeitpunkt(beschwerde.am, beschwerde.um);
  let letzte = null;
  eintraege.filter((e) => e.art === 'essen').forEach((e) => {
    const te = zeitpunkt(e.am, e.um);
    if (te < t && (letzte === null || te > letzte)) letzte = te;
  });
  if (letzte === null) return null;
  const std = stundenDazwischen(letzte, t);
  return std <= 24 ? std : null;
}

/**
 * Kommen die Beschwerden nach dem Essen oder nüchtern?
 *
 * Das ist die erste Frage, die im Sprechzimmer gestellt wird, und die
 * schwerste aus dem Kopf zu beantworten. Aus dem Tagebuch fällt sie ab.
 */
export function essensbezug(eintraege, nahStunden = 2, fernStunden = 4) {
  const beschwerden = eintraege.filter((e) => e.art === 'beschwerde');
  let nah = 0;
  let fern = 0;
  let unbekannt = 0;
  beschwerden.forEach((b) => {
    const std = stundenSeitEssen(eintraege, b);
    if (std === null) unbekannt += 1;
    else if (std <= nahStunden) nah += 1;
    else if (std >= fernStunden) fern += 1;
  });
  const bewertbar = nah + fern;
  return {
    gesamt: beschwerden.length,
    nachDemEssen: nah,
    nuechtern: fern,
    unbekannt,
    anteilNachDemEssen: bewertbar ? nah / bewertbar : 0,
    anteilNuechtern: bewertbar ? fern / bewertbar : 0,
    bewertbar,
  };
}

/**
 * Ein Tagesfaktor gegen die Beschwerdestärke: Tage mit viel gegen Tage mit
 * wenig davon.
 *
 * Dieselbe Logik wie bei den Auslösern und aus demselben Grund: Verglichen
 * wird gegen den eigenen Alltag, nicht gegen null. Wer an jedem zweiten Tag
 * angespannt ist, hätte sonst „Anspannung" als Dauerbefund.
 */
export function faktorBilanz(eintraege, tage, frageId, tagesWertFn) {
  const hoch = [];
  const niedrig = [];
  Object.keys(tage || {}).forEach((iso) => {
    const wert = tage[iso] ? tage[iso][frageId] : null;
    if (wert === null || wert === undefined) return;
    const t = tagesWertFn(eintraege, iso, tage);
    if (!t.notiert) return;
    if (Number(wert) >= 3) hoch.push(t.wert);
    else if (Number(wert) <= 1) niedrig.push(t.wert);
  });
  const schnitt = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    id: frageId,
    hoch: { tage: hoch.length, schnitt: schnitt(hoch) },
    niedrig: { tage: niedrig.length, schnitt: schnitt(niedrig) },
    differenz: schnitt(hoch) - schnitt(niedrig),
    genug: hoch.length >= 4 && niedrig.length >= 4,
  };
}

/** Wie oft eine Beschwerdeart unter allen Beschwerden vorkommt, als Anteil. */
export function artAnteil(eintraege, arten) {
  const alle = eintraege.filter((e) => e.art === 'beschwerde');
  if (!alle.length) return { anteil: 0, anzahl: 0, gesamt: 0 };
  const treffer = alle.filter((e) => (e.arten || []).some((a) => arten.includes(a)));
  return { anteil: treffer.length / alle.length, anzahl: treffer.length, gesamt: alle.length };
}

/* ---------- Was oft vorkommt ---------- */

/**
 * Die Zutaten nach Häufigkeit, die meistbenutzte zuerst.
 *
 * Die Auswahlliste beim Eintragen ist sechzehn Marken lang plus eigene. Wer
 * jeden Tag Kaffee einträgt, soll ihn nicht jeden Tag suchen – und eine
 * Eingabe, die drei Sekunden dauert statt fünfzehn, wird auch an einem
 * schlechten Tag noch gemacht. Genau daran hängt, ob das Tagebuch Lücken hat.
 */
export function haeufigeZutaten(eintraege) {
  const zaehler = new Map();
  eintraege.filter((e) => e.art === 'essen').forEach((e) => {
    zutatenVon(e).forEach((z) => zaehler.set(z.id, (zaehler.get(z.id) || 0) + 1));
  });
  return zaehler;
}

/**
 * Frühere Mahlzeiten als *vollständige* Vorlage: Text, Zutaten samt Rollen,
 * Portion.
 *
 * Vorher gab es hier nur den Text, und der Vorschlag füllte allein das
 * Textfeld – Zutaten, Rollen und Portion musste man danach von Hand nachbauen.
 * Das ist der Unterschied zwischen drei Sekunden und fünfzehn, und er
 * entscheidet mehr als jede Rechnung in dieser Datei: Das größte Risiko für
 * ein Tagebuch ist nicht ein Fehler in der Auswertung, sondern dass nach drei
 * Wochen niemand mehr etwas einträgt.
 *
 * Zusammengefasst wird über den kleingeschriebenen Text ohne Randleerzeichen –
 * sonst stünde „haferbrei" neben „Haferbrei" und beide wären halb so häufig.
 * Die Vorlage kommt vom **jüngsten** Vorkommen: Wer seinen Haferbrei zuletzt
 * ohne Milch gegessen hat, will ihn vermutlich wieder so.
 *
 * Auch einmalige Mahlzeiten kommen mit. „Nochmal wie gestern" ist ein
 * genauso guter Grund wie „das esse ich immer".
 */
export function haeufigeMahlzeiten(eintraege, anzahl = 6) {
  const zaehler = new Map();
  eintraege.filter((e) => e.art === 'essen').forEach((e) => {
    const roh = String(e.was || '').trim();
    if (!roh) return;
    const schluessel = roh.toLowerCase();
    const v = zaehler.get(schluessel) || { anzahl: 0 };
    v.text = roh;
    v.zutaten = zutatenVon(e);
    v.portion = e.portion || 'normal';
    v.zuletzt = e.am;
    v.anzahl += 1;
    zaehler.set(schluessel, v);
  });
  return [...zaehler.values()]
    .sort((a, b) => (b.anzahl - a.anzahl) || (a.zuletzt < b.zuletzt ? 1 : -1))
    .slice(0, anzahl);
}

/* ---------- Verlauf ---------- */

/**
 * Der Tageswert: die stärkste Beschwerde des Tages.
 *
 * `notiert` unterscheidet den beschwerdefreien Tag vom Tag ohne Eintrag. Für
 * die Auswertung ist das der wichtigste Unterschied überhaupt – aus einer
 * Lücke im Tagebuch einen guten Tag zu machen, verschiebt jede Statistik nach
 * unten, und zwar genau in den Wochen, in denen es jemandem zu schlecht ging,
 * um etwas einzutragen.
 */
export function tagesWert(eintraege, iso, tage = {}) {
  const amTag = eintraege.filter((e) => e.am === iso);
  const beschwerden = amTag.filter((e) => e.art === 'beschwerde');
  const notiert = amTag.length > 0 || !!tage[iso];
  const max = beschwerden.reduce((m, e) => Math.max(m, Number(e.staerke) || 0), 0);
  const summe = beschwerden.reduce((s, e) => s + (Number(e.staerke) || 0), 0);
  return {
    am: iso,
    notiert,
    wert: max,
    schnitt: beschwerden.length ? summe / beschwerden.length : 0,
    anzahl: beschwerden.length,
    mahlzeiten: amTag.filter((e) => e.art === 'essen').length,
    medikamente: amTag.filter((e) => e.art === 'medikament').length,
  };
}

/** Eine Reihe von Tageswerten, lückenlos von `von` bis `bis`. */
export function verlaufReihe(eintraege, von, bis, tage = {}) {
  const raus = [];
  const n = tageDazwischen(von, bis);
  for (let i = 0; i <= n; i++) raus.push(tagesWert(eintraege, plusTage(von, i), tage));
  return raus;
}

/**
 * Beschwerden nach Tageszeit. Beantwortet die Frage, die im Sprechzimmer
 * immer kommt: nüchtern oder nach dem Essen, tagsüber oder nachts.
 */
export function nachTageszeit(eintraege) {
  const faecher = Object.keys(TAGESZEIT_NAME);
  const eimer = Object.fromEntries(faecher.map((k) => [k, { anzahl: 0, summe: 0 }]));
  eintraege.filter((e) => e.art === 'beschwerde').forEach((e) => {
    const f = eimer[tageszeit(e.um)];
    f.anzahl += 1;
    f.summe += Number(e.staerke) || 0;
  });
  return faecher.map((k) => ({
    id: k,
    name: TAGESZEIT_NAME[k],
    anzahl: eimer[k].anzahl,
    schnitt: eimer[k].anzahl ? eimer[k].summe / eimer[k].anzahl : 0,
  })).filter((f) => f.anzahl > 0).sort((a, b) => b.anzahl - a.anzahl);
}

/** Wie oft welche Beschwerdeart angekreuzt wurde. */
export function nachArt(eintraege) {
  const zaehler = new Map();
  eintraege.filter((e) => e.art === 'beschwerde').forEach((e) => {
    (e.arten || []).forEach((a) => zaehler.set(a, (zaehler.get(a) || 0) + 1));
  });
  return [...zaehler.entries()].map(([id, anzahl]) => ({ id, anzahl }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

/**
 * Die laufende Serie beschwerdefreier Tage, rückwärts ab `bis`.
 *
 * Ein Tag ohne Eintragung beendet die Serie nicht, aber er zählt auch nicht
 * mit – sonst wäre die längste Serie die längste Pause vom Tagebuch.
 */
export function serieOhne(eintraege, tage, bis) {
  let iso = bis;
  let zaehler = 0;
  for (let i = 0; i < 400; i++) {
    const t = tagesWert(eintraege, iso, tage);
    if (t.notiert) {
      if (t.wert > 0) break;
      zaehler += 1;
    }
    iso = plusTage(iso, -1);
  }
  return zaehler;
}

/* ---------- Wird es besser oder schlechter? ---------- */

/**
 * Die letzten Wochen gegen die Wochen davor.
 *
 * Die Frage, die jeder stellt, der ein Tagebuch führt, und die bisher nirgends
 * beantwortet war: Alles andere in dieser Datei mittelt über den ganzen
 * Zeitraum und kann deshalb nicht sagen, ob es *gerade* besser wird.
 *
 * Zwei Entscheidungen tragen die Rechnung, und beide gehen gegen ein zu
 * freundliches Ergebnis:
 *
 *   1. **Verglichen werden notierte Tage, nicht Kalendertage.** Wer in einer
 *      schlechten Woche seltener einträgt, hätte sonst rechnerisch eine gute
 *      Woche – der häufigste Weg, wie ein Tagebuch sich selbst belügt. Der
 *      jüngere Abschnitt sammelt die letzten `fenster` *notierten* Tage, der
 *      ältere die `fenster` davor.
 *   2. **Beide Abschnitte müssen voll sein.** Ein Vergleich von zwölf gegen
 *      drei Tage ist keiner. Fehlt es, kommt `pruefbar: false` zurück und die
 *      Anzeige sagt, wie viele Tage noch fehlen.
 *
 * Und die Schwelle ist bewusst hoch: eine ganze Stufe auf der Zehnerskala.
 * Beschwerden schwanken von selbst, und aus jeder Schwankung eine Richtung zu
 * machen wäre ein Orakel, das mal Mut macht und mal grundlos Angst.
 */
/*
 * `ab` begrenzt, wie weit zurückgeschaut werden darf.
 *
 * Auf dem Bildschirm bleibt es leer – dort ist die Richtung eine Aussage über
 * das Tagebuch, nicht über einen Ausschnitt. Im Bericht steht dagegen ein
 * Zeitraum im Kopf, und eine Zahl, die still von davor mitrechnet, wäre dort
 * schlicht falsch beschriftet.
 */
export function trend(eintraege, tage, bis, fenster = 14, ab = null) {
  // Rückwärts durch den Kalender, bis beide Fächer voll sind – oder bis ein
  // Jahr durch ist. Ohne diese Grenze liefe die Schleife bei einem leeren
  // Tagebuch bis ans Ende der Zeit.
  const werte = [];
  let iso = bis;
  for (let i = 0; i < 400 && werte.length < fenster * 2; i++) {
    if (ab && iso < ab) break;
    const t = tagesWert(eintraege, iso, tage);
    if (t.notiert) werte.push(t.wert);
    iso = plusTage(iso, -1);
  }

  const schnitt = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  const jung = werte.slice(0, fenster);
  const alt = werte.slice(fenster, fenster * 2);
  const pruefbar = jung.length >= fenster && alt.length >= fenster;
  const differenz = schnitt(alt) - schnitt(jung);

  let richtung = 'gleich';
  if (pruefbar && differenz >= 1) richtung = 'besser';
  else if (pruefbar && differenz <= -1) richtung = 'schlechter';

  return {
    fenster,
    pruefbar,
    // Wie viele notierte Tage noch fehlen, damit sich überhaupt vergleichen lässt.
    fehlt: Math.max(0, fenster * 2 - werte.length),
    jetzt: { tage: jung.length, schnitt: schnitt(jung), frei: jung.filter((w) => w === 0).length },
    davor: { tage: alt.length, schnitt: schnitt(alt), frei: alt.filter((w) => w === 0).length },
    differenz,
    richtung,
  };
}

export const TREND_WORT = {
  besser: 'es wird besser',
  schlechter: 'es wird schlechter',
  gleich: 'kein deutlicher Unterschied',
};

/** Die großen Zahlen für die Übersicht und den Bericht. */
export function gesamtZahlen(eintraege, tage, von, bis) {
  const reihe = verlaufReihe(eintraege, von, bis, tage);
  const notiert = reihe.filter((t) => t.notiert);
  const mit = notiert.filter((t) => t.wert > 0);
  return {
    tage: reihe.length,
    notierteTage: notiert.length,
    tageMitBeschwerden: mit.length,
    anteil: notiert.length ? mit.length / notiert.length : 0,
    schnitt: notiert.length ? notiert.reduce((s, t) => s + t.wert, 0) / notiert.length : 0,
    hoechster: notiert.reduce((m, t) => Math.max(m, t.wert), 0),
    mahlzeiten: reihe.reduce((s, t) => s + t.mahlzeiten, 0),
    medikamente: reihe.reduce((s, t) => s + t.medikamente, 0),
  };
}
