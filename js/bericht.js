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
import { fmtDatum, tageDazwischen } from './datum.js';
import { fmtZahl, mehrzahl } from './text.js';
import { ausloeserName, beschwerdeName, STAERKE_WORT } from './daten.js';
import {
  ausloeserBilanz, bewerteteMahlzeiten, einstufung, gesamtZahlen, klassenBilanz,
  klassenEinstufung, nachArt, nachTageszeit, tagesWert, trend, TREND_WORT,
} from './auswertung.js';
import { haeltStand, SCHICHT_WORT } from './schichten.js';
import {
  fensterWerte, spaeteFunde, zeitBild, zeitProfil,
} from './zeitprofil.js';
import { bildLesen } from './bild.js';
import { phasenBilanz } from './zyklus.js';
import { wissenZu } from './mittel.js';
import { kriterien } from './kriterien.js';
import { stuhlZahlen } from './stuhl.js';
import { befund, mittelBilanz } from './ansprechen.js';
import { ergebnis } from './versuch.js';

const prozent = (x) => `${Math.round(x * 100)} %`;

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
  String(satz).split(/\s+/).forEach((wort) => {
    if (zeile && (zeile.length + wort.length + 1) > breite) {
      zeilen.push(zeile);
      zeile = wort;
    } else {
      zeile = zeile ? `${zeile} ${wort}` : wort;
    }
  });
  if (zeile) zeilen.push(zeile);
  return zeilen;
}

/**
 * @param {object} zustand  der gesamte Speicherzustand
 * @param {string} von, bis ISO-Daten, einschließlich
 */
export function arztBericht(zustand, von, bis) {
  const { eintraege, tage } = zustand;
  const imZeitraum = eintraege.filter((e) => e.am >= von && e.am <= bis);
  const z = gesamtZahlen(imZeitraum, tage, von, bis);
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

  if (!z.notierteTage) {
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
      return !!g && g.id === 'nsar';
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

  sag('ÜBERSICHT');
  sag(`  Tage mit Eintragung        ${z.notierteTage} von ${z.tage}`);
  sag(`  Tage mit Beschwerden       ${z.tageMitBeschwerden} (${prozent(z.anteil)} der eingetragenen Tage)`);
  sag(`  Stärke im Mittel           ${fmtZahl(z.schnitt)} von 10`);
  sag(`  Höchster Wert              ${z.hoechster} von 10 (${STAERKE_WORT[z.hoechster] || ''})`);
  sag(`  Mahlzeiten eingetragen     ${z.mahlzeiten}`);
  sag(`  Medikamenteneinnahmen      ${z.medikamente}`);
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
    stand: haeltStand(bewertet, b.id, tage),
    zeit: zeitProfil(fenster, b.id),
  }));
  const bleibt = gehalten.filter((x) => x.stand.urteil !== 'verschwindet');
  const zerfallen = gehalten.filter((x) => x.stand.urteil === 'verschwindet');

  const zahlen = (b) => `${fmtZahl(b.schnittMit)} gegen ${fmtZahl(b.schnittOhne)} `
    + `(${b.faelle} Mahlzeiten damit, ${b.gegenFaelle} ohne)`;

  if (bleibt.length) {
    sag(`AUFFÄLLIG IM ZEITRAUM VON ${zustand.fenster} STUNDEN NACH DEM ESSEN`);
    sag('  (Vergleich: mittlere Beschwerdestärke danach gegen alle übrigen Mahlzeiten)');
    bleibt.slice(0, 8).forEach(({ b, stand, zeit }) => {
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
    umbrochen(`(${zb.hinweis})`, 66).forEach((z) => sag(`  ${z}`));
    sag();
  }

  const s = stuhlZahlen(imZeitraum, tage);
  if (s.gesamt) {
    sag('STUHLGANG (BRISTOL)');
    sag(`  Eingetragen                ${s.gesamt} Mal, ${fmtZahl(s.proTag)} je notiertem Tag`);
    sag(`  Typ 1-2 (hart)             ${s.hart} (${prozent(s.anteilHart)})`);
    sag(`  Typ 3-5 (unauffällig)      ${s.normal} (${prozent(s.anteilNormal)})`);
    sag(`  Typ 6-7 (weich)            ${s.weich} (${prozent(s.anteilWeich)})`);
    if (s.dringend) sag(`  davon dringend             ${s.dringend}`);
    sag();
  }

  const mittel = new Map();
  imZeitraum.filter((e) => e.art === 'medikament').forEach((e) => {
    const name = (e.mittel || 'ohne Angabe').trim();
    mittel.set(name, (mittel.get(name) || 0) + 1);
  });
  if (mittel.size) {
    sag('EINGENOMMENE MITTEL');
    [...mittel.entries()].sort((a, b) => b[1] - a[1]).forEach(([name, n]) => {
      sag(`  ${name.padEnd(24)} ${mehrzahl(n, 'Mal', 'Mal')}`);
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
  if (phasen.length > 1) {
    sag('NACH ZYKLUSPHASE');
    phasen.forEach((p) => {
      sag(`  ${p.name.padEnd(24)} ${String(p.tage).padStart(3)} Tage, `
        + `im Mittel ${fmtZahl(p.schnitt)}`);
    });
    sag('  (Phasen geschätzt aus den eingetragenen Blutungstagen.)');
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
  return zeilen.join('\n');
}

/** Dateiname für den Bericht – ohne Umlaute, damit ihn jedes System annimmt. */
export function berichtName(von, bis) {
  return `magen-tagebuch-${von}-bis-${bis}.txt`;
}
