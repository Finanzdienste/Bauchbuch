/*
 * Was noch fehlt – und was nur eine Untersuchung beantworten kann.
 *
 * Bis hierher sagt die App, was sie sieht. Diese Datei sagt, was sie *nicht*
 * sieht, und das ist bei einem Tagebuch die nützlichere Hälfte. Zwei Sorten
 * Lücken, sauber getrennt, weil sie verschiedene Schlüsse verlangen:
 *
 *   1. **Lücken im Tagebuch.** Fragen, die offen sind, weil etwas nicht
 *      eingetragen wurde. Die kann sie selbst schließen, und hier steht, womit
 *      und wie viel es noch braucht. Das ist der Unterschied zwischen einer App,
 *      die mitschreibt, und einer, die weiterfragt.
 *
 *   2. **Lücken, die keine App schließt.** Helicobacter, Gewebe, Blutwerte,
 *      Atemtest. Dort steht nicht „unbekannt", sondern welche Untersuchung die
 *      Frage beantwortet – die eine Zeile, für die sich der ganze Aufwand
 *      lohnt, weil man sie beim Termin vorlesen kann.
 *
 * Kein Ranking von Diagnosen nach Wahrscheinlichkeit. Was hier je Verdacht
 * steht, ist: was dafür spricht, was dagegen, und was es entscheidet. Die
 * Entscheidung selbst fällt woanders.
 */

/** Wie weit ein Verdacht aus dem Tagebuch heraus gestützt ist. */
export const STAND_WORT = {
  gestuetzt: 'passt zum Verlauf',
  moeglich: 'kommt in Frage',
  unwahrscheinlich: 'spricht eher dagegen',
  offen: 'nicht beurteilbar',
};

/* ---------------------------------------------------------------------------
 * 1. Was sie selbst schließen kann
 * ---------------------------------------------------------------------------
 *
 * Sortiert nach Gewicht: Was die meisten Fragen auf einmal aufmacht, steht
 * oben. Eine Liste mit fünfzehn Punkten liest niemand – die Anzeige nimmt die
 * ersten paar.
 */
export function tagebuchLuecken(d) {
  const raus = [];
  const k = d.kriterien;
  const s = d.stuhl;
  const nimm = (id, gewicht, titel, text) => raus.push({ id, gewicht, titel, text });

  if (s.gesamt === 0) {
    nimm('stuhl', 10, 'Stuhlgang eintragen',
      'Die größte Lücke. Ohne Häufigkeit und Form lässt sich ein Reizdarm '
      + 'im Tagebuch überhaupt nicht prüfen, und der Typ – Verstopfung, '
      + 'Durchfall, gemischt – entscheidet in der Praxis über die Behandlung. '
      + 'Zwei Tipper am Tag, mit Bildchen statt Text.');
  } else if (s.gesamt < 15) {
    nimm('stuhl', 8, 'Weiter Stuhlgang eintragen',
      `${s.gesamt} von 15 Eintragungen. Ab fünfzehn lässt sich der Typ `
      + 'bestimmen; darunter kippt der Anteil mit jedem einzelnen Eintrag.');
  }

  if (!k.dauer.seit) {
    nimm('seit', 9, 'Seit wann hast du das?',
      'Die eine Angabe, die aus dem Tagebuch grundsätzlich nicht hervorgeht – '
      + 'es beginnt an dem Tag, an dem du anfängst zu schreiben. Die '
      + 'Rom-Kriterien verlangen einen Beginn vor mindestens einem halben '
      + 'Jahr. Steht unter „Mehr", dauert fünf Sekunden.');
  }

  const bez = d.bezug;
  if (bez && !bez.genug) {
    nimm('stuhlbezug', 7, 'Die Frage nach dem Stuhlgang beantworten',
      `Unten im Beschwerdebogen: „Danach besser, schlechter, unverändert?" `
      + `Bisher ${bez.beantwortet} von 4 Malen beantwortet. Das ist eines der `
      + 'drei Merkmale, an denen ein Reizdarmsyndrom festgemacht wird, und das '
      + 'einzige, das sich nicht aus Zahlen ableiten lässt.');
  }

  if (!d.benutzt.oberbauch || !d.benutzt.saettigung) {
    nimm('arten', 6, 'Zwei neue Beschwerdezeilen benutzen',
      'Im Beschwerdebogen stehen jetzt „Schmerz im Oberbauch" und „Früh satt". '
      + 'Sie klingen wie „Brennen" und „kein Appetit" und sind etwas anderes: '
      + 'An ihnen hängt, ob sich das Bild eher als Schmerz- oder als '
      + 'Völlegefühl-Typ einordnen lässt – zwei Formen, die verschieden '
      + 'behandelt werden.');
  }

  if (k.zeitraum.notierteTage < 30) {
    nimm('tage', 8, 'Regelmäßiger eintragen',
      `In den letzten drei Monaten sind ${k.zeitraum.notierteTage} Tage notiert. `
      + 'Ab dreißig lassen sich die Rom-Kriterien rechnen. Wichtig ist nicht die '
      + 'Menge je Tag, sondern dass kein Tag fehlt – eine Lücke ist kein guter '
      + 'Tag, und Lücken häufen sich genau in den schlechten Wochen.');
  } else if (k.zeitraum.tagebuchTage < 90) {
    nimm('tage', 4, 'Weiterschreiben',
      `Das Tagebuch läuft seit ${k.zeitraum.tagebuchTage} Tagen. Die `
      + 'Rom-Kriterien schauen auf drei Monate – bis dahin ist jede Aussage '
      + 'dazu vorläufig.');
  }

  if (!k.gerdq.belastbar) {
    nimm('gerdq', 5, 'Die letzte Woche vollständig eintragen',
      `Der GerdQ schaut auf sieben Tage; erfasst sind davon ${k.gerdq.erfasst}. `
      + 'Was nicht eingetragen ist, zählt als „nicht gehabt" – die Punktzahl ist '
      + 'dann zu niedrig statt falsch, aber eben auch nicht zu gebrauchen.');
  }

  if (!d.nachtwachAn) {
    nimm('nachtwach', 4, 'Die Frage „Nachts davon wach" anschalten',
      'Sie steht unter „Mehr" bei den Tagesfragen. Im GerdQ ist sie eine eigene '
      + 'Frage, und in der Sprechstunde eine der ersten – Beschwerden, die aus '
      + 'dem Schlaf reißen, sind etwas anderes als solche am Tag.');
  }

  if (d.versuchMoeglich && !d.versuchLaeuft) {
    nimm('versuch', 7, 'Einen Auslassversuch machen',
      'In deiner Bilanz steht etwas Auffälliges. Zählen allein macht daraus nie '
      + 'einen Beleg – wer an schlechten Tagen anders isst, findet sein Essen '
      + 'auffällig, ohne dass es damit zu tun hat. Zwei Wochen weglassen, dann '
      + 'bewusst wieder essen: Das ist der einzige Weg von „fällt zusammen" zu '
      + '„liegt daran". Steht unter „Muster".');
  }

  const ohneZutaten = d.mahlzeitenOhneZutaten;
  if (ohneZutaten >= 5) {
    nimm('zutaten', 3, 'Bei Mahlzeiten ankreuzen, was drin war',
      `${ohneZutaten} Mahlzeiten stehen ohne angekreuzte Zutat da. Sie zählen `
      + 'für den Verlauf, aber für keine einzige Auslöserfrage.');
  }

  return raus.sort((a, b) => b.gewicht - a.gewicht);
}

/* ---------------------------------------------------------------------------
 * 2. Was keine App schließt
 * ---------------------------------------------------------------------------
 *
 * Je Verdacht: was im Tagebuch dafür spricht, was dagegen, was offen bleibt –
 * und die Untersuchung, die es entscheidet. Die letzte Zeile ist die, für die
 * es diese Liste gibt.
 */
const VERDAECHTE = [
  {
    id: 'hpylori',
    name: 'Helicobacter pylori',
    was: 'Ein Bakterium in der Magenschleimhaut. Häufigste Ursache von Gastritis '
      + 'und Magengeschwür – und die einzige Möglichkeit auf dieser Liste, die '
      + 'sich in zwei Wochen behandeln und danach abhaken lässt.',
    untersuchung: 'Atemtest, Stuhltest oder Gewebeprobe bei der Spiegelung. '
      + 'Wichtig: Säureblocker zwei Wochen vorher absetzen (nach Absprache), '
      + 'sonst wird der Test falsch negativ.',
    frage: 'Wäre ein Test auf Helicobacter pylori sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      const m = d.musterIds;
      if (m.includes('nuechtern')) dafuer.push('Der Nüchternschmerz ist das klassische Muster dafür.');
      if (m.includes('saeure')) dafuer.push('Das säuretypische Bild passt dazu.');
      return {
        stand: 'offen',
        dafuer,
        dagegen: [],
        offen: 'Aus einem Tagebuch grundsätzlich nicht zu sehen. Ein Bakterium '
          + 'macht kein eigenes Muster – es macht die Entzündung, die dann alles '
          + 'andere macht.',
      };
    },
  },
  {
    id: 'ulkus',
    name: 'Magen- oder Zwölffingerdarmgeschwür',
    was: 'Ein Defekt in der Schleimhaut. Tut typischerweise nüchtern weh und wird '
      + 'nach dem Essen kurz besser.',
    untersuchung: 'Magenspiegelung. Sie ist auch die einzige, die eine Blutung '
      + 'gleich mitbehandeln kann.',
    frage: 'Der Schmerz kommt nüchtern und bessert sich nach dem Essen – ist eine '
      + 'Magenspiegelung angezeigt?',
    pruefe: (d) => {
      const dafuer = [];
      const dagegen = [];
      if (d.musterIds.includes('nuechtern')) {
        dafuer.push(`${d.essen.nuechtern} von ${d.essen.bewertbar} zuordenbaren `
          + 'Beschwerden kamen erst vier Stunden oder länger nach dem Essen.');
      }
      if (d.nsarTage >= 3) dafuer.push(`An ${d.nsarTage} Tagen ein entzündungshemmendes Schmerzmittel.`);
      if (d.essen.bewertbar >= 8 && d.essen.anteilNachDemEssen >= 0.6) {
        dagegen.push('Die Beschwerden kommen überwiegend kurz *nach* dem Essen, '
          + 'nicht nüchtern.');
      }
      return {
        stand: dafuer.length ? 'moeglich' : 'offen',
        dafuer,
        dagegen,
        offen: 'Ein Geschwür sieht man, man errechnet es nicht. Warnzeichen wie '
          + 'schwarzer Stuhl oder Blutarmut würden es dringend machen.',
      };
    },
  },
  {
    id: 'reflux',
    name: 'Refluxkrankheit',
    was: 'Mageninhalt kommt in die Speiseröhre zurück. Brennen hinter dem '
      + 'Brustbein, oft im Liegen und nach spätem Essen.',
    untersuchung: 'Meist zuerst ein befristeter Versuch mit einem Säureblocker; '
      + 'bleibt es dabei oder kommt es wieder, Spiegelung und gegebenenfalls eine '
      + 'Messung des Säurerückflusses über 24 Stunden.',
    frage: 'Spricht etwas für oder gegen einen befristeten Versuch mit einem '
      + 'Säureblocker – und was, wenn er nichts ändert?',
    pruefe: (d) => {
      const dafuer = [];
      const dagegen = [];
      const g = d.kriterien.gerdq;
      if (g.belastbar && g.wahrscheinlich) {
        dafuer.push(`GerdQ ${g.punkte} von 18 Punkten – ab 8 gilt Reflux als wahrscheinlich.`);
      }
      if (g.belastbar && !g.wahrscheinlich) {
        dagegen.push(`GerdQ ${g.punkte} von 18 Punkten, unter der Schwelle von 8.`);
      }
      if (d.musterIds.includes('saeure')) dafuer.push('Das Muster ist säuretypisch.');
      const ppi = (d.mittel || []).find((m) => m.saeureVersuchAusgereizt);
      if (ppi) {
        dagegen.push(`${ppi.name} läuft seit ${Math.round(ppi.wochen)} Wochen, ohne dass `
          + 'sich die Beschwerdestärke geändert hätte. Wäre Säure die Ursache, wäre '
          + 'nach vier bis acht Wochen etwas zu sehen.');
      }
      let stand = 'offen';
      if (dafuer.length && !dagegen.length) stand = 'gestuetzt';
      else if (dafuer.length) stand = 'moeglich';
      else if (dagegen.length) stand = 'unwahrscheinlich';
      return {
        stand,
        dafuer,
        dagegen,
        offen: 'Ob die Speiseröhre Schaden genommen hat, zeigt nur die Spiegelung. '
          + 'Der GerdQ sagt etwas über das Muster, nichts über den Zustand.',
      };
    },
  },
  {
    id: 'dyspepsie',
    name: 'Funktionelle Dyspepsie',
    was: 'Beschwerden ohne fassbaren Befund. Kein Restposten und keine '
      + 'Einbildung – eine eigene Störung mit eigener Behandlung, und die '
      + 'häufigste Erklärung überhaupt.',
    untersuchung: 'Die Diagnose steht, wenn die Kriterien erfüllt sind *und* eine '
      + 'Spiegelung nichts zeigt. Ohne die Spiegelung bleibt sie eine Vermutung.',
    frage: 'Passt das Bild zu einer funktionellen Dyspepsie – und wenn ja, welche '
      + 'Form, PDS oder EPS?',
    pruefe: (d) => {
      const dafuer = [];
      const dy = d.kriterien.dyspepsie;
      if (dy.pruefbar && dy.pds.erfuellt) {
        dafuer.push(`Die PDS-Kriterien sind erfüllt: an ${dy.pds.tage} Tagen `
          + `Völlegefühl oder frühes Sattsein, ${dy.pds.proWoche.toFixed(1).replace('.', ',')} `
          + 'je Woche der notierten Tage (verlangt sind 3).');
      }
      if (dy.pruefbar && dy.eps.erfuellt) {
        dafuer.push(`Die EPS-Kriterien sind erfüllt: an ${dy.eps.tage} Tagen `
          + `Schmerz oder Brennen im Oberbauch, ${dy.eps.proWoche.toFixed(1).replace('.', ',')} `
          + 'je Woche der notierten Tage (verlangt ist 1).');
      }
      return {
        stand: dafuer.length ? 'gestuetzt' : (dy.pruefbar ? 'unwahrscheinlich' : 'offen'),
        dafuer,
        dagegen: [],
        offen: dy.pruefbar ? 'Die Kriterien setzen voraus, dass nichts Organisches '
          + 'dahintersteckt. Das entscheidet die Spiegelung, nicht dieses Tagebuch.'
          : 'Für die Kriterien fehlen noch notierte Tage.',
      };
    },
  },
  {
    id: 'reizdarm',
    name: 'Reizdarmsyndrom',
    was: 'Bauchschmerz, der mit dem Stuhlgang zusammenhängt. Wie die funktionelle '
      + 'Dyspepsie eine eigene Diagnose mit eigener Behandlung – und oft beides '
      + 'zusammen.',
    untersuchung: 'Vor der Diagnose gehören Zöliakie (Bluttest) und eine '
      + 'Entzündung im Darm (Calprotectin im Stuhl) ausgeschlossen. Beides ist '
      + 'einfach und wird oft vergessen.',
    frage: 'Die Rom-Kriterien für ein Reizdarmsyndrom sind erfüllt – sind Zöliakie '
      + 'und Calprotectin schon geprüft worden?',
    pruefe: (d) => {
      const r = d.kriterien.reizdarm;
      const dafuer = [];
      const dagegen = [];
      if (r.pruefbar && r.schmerzErfuellt) {
        dafuer.push(`Bauchschmerz an ${r.schmerzTage} Tagen, `
          + `${r.proWoche.toFixed(1).replace('.', ',')} je Woche der notierten Tage `
          + '(verlangt ist 1).');
      }
      r.merkmale.filter((m) => m.erfuellt).forEach((m) => dafuer.push(`${m.name}: ${m.text}`));
      if (r.pruefbar && !r.schmerzErfuellt) {
        dagegen.push(`Bauchschmerz nur an ${r.schmerzTage} Tagen – das ist seltener `
          + 'als einmal pro Woche.');
      }
      if (r.typ.typ) dafuer.push(`Stuhlform: ${r.typ.name}.`);
      let stand = 'offen';
      if (r.erfuellt) stand = 'gestuetzt';
      else if (r.pruefbar && dafuer.length) stand = 'moeglich';
      else if (r.pruefbar) stand = 'unwahrscheinlich';
      return {
        stand,
        dafuer,
        dagegen,
        offen: r.typ.typ ? 'Ein Reizdarm ist eine Diagnose nach Ausschluss – das '
          + 'Tagebuch liefert dafür das Material, den Ausschluss macht das Labor.'
          : `Für den Typ fehlen noch ${r.typ.fehlt} eingetragene Stuhlgänge.`,
      };
    },
  },
  {
    id: 'unvertraeglich',
    name: 'Laktose- oder Fruktoseunverträglichkeit',
    was: 'Ein Zucker wird im Dünndarm nicht aufgenommen und im Dickdarm vergoren. '
      + 'Gas, Krämpfe, Durchfall – meist Stunden nach dem Essen.',
    untersuchung: 'H2-Atemtest, dauert einen Vormittag. Je Zucker ein Termin.',
    frage: 'Wäre ein Atemtest auf Laktose oder Fruktose sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      (d.klassen || []).filter((k) => k.genug && k.differenz >= 0.5
        && ['laktose', 'fodmap'].includes(k.id))
        .forEach((k) => dafuer.push(`${k.name}: danach im Mittel `
          + `${k.schnittMit.toFixed(1).replace('.', ',')} statt `
          + `${k.schnittOhne.toFixed(1).replace('.', ',')} `
          + `(${k.faelle} Mahlzeiten damit, ${k.gegenFaelle} ohne).`));
      return {
        stand: dafuer.length ? 'moeglich' : 'offen',
        dafuer,
        dagegen: [],
        offen: 'Ein Auslassversuch (unter „Muster") bringt hier fast so viel wie '
          + 'der Test und geht sofort – der Test sagt dafür, *welcher* Zucker es ist.',
      };
    },
  },
  {
    id: 'zoeliakie',
    name: 'Zöliakie',
    was: 'Eine Abwehrreaktion auf Gluten, die die Dünndarmschleimhaut zerstört. '
      + 'Kann sich als Reizdarm tarnen und bleibt oft jahrelang unentdeckt.',
    untersuchung: 'Bluttest auf Antikörper (Transglutaminase-IgA plus '
      + 'Gesamt-IgA). **Nur aussagekräftig, solange noch Gluten gegessen wird** – '
      + 'wer vorher weglässt, bekommt ein falsch unauffälliges Ergebnis.',
    frage: 'Ist Zöliakie schon einmal ausgeschlossen worden?',
    pruefe: (d) => {
      const dafuer = [];
      const g = (d.klassen || []).find((k) => k.id === 'gluten');
      if (g && g.genug && g.differenz >= 0.5) {
        dafuer.push(`Weizen und Gluten: danach im Mittel `
          + `${g.schnittMit.toFixed(1).replace('.', ',')} statt `
          + `${g.schnittOhne.toFixed(1).replace('.', ',')} (${g.faelle} Mahlzeiten damit).`);
      }
      return {
        stand: 'offen',
        dafuer,
        dagegen: [],
        offen: 'Aus dem Tagebuch nicht zu unterscheiden von einer '
          + 'Fruktan-Unverträglichkeit – im selben Korn steckt beides. Nur der '
          + 'Bluttest trennt sie. Deshalb: erst testen, dann weglassen.',
      };
    },
  },
  {
    id: 'galle',
    name: 'Gallensteine',
    was: 'Krampfartiger Schmerz im rechten Oberbauch, klassisch nach fettem Essen '
      + 'und oft abends oder nachts. Häufig, und im Tagebuch leicht mit einer '
      + 'Gastritis zu verwechseln.',
    untersuchung: 'Ultraschall des Oberbauchs. Zehn Minuten, keine Vorbereitung '
      + 'außer nüchtern sein.',
    frage: 'Der Schmerz kommt nach fettem Essen – wäre ein Ultraschall der '
      + 'Gallenblase sinnvoll?',
    pruefe: (d) => {
      const dafuer = [];
      const f = (d.klassen || []).find((k) => k.id === 'fett');
      if (f && f.genug && f.differenz >= 0.5) {
        dafuer.push(`Fett: danach im Mittel ${f.schnittMit.toFixed(1).replace('.', ',')} `
          + `statt ${f.schnittOhne.toFixed(1).replace('.', ',')} (${f.faelle} Mahlzeiten damit).`);
      }
      if (d.krampfAnteil >= 0.3) {
        dafuer.push(`In ${Math.round(d.krampfAnteil * 100)} % der Eintragungen ging es `
          + 'um Krämpfe oder Bauchschmerz.');
      }
      return {
        stand: dafuer.length >= 2 ? 'moeglich' : 'offen',
        dafuer,
        dagegen: [],
        offen: 'Ob der Schmerz rechts sitzt, weiß dieses Tagebuch nicht – es fragt '
          + 'nicht nach der Stelle. Für die Unterscheidung ist genau das die erste '
          + 'Frage.',
      };
    },
  },
  {
    id: 'nsar',
    name: 'Schaden durch Schmerzmittel',
    was: 'Ibuprofen, Diclofenac und ASS greifen die Magenschleimhaut direkt an. '
      + 'Die häufigste vermeidbare Ursache – und die einzige auf dieser Liste, '
      + 'bei der das Tagebuch die Antwort schon hat.',
    untersuchung: 'Keine nötig, um die Frage zu stellen. Es geht um eine '
      + 'Alternative oder um einen Magenschutz – beides gehört besprochen, nicht '
      + 'selbst entschieden.',
    frage: 'Ich nehme regelmäßig ein entzündungshemmendes Schmerzmittel – gibt es '
      + 'eine magenfreundlichere Alternative, oder ist ein Magenschutz angezeigt?',
    pruefe: (d) => {
      const dafuer = [];
      if (d.nsarTage >= 3) {
        dafuer.push(`An ${d.nsarTage} Tagen steht ein entzündungshemmendes `
          + 'Schmerzmittel im Tagebuch.');
      }
      return {
        stand: d.nsarTage >= 3 ? 'gestuetzt' : 'unwahrscheinlich',
        dafuer,
        dagegen: d.nsarTage === 0 ? ['Kein solches Schmerzmittel eingetragen.'] : [],
        offen: d.nsarTage >= 3 ? 'Ob die Schleimhaut schon Schaden genommen hat, '
          + 'zeigt nur die Spiegelung. Die Frage nach der Alternative lohnt sich '
          + 'trotzdem sofort.' : '',
      };
    },
  },
  {
    id: 'blut',
    name: 'Blutarmut, Eisenmangel',
    was: 'Kein Verdauungsproblem, aber seine häufigste stille Folge – eine '
      + 'Blutung, die man nicht sieht, oder eine Aufnahmestörung.',
    untersuchung: 'Blutbild und Ferritin. Eine Viertelstunde, und es beantwortet '
      + 'zwei Fragen auf einmal: ob Blut verlorengeht und ob eine Zöliakie '
      + 'schon Spuren hinterlassen hat.',
    frage: 'Wären ein Blutbild und Ferritin sinnvoll?',
    pruefe: (d) => ({
      stand: 'offen',
      dafuer: d.warnIds.includes('blaesse') || d.warnIds.includes('teerstuhl')
        ? ['Im Tagebuch steht ein Warnzeichen, das dazu passt.'] : [],
      dagegen: [],
      offen: 'Aus einem Tagebuch nie zu sehen. Steht hier, weil es die billigste '
        + 'Untersuchung auf dieser Liste ist und am meisten auf einmal ausschließt.',
    }),
  },
];

/**
 * Der ganze Zettel.
 *
 * @param {object} d
 *   kriterien (aus js/kriterien.js), stuhl (stuhlZahlen), bezug (bezugBilanz),
 *   klassen (klassenBilanz), mittel (mittelBilanz), musterIds, essen
 *   (essensbezug), nsarTage, warnIds, krampfAnteil, benutzt, nachtwachAn,
 *   versuchMoeglich, versuchLaeuft, mahlzeitenOhneZutaten
 */
export function luecken(d) {
  return {
    tagebuch: tagebuchLuecken(d),
    verdaechte: VERDAECHTE.map((v) => {
      const p = v.pruefe(d);
      return {
        id: v.id,
        name: v.name,
        was: v.was,
        untersuchung: v.untersuchung,
        frage: v.frage,
        ...p,
        wort: STAND_WORT[p.stand],
      };
    }).sort((a, b) => {
      const rang = { gestuetzt: 0, moeglich: 1, offen: 2, unwahrscheinlich: 3 };
      return (rang[a.stand] - rang[b.stand]) || (b.dafuer.length - a.dafuer.length);
    }),
  };
}
