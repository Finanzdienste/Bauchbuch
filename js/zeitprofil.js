/*
 * Wann kommt es? – das Zeitprofil nach dem Essen
 *
 * WARUM DAS FESTE FENSTER ZU WENIG IST
 *
 * Bisher galt: Beschwerden in den vier Stunden nach einer Mahlzeit zählen zu
 * ihr. Das ist eine brauchbare Faustregel und wirft eine der nützlichsten
 * Auskünfte weg, die in einem Tagebuch steckt – nämlich *wann genau*.
 *
 * Der Bauch braucht Zeit, und zwar je nach Ort verschieden lange:
 *
 *   0–2 Stunden   Der Magen ist noch voll. Was hier weh tut, hat mit Säure,
 *                 Dehnung und Magenentleerung zu tun – Reflux, Gastritis,
 *                 funktionelle Dyspepsie.
 *   2–4 Stunden   Der Speisebrei ist im Dünndarm. Fett und Galle brauchen
 *                 ungefähr so lange.
 *   4–8 Stunden   Jetzt erst erreicht der Rest den Dickdarm. Was Bakterien
 *                 vergären – FODMAP, Laktose, Ballaststoffe – meldet sich
 *                 nicht früher. Es *kann* nicht früher sein.
 *
 * Für die Sprechstunde ist das ein Unterschied ums Ganze: „Nach dem Essen
 * tut es weh" führt zum Säureblocker, „sechs Stunden nach dem Essen tut es
 * weh" führt zur Ernährungsberatung. Beides steht im selben Tagebuch.
 *
 * DIE FALLE, DIE DIESE DATEI VERMEIDET
 *
 * Wer dreimal am Tag isst, dessen Beschwerde vier Stunden nach dem Frühstück
 * ist gleichzeitig eine Stunde nach dem Mittagessen. Zählte man sie beiden
 * Mahlzeiten zu, stünde am Ende jede Beschwerde in jedem Fenster, und das
 * Profil wäre Rauschen mit drei Balken.
 *
 * Deshalb: Jede Beschwerde gehört **der letzten Mahlzeit davor** und keiner
 * anderen. Das hat einen Preis, und er wird hier ausgesprochen statt versteckt:
 * Das späte Fenster einer Mahlzeit lässt sich nur beobachten, wenn in diesen
 * Stunden nichts dazwischengegessen wurde. Für die meisten Mahlzeiten ist es
 * deshalb gar nicht beobachtbar – und eine nicht beobachtbare Stunde ist keine
 * beschwerdefreie Stunde. Sie zählt hier als das, was sie ist: nicht erhoben.
 *
 * Am Abendessen liegt das Fenster meist frei, am Frühstück selten. Wer also
 * wissen will, was der Dickdarm macht, muss länger Tagebuch führen als jemand,
 * der nach dem Magen fragt. Auch das sagt die App lieber, als es durch eine
 * Zahl zu ersetzen, die so aussieht, als wäre sie erhoben worden.
 */
import { zeitpunkt, stundenDazwischen } from './datum.js';
import { merkmale, reihenfolgeUnklar } from './auswertung.js';
import { zaehltFuerBauch } from './wasser.js';

/**
 * Die drei Fenster.
 *
 * Die Grenzen sind gerundet und stimmen für niemanden genau; die
 * Magenentleerung schwankt zwischen Menschen und Mahlzeiten erheblich. Sie
 * sind trotzdem nicht beliebig: Vergärung im Dickdarm *vor* vier Stunden gibt
 * es nicht, und darauf beruht die ganze Auskunft.
 */
export const FENSTER = [
  {
    id: 'frueh',
    name: '0–2 Stunden danach',
    kurz: 'früh',
    von: 0,
    bis: 2,
    ort: 'Magen und Speiseröhre',
    deutung: 'So früh kommt Beschwerde aus dem Magen oder der Speiseröhre – '
      + 'Säure, Dehnung, verzögerte Entleerung. Für den Dickdarm ist es zu früh.',
  },
  {
    id: 'mittel',
    name: '2–4 Stunden danach',
    kurz: 'mittel',
    von: 2,
    bis: 4,
    ort: 'Dünndarm und Galle',
    deutung: 'In dieser Zeit arbeitet der Dünndarm an Fett und Galle. Das '
      + 'passt eher zu fettem Essen als zu vergärbaren Kohlenhydraten.',
  },
  {
    id: 'spaet',
    name: '4–8 Stunden danach',
    kurz: 'spät',
    von: 4,
    bis: 8,
    ort: 'Dickdarm',
    deutung: 'So spät ist der Rest im Dickdarm angekommen. Was dort vergärt – '
      + 'FODMAP, Laktose, Ballaststoffe – kann sich gar nicht früher melden.',
  },
];

/** Mindestens so viele beobachtbare Mahlzeiten je Seite und Fenster. */
const MINDEST_JE_FENSTER = 6;

/** Ab wie vielen zugeordneten Beschwerden das allgemeine Profil etwas sagt. */
const MINDEST_BESCHWERDEN = 12;

/*
 * Ein Schwerpunkt muss deutlich sein.
 *
 * Drei Fenster heißen drei Vergleiche, und wer aus drei Zahlen die größte
 * heraussucht, findet immer eine. Sie muss deshalb nicht nur die größte sein,
 * sondern die nächste um einen halben Punkt schlagen.
 */
const SCHWELLE = 1;
const ABSTAND = 0.5;

const mittelwert = (liste) => (liste.length
  ? liste.reduce((s, x) => s + x, 0) / liste.length : 0);

/**
 * Jede Beschwerde der letzten Mahlzeit davor zuordnen.
 *
 * @returns {Map} Mahlzeit-Kennung -> [{ stunden, staerke }]
 */
function zuordnen(eintraege) {
  const essen = eintraege.filter((e) => e.art === 'essen')
    .map((e) => ({ e, t: zeitpunkt(e.am, e.um) }))
    .sort((a, b) => a.t - b.t);
  const zu = new Map();
  essen.forEach((x) => zu.set(x.e.id, []));

  eintraege.filter((e) => e.art === 'beschwerde').forEach((b) => {
    const t = zeitpunkt(b.am, b.um);
    let letzte = null;
    // Rückwärts: die erste Mahlzeit, die vor der Beschwerde liegt, ist die
    // gesuchte. Gleichzeitigkeit zählt nicht – wer beim Essen schon Schmerzen
    // hat, hat sie nicht vom Essen.
    for (let i = essen.length - 1; i >= 0; i--) {
      if (essen[i].t < t) { letzte = essen[i]; break; }
    }
    if (!letzte) return;
    const stunden = stundenDazwischen(letzte.t, t);
    if (stunden > 8) return;
    // `ungefaehr`: Die Stunden sind dann aus einem Knopf gerechnet, nicht
    // erhoben – auf der Seite der Beschwerde oder auf der der Mahlzeit. Und
    // wenn bei einer Mahlzeit dieses Tages offen ist, ob sie vor oder nach
    // der Beschwerde kam (ein Abendessen nur mit „abends", eine genaue
    // Beschwerde um sieben), ist auch „die letzte Mahlzeit davor" nur geraten
    // – und mit ihr die Stunden. Es ist dieselbe Prüfung wie in
    // stundenSeitEssen (js/auswertung.js); ohne sie stünde hier „vier bis acht
    // Stunden nach dem Mittag, Dickdarm", wo die Nüchternrechnung zu Recht
    // „unbekannt" sagt.
    zu.get(letzte.e.id).push({
      stunden,
      staerke: Number(b.staerke) || 0,
      ungefaehr: !!b.ungefaehr || !!letzte.e.ungefaehr || essen.some((x) => reihenfolgeUnklar(x.e, b)),
    });
  });
  return zu;
}

/**
 * Für jede Mahlzeit: was in welchem Fenster kam – und welches Fenster
 * überhaupt beobachtbar war.
 *
 * Beobachtbar heißt zweierlei: Es wurde in dieser Zeit nichts dazwischen
 * gegessen (sonst gehörte die Beschwerde der anderen Mahlzeit), und das
 * Tagebuch lief noch (sonst wäre „nichts eingetragen" als „nichts gewesen"
 * gezählt – der Fehler, den diese App nirgends macht).
 */
export function fensterWerte(eintraege) {
  const essen = eintraege.filter((e) => e.art === 'essen')
    .map((e) => ({ e, t: zeitpunkt(e.am, e.um) }))
    .sort((a, b) => a.t - b.t);
  const zu = zuordnen(eintraege);
  // „Das Tagebuch lief noch" – aber nur für den Bauch: Ein abendlicher
  // Kopfeintrag macht ein Spätfenster nicht beobachtbar, eine abends
  // eingetragene Aktivität ebenso wenig.
  const letzterEintrag = eintraege.filter(zaehltFuerBauch).reduce(
    (m, e) => Math.max(m, zeitpunkt(e.am, e.um)), 0,
  );
  const beschwerden = eintraege.filter((e) => e.art === 'beschwerde');

  return essen.map((x, i) => {
    const naechste = essen[i + 1] ? stundenDazwischen(x.t, essen[i + 1].t) : Infinity;
    const tagebuchBis = stundenDazwischen(x.t, letzterEintrag);
    const liste = zu.get(x.e.id) || [];
    /*
     * Eine ungefähre Zeit – „abends", „nach dem Essen" – sagt, zu welcher
     * Mahlzeit etwas gehört, aber nicht, wie lange danach es kam. Hängt an
     * dieser Mahlzeit eine solche Angabe, oder ist sie selbst nur ungefähr
     * eingetragen, ist keines ihrer Fenster beobachtet: Sonst landete jede
     * „nach dem Essen"-Beschwerde künstlich nach einer halben Stunde, und das
     * Profil zeigte einen Magen, wo es nur einen Knopf zeigt.
     *
     * Und eine Beschwerde, bei der offen ist, ob sie vor oder nach dieser
     * Mahlzeit kam, hängt vielleicht an ihr, vielleicht an der davor. Ohne
     * diese Zeile stünde die Mahlzeit als beschwerdefrei da, weil die
     * Beschwerde zufällig eine Minute früher eingetragen ist.
     *
     * Dass damit nur Mahlzeiten mit einer solchen Beschwerde herausfallen,
     * ist hier – anders als in der Auslöserbilanz (siehe wertNach) – der
     * kleinere Fehler. Das Zeitprofil fragt nach der Stunde, und eine
     * Beschwerde ohne Stunde in alle Fenster zu legen, erfände genau die
     * Stunden, um die es geht. Weglassen kann hier nur verbergen, nicht
     * erfinden: Das Profil meldet nur einen Schwerpunkt, nie ein
     * „unauffällig".
     */
    const unklar = !!x.e.ungefaehr || liste.some((b) => b.ungefaehr)
      || beschwerden.some((b) => reihenfolgeUnklar(x.e, b));
    const werte = {};
    FENSTER.forEach((f) => {
      const beobachtbar = !unklar && naechste >= f.bis && tagebuchBis >= f.bis;
      const drin = liste.filter((b) => b.stunden > f.von && b.stunden <= f.bis);
      werte[f.id] = {
        beobachtbar,
        wert: drin.reduce((m, b) => Math.max(m, b.staerke), 0),
      };
    });
    return { m: x.e, am: x.e.am, merkmale: new Set(merkmale(x.e)), werte };
  });
}

/**
 * Wann kommen die Beschwerden überhaupt? – ohne Blick auf einzelne Auslöser.
 *
 * Diese Zahl beantwortet die erste Frage der Sprechstunde („kommt das nach dem
 * Essen?") genauer als ein Ja und ist völlig unabhängig davon, ob jemand seine
 * Zutaten sauber einträgt.
 */
export function zeitBild(eintraege) {
  const zu = zuordnen(eintraege);
  const alle = [];
  // Nur, was auf die Stunde erhoben ist. Eine „nach dem Essen" getippte
  // Beschwerde liegt immer eine halbe Stunde hinter der Mahlzeit – mit ihr
  // zeigte das Bild „die meisten kommen in den ersten zwei Stunden", und das
  // hätte der Knopf gesagt, nicht der Bauch.
  let geschaetzt = 0;
  zu.forEach((liste) => liste.forEach((b) => {
    if (b.ungefaehr) geschaetzt += 1;
    else alle.push(b);
  }));
  const gesamt = eintraege.filter((e) => e.art === 'beschwerde').length;
  // Sonst stünde bei jemandem, der alles mit den Zeitknöpfen nachträgt,
  // „0 Beschwerden zuordenbar" – und das sähe aus wie ein Fehler der App.
  const ohneStunde = geschaetzt
    ? ` ${geschaetzt} weitere sind mit ungefährer Zeit eingetragen. Sie sagen, `
      + 'zu welcher Mahlzeit etwas gehört, aber nicht, nach wie vielen Stunden – '
      + 'deshalb zählen sie hier nicht.'
    : '';

  const teile = FENSTER.map((f) => {
    const drin = alle.filter((b) => b.stunden > f.von && b.stunden <= f.bis);
    return {
      id: f.id,
      name: f.name,
      ort: f.ort,
      anzahl: drin.length,
      anteil: alle.length ? drin.length / alle.length : 0,
      schnitt: mittelwert(drin.map((b) => b.staerke)),
    };
  });

  if (alle.length < MINDEST_BESCHWERDEN) {
    return {
      pruefbar: false,
      teile,
      zugeordnet: alle.length,
      gesamt,
      satz: `Bisher lassen sich ${alle.length} Beschwerden einer Mahlzeit `
        + 'davor zuordnen. Für ein Zeitprofil sind das zu wenige – das heißt '
        + `nicht, dass es keines gibt.${ohneStunde}`,
    };
  }

  const sortiert = [...teile].sort((a, b) => b.anteil - a.anteil);
  const spitze = sortiert[0];
  const zweite = sortiert[1];
  // Auch hier: die größte von dreien ist noch kein Schwerpunkt. Sie muss die
  // Hälfte der Zuordnungen tragen und die nächste deutlich schlagen.
  const deutlich = spitze.anteil >= 0.45 && (spitze.anteil - zweite.anteil) >= 0.15;
  const fenster = FENSTER.find((f) => f.id === spitze.id);

  return {
    pruefbar: true,
    teile,
    zugeordnet: alle.length,
    gesamt,
    schwerpunkt: deutlich ? spitze.id : null,
    satz: deutlich
      ? `Die meisten Beschwerden kommen ${spitze.name.toLowerCase()} `
        + `(${Math.round(spitze.anteil * 100)} % der zugeordneten). ${fenster.deutung}`
      : 'Die Beschwerden verteilen sich über die Stunden nach dem Essen, ohne '
        + 'erkennbaren Schwerpunkt. Das spricht eher gegen einen einzelnen Ort '
        + 'als Ursache.',
    hinweis: 'Zugeordnet wird immer der letzten Mahlzeit davor. Späte Stunden '
      + 'sind deshalb seltener beobachtbar als frühe – wer alle drei Stunden '
      + `isst, kann über den Dickdarm wenig erfahren.${ohneStunde}`,
  };
}

/**
 * Und jetzt je Auslöser: wann meldet sich *dieses* Essen?
 *
 * Der Vergleich ist derselbe wie in der Auslöserbilanz – Mahlzeiten mit dem
 * Merkmal gegen die übrigen –, nur getrennt nach Fenster. Ein Auslöser, der
 * sich erst nach sechs Stunden zeigt, ist ein anderer Befund als einer, der
 * nach einer halben Stunde brennt, auch wenn der Vier-Stunden-Schnitt für
 * beide dasselbe sagt.
 */
export function zeitProfil(bewertet, id) {
  const teile = FENSTER.map((f) => {
    const mit = bewertet.filter((b) => b.merkmale.has(id) && b.werte[f.id].beobachtbar);
    const ohne = bewertet.filter((b) => !b.merkmale.has(id) && b.werte[f.id].beobachtbar);
    const pruefbar = mit.length >= MINDEST_JE_FENSTER && ohne.length >= MINDEST_JE_FENSTER;
    const schnittMit = mittelwert(mit.map((b) => b.werte[f.id].wert));
    const schnittOhne = mittelwert(ohne.map((b) => b.werte[f.id].wert));
    return {
      id: f.id,
      name: f.name,
      kurz: f.kurz,
      ort: f.ort,
      pruefbar,
      faelle: mit.length,
      gegenFaelle: ohne.length,
      schnittMit,
      schnittOhne,
      differenz: pruefbar ? schnittMit - schnittOhne : 0,
      fehlt: Math.max(0, MINDEST_JE_FENSTER - Math.min(mit.length, ohne.length)),
    };
  });

  const pruefbare = teile.filter((t) => t.pruefbar);
  if (!pruefbare.length) {
    return {
      teile,
      pruefbare: 0,
      schwerpunkt: null,
      satz: 'Wann genau es sich meldet, lässt sich noch nicht sagen: In keinem '
        + 'Zeitfenster sind genug beobachtbare Mahlzeiten beisammen. Beobachtbar '
        + 'ist ein Fenster nur, wenn darin nichts dazwischengegessen wurde.',
    };
  }

  const sortiert = [...pruefbare].sort((a, b) => b.differenz - a.differenz);
  const spitze = sortiert[0];
  const zweite = sortiert[1];
  const deutlich = spitze.differenz >= SCHWELLE
    && (!zweite || (spitze.differenz - zweite.differenz) >= ABSTAND);

  if (!deutlich) {
    return {
      teile,
      pruefbare: pruefbare.length,
      schwerpunkt: null,
      satz: pruefbare.length === 1
        ? `Bisher ist nur das Fenster „${pruefbare[0].name}" besetzt genug; für `
          + 'einen Vergleich der Zeitpunkte fehlt der Rest.'
        : 'Ein deutlicher Zeitpunkt ist nicht zu erkennen – der Unterschied '
          + 'verteilt sich über die Stunden danach.',
    };
  }

  const f = FENSTER.find((x) => x.id === spitze.id);
  return {
    teile,
    pruefbare: pruefbare.length,
    schwerpunkt: spitze.id,
    satz: `Auffällig wird es vor allem ${spitze.name.toLowerCase()}. ${f.deutung}`,
  };
}

/**
 * Was das feste Fenster gar nicht sehen kann.
 *
 * Und das ist der eigentliche Gewinn dieser Datei. Die Auslöserbilanz zählt
 * Beschwerden in den vier Stunden nach dem Essen; ein Auslöser, der sich erst
 * nach sechs Stunden meldet, taucht dort nicht als „unauffällig" auf, sondern
 * überhaupt nicht. Er ist kein schwacher Befund, er ist ein ungestellter.
 *
 * Genau danach wird hier gesucht – und **nur** danach: Zurückgegeben wird ein
 * Auslöser nur, wenn sein Schwerpunkt jenseits des eingestellten Fensters
 * liegt. Das ist keine Feinheit, sondern der Schutz vor der Fischerei: Drei
 * Fenster mal zwanzig Auslöser sind sechzig Vergleiche, und wer in sechzig
 * Vergleichen sucht, findet immer etwas. Ein früher Schwerpunkt wäre der Bilanz
 * ohnehin aufgefallen – ihn hier ein zweites Mal zu melden hieße, dieselbe Zahl
 * zweimal zu zählen und die Trefferchance zu verdoppeln.
 *
 * @param {object[]} fenster  aus fensterWerte()
 * @param {string[]} ids      Auslöser, die die Bilanz *nicht* auffällig fand
 * @param {number} bisher     das eingestellte Fenster in Stunden
 */
export function spaeteFunde(fenster, ids, bisher = 4) {
  const raus = [];
  ids.forEach((id) => {
    const p = zeitProfil(fenster, id);
    if (!p.schwerpunkt) return;
    const f = FENSTER.find((x) => x.id === p.schwerpunkt);
    // Erst ab der Stunde, an der die alte Rechnung aufhört zu schauen.
    if (f.von < bisher) return;
    const teil = p.teile.find((x) => x.id === p.schwerpunkt);
    raus.push({ id, profil: p, teil, fensterName: f.name, ort: f.ort });
  });
  return raus.sort((a, b) => b.teil.differenz - a.teil.differenz);
}

/** Für die Anzeige: das Fenster in einem Wort. */
export const FENSTER_WORT = Object.fromEntries(
  FENSTER.map((f) => [f.id, f.name]),
);
