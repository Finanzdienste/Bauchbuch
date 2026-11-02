/*
 * Der Ausdruck für den Arzttermin.
 *
 * Zehn Minuten Sprechstunde und die Frage „und, wie war es?" – darauf ist
 * niemand aus dem Kopf vorbereitet. Diese Datei macht aus Wochen an
 * Eintragungen eine Seite Text: Zeitraum, wie viele Tage mit Beschwerden, wie
 * stark, wann, was auffällig war, welche Mittel genommen wurden.
 *
 * Bewusst reiner Text und kein PDF: Text lässt sich in jede Mail einfügen, auf
 * jedem Gerät ausdrucken und vorher noch ändern. Und was man ändern kann,
 * liest man vorher – bei einem erzeugten PDF tut das erfahrungsgemäß niemand.
 *
 * Der Bericht behauptet nichts. Er zählt, und er sagt dazu, wie oft. Die
 * Einordnung macht die Praxis.
 */
import { fmtDatum, plusTage, tageDazwischen, zeitpunkt } from './datum.js';
import { fmtZahl, mehrzahl } from './text.js';
import { ausloeserName, beschwerdeName, STAERKE_WORT } from './daten.js';
import {
  ausloeserBilanz, bewerteteMahlzeiten, einstufung, faktorBilanz, gesamtZahlen,
  klassenBilanz, klassenEinstufung, nachArt, nachTageszeit, tagesWert, trend,
  TREND_WORT,
} from './auswertung.js';
import { haeltStand, SCHICHT_WORT } from './schichten.js';
import {
  FENSTER, fensterWerte, spaeteFunde, zeitBild, zeitProfil,
} from './zeitprofil.js';
import { phasenUrteil, wechselnde } from './wechselwirkung.js';
import { wasSacheIst } from './lage.js';
import { spielraumSatz, strenge, zufallsSpielraum } from './zufall.js';
import { dosisBild } from './dosis.js';
import { gewichtsBild } from './gewicht.js';
import { bildLesen } from './bild.js';
import { PHASEN, phasenBilanz, phasenFrage } from './zyklus.js';
import { istAdhsMittel, mphForm, wissenZu } from './mittel.js';
import { formZu, wechselHinweise } from './zusammen.js';
import {
  PAUSE_WERTE, adhsAuswertung, essensRhythmus, zeitprofilNahAmMittel,
} from './adhs.js';
import { spannungAuswertung } from './spannung.js';
import { familienVergleiche, grenzeText, hatUrteil } from './vergleich.js';
import { kriterien } from './kriterien.js';
import { stuhlZahlen, wasserSatz, wasserVergleich } from './stuhl.js';
import { glasName, literText, wasserZahlen } from './wasser.js';
import {
  AKTIV_KOPF_STUNDEN, aktivitaetBilanz, aktivitaetName, aktivitaetenVon, bewegungSatz,
} from './aktivitaet.js';
import { befund, mittelBilanz } from './ansprechen.js';
import { ergebnis } from './versuch.js';
import { provokationsBild } from './provokation.js';
import { planBild } from './stufenplan.js';
import {
  aufwachZahlen, bauchAnKopfTagen, bauchAnKopfTagenSatz, chronischSatz, kopfFragen, kopfMerkmale,
  kopfMittel, kopfMonate, kopfNachPhase, kopfTageVon, kopfUmPeriode, kopfUmstaende, kopfZahlen,
  nachwirkungSatz, nsarNachwirkung, sortenText, statusSatz, uebergebrauchSatz,
  umPeriodeSatz, umstaendeSaetze, unauffaelligeVergleiche,
} from './kopf.js';

const prozent = (x) => `${Math.round(x * 100)} %`;

/**
 * So breit darf eine Zeile höchstens sein: Der Zettel wird ausgedruckt oder
 * in eine Mail geklebt, und beides schneidet um die 80 Zeichen ab oder bricht
 * mitten im Wort um.
 */
const BERICHT_BREITE = 79;

/**
 * Einen langen Satz auf Zeilenbreite umbrechen.
 *
 * Der Bericht ist reiner Text und wird ausgedruckt oder in eine Mail geklebt.
 * Eine 400 Zeichen lange Zeile ist dort entweder abgeschnitten oder unlesbar –
 * und die Sätze aus js/ansprechen.js und js/versuch.js sind genau das.
 */
function umbrochen(satz, breite = 68) {
  const zeilen = [];
  let zeile = '';
  String(satz).split(/\s+/).forEach((ganz) => {
    // Ein Wort, das allein breiter ist als die Zeile – ein langer Name ohne
    // Leerzeichen –, wird hart geteilt. Sonst stünde es über den Rand hinaus.
    const stuecke = ganz.length > breite
      ? Array.from({ length: Math.ceil(ganz.length / breite) }, (_, i) => ganz.slice(i * breite, (i + 1) * breite))
      : [ganz];
    stuecke.forEach((wort) => {
      if (zeile && (zeile.length + wort.length + 1) > breite) {
        zeilen.push(zeile);
        zeile = wort;
      } else {
        zeile = zeile ? `${zeile} ${wort}` : wort;
      }
    });
  });
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/**
 * Ein Absatz mit Einzug: die erste Zeile mit `einzug`, jede weitere mit
 * `fort` – so, wie die Abschnitte des Berichts eingerückt sind.
 */
function berAbsatz(satz, einzug = '  ', fort = '    ', breite = BERICHT_BREITE - fort.length) {
  // Eine Zahl und ihr Prozentzeichen bleiben auf einer Zeile.
  return umbrochen(String(satz).replace(/ %/g, '\u0001%'), breite)
    .map((zl, i) => `${i ? fort : einzug}${zl.replace(/\u0001/g, ' ')}`);
}

/**
 * Eine Zeile in Spalten („Kopfschmerztage            3 · davor 4 · …"),
 * deren Teile auf weitere Zeilen unter die zweite Spalte rücken, wenn alles
 * zusammen zu breit wird. Passt es, bleibt es eine Zeile wie bisher.
 */
function berSpalte(kopf, ...teile) {
  const ganz = `${kopf}${teile.join(' ')}`;
  if (ganz.length <= BERICHT_BREITE) return [ganz];
  const unter = ' '.repeat(kopf.length);
  return [`${kopf}${teile[0]}`, ...teile.slice(1).map((t) => `${unter}${t}`)];
}

/**
 * Der letzte Wächter über die Breite: Jede Zeile, die noch zu lang ist, wird
 * an einem Leerzeichen umbrochen – unter der zweiten Spalte, wenn die Zeile
 * Spalten hat, sonst etwas eingerückt. Was kürzer ist, bleibt Zeichen für
 * Zeichen, wie es war; das hält einen Bericht ohne lange Zeilen gleich.
 */
function berZeileKuerzen(zeile) {
  if (zeile.length <= BERICHT_BREITE) return [zeile];
  const einzug = zeile.match(/^ */)[0].length;
  const spalte = /^ *\S(?:.*?\S)? {2,}(?=\S)/.exec(zeile);
  const fort = spalte && spalte[0].length <= 40 ? spalte[0].length : einzug + 2;
  const raus = [];
  let rest = zeile;
  let innen = einzug;
  while (rest.length > BERICHT_BREITE) {
    // Am liebsten vor einem Gedankenstrich: „… 14 Tage – spricht dagegen"
    // bleibt dann als Urteil beisammen, statt mitten darin umzubrechen.
    const strich = rest.lastIndexOf(' – ', BERICHT_BREITE - 2);
    let schnitt = strich > innen + 20 ? strich : rest.lastIndexOf(' ', BERICHT_BREITE);
    // Kein Leerzeichen hinter dem Einzug: ein überlanges Wort, hart geteilt.
    if (schnitt <= innen) schnitt = BERICHT_BREITE;
    raus.push(rest.slice(0, schnitt).trimEnd());
    const weiter = rest.slice(schnitt).trimStart();
    rest = weiter ? `${' '.repeat(fort)}${weiter}` : '';
    innen = fort;
  }
  if (rest) raus.push(rest);
  return raus;
}

/* ---------- Die Teile der Fassung 28 ---------- */

/** Die Tagesfelder zu Kiefer, Nacken und Schiene. */
const BER_SPANNUNG_FELDER = ['verspannt', 'kiefer', 'gepresst', 'schiene'];
const BER_GEGENMITTEL = ['massagepistole', 'massage', 'waerme'];
const BER_SPANNUNG_KOPF = ['kauen', 'nackenbewegung', 'schlaefe'];
/* Kurz genug für die Spalte der Kopfmerkmale – die langen Namen würden mitten im Wort abgeschnitten. */
const BER_KOPF_KURZ = { kauen: 'Schlimmer beim Kauen', nackenbewegung: 'Bei Kopf-/Nackenbewegung' };

const berDa = (x) => x !== undefined && x !== null && x !== '';

/** Das Urteil eines neuen Vergleichs in einem Wort – wie auf „Muster". */
const BER_URTEIL = { auffaellig: 'auffällig', moeglich: 'möglich', unauffaellig: 'eher weniger' };

/** Ein Wert eines Vergleichs: Anteile in Prozent, Skalen mit Komma. */
const berWert = (v, x) => (v.skala === 'anteil' ? prozent(x) : fmtZahl(x));
const berSpielraum = (v) => (v.skala === 'anteil'
  ? `${Math.round(v.urteil.spielraum * 100)} Prozentpunkte` : fmtZahl(v.urteil.spielraum));

/** Teile mit „ · " zu Zeilen packen, ohne einen Teil zu zerreißen. */
function berReihen(teile, breite) {
  return teile.reduce((r, x) => {
    if (r.length && `${r[r.length - 1]} · ${x}`.length <= breite) r[r.length - 1] += ` · ${x}`;
    else r.push(x);
    return r;
  }, []);
}

/*
 * Die Kernsätze der Paare für den Zettel. Die Karte auf „Tag" spricht den
 * Menschen an, der die Mittel nimmt („In deinen Mitteln …", „bitte nichts
 * weglassen"); der Zettel geht an die Praxis und braucht nur, was die
 * Fachinformation sagt. Die Sätze sind Teile der Kartentexte aus
 * js/zusammen.js und mit ihnen belegt. Für die übrigen Paare reicht der
 * erste Satz des Hinweises bis zum Gedankenstrich.
 */
const BER_PAAR = {
  W1: 'Die Fachinformation solcher Kapseln sieht beides nicht zusammen vor: In einem weniger '
    + 'sauren Magen kann der Wirkstoff früher frei werden.',
  W1u: 'Bei manchen Methylphenidat-Kapseln (Medikinet retard, Medikinet adult) sieht die '
    + 'Fachinformation das nicht zusammen vor; die Form ist nicht angegeben.',
  W3: 'Ob ein Säureblocker zum Präparat passt, hängt bei Methylphenidat an der Form.',
  W4: 'Ob ein Säureblocker zum Präparat passt, hängt bei Methylphenidat an der Form.',
};

function berPaarKern(h) {
  if (BER_PAAR[h.id]) return BER_PAAR[h.id];
  const vorStrich = String(h.text || '').split(' – ')[0];
  const ende = vorStrich.search(/\.\s/);
  const satz = (ende >= 0 ? vorStrich.slice(0, ende + 1) : vorStrich).trim();
  return /[.!?]$/.test(satz) ? satz : `${satz}.`;
}

/** Die Form eines Methylphenidats in Worten – „nicht angegeben" statt einer Form, die keine ist. */
function berFormText(name, standardMittel, eintraege) {
  const f = mphForm(formZu(name, standardMittel, eintraege));
  return f && f.id !== 'unbekannt' ? f.kurzname : null;
}

/** Ein Name im Paar: bei Methylphenidat mit der Form, damit die Praxis weiß, welches. */
function berPaarName(name, standardMittel, eintraege) {
  const g = wissenZu(name);
  if (!g || g.id !== 'mph') return name;
  const form = berFormText(name, standardMittel, eintraege) || 'Form nicht angegeben';
  return /methylphenidat/i.test(name) ? `${name} (${form})` : `${name} (Methylphenidat, ${form})`;
}

/**
 * ADHS-MITTEL – der Abschnitt zur Muster-Karte, für die Praxis.
 *
 * Er rechnet nichts selbst (js/adhs.js tut das) und sagt dasselbe wie die
 * Karte, nur knapp und ohne Anrede: Zahlen mit Fallzahlen, ein Urteil nur,
 * wo es über dem Zufallsspielraum der Familie liegt, und auf der Seite „ohne"
 * nie, wie viel noch fehlt (R9).
 */
function berAdhs(a, rhythmus, { spannungAn, gewichtDa }) {
  const z = [];
  const absatz = (t, ein = '  ', fort = '    ') => z.push(...berAbsatz(t, ein, fort));
  const klammer = (saetze, ein = '    ') => {
    const da = saetze.filter(Boolean);
    if (da.length) absatz(`(${da.join(' ')})`, ein, ein);
  };

  z.push('ADHS-MITTEL (eigene Einträge; Zählfenster, keine Wirkdauer)');
  absatz(`${a.abschnitt.namen.join(', ')} seit ${a.abschnitt.datum}: `
    + `${mehrzahl(a.abschnitt.tage, 'Einnahmetag', 'Einnahmetage')}`
    + `${a.a2 && a.a2.bezugUhr ? `, erste meist ${a.a2.bezugUhr}` : ''}`);

  /* Tage ohne Mittel – mit Grund, und „wegen Beschwerden" als nicht gewertet. */
  if (a.a2) {
    const g = a.a2.gruende;
    const gruende = [
      g.geplant ? `geplant ${g.geplant}` : '', g.vergessen ? `vergessen ${g.vergessen}` : '',
      g.pause ? `ohne Grund ${g.pause}` : '',
      g.beschwerden ? `wegen Beschwerden ${g.beschwerden} – nicht gewertet` : '',
    ].filter(Boolean).join(', ');
    absatz(`Tage ohne ADHS-Mittel: ${a.a2.ohneTage + g.beschwerden}${gruende ? ` (${gruende})` : ''}`);
  }

  /* A1 */
  const h = a.a1 && a.a1.haupt;
  if (h) {
    const v = h.vergleich;
    const zl = h.zaehl;
    // Als Reihe von Teilen, damit keine Zahl allein auf der nächsten Zeile steht.
    berReihen([
      `Zum Essen (erste Einnahme je Tag): mit ${v.mit.n}`, `ohne ${v.ohne.n}`,
      zl.vor ? `kurz vor dem Essen ${zl.vor}` : '', zl.ohneAngabe ? `ohne Angabe ${zl.ohneAngabe}` : '',
      zl.spaet ? `später angegeben ${zl.spaet}` : '',
      zl.widerspruch ? `Angabe und Mahlzeit widersprechen sich ${zl.widerspruch}` : '',
      zl.unklar ? `Mahlzeit nur ungefähr ${zl.unklar}` : '',
    ].filter(Boolean), BERICHT_BREITE - 4).forEach((zeile, i) => z.push(`${i ? '    ' : '  '}${zeile}`));
    const nicht = [
      zl.nichtZuzuordnen ? `Zeit nur ungefähr ${zl.nichtZuzuordnen}` : '',
      zl.davor ? `Beschwerde schon davor ${zl.davor}` : '',
      zl.offen ? `Reihenfolge offen ${zl.offen}` : '',
      zl.nichtNotiert ? `Tag sonst ohne Bauch-Angaben ${zl.nichtNotiert}` : '',
    ].filter(Boolean).join(' · ');
    if (nicht) absatz(`Nicht gewertet: ${nicht}`, '    ', '      ');
    absatz(`Bauch in den 4 Stunden nach der ersten Einnahme (0–10)${a.a1.alle.length > 1 ? `, ${h.name}` : ''}`);
    z.push(`    ohne Essen ${String(v.ohne.n).padStart(3)} Mal${v.genug ? `, im Mittel ${fmtZahl(v.ohne.schnitt)}` : ''}`);
    z.push(`    mit Essen  ${String(v.mit.n).padStart(3)} Mal${v.genug ? `, im Mittel ${fmtZahl(v.mit.schnitt)}` : ''}`);
    const saetze = [];
    if (hatUrteil(v)) {
      absatz(`Unterschied ${fmtZahl(v.urteil.differenz)}, Zufallsspielraum ${fmtZahl(v.urteil.spielraum)} `
        + `– ${BER_URTEIL[v.art]}.`, '    ', '    ');
      saetze.push('Ob es am leeren Magen liegt oder an dem, was an solchen Morgen sonst anders ist, zeigt '
        + 'das Tagebuch nicht.');
    } else if (v.genug) {
      saetze.push(...v.saetze);
    } else {
      // Zu wenige: die Sätze aus js/adhs.js – bisherige Zahl, kein Ziel (R9).
      saetze.push(...h.saetze.filter((t) => t.startsWith('Bisher ') || t.startsWith('Ein Vergleich entsteht')
        || t.startsWith('Bei manchen Präparaten')));
    }
    if (v.mit.n) saetze.push('Bei „mit Essen“ zählt die Mahlzeit selbst mit.');
    if (v.genug && h.anspannung.ohne !== null && h.anspannung.mit !== null) {
      saetze.push(`Anspannung an diesen Tagen ${fmtZahl(h.anspannung.ohne)} gegen ${fmtZahl(h.anspannung.mit)}.`);
    }
    if (h.nuechtern) {
      saetze.push(`${h.nuechtern} dieser Beschwerden zählen unten unter „Wie lange nach dem Essen“ auch als `
        + 'nüchtern – dieselben Beschwerden, zwei Lesarten.');
    }
    klammer(saetze);
    if (a.a1.auch.length) {
      absatz(`auch: ${a.a1.auch.map((x) => `${x.name}: ${mehrzahl(x.faelle, 'Fall', 'Fälle')}`).join(', ')}`,
        '    ', '      ');
    }
  }

  /* A2 */
  if (a.a2) {
    z.push('  Mit gegen ohne Mittel (nur notierte Tage)');
    const ids = ['bauch', 'kopf', 'schlaf', ...(spannungAn ? ['kiefer', 'gepresst'] : [])];
    const titel = {
      bauch: 'Bauch am Tag (0–10)',
      kopf: `Kopfschmerz nach der Einnahmezeit${a.a2.bezugUhr ? ` (meist ${a.a2.bezugUhr})` : ''}`,
      schlaf: 'Schlaf danach (0 gut – 4 kaum)',
      kiefer: 'Kiefer am Morgen danach (0–4)',
      gepresst: 'Tagsüber gepresst',
    };
    const kurz = { bauch: 'Bauch', kopf: 'Kopf', schlaf: 'Schlaf', kiefer: 'Kiefer', gepresst: 'gepresst' };
    const da = ids.map((id) => [id, a.a2.zeilen[id]]).filter(([, v]) => v && v.genug);
    da.forEach(([id, v]) => {
      absatz(`${titel[id]}: mit Mittel ${berWert(v, v.mit.schnitt)} · ohne ${berWert(v, v.ohne.schnitt)} `
        + `(${v.mit.n}/${v.ohne.n} Tage)${hatUrteil(v) ? ` – ${BER_URTEIL[v.art]}, Spielraum ±${berSpielraum(v)}` : ''}`,
      '    ', '      ');
    });
    // Ohne Urteil: ein gemeinsamer Satz zur Nachweisgrenze (R5), dazu die
    // Gründe, aus denen keines fallen durfte (R6 bis R6c) – je einmal.
    const grenzen = da.filter(([, v]) => v.art === 'neutral')
      .map(([id, v]) => `${grenzeText(v.urteil.grenze, v.skala)} (${kurz[id]})`);
    const saetze = [];
    if (grenzen.length) {
      saetze.push(`Kein Unterschied über dem Zufall – unter ${grenzen.length > 1
        ? `${grenzen.slice(0, -1).join(', ')} und ${grenzen[grenzen.length - 1]}` : grenzen[0]} wäre hier `
        + 'keiner zu sehen.');
    }
    saetze.push(...new Set(da.filter(([, v]) => v.stoerung).flatMap(([, v]) => v.saetze)));
    const st = a.a2.stuhl;
    if (st.genug && !st.stoerung) {
      saetze.push(`Harter Stuhl (Typ 1–2) an Tagen mit Mittel ${prozent(st.mit.schnitt)} (${st.mit.n} Tage mit `
        + `Stuhlgang), ohne ${prozent(st.ohne.schnitt)} (${st.ohne.n}) – nur beschrieben.`);
    }
    saetze.push(...a.a2.saetze);
    saetze.forEach((t) => absatz(t, '    ', '    '));
  }

  /* A3 */
  if (a.a3 && a.a3.faelle) {
    const v = a.a3;
    if (v.dicht) {
      absatz('Schlaf nach späterer letzter Einnahme: Die Einnahmezeiten liegen zu dicht beieinander für '
        + 'diesen Vergleich.');
    } else if (!v.genug) {
      absatz(`Schlaf nach späterer letzter Einnahme: bisher ${mehrzahl(v.faelle, 'Tag', 'Tage')} mit einer `
        + 'Schlafangabe in der Nacht danach – zu wenige für einen Vergleich.');
    } else {
      absatz(`Schlaf (0 gut – 4 kaum) nach letzter Einnahme nach ${v.uhr}: ${fmtZahl(v.mit.schnitt)} `
        + `(${v.mit.n} Nächte), sonst ${fmtZahl(v.ohne.schnitt)} (${v.ohne.n})`
        + `${hatUrteil(v) ? ` – ${BER_URTEIL[v.art]}, Spielraum ±${fmtZahl(v.urteil.spielraum)}` : ''}`);
      // Die übrigen Sätze aus js/adhs.js: Nachweisgrenze, Wochentag, Blöcke, Vor-Nacht.
      const saetze = [...v.saetze.slice(1)];
      if (v.stress.spaeter !== null && v.stress.sonst !== null) {
        saetze.push(`Anspannung an diesen Tagen ${fmtZahl(v.stress.spaeter)} gegen ${fmtZahl(v.stress.sonst)}.`);
      }
      saetze.push('Späteres Einschlafen gehört oft auch zu ADHS selbst – beides lässt sich hier nicht trennen.');
      klammer(saetze);
    }
  }

  /* A4 */
  if (a.a4 && a.a4.sichtbar) {
    const f = a.a4.faecher;
    absatz(`Kopfschmerz-Beginn ab der ersten Einnahme (n = ${a.a4.n}, Beschreibung):`);
    absatz(`0–4 Std. ${f[0]} · 4–8 Std. ${f[1]} · 8–12 Std. ${f[2]} (vorher ${a.a4.vorher}, `
      + `später ${a.a4.spaeter})`, '    ', '    ');
    a.a4.saetze.forEach((t) => absatz(t, '    ', '    '));
  }

  /* A5 */
  z.push(...berRhythmus(rhythmus, gewichtDa));

  z.push('  (Zahlen aus dem Tagebuch, kein Urteil über das Mittel.)');
  const fragen = a.fragen.filter((f) => !f.nurMitSpannung || spannungAn).slice(0, 3);
  if (fragen.length) {
    z.push('  Fragen dazu:');
    fragen.forEach((f) => umbrochen(f.text, 64).forEach((zl, j) => z.push(`  ${j ? '  ' : '- '}${zl}`)));
  }
  return z;
}

/**
 * Der Essensrhythmus in Zeilen – mit Einnahmen über ihre Tage, sonst über
 * alle Tage. Jeder Nenner steht dabei: Eine ausgefallene und eine nicht
 * eingetragene Mahlzeit sehen im Tagebuch gleich aus.
 */
function berRhythmus(r, gewichtDa) {
  const z = [];
  if (!r || !r.tage) return z;
  const zl = r.zeilen;
  const welche = r.mitEinnahme ? 'Einnahmetagen' : 'Tagen';
  const zeilen = (x, ein) => {
    const raus = [];
    if (x.ohneMittag && x.ohneMittag.n) {
      raus.push(`Tage mit zwei oder mehr Mahlzeiten, keine davon zwischen 11 und 15 Uhr: `
        + `${x.ohneMittag.k} von ${x.ohneMittag.n}`);
    }
    if (x.spaet && x.spaet.n) raus.push(`Mahlzeit ab 20 Uhr: an ${x.spaet.k} von ${x.spaet.n} Tagen mit Abend-Einträgen`);
    if (x.appetit && x.appetit.n) {
      raus.push(`„Kein Appetit“: an ${x.appetit.k} von ${x.appetit.n} ${ein} mit Bauch-Angaben`);
    }
    return raus;
  };
  const raus = [];
  if (zl.ersteMahlzeit && zl.ersteMahlzeit.tage) {
    raus.push(`Erste eingetragene Mahlzeit nach der Einnahme: nach ${fmtZahl(zl.ersteMahlzeit.median)} Std. `
      + `(Median über ${mehrzahl(zl.ersteMahlzeit.tage, 'Tag', 'Tage')})`);
  }
  raus.push(...zeilen(zl, welche));
  if (r.ohne) {
    const ohne = zeilen(r.ohne, 'Tagen');
    if (ohne.length) raus.push(`An Tagen ohne ADHS-Mittel: ${ohne.join('; ')}`);
  }
  if (!raus.length) return z;
  raus.forEach((t) => z.push(...berAbsatz(t)));
  if (r.gewicht && gewichtDa) z.push('  Gewicht: siehe GEWICHT');
  z.push(...berAbsatz(r.satz));
  return z;
}

/**
 * KIEFER, NACKEN, SCHIENE – der Abschnitt zur Muster-Karte. Die Sätze kommen
 * fertig aus js/spannung.js; was am selben Tag zusammen vorkommt, steht nur
 * als Zahl (R7).
 */
function berSpannung(sp) {
  const z = [];
  const absatz = (t, ein = '  ', fort = '    ') => z.push(...berAbsatz(t, ein, fort));
  z.push('KIEFER, NACKEN, SCHIENE (eigene Angaben)');

  const v1 = sp.v1;
  if (v1.getragen || v1.nicht) {
    absatz(`Schiene: ${v1.getragen} Nächte getragen, ${v1.nicht} nicht`
      + `${v1.ohneAngabe ? `, ${v1.ohneAngabe} ohne Angabe` : ''}`);
    v1.saetze.forEach((t) => absatz(t, '    ', '    '));
  }

  const v2 = sp.v2;
  if (v2.mit.n || v2.ohne.n) {
    if (v2.genug) {
      absatz(v2.satz);
      absatz(`Anspannung an diesen Tagen ${fmtZahl(v2.stress.mit)} gegen ${fmtZahl(v2.stress.ohne)}.`, '    ', '    ');
    } else {
      absatz(`Nacken/Schultern und neuer Kopfschmerz am Folgetag: bisher ${mehrzahl(v2.mit.n, 'Tag', 'Tage')} `
        + `nach stark verspanntem, ${v2.ohne.n} nach lockerem Tag – zu wenige für einen Vergleich.`);
    }
    if (v2.gut.genug) {
      absatz(`Nur nach guten Nächten: nach stark verspanntem Tag ${v2.gut.mit.k} von ${v2.gut.mit.n}, nach `
        + `lockerem ${v2.gut.ohne.k} von ${v2.gut.ohne.n} – nur beschrieben.`, '    ', '    ');
    }
    absatz(v2.vorbote, '    ', '    ');
  }

  if (sp.v3.length) {
    sp.v3.filter((x) => x.vergleich.genug).forEach((x) => absatz(x.satz));
    const wenig = sp.v3.filter((x) => !x.vergleich.genug);
    if (wenig.length) {
      absatz(`Nach mindestens mittel verspanntem Vortag bisher: ${wenig.map((x) => `${x.name} `
        + `${mehrzahl(x.vergleich.mit.n, 'Tag', 'Tage')}`).join(', ')} – zu wenige für einen Vergleich.`);
    }
    absatz('Massiert oder gewärmt wird oft, wenn sich etwas anbahnt – ein Kopfschmerz danach kann schon '
      + 'unterwegs gewesen sein; danach wird es außerdem oft von selbst besser.', '    ', '    ');
  }

  sp.v4.forEach((x) => absatz(x.satz));

  if (sp.v5.genug) {
    absatz(`Kiefer am Morgen (0–4) nach Nächten mit „Nachts davon wach“ ${fmtZahl(sp.v5.mit.schnitt)} `
      + `(${sp.v5.mit.n}), sonst ${fmtZahl(sp.v5.ohne.schnitt)} (${sp.v5.ohne.n}).`);
    absatz(sp.v5.satz, '    ', '    ');
  }

  const g = sp.gleichzeitig;
  if (g.nacken.an.n >= 4 && g.nacken.sonst.n >= 4) {
    absatz(`Am selben Tag: Nacken/Schultern an Kopfschmerztagen ${fmtZahl(g.nacken.an.schnitt)}, sonst `
      + `${fmtZahl(g.nacken.sonst.schnitt)} (gleichzeitig – sagt nichts über die Ursache)`);
  }
  if (g.gepresst.n) {
    absatz(`Tagsüber gepresst/geknirscht bemerkt: an ${g.gepresst.ja} von ${mehrzahl(g.gepresst.n, 'Tag', 'Tagen')}`);
  }
  const m = g.merkmale;
  const merkmale = [
    m.kauen ? `schlimmer beim Kauen ${m.kauen}` : '',
    m.nackenbewegung ? `bei Nackenbewegung ${m.nackenbewegung}` : '',
    m.schlaefe ? `Schläfe/Kiefer ${m.schlaefe}` : '',
  ].filter(Boolean);
  if (merkmale.length) absatz(`Kopfschmerz-Merkmale: ${merkmale.join(' · ')}`);

  const fragen = sp.fragen.slice(0, 2);
  if (fragen.length) {
    z.push('  Fragen dazu:');
    fragen.forEach((f) => umbrochen(f.text, 64).forEach((zl, j) => z.push(`  ${j ? '  ' : '- '}${zl}`)));
  }
  z.push(...berAbsatz('(Bestätigt oder widerlegt keine ärztliche oder zahnärztliche Einschätzung – gezählt '
    + 'wird, ob Kopfschmerz mit diesen Dingen zusammen öfter oder seltener kommt.)'));
  return z;
}

/**
 * @param {object} zustand  der gesamte Speicherzustand
 * @param {string} von, bis ISO-Daten, einschließlich
 */
export function arztBericht(zustand, von, bis) {
  const { eintraege, tage } = zustand;
  const imZeitraum = eintraege.filter((e) => e.am >= von && e.am <= bis);
  /*
   * Der Tagesspeicher ebenso eingegrenzt – für alles, was Tage zählt. Wer
   * gefilterte Einträge mit ungefilterten Tagesfragen mischt, bekommt aus
   * jedem Tag mit Tagesfrage außerhalb des Zeitraums einen notierten Tag
   * mit Bauchwert null, und aus jedem Zyklus davor einen Zyklus ohne
   * Kopfschmerz. Genau das stand bis zur Gegenprüfung im Kopfabschnitt.
   */
  const tageImZeitraum = Object.fromEntries(Object.entries(tage || {})
    .filter(([iso]) => iso >= von && iso <= bis));
  const z = gesamtZahlen(imZeitraum, tage, von, bis);
  /*
   * „Jetzt" für die Rechnungen, die abgelaufene Fenster brauchen: das Ende
   * des Berichtszeitraums, und wenn er bis heute reicht, die Uhr. So rechnet
   * ein Bericht über einen vergangenen Zeitraum heute dasselbe wie morgen.
   */
  const berichtJetzt = Math.min(Date.now(), zeitpunkt(plusTage(bis, 1), '00:00'));
  const zeilen = [];
  const sag = (s = '') => zeilen.push(s);

  sag('Magen-Tagebuch');
  sag(`Zeitraum: ${fmtDatum(von, true)} bis ${fmtDatum(bis, true)} `
    + `(${mehrzahl(tageDazwischen(von, bis) + 1, 'Tag', 'Tage')})`);
  // Beginnt der Bericht genau an einem eingetragenen Termin, gehört das in
  // den Kopf: Dann liest niemand die 47 Tage als eine runde Zahl, die eine
  // App sich ausgesucht hat.
  if ((zustand.termine || []).includes(von)) {
    sag('Das ist die Zeit seit dem letzten Termin.');
  }
  sag();

  /*
   * Hier kommt „In Kürze" hin – gefüllt wird es aber erst ganz unten.
   *
   * Die Sätze fassen zusammen, was der Bericht rechnet, also müssen sie nach
   * allem entstehen. Stehen müssen sie trotzdem oben: Zehn Minuten
   * Sprechstunde reichen nicht für zwölf Abschnitte, und was hinten steht,
   * wird nicht gelesen. Die Zeilen werden deshalb am Ende an diese Stelle
   * eingesetzt.
   */
  const kopfMarke = zeilen.length;

  /*
   * Was die einschaltbaren Teile im Zeitraum haben. Gerechnet wird es immer
   * (R0); ob es auf dem Zettel steht, entscheiden die Schalter – ein
   * ausgeschalteter Teil bekommt keinen Abschnitt und hält den Bericht auch
   * nicht davon ab, „nichts eingetragen" zu sagen.
   */
  const adhsAn = zustand.adhsAn === true;
  const spannungAn = zustand.spannungAn === true;
  const tagWerte = Object.values(tageImZeitraum).filter((x) => x && typeof x === 'object');
  const adhsDa = imZeitraum.some((e) => e.art === 'medikament' && istAdhsMittel(e.mittel))
    || tagWerte.some((x) => PAUSE_WERTE.includes(x.adhsPause));
  const spannungFelder = tagWerte.some((x) => BER_SPANNUNG_FELDER.some((f) => berDa(x[f])));
  const spannungDa = spannungFelder
    || imZeitraum.some((e) => aktivitaetenVon(e).some((id) => BER_GEGENMITTEL.includes(id)))
    || imZeitraum.some((e) => e.art === 'kopf' && (e.kopfArten || []).some((id) => BER_SPANNUNG_KOPF.includes(id)));

  // Ohne einen notierten Bauchtag gibt es keinen Bauchbericht – außer der
  // Kopf hat etwas, oder ein eingeschalteter Teil: Dann stehen die
  // Bauchzeilen auf null, die anderen Abschnitte nicht.
  if (!z.notierteTage && !imZeitraum.some((e) => e.art === 'kopf')
    && !(adhsAn && adhsDa) && !(spannungAn && spannungFelder)) {
    sag('In diesem Zeitraum wurde nichts eingetragen.');
    return zeilen.join('\n');
  }

  const bild = bildLesen({
    eintraege: imZeitraum,
    tage,
    bilanz: ausloeserBilanz(imZeitraum, {
      fenster: zustand.fenster,
      mindestFaelle: zustand.mindestFaelle,
      eigene: zustand.eigeneAusloeser,
    }),
    name: (id) => ausloeserName(id, zustand.eigeneAusloeser),
    istNsar: (name) => {
      const g = wissenZu(name);
      return !!g && (g.id === 'nsar' || g.id === 'kombi');
    },
  });

  // Warnzeichen stehen ganz oben, vor den Zahlen. Wer den Zettel in der Hand
  // hat, soll sie sehen, bevor er zu blättern anfängt.
  if (bild.warnungen.length) {
    sag('!! WARNZEICHEN IM ZEITRAUM');
    bild.warnungen.forEach((w) => {
      sag(`  [${w.dringlichkeit === 'sofort' ? 'sofort' : 'zeitnah'}] ${w.name}`);
      sag(`           ${mehrzahl(w.anzahl, 'Mal', 'Mal')}, zuletzt ${fmtDatum(w.zuletzt, true)}`);
    });
    sag();
  }

  /*
   * Die Waage steht bei den Warnzeichen und nicht bei den Zahlen.
   *
   * Ein ungewollter Verlust von fünf Prozent ist das stärkste einzelne
   * Zeichen, das ein Tagebuch beisteuern kann – und die einzige Angabe darin,
   * die nicht aus einer Selbsteinschätzung stammt.
   */
  const waage = gewichtsBild(zustand.gewicht, bis, zustand.abnehmenGewollt);
  const gewichtDa = waage.urteil !== 'keine' && waage.urteil !== 'zu-kurz';
  if (gewichtDa) {
    sag(waage.warnung ? '!! GEWICHT' : 'GEWICHT');
    umbrochen(waage.satz).forEach((zl) => sag(`  ${zl}`));
    sag();
  }

  // Der Kopf wird getrennt gezählt (js/kopf.js) und steht in der Übersicht
  // als eigene Zeile – damit niemand die „Tage mit Beschwerden" darüber für
  // Kopfschmerztage hält oder umgekehrt.
  const kz = kopfZahlen(imZeitraum, tageImZeitraum, bis);

  sag('ÜBERSICHT');
  sag(`  Tage mit Eintragung        ${z.notierteTage} von ${z.tage}`);
  sag(`  Tage mit Beschwerden       ${z.tageMitBeschwerden} (${prozent(z.anteil)} der eingetragenen Tage)`);
  sag(`  Stärke im Mittel           ${fmtZahl(z.schnitt)} von 10`);
  sag(`  Höchster Wert              ${z.hoechster} von 10 (${STAERKE_WORT[z.hoechster] || ''})`);
  sag(`  Mahlzeiten eingetragen     ${z.mahlzeiten}`);
  sag(`  Medikamenteneinnahmen      ${z.medikamente}`);
  if (kz.anzahl) sag(`  Kopfschmerztage            ${kz.tage} (getrennt gezählt, siehe unten)`);
  // Die Aktivitäten als Zahl, die drei häufigsten dabei. Sie zählen in keine
  // Zeile darüber: Ein Tag mit nur „Arbeit" ist kein Tag mit Eintragung.
  const aktivZaehler = new Map();
  imZeitraum.forEach((e) => aktivitaetenVon(e)
    .forEach((id) => aktivZaehler.set(id, (aktivZaehler.get(id) || 0) + 1)));
  const aktivAnzahl = imZeitraum.filter((e) => aktivitaetenVon(e).length).length;
  if (aktivAnzahl) {
    // Umbrochen wird zwischen den Aktivitäten, nie in einer: „Feier/Ausgehen"
    // und seine Zahl gehören auf dieselbe Zeile.
    const meist = [...aktivZaehler.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
      .map(([id, n]) => `${aktivitaetName(id, zustand.eigeneAktivitaeten)} ${n}×`);
    sag(`  Aktivitäten eingetragen    ${aktivAnzahl}`);
    const reihen = meist.reduce((r, x) => {
      if (r.length && `${r[r.length - 1]} · ${x}`.length <= 50) r[r.length - 1] += ` · ${x}`;
      else r.push(x);
      return r;
    }, []);
    reihen.forEach((zl) => sag(`                             ${zl}`));
  }
  /*
   * Das Wasser als eine Zeile, ohne Ziel und ohne Bewertung: Wie viel jemand
   * trinken sollte, hängt an Dingen, die dieses Tagebuch nicht kennt, und
   * eine App, die das besser weiß als die Praxis, hätte hier nichts verloren.
   * Gemittelt wird über die Tage, an denen gezählt wurde – ein Tag ohne Zahl
   * ist kein Tag ohne Trinken.
   */
  const wz = wasserZahlen(tageImZeitraum, von, bis);
  if (wz.tage) {
    const liter = literText(wz.schnitt, zustand.wasserGlas);
    sag(`  Wasser                     im Mittel ${fmtZahl(wz.schnitt)} `
      + `${wz.schnitt === 1 ? 'Glas' : 'Gläser'}${liter ? ` (${liter})` : ''}`);
    sag(`                             an ${mehrzahl(wz.tage, 'Tag', 'Tagen')} mit Angabe, `
      + `ein Glas = ${glasName(zustand.wasserGlas)}`);
  }
  sag();

  /*
   * Wird es besser oder schlechter?
   *
   * Die eine Frage, die in der Sprechstunde immer kommt und die aus dem Kopf
   * niemand beantwortet – „mal so, mal so" ist die ehrliche Antwort und die
   * nutzloseste. Verglichen wird nur innerhalb des Berichtszeitraums: Eine
   * Richtung, die heimlich Tage von vor dem letzten Termin mitzählt, stünde
   * unter einer Überschrift, die etwas anderes verspricht.
   */
  const t = trend(imZeitraum, tage, bis, 14, von);
  if (t.pruefbar) {
    sag('RICHTUNG');
    sag(`  Die letzten ${t.jetzt.tage} notierten Tage gegen die ${t.davor.tage} davor:`);
    sag(`  ${TREND_WORT[t.richtung]}`);
    sag(`  Stärke im Mittel  ${fmtZahl(t.jetzt.schnitt)} zuletzt gegen `
      + `${fmtZahl(t.davor.schnitt)} davor`);
    sag(`  Beschwerdefreie Tage  ${t.jetzt.frei} zuletzt gegen ${t.davor.frei} davor`);
    sag('  (Verglichen werden notierte Tage, nicht Kalendertage – eine Lücke im');
    sag('  Tagebuch ist kein guter Tag. Schwelle für eine Richtung: eine ganze');
    sag('  Stufe Unterschied.)');
    sag();
  }

  const arten = nachArt(imZeitraum);
  if (arten.length) {
    sag('BESCHWERDEN NACH ART');
    arten.slice(0, 8).forEach((a) => {
      sag(`  ${beschwerdeName(a.id).padEnd(24)} ${mehrzahl(a.anzahl, 'Mal', 'Mal')}`);
    });
    sag();
  }

  const zeiten = nachTageszeit(imZeitraum);
  if (zeiten.length) {
    sag('BESCHWERDEN NACH TAGESZEIT');
    zeiten.forEach((t) => {
      sag(`  ${t.name.padEnd(24)} ${String(t.anzahl).padStart(3)} Mal, `
        + `im Mittel ${fmtZahl(t.schnitt)}`);
    });
    sag();
  }

  const alleAusloeser = ausloeserBilanz(imZeitraum, {
    fenster: zustand.fenster,
    mindestFaelle: zustand.mindestFaelle,
    eigene: zustand.eigeneAusloeser,
  });
  const bilanz = alleAusloeser.filter((b) => b.genug
    && einstufung(b) !== 'neutral' && einstufung(b) !== 'unauffaellig');

  /*
   * Bevor ein Auslöser auf dem Zettel steht, wird er gegen die Umstände
   * gehalten.
   *
   * Der rohe Vergleich fragt nur: war es nach diesen Mahlzeiten schlimmer? Er
   * kann nicht wissen, dass es Kaffee vor allem an Arbeitstagen gibt und
   * Arbeitstage die angespannten sind. Wer das ungeprüft als „auffällig" in
   * eine Sprechstunde trägt, streicht am Ende ein Lebensmittel und hat nichts
   * gewonnen. Deshalb wird jeder Fund innerhalb gleicher Anspannung, gleichen
   * Schlafs und gleicher Zyklusphase nachgerechnet – und was dabei
   * verschwindet, steht weiter unten und nicht hier oben.
   */
  const bewertet = bewerteteMahlzeiten(imZeitraum, zustand.fenster);
  const fenster = fensterWerte(imZeitraum);
  const gehalten = bilanz.map((b) => ({
    b,
    stand: haeltStand(bewertet, b.id, tage, { kopfTage: kopfTageVon(imZeitraum) }),
    zeit: zeitProfil(fenster, b.id),
    dosis: dosisBild(imZeitraum, b.id, zustand.fenster),
  }));
  const bleibt = gehalten.filter((x) => x.stand.urteil !== 'verschwindet');
  const zerfallen = gehalten.filter((x) => x.stand.urteil === 'verschwindet');

  const zahlen = (b) => `${fmtZahl(b.schnittMit)} gegen ${fmtZahl(b.schnittOhne)} `
    + `(${b.faelle} Mahlzeiten damit, ${b.gegenFaelle} ohne)`;

  if (bleibt.length) {
    sag(`AUFFÄLLIG IM ZEITRAUM VON ${zustand.fenster} STUNDEN NACH DEM ESSEN`);
    sag('  (Vergleich: mittlere Beschwerdestärke danach gegen alle übrigen Mahlzeiten)');
    // Die Schwelle gehört auf den Zettel: Sie erklärt, warum manches *nicht*
    // dasteht, und das ist in einer Sprechstunde die nützlichere Auskunft.
    const b0 = bleibt[0].b;
    if (Number.isFinite(b0.spielraum)) {
      umbrochen(spielraumSatz(b0.spielraum, b0.vergleiche), 66)
        .forEach((zl) => sag(`  ${zl}`));
    }
    bleibt.slice(0, 8).forEach(({ b, stand, zeit, dosis }) => {
      sag(`  ${ausloeserName(b.id, zustand.eigeneAusloeser).padEnd(24)} ${zahlen(b)}`);
      const wo = stand.urteil === 'nur-dann' ? ` (${(stand.wo || []).join(', ')})` : '';
      sag(`    unter gleichen Umständen: ${SCHICHT_WORT[stand.urteil]}${wo}`
        + (stand.urteil === 'unklar' ? ' – zu wenige Tage mit Angaben zu'
          + ' Anspannung, Schlaf oder Zyklus' : ''));
      // Der Zeitpunkt nur, wenn er deutlich ist. „Verteilt sich" ist für die
      // Sprechstunde keine Auskunft, sondern eine Zeile mehr zu lesen.
      if (zeit.schwerpunkt) {
        const f = zeit.teile.find((t) => t.id === zeit.schwerpunkt);
        sag(`    auffällig vor allem ${f.name.toLowerCase()} (${f.ort})`);
      }
      /*
       * Und die Menge – für die Sprechstunde oft die entscheidende Zeile.
       *
       * „Zwiebeln auffällig" führt zu einer Streichliste, die nach vier Wochen
       * niemand mehr einhält. „Als Würze unauffällig, als Hauptzutat nicht"
       * führt zu einer Empfehlung, die jemand leben kann – und die Angabe
       * kostet den Zettel eine Zeile.
       */
      if (dosis.urteil === 'schwelle') {
        sag(`    ${dosis.gehtBis.satz}: unauffällig (${dosis.gehtBis.faelle} Mahlzeiten), `
          + `${dosis.abStufe.satz}: auffällig (${dosis.abStufe.faelle})`);
      } else if (dosis.urteil === 'ab-hier') {
        sag(`    bisher nur ${dosis.abStufe.satz} geprüft – kleinere Mengen sind offen`);
      }
    });
    sag();
  }

  /*
   * Und was das Fenster gar nicht sehen konnte.
   *
   * Vier Stunden sind eine Konvention, keine Physiologie. Was im Dickdarm
   * vergärt, meldet sich frühestens nach vier bis acht Stunden – für die
   * Bilanz oben existiert es damit nicht. Diese Zeilen sind der Unterschied
   * zwischen „nichts gefunden" und „nicht danach gesucht".
   */
  const spaet = spaeteFunde(
    fenster,
    alleAusloeser.filter((b) => !['auffaellig', 'moeglich'].includes(einstufung(b)))
      .map((b) => b.id),
    zustand.fenster || 4,
  );
  if (spaet.length) {
    sag('ERST NACH DEM FENSTER AUFFÄLLIG');
    sag(`  (Im Fenster von ${zustand.fenster || 4} Stunden unauffällig, später nicht.`);
    sag('  Gezählt sind nur Mahlzeiten, bei denen das späte Fenster überhaupt');
    sag('  beobachtbar war – also nichts dazwischengegessen wurde.)');
    spaet.slice(0, 4).forEach((x) => {
      sag(`  ${ausloeserName(x.id, zustand.eigeneAusloeser).padEnd(24)} `
        + `${fmtZahl(x.teil.schnittMit)} gegen ${fmtZahl(x.teil.schnittOhne)} `
        + `(${x.teil.faelle} damit, ${x.teil.gegenFaelle} ohne)`);
      sag(`    ${x.fensterName}, also ${x.ort}`);
    });
    sag();
  }

  /*
   * Was den Vergleich nicht überstanden hat, wird trotzdem genannt.
   *
   * Es einfach wegzulassen wäre bequem und falsch: In der Sprechstunde kommt
   * derselbe Verdacht sonst beim nächsten Mal wieder, und diesmal ungeprüft.
   */
  if (zerfallen.length) {
    sag('IM ROHEN VERGLEICH AUFFÄLLIG, UNTER GLEICHEN UMSTÄNDEN NICHT MEHR');
    sag('  (Innerhalb gleicher Anspannung, gleichen Schlafs und gleicher');
    sag('  Zyklusphase nachgerechnet bleibt kein Unterschied übrig – der');
    sag('  Verdacht kam vermutlich daher, dass beides zusammenfällt.)');
    zerfallen.slice(0, 6).forEach(({ b }) => {
      sag(`  ${ausloeserName(b.id, zustand.eigeneAusloeser).padEnd(24)} ${zahlen(b)}`);
    });
    sag();
  }

  /*
   * Nach Wirkweise – vor den einzelnen Zutaten wäre falsch herum, danach ist
   * richtig: Wer den Zettel liest, kennt dann schon die Beispiele und sieht
   * hier, was sie gemeinsam haben.
   */
  const klassen = klassenBilanz(imZeitraum, { fenster: zustand.fenster })
    .filter((k) => k.genug && ['auffaellig', 'moeglich'].includes(klassenEinstufung(k)));
  if (klassen.length) {
    sag('NACH WIRKWEISE ZUSAMMENGEFASST');
    sag('  (Mehr Fälle je Vergleich als eine einzelne Zutat; die Zuordnung ist grob.)');
    klassen.slice(0, 6).forEach((k) => {
      sag(`  ${k.kurz.padEnd(24)} ${fmtZahl(k.schnittMit)} gegen ${fmtZahl(k.schnittOhne)} `
        + `(${k.faelle} Mahlzeiten damit, ${k.gegenFaelle} ohne)`);
    });
    sag();
  }

  /*
   * Wie lange nach dem Essen – die Frage nach dem Ort.
   *
   * „Nach dem Essen tut es weh" führt zum Säureblocker; „sechs Stunden nach dem
   * Essen tut es weh" führt zur Ernährungsberatung. Aus dem Kopf beantwortet
   * das niemand, aus dem Tagebuch fällt es ab.
   */
  const zb = zeitBild(imZeitraum);
  if (zb.zugeordnet) {
    sag('WIE LANGE NACH DEM ESSEN');
    zb.teile.forEach((t) => {
      sag(`  ${t.name.padEnd(24)} ${String(t.anzahl).padStart(3)} `
        + `(${prozent(t.anteil)}), im Mittel ${fmtZahl(t.schnitt)}  – ${t.ort}`);
    });
    umbrochen(zb.satz).forEach((z) => sag(`  ${z}`));
    sag(`  Zugeordnet: ${zb.zugeordnet} von ${zb.gesamt} Beschwerden.`);
    // Für alle, ohne Schalter: Liegen die Beschwerden des Schwerpunkts
    // zugleich nach einem ADHS-Mittel, misst das Zeitfenster beides.
    const nah = zeitprofilNahAmMittel(imZeitraum, zb, FENSTER);
    if (nah && nah.zeigen) umbrochen(nah.satz, 66).forEach((z) => sag(`  ${z}`));
    umbrochen(`(${zb.hinweis})`, 66).forEach((z) => sag(`  ${z}`));
    sag();
  }

  /*
   * Mit dem Tagesspeicher des Zeitraums, nicht dem ganzen: Jeder Tag mit
   * einer Tagesfrage von vor dem Zeitraum stünde sonst im Nenner von „je
   * notiertem Tag", und der Bericht zählte weniger Stuhlgänge, je länger das
   * Tagebuch schon läuft.
   */
  const s = stuhlZahlen(imZeitraum, tageImZeitraum);
  if (s.gesamt) {
    sag('STUHLGANG (BRISTOL)');
    sag(`  Eingetragen                ${s.gesamt} Mal, ${fmtZahl(s.proTag)} je notiertem Tag`);
    sag(`  Typ 1-2 (hart)             ${s.hart} (${prozent(s.anteilHart)})`);
    sag(`  Typ 3-5 (unauffällig)      ${s.normal} (${prozent(s.anteilNormal)})`);
    sag(`  Typ 6-7 (weich)            ${s.weich} (${prozent(s.anteilWeich)})`);
    if (s.dringend) sag(`  davon dringend             ${s.dringend}`);
    // Nur mit genug Fällen auf beiden Seiten; sonst gar nicht – siehe
    // wasserVergleich in js/stuhl.js.
    const wasser = wasserSatz(wasserVergleich(imZeitraum, tageImZeitraum));
    if (wasser) {
      umbrochen(wasser).forEach((zl) => sag(`  ${zl}`));
      sag('  (Gezählt am selben Tag, keine Ursache.)');
    }
    sag();
  }

  /*
   * Kopfschmerzen – getrennt vom Bauch, und mit dem, was beide verbindet.
   *
   * Die Zahlen oben (Stärke, Beschwerdetage, Auslöser) kennen den Kopf nicht;
   * das ist Absicht und steht als Satz dabei. Was hierher gehört, ist das
   * Schmerzmittel: an wie vielen Kopfschmerztagen eines im Tagebuch stand und
   * was der Bauch an den Tagen danach gemacht hat.
   */
  if (kz.anzahl) {
    // Auch ein ADHS-Mittel hat seine Gruppe – unter „Nicht zugeordnet"
    // stehen nur Mittel, die die App nicht kennt.
    const gruppeVon = (name) => {
      const g = wissenZu(name);
      return g ? g.id : null;
    };
    /*
     * Zwei Blickwinkel: Was im Berichtszeitraum eingetragen wurde (kz, km),
     * und die Kalenderzahlen der Neurologie über alle Einträge (kzAlle,
     * kmAlle) – „die letzten 30 Tage" sind die letzten 30 Tage, auch wenn
     * der Bericht nur achtzehn umfasst.
     */
    const km = kopfMittel(imZeitraum, gruppeVon, bis);
    const kzAlle = kopfZahlen(eintraege, tage, bis);
    const kmAlle = kopfMittel(eintraege, gruppeVon, bis);
    const befundIds = (zustand.befunde || []).map((b) => b.id);
    const kette = (liste, feld) => liste.map((f, i) => `${i ? 'davor ' : ''}${f[feld]}`).join(' · ');
    sag('KOPFSCHMERZEN');
    sag('  Für die Neurologie, je 30-Tage-Fenster (jüngstes zuerst):');
    berSpalte('  Kopfschmerztage            ', kette(kzAlle.fenster, 'kopfTage'),
      `(${kzAlle.notiert30} der letzten 30 Tage notiert)`).forEach(sag);
    if (kmAlle.fenster.some((f) => f.akut)) {
      const sorten = sortenText(kmAlle.fenster[0]);
      berSpalte('  Tage mit Akutmittel        ', kette(kmAlle.fenster, 'akut'),
        ...(sorten ? [`(zuletzt: ${sorten})`] : [])).forEach(sag);
    }
    if (kzAlle.verlauf.ausgefallen || kzAlle.verlauf.eingeschraenkt) {
      sag(`  Ausgefallen (90 Tage)      ${mehrzahl(kzAlle.verlauf.ausgefallen, 'Tag', 'Tage')}`
        + (kzAlle.verlauf.eingeschraenkt ? `, dazu ${kzAlle.verlauf.eingeschraenkt} eingeschränkt` : ''));
    }
    sag('  Im Berichtszeitraum:');
    sag(`  Eingetragen                ${kz.anzahl} Mal an ${kz.tage} Tagen `
      + `(${prozent(kz.anteil)} der notierten Tage)`);
    sag(`  Stärke im Mittel           ${fmtZahl(kz.schnitt)} von 10, höchstens ${kz.hoechster}`);
    kz.dauern.forEach((x) => {
      sag(`  Dauer ${x.name.padEnd(20)} ${mehrzahl(x.anzahl, 'Mal', 'Mal')}`);
    });
    kz.arten.slice(0, 5).forEach((a) => {
      sag(`  ${(BER_KOPF_KURZ[a.id] || a.name).slice(0, 26).padEnd(26)} ${mehrzahl(a.anzahl, 'Mal', 'Mal')}`);
    });
    /*
     * Die Merkmale so gezählt, wie die Kopfschmerzklassifikation fragt – nur,
     * wenn im Zeitraum eines der Merkmale steht, die es erst seit der
     * Fassung 28 gibt. Ein älteres Tagebuch bekommt keine Zeilen, die es
     * nicht füllen konnte.
     */
    const merkmale = kopfMerkmale(imZeitraum, von, bis);
    if (merkmale.zeilen.length) {
      sag('  Merkmale (Zahl der Kopfschmerzen):');
      berReihen(merkmale.zeilen.map((x) => `${x.name} ${x.anzahl}`), 66).forEach((zl) => sag(`    ${zl}`));
      berAbsatz(merkmale.satz, '    ', '    ').forEach(sag);
    }
    const w = kz.wirkung;
    if (w.weg + w.besser + w.nicht) {
      sag(`  Mittel nach zwei Stunden   weg ${w.weg}×, besser ${w.besser}×, nicht geholfen ${w.nicht}×`);
    }
    if (km.mitAkut) {
      sag(`  Akutmittel am selben Tag   an ${km.mitAkut} von ${kz.tage} Tagen`
        + (km.mitNsar ? `, davon ${km.mitNsar} entzündungshemmend` : '')
        // Kombinationsmittel für sich, wie in der Karte – auch die mit
        // Paracetamol, die in keiner anderen Teilzahl stehen.
        + (km.mitKombi ? `, ${km.mitKombi} Kombinationsmittel` : '')
        + (km.mitTriptan ? `, ${km.mitTriptan} mit Triptan` : '')
        + (km.mitNichtNsar ? `, ${km.mitNichtNsar} ohne Entzündungshemmung` : ''));
    }
    if (kmAlle.unbekannt.length) {
      sag(`  Nicht zugeordnet           ${kmAlle.unbekannt.map((u) => `${u.name} (${u.tage})`).join(', ')}`);
    }
    /*
     * Der Kopfschmerzkalender: drei Monate nebeneinander, aus allen Einträgen
     * – nicht nur denen im Berichtszeitraum, denn ein Monat, von dem nur die
     * letzte Woche zählt, sähe wie ein guter Monat aus.
     */
    const monate = kopfMonate(eintraege, tage, gruppeVon, bis);
    if (monate.length) {
      sag('  Je Kalendermonat:          Kopfschmerz / Akutmittel / ausgefallen / Periode');
      monate.forEach((mo) => {
        const name = mo.name + (mo.angefangen ? ' (bis Berichtsende)' : '');
        const zahlen = `${String(mo.kopfTage).padStart(11)} / ${String(mo.akut).padStart(10)}`
          + `${mo.triptan ? ` (Triptan ${mo.triptan})` : ''} / ${String(mo.ausgefallen).padStart(11)} / ${String(mo.blutung).padStart(7)}`;
        const zeile = `    ${name.padEnd(24)} ${zahlen}`;
        // Zu breit für eine Zeile: der Monat für sich, die Zahlen darunter in
        // ihren Spalten – und wenn auch das nicht passt, ohne die Lücken.
        if (zeile.length <= BERICHT_BREITE) sag(zeile);
        else {
          let vorn = `    ${name.padEnd(24)} `;
          if (name.length > 24) {
            sag(`    ${name}`);
            vorn = ' '.repeat(29);
          }
          const unter = `${vorn}${zahlen}`;
          sag(unter.length <= BERICHT_BREITE ? unter : `${vorn}${zahlen.trim().replace(/ {2,}/g, ' ')}`);
        }
      });
    }
    const nach = km.nsarTage.length
      ? nsarNachwirkung(imZeitraum, tageImZeitraum, km.nsarTage, km.kopfTageOhneNsar, tagesWert) : null;
    const bauch = bauchAnKopfTagen(imZeitraum, tageImZeitraum, tagesWert);
    const umstaende = kopfUmstaende(imZeitraum, tageImZeitraum, faktorBilanz, zufallsSpielraum);
    [
      statusSatz(kzAlle, bis),
      uebergebrauchSatz(kmAlle),
      chronischSatz(kzAlle),
      nachwirkungSatz(nach, fmtZahl),
      umPeriodeSatz(kopfUmPeriode(imZeitraum, tageImZeitraum, bis)),
      ...umstaendeSaetze(umstaende),
      bauchAnKopfTagenSatz(bauch, fmtZahl),
      unauffaelligeVergleiche({ nach, bauch, umstaende }),
    ].filter(Boolean).forEach((satz) => {
      sag('');
      umbrochen(satz).forEach((zl) => sag(`  ${zl}`));
    });
    // Die Aufwach-Frage zählt über dieselben 30 Tage wie die Fenster oben.
    const fragen = kopfFragen({
      zahlen: kzAlle, mittel: kmAlle, befundIds, aufwach: aufwachZahlen(eintraege, tage, bis), spannungAn,
    });
    if (fragen.length) {
      sag('');
      sag('  Fragen für die Sprechstunde:');
      fragen.forEach((f) => umbrochen(f, 64).forEach((zl, j) => sag(`  ${j ? '  ' : '- '}${zl}`)));
    }
    const kp = kopfNachPhase(imZeitraum, tageImZeitraum);
    if (kp.length > 1) {
      sag('');
      sag('  Nach Zyklusphase (geschätzt aus den Blutungstagen):');
      kp.forEach((p) => sag(`    ${p.name.padEnd(24)} an ${p.mit} von ${p.tage} Tagen`));
    }
    sag('  Getrennt vom Bauch gezählt: Kein Kopfschmerz zählt in die Werte oben.');
    sag();
  }

  /*
   * Was nach den Aktivitäten kam – nur mit genug Fällen, und nur Zahlen.
   *
   * Eine Zeile je Aktivität für den Bauch, eine für den Kopf, und dazu die
   * Tagesfrage „Bewegung". Verglichen wird mit denselben Stunden an Tagen
   * ohne die Aktivität (siehe js/aktivitaet.js); was dafür zu selten ist,
   * steht hier gar nicht – ein „noch nicht" hat auf dem Zettel nichts zu tun.
   */
  // Mit dem eingegrenzten Tagesspeicher: Das Kopffenster reicht in den Tag
  // nach dem Berichtsende, und eine Tagesfrage dort machte ihn zu einem
  // notierten Tag, dessen Einträge hier fehlen.
  const aktiv = aktivitaetBilanz(imZeitraum, tageImZeitraum, {
    fenster: zustand.fenster, mindestFaelle: zustand.mindestFaelle,
  }).filter((x) => x.bauch.genug || x.kopf.genug);
  const bewegung = bewegungSatz(faktorBilanz(imZeitraum, tageImZeitraum, 'bewegung', tagesWert));
  if (aktiv.length || bewegung) {
    sag('NACH AKTIVITÄTEN');
    if (aktiv.length) {
      umbrochen(`(Beschwerden in den ${zustand.fenster || 4} Stunden danach, Kopfschmerz in den `
        + `${AKTIV_KOPF_STUNDEN} Stunden danach – gegen dieselben Stunden an Tagen ohne. `
        + 'Eine Häufigkeit, keine Ursache.)', 66).forEach((zl) => sag(`  ${zl}`));
    }
    const wort = (art) => ({ auffaellig: ' – auffällig', moeglich: ' – möglicherweise auffällig' }[art] || '');
    aktiv.slice(0, 8).forEach((x) => {
      sag(`  ${aktivitaetName(x.id, zustand.eigeneAktivitaeten)}`);
      if (x.bauch.genug) {
        sag(`    Bauch ${x.bauch.mitTreffer} von ${x.bauch.faelle} (${prozent(x.bauch.quoteMit)}), `
          + `sonst ${x.bauch.ohneTreffer} von ${x.bauch.gegenFaelle} (${prozent(x.bauch.quoteOhne)})`
          + `${wort(x.bauch.art)}`);
      }
      if (x.kopf.genug) {
        // Beim Kopf zählen Tage, nicht Male – siehe aktivitaetBilanz.
        sag(`    Kopf an ${x.kopf.mitTreffer} von ${x.kopf.faelle} Tagen (${prozent(x.kopf.quoteMit)}), `
          + `sonst ${x.kopf.ohneTreffer} von ${x.kopf.gegenFaelle} (${prozent(x.kopf.quoteOhne)})`
          + `${x.kopf.art === 'auffaellig' ? ' – öfter' : ''}`);
      }
    });
    if (bewegung) umbrochen(bewegung, 66).forEach((zl) => sag(`  ${zl}`));
    sag();
  }

  /*
   * Kiefer, Nacken, Schiene – nur mit dem Schalter, und nur, wenn im Zeitraum
   * etwas dazu steht. Gerechnet über den Zeitraum und seinen Tagesspeicher,
   * wie alles hier.
   */
  if (spannungAn && spannungDa) {
    berSpannung(spannungAuswertung({
      eintraege: imZeitraum, tage: tageImZeitraum, heute: bis, jetzt: berichtJetzt,
      fenster: zustand.fenster, mindestFaelle: zustand.mindestFaelle, standardMittel: zustand.standardMittel,
    })).forEach(sag);
    sag();
  }

  /*
   * Mit Dosis, und jede Dosis für sich: „Pantoprazol – 30 Mal" verschweigt,
   * ob das 20 oder 40 mg waren, und genau danach wird in der Sprechstunde
   * zuerst gefragt. Groß und klein geschrieben ist derselbe Name.
   */
  const mittel = new Map();
  imZeitraum.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = String(e.mittel || '').trim() || 'ohne Angabe';
    const dosis = String(e.dosis || '').trim();
    const k = `${name.toLowerCase()}|${dosis.toLowerCase()}`;
    const v = mittel.get(k) || { name, text: dosis ? `${name} ${dosis}` : name, n: 0 };
    v.n += 1;
    mittel.set(k, v);
  });
  /*
   * Und welche der eingetragenen Mittel zusammen eine Frage aufwerfen (alle
   * Stufen aus js/zusammen.js, ohne Schalter): ein Satz, was die
   * Fachinformation dazu sagt, und die Frage für die Sprechstunde.
   * Eingetragen heißt wie auf „Tag": unter „Meine Mittel" oder in den 30
   * Tagen bis zum Ende des Berichts eingenommen.
   */
  const paare = wechselHinweise(zustand.standardMittel, eintraege, bis);
  if (mittel.size || paare.length) {
    sag('EINGENOMMENE MITTEL');
    // Name und Dosis in voller Länge, umbrochen statt abgeschnitten: Die
    // Dosis ist das, wonach in der Sprechstunde zuerst gefragt wird.
    [...mittel.values()].sort((a, b) => b.n - a.n).forEach((v) => {
      berAbsatz(`${v.text} – ${mehrzahl(v.n, 'Mal', 'Mal')}`, '  ', '    ', 66).forEach(sag);
      // Bei Methylphenidat die Form: Für Magen und Säureblocker ist sie das
      // eigentliche Mittel.
      const g = wissenZu(v.name);
      if (g && g.id === 'mph') {
        sag(`    Form: ${berFormText(v.name, zustand.standardMittel, imZeitraum) || 'nicht angegeben'}`);
      }
    });
    paare.forEach((h) => {
      const [a, b] = h.namen.map((n) => berPaarName(n, zustand.standardMittel, eintraege));
      berAbsatz(`Zusammen eingetragen: ${a} und ${b}. ${berPaarKern(h)}`).forEach(sag);
      berAbsatz(`Frage: ${h.frage}`).forEach(sag);
    });
    sag();
  }

  /*
   * Ob die Mittel etwas bewirkt haben.
   *
   * Für die Sprechstunde ist das oft die nützlichste Zeile des Zettels –
   * besonders, wenn nichts passiert ist: Ein Säureblocker ohne Wirkung nach
   * vier bis acht Wochen ist selbst ein Befund und spricht gegen die Säure als
   * Ursache. Aus dem Kopf beantwortet das niemand belastbar.
   */
  const ansprechen = mittelBilanz(imZeitraum, tage, {
    heute: bis,
    gruppeVon: (name) => {
      const g = wissenZu(name);
      return g ? g.id : null;
    },
  }).filter((m) => m.genug);
  if (ansprechen.length) {
    sag('HAT ES ETWAS BEWIRKT?');
    ansprechen.slice(0, 4).forEach((m) => {
      sag(`  ${m.name} – ${mehrzahl(m.einnahmeTage, 'Einnahmetag', 'Einnahmetage')}, `
        + `seit ${fmtDatum(m.seit, true)}`);
      umbrochen(befund(m)).forEach((z) => sag(`     ${z}`));
    });
    sag();
  }

  /*
   * ADHS-MITTEL – nur mit dem Schalter. Ohne eine Einnahme im Zeitraum bleibt
   * vom Abschnitt der Essensrhythmus: Er ist auch ohne Mittel eine Frage, die
   * zu ADHS gehört.
   */
  if (adhsAn) {
    const a = adhsAuswertung({
      eintraege: imZeitraum, tage: tageImZeitraum, heute: bis, jetzt: berichtJetzt,
      mindestFaelle: zustand.mindestFaelle, standardMittel: zustand.standardMittel, gewicht: zustand.gewicht,
    });
    const rhythmus = essensRhythmus({
      eintraege: imZeitraum, tage: tageImZeitraum, von, bis, standardMittel: zustand.standardMittel,
      gewicht: zustand.gewicht,
    });
    if (a.einnahmen && a.abschnitt) {
      berAdhs(a, rhythmus, { spannungAn, gewichtDa }).forEach(sag);
      sag();
    } else {
      const ohne = tagWerte.filter((x) => PAUSE_WERTE.includes(x.adhsPause)).length;
      const zeilenR = berRhythmus(rhythmus, gewichtDa);
      if (zeilenR.length || ohne) {
        sag('ESSENSRHYTHMUS (eigene Einträge)');
        if (ohne) sag(`  Als Tage ohne ADHS-Mittel notiert: ${ohne}`);
        zeilenR.forEach(sag);
        sag();
      }
    }
  }

  const v = zustand.versuch;
  if (v) {
    const e = ergebnis(v, eintraege, tage, bis);
    sag('AUSLASSVERSUCH');
    sag(`  Weggelassen: ${v.art === 'klasse' ? v.ziel : ausloeserName(v.ziel, zustand.eigeneAusloeser)}, `
      + `ab ${fmtDatum(v.start, true)} für ${mehrzahl(v.tage, 'Tag', 'Tage')}`);
    sag(`  Ergebnis: ${e.wort}`);
    sag(`  Davor ${fmtZahl(e.vorher.schnitt)} (${e.vorher.notierte} Tage), `
      + `ohne ${fmtZahl(e.auslass.schnitt)} (${e.auslass.notierte} Tage)`
      + (e.nachher ? `, nach der Wiedereinführung ${fmtZahl(e.nachher.schnitt)} `
        + `(${e.nachher.notierte} Tage)` : ', Wiedereinführung steht noch aus'));
    umbrochen(e.satz).forEach((z) => sag(`  ${z}`));
    sag('  (Ein Versuch an einem einzigen Menschen, ohne Verblindung.)');
    sag();
  }

  /*
   * Der Stufenplan gehört in den Bericht, und zwar als Erstes von allem
   * Geprüften.
   *
   * Er ist das Aufwendigste, was dieses Tagebuch hervorbringt – Wochen –, und
   * die Ernährungsberatung, an die eine Praxis überweist, fängt sonst bei null
   * an: dieselbe Karenz, dieselben Wochen. Ein Plan mit Ergebnissen erspart
   * genau das. Und die Karenzweiche gehört mit hinein, gerade wenn sie negativ
   * ausfiel: „Vier Wochen ohne FODMAPs haben nichts geändert" schließt eine
   * ganze Richtung aus und ist damit eine der nützlichsten Zeilen des Zettels.
   */
  const plan = zustand.stufenplan;
  const plaene = [plan, ...(zustand.stufenplaene || [])].filter(Boolean);
  if (plaene.length) {
    sag('STUFENPLAN (FODMAP)');
    plaene.slice(0, 3).forEach((pl) => {
      const b = planBild(pl, eintraege, tage, bis);
      sag(`  Karenz ab ${fmtDatum(pl.start, true)}, ${mehrzahl(pl.karenzTage, 'Tag', 'Tage')}`
        + ` – ${b.karenz.wort}`);
      sag(`     ${fmtZahl(b.karenz.karenz.schnitt)} während der Karenz gegen `
        + `${fmtZahl(b.karenz.vorher.schnitt)} davor `
        + `(${b.karenz.karenz.notierte} gegen ${b.karenz.vorher.notierte} notierte Tage)`);
      b.stufen.forEach((x) => {
        sag(`     ${x.name}: ${x.wort}`
          + (x.urteil === 'menge' && x.gehtBis ? ` (bis ${x.gehtBis})` : '')
          + (Number.isFinite(x.unterschied) && x.urteil !== 'laeuft'
            ? ` – ${fmtZahl(x.schnitt)} gegen ${fmtZahl(x.basis)} in der Karenz` : ''));
      });
      if (b.offen.length) sag(`     noch nicht geprüft: ${b.offen.length} Gruppen`);
    });
    sag();
  }

  /*
   * Der Provokationstest gehört in den Bericht, und zwar mitsamt seinen
   * Leerdurchgängen.
   *
   * In der Sprechstunde ist „ich vertrage keine Milch" eine Meinung. „Dreimal
   * nüchtern 250 ml, dreimal Beschwerden, an zwei Leermorgen nichts" ist eine
   * Beobachtung mit Protokoll – und sie beantwortet die Frage, die dort als
   * Nächstes kommt: Lohnt ein Atemtest, oder ist die Sache schon geklärt?
   * Ohne die Leerdurchgänge wäre es wieder nur eine Meinung.
   */
  const prov = [zustand.provokation, ...(zustand.provokationen || [])].filter(Boolean);
  if (prov.length) {
    sag('PROVOKATIONSTESTS');
    prov.slice(0, 6).forEach((p) => {
      const b = provokationsBild(p, eintraege, bis);
      sag(`  ${p.was || p.ziel} nüchtern, Fenster ${p.fenster || 4} h – ${b.wort}`);
      // Der Grund nur, wo er für alle stimmt – mancher Durchgang lag bloß zu
      // dicht am vorigen, und dann wäre „dabei gegessen" falsch.
      const weg = b.laeufe.filter((l) => !l.sauber);
      const nurEssen = weg.every((l) => l.gegessen && !l.zuNah);
      sag(`     ${b.echte} Durchgänge, ${b.leere} Leerdurchgänge`
        + (b.verworfen ? `, ${b.verworfen} nicht auswertbar${nurEssen ? ' (dabei gegessen)' : ''}` : '')
        + (Number.isFinite(b.unterschied)
          ? `; ${fmtZahl(b.schnitt)} gegen ${fmtZahl(b.vergleich)} von 10` : ''));
      umbrochen(b.satz).forEach((z) => sag(`     ${z}`));
    });
    sag('  (Nicht verblindet. Ein Test ohne Befund wiegt hier schwerer als einer');
    sag('   mit: Die Erwartung schiebt nur in eine Richtung.)');
    sag();
  }

  /*
   * Was schon geprüft wurde – auch und gerade, was nichts ergab.
   *
   * Ohne diesen Abschnitt schickt jede Sprechstunde denselben Verdacht noch
   * einmal los. Ein Auslassversuch, der dagegen sprach, hat genauso Arbeit
   * gekostet wie einer, der dafür sprach, und ist für die nächste Überlegung
   * genauso viel wert.
   */
  const alte = (zustand.versuche || []).filter((x) => x.start <= bis);
  if (alte.length) {
    sag('SCHON GEPRÜFT');
    alte.slice(0, 8).forEach((x) => {
      const e = ergebnis(x, eintraege, tage, bis);
      const was = x.art === 'klasse' ? x.ziel : ausloeserName(x.ziel, zustand.eigeneAusloeser);
      sag(`  ${was} weggelassen ab ${fmtDatum(x.start, true)}, `
        + `${mehrzahl(x.tage, 'Tag', 'Tage')} – ${e.wort}`);
      sag(`     davor ${fmtZahl(e.vorher.schnitt)}, ohne ${fmtZahl(e.auslass.schnitt)}`
        + (e.nachher ? `, danach ${fmtZahl(e.nachher.schnitt)}` : ''));
    });
    sag();
  }

  const notizen = imZeitraum.filter((e) => e.art === 'notiz' && String(e.text || '').trim());
  if (notizen.length) {
    sag('NOTIZEN');
    notizen.slice(-12).forEach((e) => sag(`  ${fmtDatum(e.am)} ${e.um}  ${e.text.trim()}`));
    sag();
  }

  const phasen = phasenBilanz(imZeitraum, tage, tagesWert);
  /*
   * Mit „ADHS": Stimmung und Anspannung je Phase. Die Werte nur aus dem
   * Zeitraum, die Phasen wie oben aus allen Blutungstagen. Kein Urteil – nur
   * die Grenze, unter der ein Abstand zwischen höchster und niedrigster Phase
   * auch zufällig vorkommt (1,4 fürs Heraussuchen aus vier Phasen, mal der
   * Strenge der Familie, mal Standardfehler).
   */
  const zyklusFragen = [];
  if (adhsAn) {
    const tageFrage = Object.fromEntries(Object.entries(tage || {}).map(([iso, t]) => [iso,
      iso >= von && iso <= bis ? t : { blutung: t && t.blutung }]));
    [['stimmung', 'Stimmung (0 gut – 4 sehr schlecht)'], ['stress', 'Anspannung (0 ruhig – 4 sehr viel)']]
      .forEach(([id, name]) => {
        const f = phasenFrage(tageFrage, id);
        if (f.genug) zyklusFragen.push({ id, name, f, grenze: 1.4 * strenge(familienVergleiche(2)) * f.se });
      });
  }
  if (phasen.length > 1 || zyklusFragen.length) {
    sag('NACH ZYKLUSPHASE');
    phasen.forEach((p) => {
      sag(`  ${p.name.padEnd(24)} ${String(p.tage).padStart(3)} Tage, `
        + `im Mittel ${fmtZahl(p.schnitt)}`);
    });
    const pu = phasenUrteil(phasen, tage);
    if (phasen.length > 1 && pu.pruefbar) umbrochen(pu.satz).forEach((z) => sag(`  ${z}`));
    zyklusFragen.forEach(({ name, f }) => {
      sag(`  ${name} je Phase:`);
      berReihen(PHASEN.map((ph) => f.phasen.find((x) => x.phase === ph.id))
        .map((x) => `${x.name} ${fmtZahl(x.schnitt)} (${x.tage} Tage)`), 72).forEach((zl) => sag(`    ${zl}`));
    });
    if (zyklusFragen.length) {
      const grenzen = zyklusFragen.map((x) => `${fmtZahl(x.grenze)} Stufen (${x.name.split(' ')[0]})`);
      berAbsatz(`(Zahlen aus den Tagesfragen, keine Einordnung. Unterschiede unter ${grenzen.join(' und ')} `
        + 'zwischen der höchsten und der niedrigsten Phase kommen hier auch zufällig vor.)').forEach(sag);
    }
    sag('  (Phasen geschätzt aus den eingetragenen Blutungstagen.)');
    sag();
  }

  /*
   * Und die Frage, die aus beidem zusammen entsteht.
   *
   * Ein Auslöser, der nur in einer Phase wirkt, kommt im Schnitt über vier
   * Wochen als „ein bisschen auffällig" heraus – eine Aussage, die für keinen
   * einzigen Tag stimmt. Für die Sprechstunde ist der Unterschied wichtig:
   * wechselnde Empfindlichkeit ist etwas anderes als eine Unverträglichkeit,
   * und sie wird anders behandelt.
   */
  const wechsel = wechselnde(
    bewertet, alleAusloeser.filter((b) => b.genug).map((b) => b.id), tage,
  );
  if (wechsel.length) {
    sag('WIRKUNG WECHSELT MIT DER ZYKLUSPHASE');
    wechsel.slice(0, 4).forEach((w) => {
      sag(`  ${ausloeserName(w.id, zustand.eigeneAusloeser)}`);
      w.phasen.filter((p) => p.pruefbar).forEach((p) => {
        sag(`    ${p.name.padEnd(22)} ${fmtZahl(p.schnittMit)} gegen `
          + `${fmtZahl(p.schnittOhne)} (${p.faelle} damit, ${p.gegenFaelle} ohne)`);
      });
    });
    sag('  (Dieselbe Menge, andere Wirkung – das spricht eher für eine');
    sag('  wechselnde Empfindlichkeit als für eine Unverträglichkeit.)');
    sag();
  }

  /*
   * Die Kriterien.
   *
   * Sie stehen bewusst *nach* den Zahlen und vor den Fragen: Wer den Zettel
   * liest, soll erst sehen, worauf sie beruhen. Und sie stehen nur da, wenn sie
   * geprüft werden konnten – „nicht prüfbar" als „nicht erfüllt" auszugeben
   * wäre die häufigste Art, mit Kriterien zu lügen.
   */
  const k = kriterien({
    eintraege,
    tage,
    heute: bis,
    beschwerdenSeit: zustand.beschwerdenSeit,
    istSaeuremittel: (name) => {
      const g = wissenZu(name);
      return !!g && ['ppi', 'h2', 'antazida', 'alginat'].includes(g.id);
    },
  });
  const kZeilen = [];
  /*
   * Auch das Nichtprüfbare kommt mit.
   *
   * Ein Regelwerk stillschweigend wegzulassen, weil die Daten nicht reichen,
   * sieht auf dem Papier aus wie „trifft nicht zu" – und das ist etwas ganz
   * anderes. Steht dort stattdessen, *warum* es nicht ging, weiß die Praxis
   * sofort, welche Frage noch offen ist.
   */
  if (k.reizdarm.pruefbar) {
    kZeilen.push(`  Rom IV, Reizdarmsyndrom       ${k.reizdarm.erfuellt ? 'Kriterien erfüllt' : 'nicht erfüllt'}`);
    kZeilen.push(`    Bauchschmerz an ${k.reizdarm.schmerzTage} Tagen `
      + `(${fmtZahl(k.reizdarm.proWoche)} je Woche der notierten Tage),`);
    kZeilen.push(`    ${k.reizdarm.erfuellteMerkmale} von 3 Merkmalen erfüllt`);
    k.reizdarm.merkmale.filter((m) => m.erfuellt)
      .forEach((m) => umbrochen(`${m.name}: ${m.text}`, 62).forEach((z) => kZeilen.push(`      - ${z}`)));
    if (k.reizdarm.typ.typ) kZeilen.push(`    Stuhlform: ${k.reizdarm.typ.name}`);
  } else {
    kZeilen.push('  Rom IV, Reizdarmsyndrom       nicht prüfbar');
    kZeilen.push('    Dafür fehlen Tage ohne Bauchschmerz oder Stuhlgangseinträge,');
    kZeilen.push('    mit denen sich die Schmerztage vergleichen ließen.');
  }
  if (k.dyspepsie.pruefbar) {
    kZeilen.push(`  Rom IV, funktionelle Dyspepsie ${k.dyspepsie.erfuellt ? 'Kriterien erfüllt' : 'nicht erfüllt'}`);
    [k.dyspepsie.pds, k.dyspepsie.eps].forEach((f) => {
      kZeilen.push(`    ${f.erfuellt ? '[x]' : '[ ]'} ${f.name}:`);
      kZeilen.push(`        an ${f.tage} Tagen, ${fmtZahl(f.proWoche)} je Woche der notierten Tage`);
    });
  } else {
    kZeilen.push('  Rom IV, funktionelle Dyspepsie nicht prüfbar (zu wenige notierte Tage)');
  }
  if (k.gerdq.belastbar) {
    kZeilen.push(`  GerdQ (letzte 7 Tage)         ${k.gerdq.punkte} von 18 Punkten`);
    kZeilen.push('    (ab 8 gilt eine Refluxkrankheit als wahrscheinlich)');
  } else {
    kZeilen.push(`  GerdQ (letzte 7 Tage)         nicht belastbar – nur `
      + `${k.gerdq.erfasst} der 7 Tage notiert`);
  }
  if (kZeilen.length) {
    sag('KRITERIEN');
    kZeilen.forEach(sag);
    if (k.dauer.erfuellt === null) {
      sag('    Beginn der Beschwerden nicht angegeben – die Rom-Bedingung');
      sag('    „Beginn vor mindestens sechs Monaten" ist damit ungeprüft.');
    } else {
      sag(`    Beschwerden seit ${k.dauer.seit} (${mehrzahl(k.dauer.monate, 'Monat', 'Monaten')}); `
        + `Rom-Zeitbedingung ${k.dauer.erfuellt ? 'erfüllt' : 'nicht erfüllt'}.`);
    }
    // Formulierung mit Absicht ohne Doppelpunkt nach „Diagnose" – der
    // Berichtstest sucht nach genau diesem Muster, weil es sonst niemandem
    // auffiele, wenn hier eines Tages doch eine zugeschrieben würde.
    sag('  Erfüllte Kriterien sind KEINE Diagnose. Beide Regelwerke setzen');
    sag('  voraus, dass nichts Organisches dahintersteckt. Grundlage sind');
    sag(`  ${k.zeitraum.notierteTage} notierte Tage der letzten 90; ein Tagebuch untererfasst,`);
    sag('  die Zahlen sind daher eher zu niedrig als zu hoch.');
    sag();
  }

  if (bild.muster.length) {
    sag('WORAUF DAS MUSTER HINDEUTET');
    sag('  (Beschreibung des Verlaufs, keine Diagnose – siehe unten.)');
    bild.muster.slice(0, 2).forEach((m, i) => {
      sag(`  ${i + 1}. ${m.name}`);
      m.belege.forEach((x) => umbrochen(x, 62).forEach((z, j) => sag(`     ${j ? '  ' : '- '}${z}`)));
      umbrochen(`Abzuklären wäre: ${m.ursachen.map((u) => u.name).join(', ')}`, 64)
        .forEach((z) => sag(`     ${z}`));
    });
    sag();
  }

  if (bild.fragen.length) {
    sag('FRAGEN');
    bild.fragen.forEach((f) => umbrochen(f, 64).forEach((z, j) => sag(`  ${j ? '  ' : '- '}${z}`)));
    sag();
  }

  /*
   * Und jetzt die Zusammenfassung, die oben eingesetzt wird.
   *
   * Sie rechnet nichts Eigenes (siehe js/lage.js): Jeder Satz stammt aus einem
   * Abschnitt, der weiter unten mit seinen Fallzahlen steht. Wer einen Satz
   * hier nicht wiederfindet, hat einen Fehler gefunden.
   */
  const kurz = wasSacheIst({
    warnungen: bild.warnungen,
    trend: t,
    funde: bleibt.map(({ b, stand }) => ({
      name: ausloeserName(b.id, zustand.eigeneAusloeser),
      differenz: b.differenz,
      faelle: b.faelle,
      gegenFaelle: b.gegenFaelle,
      urteil: stand.urteil,
    })),
    spaet: spaet.map((x) => ({
      name: ausloeserName(x.id, zustand.eigeneAusloeser),
      fensterName: x.fensterName,
      ort: x.ort,
    })),
    wechsel: wechsel.map((w) => ({
      name: ausloeserName(w.id, zustand.eigeneAusloeser),
      phase: w.staerkste.name,
    })),
    zeit: zb,
    gewicht: waage,
    mittel: ansprechen,
    notierteTage: z.notierteTage,
    paare: paare.filter((h) => h.stufe === 'A'),
  });
  const kurzZeilen = ['IN KÜRZE'];
  kurz.saetze.forEach((x) => {
    umbrochen(x.text, 66).forEach((zl, i) => kurzZeilen.push(`  ${i ? '  ' : '- '}${zl}`));
  });
  kurzZeilen.push('  (Zusammengefasst aus den Abschnitten unten; dort stehen die Fallzahlen.)');
  kurzZeilen.push('');
  zeilen.splice(kopfMarke, 0, ...kurzZeilen);

  sag('---');
  sag('Selbst geführtes Tagebuch. Die Zahlen sind gezählt, nicht gedeutet;');
  sag('„auffällig" heißt hier nur: nach diesen Mahlzeiten stand im Mittel ein');
  sag('höherer Wert als nach den übrigen – und der Unterschied blieb auch dann');
  sag('bestehen, als nur Tage mit gleicher Anspannung, gleichem Schlaf und');
  sag('gleicher Zyklusphase miteinander verglichen wurden. Das ist kein');
  sag('Wirkungsnachweis: Es bleiben alle Umstände, die niemand einträgt.');
  sag('Der Abschnitt zum Muster ordnet den');
  sag('Verlauf in gebräuchliche Begriffe ein und stellt keine Diagnose – die');
  sag('genannten Möglichkeiten unterscheidet eine Untersuchung, nicht ein Tagebuch.');
  return zeilen.flatMap(berZeileKuerzen).join('\n');
}

/** Dateiname für den Bericht – ohne Umlaute, damit ihn jedes System annimmt. */
export function berichtName(von, bis) {
  return `magen-tagebuch-${von}-bis-${bis}.txt`;
}
