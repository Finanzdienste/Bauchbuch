/*
 * Der Stufenplan: erst weglassen, dann Gruppe für Gruppe zurückholen
 *
 * WORAUF DAS GANZE HINAUSLÄUFT
 *
 * Das hier ist die größte Sache, die diese App verlangt, und die einzige, die
 * am Ende einen Speiseplan hinterlässt statt einer Auskunft. Der Ablauf ist der
 * der FODMAP-Diät, wie sie in der Ernährungsberatung gemacht wird:
 *
 *   1. KARENZ. Zwei bis vier Wochen konsequent ohne die vergärbaren
 *      Kohlenhydrate. Die Frage dieser Phase ist nicht „was davon", sondern
 *      „überhaupt".
 *   2. WIEDEREINFÜHRUNG. Eine Gruppe nach der anderen, jede über drei Tage mit
 *      steigender Menge, dazwischen jedes Mal zurück auf die Karenz.
 *   3. WAS BLEIBT. Der Alltag danach ist die Karenz plus alles, was sich als
 *      verträglich erwiesen hat – und das ist bei den meisten Menschen das
 *      meiste.
 *
 * DIE WICHTIGSTE ZEILE DIESER DATEI IST EIN ABBRUCH
 *
 * Wenn die Karenz nichts bringt, ist der Plan zu Ende. Nicht „dann probieren
 * wir die Wiedereinführung trotzdem", sondern: aufhören, wieder normal essen,
 * woanders suchen. Das ist die Stelle, an der Apps und Ratgeber reihenweise
 * versagen – sie führen durch zehn Wochen Verzicht, ohne je zu fragen, ob die
 * ersten drei etwas gebracht haben.
 *
 * Und es ist keine Formalie: Eine FODMAP-Karenz streicht Weizen, Zwiebeln,
 * Hülsenfrüchte, viele Obstsorten und Milchprodukte auf einmal. Wer sie ohne
 * Nutzen weiterführt, verliert Ballaststoffe, Kalzium und Vielfalt in der
 * Darmflora und hat dafür nichts bekommen. Eine Diät ohne Wirkung ist kein
 * neutraler Zustand, sie ist ein Schaden mit Aufwand.
 *
 * DIE ZWEITWICHTIGSTE: DIE KARENZ IST NICHT DAS ZIEL
 *
 * Sie ist der Aufbau, nicht das Ergebnis. Wer nach der Karenz aufhört, weil es
 * ihm besser geht, bleibt für immer auf der strengsten Stufe – und das ist der
 * häufigste Ausgang im wirklichen Leben, weil sich niemand traut, das
 * Erreichte wieder aufs Spiel zu setzen. Deshalb steht in dieser App an jeder
 * Stelle, dass die Wiedereinführung der Punkt ist und die Karenz nur der Weg
 * dorthin.
 *
 * VOR DEM ANFANG: ZÖLIAKIE
 *
 * Eine Karenz nimmt Weizen mit heraus. Der Bluttest auf Zöliakie funktioniert
 * aber nur, solange noch Gluten gegessen wird – wer vorher wegläßt, bekommt
 * ein falsch unauffälliges Ergebnis und einen Verdacht, der jahrelang
 * unentdeckt bleibt. Deshalb steht die Frage vor dem Start und nicht im
 * Kleingedruckten.
 *
 * Reine Rechnung. Was gestartet und abgehakt wird, steht in js/store.js.
 */
import { plusTage, tageDazwischen } from './datum.js';
import { tagesWert } from './auswertung.js';

/** Wie lange eine Gruppe geprüft wird: drei Tage mit steigender Menge. */
export const STUFE_TAGE = 3;

/**
 * Und so lange danach wieder Karenz, bevor die nächste Gruppe kommt.
 *
 * Ohne diese Pause misst die zweite Gruppe, was die erste angerichtet hat. Sie
 * ist der Grund, warum ein Stufenplan Wochen dauert und nicht Tage.
 */
export const PAUSE_TAGE = 3;

/**
 * Der erste Tag nach einer Stufe zählt noch zur Stufe.
 *
 * Was am dritten Tag in der größten Menge gegessen wurde, meldet sich oft erst
 * am nächsten Morgen – FODMAPs wirken im Dickdarm, und dorthin braucht Essen
 * seine Zeit. Diesen Tag zur Pause zu zählen hieße, die Reaktion der
 * Vergleichsgruppe zuzuschlagen: Sie fehlte dann nicht nur beim Befund, sie
 * machte den Vergleichswert obendrein schlechter.
 */
export const NACHKLANG = 1;

/**
 * Die ersten Tage der Karenz zählen nicht mit.
 *
 * Eine Ernährungsumstellung braucht ein paar Tage, bis sie steht – und die
 * ersten sind erfahrungsgemäß die unruhigsten, weil sich auch der Alltag
 * umstellen muss. Sie in den Vergleichswert zu nehmen machte die Karenz
 * schlechter, als sie ist.
 */
export const EINGEWOEHNUNG = 3;

/** Auf beiden Seiten so viele notierte Tage, sonst gibt es kein Urteil. */
export const MINDEST_NOTIERT = 5;

/** Eine ganze Stufe – dieselbe Schwelle wie überall in dieser App. */
export const PLAN_SCHWELLE = 1;

/** Kürzer als zwei Wochen zeigt nichts, länger als vier hält niemand durch. */
export const KARENZ_VORSCHLAEGE = [14, 21, 28];

/**
 * Die Gruppen, und womit sie geprüft werden.
 *
 * Die Mengen steigen über drei Tage, und das ist keine Bequemlichkeit: Die
 * meisten Unverträglichkeiten sind Mengenfragen. Wer nur die größte Menge
 * prüft, erfährt nie, dass die kleine durchgeht – und streicht dann eine ganze
 * Gruppe, obwohl ein Drittel davon problemlos gewesen wäre.
 *
 * Weizen und Zwiebel stehen getrennt, obwohl beides Fruktane sind. Sie
 * vertragen sich beim selben Menschen oft verschieden gut, und für den Alltag
 * ist der Unterschied riesig: Brot betrifft jede Mahlzeit, Zwiebel fast jedes
 * Gericht, das jemand anders gekocht hat.
 */
export const FODMAP_GRUPPEN = [
  {
    id: 'laktose',
    name: 'Laktose – Milchzucker',
    womit: 'Milch',
    mengen: ['100 ml', '200 ml', '300 ml'],
    steckt: 'Milch, Frischkäse, Joghurt, Sahne. Hartkäse und gereifter Käse '
      + 'enthalten kaum noch Laktose und sind fast immer verträglich.',
  },
  {
    id: 'fruktose',
    name: 'Fruktose – Fruchtzucker im Überschuss',
    womit: 'Honig',
    mengen: ['1 TL', '1 EL', '2 EL'],
    steckt: 'Honig, Mango, Apfel, Birne, Wassermelone, Agavendicksaft, '
      + 'Fruchtsäfte. Gemeint ist nur der Überschuss über den Traubenzucker – '
      + 'Beeren und Zitrusfrüchte sind unproblematisch.',
  },
  {
    id: 'fruktane-weizen',
    name: 'Fruktane aus Getreide',
    womit: 'Weizenbrot',
    mengen: ['½ Scheibe', '1 Scheibe', '2 Scheiben'],
    steckt: 'Weizen, Roggen, Gerste – also Brot, Nudeln, Couscous, die meisten '
      + 'Frühstücksflocken. Das ist die Gruppe, die den Alltag am stärksten '
      + 'betrifft, und deshalb die, deren Antwort am meisten wert ist.',
  },
  {
    id: 'fruktane-zwiebel',
    name: 'Fruktane aus Zwiebel und Knoblauch',
    womit: 'Zwiebel, gekocht',
    mengen: ['⅛ Zwiebel', '¼ Zwiebel', '½ Zwiebel'],
    steckt: 'Zwiebel, Knoblauch, Lauch, Schalotte – und damit fast alles, was '
      + 'jemand anders gekocht hat. Getrennt von den Getreide-Fruktanen '
      + 'geprüft, weil sich beides beim selben Menschen oft verschieden '
      + 'verhält.',
  },
  {
    id: 'galactane',
    name: 'Galactane – Hülsenfrüchte',
    womit: 'Kichererbsen aus der Dose, abgespült',
    mengen: ['2 EL', '4 EL', '6 EL'],
    steckt: 'Linsen, Kichererbsen, Bohnen, Erbsen, Sojabohnen. Abspülen '
      + 'schwemmt einen Teil heraus – deshalb wird mit der abgespülten '
      + 'Dosenware geprüft und nicht mit selbst gekochten.',
  },
  {
    id: 'sorbit',
    name: 'Sorbit – ein Zuckeralkohol',
    womit: 'Trockenpflaumen',
    mengen: ['1 Stück', '2 Stück', '4 Stück'],
    steckt: 'Steinobst, Avocado, Trockenobst und alles „Zuckerfreie": '
      + 'Kaugummi, Bonbons, Hustenlutscher.',
  },
  {
    id: 'mannit',
    name: 'Mannit – der andere Zuckeralkohol',
    womit: 'Champignons',
    mengen: ['1 Stück', '3 Stück', '5 Stück'],
    steckt: 'Champignons, Blumenkohl, Zuckerschoten, Sellerie. Wird oft '
      + 'zusammen mit Sorbit vertragen oder nicht, aber eben nicht immer – '
      + 'deshalb steht es für sich.',
  },
];

export const GRUPPE_VON = Object.fromEntries(FODMAP_GRUPPEN.map((g) => [g.id, g]));

const tagesSchnitt = (werte) => (werte.length
  ? werte.reduce((a, b) => a + b, 0) / werte.length : 0);

/** Die notierten Tageswerte eines Zeitraums, beide Ränder eingeschlossen. */
function zeitraum(eintraege, tage, von, bis) {
  const werte = [];
  const n = tageDazwischen(von, bis);
  if (n < 0) return { werte, notierte: 0, schnitt: 0, von, bis };
  for (let i = 0; i <= n; i++) {
    const t = tagesWert(eintraege, plusTage(von, i), tage);
    // Eine Lücke im Tagebuch ist kein beschwerdefreier Tag. Dieselbe Regel wie
    // überall – und hier zählt sie doppelt, weil ein Stufenplan über Wochen
    // läuft und niemand über Wochen lückenlos einträgt.
    if (t.notiert) werte.push(t.wert);
  }
  return { werte, notierte: werte.length, schnitt: tagesSchnitt(werte), von, bis };
}

/** Der Zeitraum einer Stufe: die drei Tage plus den Nachklang. */
function stufenFenster(st) {
  return { von: st.start, bis: plusTage(st.start, STUFE_TAGE - 1 + NACHKLANG) };
}

/**
 * Wo der Plan gerade steht.
 *
 *   'karenz'    die Auslasszeit läuft
 *   'entscheid' die Karenz ist um – jetzt fällt die Frage, ob es überhaupt hilft
 *   'stufe'     eine Gruppe wird gerade geprüft
 *   'pause'     Karenz zwischen zwei Gruppen
 *   'bereit'    die Pause ist um, die nächste Gruppe kann anfangen
 *   'fertig'    alle gewählten Gruppen durch
 *   'beendet'   von Hand abgebrochen
 */
export function planStand(plan, heute) {
  if (!plan) return null;
  if (plan.beendet) return { phase: 'beendet' };

  const stufen = plan.stufen || [];
  const laufend = stufen.find((st) => {
    const f = stufenFenster(st);
    return heute >= st.start && heute <= f.bis;
  });
  if (laufend) {
    return {
      phase: 'stufe',
      gruppe: laufend.gruppe,
      tag: Math.min(STUFE_TAGE, tageDazwischen(laufend.start, heute) + 1),
      nachklang: tageDazwischen(laufend.start, heute) >= STUFE_TAGE,
    };
  }

  const karenzBis = plusTage(plan.start, plan.karenzTage - 1);
  if (!stufen.length) {
    return tageDazwischen(plan.start, heute) >= plan.karenzTage
      ? { phase: 'entscheid', karenzBis }
      : {
        phase: 'karenz',
        tag: Math.max(1, tageDazwischen(plan.start, heute) + 1),
        von: plan.karenzTage,
        rest: Math.max(0, plan.karenzTage - (tageDazwischen(plan.start, heute) + 1)),
      };
  }

  const offen = (plan.gruppen || []).filter((g) => !stufen.some((st) => st.gruppe === g));
  if (!offen.length) return { phase: 'fertig' };

  const letzte = stufen[stufen.length - 1];
  const seit = tageDazwischen(stufenFenster(letzte).bis, heute);
  return seit >= PAUSE_TAGE
    ? { phase: 'bereit', naechste: offen[0], offen }
    : { phase: 'pause', naechste: offen[0], offen, rest: PAUSE_TAGE - seit };
}

export const KARENZ_URTEIL = {
  laeuft: 'läuft noch',
  zuwenig: 'zu wenige notierte Tage',
  hilft: 'die Karenz hilft',
  'hilft-nicht': 'die Karenz hilft nicht',
};

/**
 * Bringt die Karenz überhaupt etwas?
 *
 * Die Weiche, an der der ganze Plan hängt. Verglichen wird die Karenz – ohne
 * ihre Eingewöhnungstage – mit dem gleich langen Zeitraum davor, also mit dem
 * eigenen Alltag und nicht mit null.
 */
export function karenzBild(plan, eintraege, tage, heute) {
  if (!plan) return null;
  const bis0 = plusTage(plan.start, plan.karenzTage - 1);
  const bis = heute < bis0 ? heute : bis0;
  const von = plusTage(plan.start, EINGEWOEHNUNG);
  const karenz = zeitraum(eintraege, tage, von, bis);
  const vorher = zeitraum(eintraege, tage,
    plusTage(plan.start, -plan.karenzTage), plusTage(plan.start, -1));
  const besserung = vorher.schnitt - karenz.schnitt;

  const zahlen = `${karenz.schnitt.toFixed(1).replace('.', ',')} während der Karenz `
    + `gegen ${vorher.schnitt.toFixed(1).replace('.', ',')} davor `
    + `(${karenz.notierte} gegen ${vorher.notierte} notierte Tage).`;

  if (vorher.notierte < MINDEST_NOTIERT || karenz.notierte < MINDEST_NOTIERT) {
    return {
      urteil: 'zuwenig',
      wort: KARENZ_URTEIL.zuwenig,
      vorher,
      karenz,
      besserung,
      satz: `Für den Vergleich braucht es auf beiden Seiten mindestens `
        + `${MINDEST_NOTIERT} notierte Tage – bisher ${vorher.notierte} davor und `
        + `${karenz.notierte} währenddessen. Eine Lücke im Tagebuch ist kein `
        + `beschwerdefreier Tag, und gerade in einer Karenz wird weniger `
        + `eingetragen, weil weniger passiert.`,
    };
  }

  if (heute <= bis0) {
    return {
      urteil: 'laeuft',
      wort: KARENZ_URTEIL.laeuft,
      vorher,
      karenz,
      besserung,
      satz: besserung >= PLAN_SCHWELLE
        ? `Bisher ${besserung.toFixed(1).replace('.', ',')} Stufen besser: ${zahlen} `
          + `Das sieht gut aus – und es ist noch keine Antwort darauf, *was* davon. `
          + `Die kommt erst mit der Wiedereinführung.`
        : `Bisher kein deutlicher Unterschied: ${zahlen} Weiter bis zum Ende der `
          + `Karenz; darunter ist es zu früh für ein Urteil.`,
    };
  }

  if (besserung >= PLAN_SCHWELLE) {
    return {
      urteil: 'hilft',
      wort: KARENZ_URTEIL.hilft,
      vorher,
      karenz,
      besserung,
      satz: `${besserung.toFixed(1).replace('.', ',')} Stufen besser: ${zahlen} `
        + `Damit steht fest, dass es sich lohnt weiterzumachen – und jetzt kommt `
        + `der Teil, auf den alles hinausläuft. **Die Karenz ist nicht das Ziel.** `
        + `Sie ist der Aufbau: Erst die Wiedereinführung sagt, welche Gruppe `
        + `es war, und alles andere darf zurück auf den Teller.`,
    };
  }

  /*
   * Der Abbruch. Die wichtigste Ausgabe dieser Datei, und sie muss unmissver-
   * ständlich sein: nicht „vielleicht doch noch weiterprobieren", sondern
   * aufhören.
   */
  return {
    urteil: 'hilft-nicht',
    wort: KARENZ_URTEIL['hilft-nicht'],
    vorher,
    karenz,
    besserung,
    satz: `Kein deutlicher Unterschied: ${zahlen} Damit ist dieser Plan zu Ende, `
      + `und das ist die richtige Folgerung und kein Fehlschlag: Wenn `
      + `${plan.karenzTage} Tage ohne diese Kohlenhydrate nichts geändert haben, `
      + `wird die Wiedereinführung es auch nicht klären – dann liegt es nicht `
      + `daran. Iss wieder normal. Eine Diät, die nichts bringt, ist kein `
      + `neutraler Zustand: Sie kostet Ballaststoffe, Kalzium und Vielfalt, und `
      + `dafür bekommst du hier nichts. Was stattdessen dransteht, steht unter `
      + `„Was noch fehlt".`,
  };
}

export const STUFEN_URTEIL = {
  laeuft: 'läuft noch',
  zuwenig: 'zu wenig eingetragen',
  vertraegt: 'verträgst du',
  menge: 'kommt auf die Menge an',
  reagiert: 'reagiert – kleine Menge ungeprüft',
  'vertraegt-nicht': 'verträgst du nicht',
};

/**
 * Was bei den Karenz-Tagen herauskommt, gegen die eine Stufe gehalten wird.
 *
 * Nicht nur die ursprüngliche Karenz, sondern auch die Pausen zwischen den
 * Stufen: Der Plan läuft über Wochen, und wie es jemandem „ohne" geht, ändert
 * sich in dieser Zeit. Der Nachklangtag nach jeder Stufe bleibt draußen – er
 * gehört zur Stufe.
 */
function grundlinie(plan, eintraege, tage, heute) {
  const werte = [];
  const bis0 = plusTage(plan.start, plan.karenzTage - 1);
  const k = zeitraum(eintraege, tage, plusTage(plan.start, EINGEWOEHNUNG),
    heute < bis0 ? heute : bis0);
  werte.push(...k.werte);

  (plan.stufen || []).forEach((st) => {
    const nach = plusTage(stufenFenster(st).bis, 1);
    const p = zeitraum(eintraege, tage, nach,
      heute < plusTage(nach, PAUSE_TAGE - 1) ? heute : plusTage(nach, PAUSE_TAGE - 1));
    werte.push(...p.werte);
  });

  return { werte, notierte: werte.length, schnitt: tagesSchnitt(werte) };
}

/**
 * Eine einzelne Stufe: verträgst du die Gruppe – und in welcher Menge?
 *
 * Die Mengenfrage fällt hier fast umsonst ab, weil die Stufe ohnehin über drei
 * Tage steigert. Sie zu verschweigen wäre die teuerste Auslassung des ganzen
 * Plans: „Weizen verträgst du nicht" streicht Brot, Nudeln und Couscous;
 * „ab zwei Scheiben wird es zu viel" streicht gar nichts.
 */
export function stufenBild(plan, st, eintraege, tage, heute) {
  const g = GRUPPE_VON[st.gruppe] || { name: st.gruppe, mengen: [] };
  const basis = grundlinie(plan, eintraege, tage, heute);
  const f = stufenFenster(st);

  const tageswerte = [];
  for (let i = 0; i < STUFE_TAGE; i++) {
    const iso = plusTage(st.start, i);
    const t = tagesWert(eintraege, iso, tage);
    tageswerte.push(t.notiert ? t.wert : null);
  }
  // Der Nachklangtag zählt zum letzten, größten Tag – dort wurde am meisten
  // gegessen, und dorthin gehört, was sich am Morgen danach meldet.
  const nach = tagesWert(eintraege, plusTage(st.start, STUFE_TAGE), tage);
  if (nach.notiert && tageswerte[STUFE_TAGE - 1] !== null) {
    tageswerte[STUFE_TAGE - 1] = Math.max(tageswerte[STUFE_TAGE - 1], nach.wert);
  }

  const gemessen = tageswerte.filter((x) => x !== null);
  const schnitt = tagesSchnitt(gemessen);
  const unterschied = schnitt - basis.schnitt;

  const gemeinsam = {
    gruppe: st.gruppe,
    name: g.name,
    start: st.start,
    bis: f.bis,
    tageswerte,
    mengen: g.mengen,
    basis: basis.schnitt,
    basisTage: basis.notierte,
    schnitt,
    unterschied,
  };

  if (heute <= f.bis) {
    return { ...gemeinsam, urteil: 'laeuft', wort: STUFEN_URTEIL.laeuft, satz: '' };
  }
  if (gemessen.length < 2 || basis.notierte < MINDEST_NOTIERT) {
    return {
      ...gemeinsam,
      urteil: 'zuwenig',
      wort: STUFEN_URTEIL.zuwenig,
      satz: `An ${gemessen.length} der ${STUFE_TAGE} Tage steht etwas im Tagebuch, `
        + `und als Vergleich ${basis.notierte} Karenztage. Das reicht nicht – `
        + `diese Gruppe müsste noch einmal geprüft werden. Ärgerlich, aber `
        + `ehrlicher, als aus zwei Tagen einen Speiseplan zu machen.`,
    };
  }

  const zahlen = `${schnitt.toFixed(1).replace('.', ',')} an den Testtagen gegen `
    + `${basis.schnitt.toFixed(1).replace('.', ',')} in der Karenz `
    + `(${basis.notierte} Tage).`;

  if (unterschied < PLAN_SCHWELLE) {
    return {
      ...gemeinsam,
      urteil: 'vertraegt',
      wort: STUFEN_URTEIL.vertraegt,
      satz: `Kein deutlicher Unterschied: ${zahlen} Diese Gruppe darf zurück auf `
        + `den Teller – bis ${g.mengen[STUFE_TAGE - 1] || 'zur geprüften Menge'} `
        + `${g.womit ? `${g.womit} ` : ''}war nichts zu merken. Jede Gruppe, die `
        + `zurückkommt, ist der eigentliche Ertrag des ganzen Plans.`,
    };
  }

  /*
   * Reagiert hat es. Jetzt die Frage, die den Unterschied zwischen einer
   * Streichliste und einer Faustregel macht: ab welcher Menge?
   */
  const erste = tageswerte[0];
  const ruhigAmAnfang = erste !== null && erste - basis.schnitt < PLAN_SCHWELLE;
  const abTag = tageswerte.findIndex((w) => w !== null && w - basis.schnitt >= PLAN_SCHWELLE);

  if (ruhigAmAnfang && abTag > 0) {
    return {
      ...gemeinsam,
      urteil: 'menge',
      wort: STUFEN_URTEIL.menge,
      abTag: abTag + 1,
      gehtBis: g.mengen[abTag - 1],
      satz: `${zahlen} Aber nicht von Anfang an: ${g.mengen[abTag - 1]} `
        + `${g.womit || ''} ging noch, ab ${g.mengen[abTag]} kam es. Das ist die `
        + `nützlichste Antwort, die dieser Plan geben kann – **streichen wäre `
        + `hier zu viel.** Behalte die kleinere Menge und lass die größere weg.`,
    };
  }

  /*
   * Der erste Tag fehlt im Tagebuch – und damit ausgerechnet der, der über die
   * kleine Menge entscheidet.
   *
   * Hier „schon die kleinste Menge schlägt durch" zu schreiben, wäre eine
   * Aussage über etwas, das nie beobachtet wurde, und sie hätte Folgen: Sie
   * streicht eine ganze Gruppe. Derselbe Fehler steckte einmal in
   * js/dosis.js – dort hieß es „auch in kleiner Menge", obwohl nur die große
   * je vorkam. Was nicht erhoben wurde, heißt nicht unauffällig, und es heißt
   * genauso wenig auffällig.
   */
  if (erste === null) {
    return {
      ...gemeinsam,
      urteil: 'reagiert',
      wort: STUFEN_URTEIL.reagiert,
      satz: `${zahlen} Diese Gruppe hat reagiert – aber am ersten Tag, dem mit der `
        + `kleinsten Menge (${g.mengen[0] || 'die erste Stufe'}), steht nichts im `
        + `Tagebuch. Ob die kleine Menge durchgeht, ist damit offen, und das ist `
        + `genau die Frage, an der hängt, ob du die Gruppe streichen musst oder `
        + `nur begrenzen. Diese Stufe lohnt eine Wiederholung.`,
    };
  }

  return {
    ...gemeinsam,
    urteil: 'vertraegt-nicht',
    wort: STUFEN_URTEIL['vertraegt-nicht'],
    satz: `${zahlen} Schon die kleinste geprüfte Menge `
      + `(${g.mengen[0] || 'die erste Stufe'}${g.womit ? ` ${g.womit}` : ''}) hat `
      + `durchgeschlagen. Diese Gruppe bleibt vorerst draußen – und lohnt in `
      + `einem halben Jahr einen zweiten Versuch: Verträglichkeiten ändern sich, `
      + `besonders wenn sich der Darm zwischendurch beruhigt hat.`,
  };
}

/**
 * Der ganze Plan auf einen Blick – und vor allem: was heute zu tun ist.
 *
 * Ein Plan über zehn Wochen, der nicht jeden Tag sagt, was heute dran ist, ist
 * keiner. Genau daran scheitert die FODMAP-Diät im Alltag am häufigsten: nicht
 * am Verzicht, sondern daran, dass nach der dritten Woche niemand mehr weiß,
 * welche Gruppe als Nächstes kommt und wann.
 */
export function planBild(plan, eintraege, tage, heute) {
  if (!plan) return null;
  const stand = planStand(plan, heute);
  const karenz = karenzBild(plan, eintraege, tage, heute);
  const stufen = (plan.stufen || []).map((st) => stufenBild(plan, st, eintraege, tage, heute));
  const offen = (plan.gruppen || []).filter((g) => !(plan.stufen || []).some((st) => st.gruppe === g));

  let schritt = null;
  if (stand.phase === 'karenz') {
    schritt = {
      satz: `Tag ${stand.tag} von ${plan.karenzTage} der Karenz. Noch `
        + `${stand.rest} Tage – einfach weiter eintragen, mehr ist heute nicht zu tun.`,
    };
  } else if (stand.phase === 'entscheid') {
    schritt = {
      entscheid: true,
      satz: karenz.urteil === 'hilft'
        ? 'Die Karenz ist um und sie hat geholfen. Jetzt die Wiedereinführung – '
          + 'wähle die Gruppe, deren Antwort dir am meisten bringt.'
        : (karenz.urteil === 'hilft-nicht'
          ? 'Die Karenz ist um und hat nichts gebracht. Hier ist Schluss: wieder '
            + 'normal essen.'
          : 'Die Karenz ist um, aber es fehlen notierte Tage für ein Urteil.'),
    };
  } else if (stand.phase === 'stufe') {
    const g = GRUPPE_VON[stand.gruppe] || {};
    schritt = stand.nachklang
      ? {
        satz: `Heute nichts davon mehr – der Tag nach der Stufe gehört noch dazu. `
          + `Was sich vom gestrigen Tag noch meldet, gehört zu ${g.name || stand.gruppe}.`,
      }
      : {
        satz: `${g.name || stand.gruppe}, Tag ${stand.tag} von ${STUFE_TAGE}: `
          + `${(g.mengen || [])[stand.tag - 1] || 'die vorgesehene Menge'} `
          + `${g.womit || ''}. Sonst weiter wie in der Karenz – nur diese eine Sache dazu.`,
      };
  } else if (stand.phase === 'pause') {
    schritt = {
      satz: `Pause: noch ${stand.rest} Tage zurück auf die Karenz, damit die `
        + `nächste Gruppe nicht misst, was die letzte hinterlassen hat.`,
    };
  } else if (stand.phase === 'bereit') {
    const g = GRUPPE_VON[stand.naechste] || {};
    schritt = {
      bereit: true,
      gruppe: stand.naechste,
      satz: `Bereit für die nächste Gruppe: ${g.name || stand.naechste}, `
        + `drei Tage mit ${(g.mengen || []).join(', ')} ${g.womit || ''}.`,
    };
  } else if (stand.phase === 'fertig') {
    const gut = stufen.filter((x) => x.urteil === 'vertraegt').length;
    const teils = stufen.filter((x) => x.urteil === 'menge').length;
    schritt = {
      satz: `Alle gewählten Gruppen durch. ${gut} davon verträgst du, `
        + `${teils} in kleiner Menge. Dein Alltag ist ab jetzt die Karenz plus `
        + `alles, was zurückdurfte – und nicht die Karenz.`,
    };
  }

  return {
    stand, karenz, stufen, offen, schritt,
  };
}
