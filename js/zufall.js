/*
 * Der Zufallsspielraum – wie groß ein Unterschied allein durch Zufall ausfällt
 *
 * DAS PROBLEM, DAS MIT JEDER NEUEN AUSWERTUNG GRÖSSER WURDE
 *
 * Die App vergleicht inzwischen viel: zwei Dutzend Auslöser, dazu Klassen,
 * dazu drei Zeitfenster, dazu Schichten und Zyklusphasen. Jeder einzelne
 * Vergleich ist sauber gerechnet. Nur wächst mit ihrer Zahl etwas, das kein
 * einzelner Vergleich sehen kann: Bei fünfzig Vergleichen ist ein „auffälliger"
 * Unterschied kein Ausreißer mehr, sondern die Regel. Man findet immer etwas –
 * auch in einem Tagebuch, in dem nichts drinsteckt.
 *
 * Und ein Zufallstreffer ist hier nicht folgenlos. Er führt dazu, dass jemand
 * ein Lebensmittel streicht, das ihm nichts tut; dass er einseitiger isst;
 * dass er der App beim nächsten, echten Fund weniger glaubt.
 *
 * WAS EINE MITTLERE DIFFERENZ NICHT SAGT
 *
 * „Nach Kaffee war es im Mittel 2 Stufen schlechter" klingt nach einer
 * Aussage. Sie ist aber nur so viel wert, wie die Werte darunter beieinander
 * liegen. Zwanzig Mahlzeiten, deren Werte zwischen 0 und 10 springen, bringen
 * zwei Stufen Unterschied mühelos aus reinem Zufall hervor. Zwanzig
 * Mahlzeiten, die alle zwischen 3 und 5 liegen, tun das nicht.
 *
 * Genau das rechnet diese Datei: Wie groß darf ein Unterschied sein, damit man
 * ihn noch dem Zufall zuschreiben würde? Und weil die Zahl der Vergleiche
 * mitzählt, geht sie mit ein – wer fünfzigmal fragt, braucht eine deutlichere
 * Antwort als wer dreimal fragt.
 *
 * WAS DAS NICHT IST
 *
 * Kein Signifikanztest, und es steht nirgends ein p-Wert. Das hier ist ein
 * Tagebuch eines einzigen Menschen, ohne Randomisierung und ohne Verblindung;
 * ein p-Wert würde eine Strenge vortäuschen, die die Daten nicht hergeben. Was
 * hier steht, ist eine Faustregel in der Währung der App selbst: in Stufen.
 */

/**
 * Wie streng, bei wie vielen Vergleichen?
 *
 * Der Gedanke ist der von Bonferroni, nur ohne dessen Formel: Je mehr Fragen
 * gestellt werden, desto deutlicher muss die Antwort ausfallen. Drei Stufen
 * statt einer feinen Kurve, weil die Kurve eine Genauigkeit vorspiegelte, die
 * hier niemand hat.
 */
export function strenge(vergleiche) {
  if (vergleiche <= 8) return 2;
  if (vergleiche <= 25) return 2.5;
  return 3;
}

const summe = (l) => l.reduce((s, x) => s + x, 0);

/**
 * Der Spielraum des Zufalls für einen Vergleich.
 *
 * @param {number[]} mit        die Werte der einen Seite
 * @param {number[]} ohne       die der anderen
 * @param {number} vergleiche   wie viele Vergleiche insgesamt angestellt werden
 * @returns {{streuung:number, se:number, spielraum:number}}
 *   `spielraum` ist der Unterschied, unter dem nichts behauptet wird.
 */
export function zufallsSpielraum(mit, ohne, vergleiche = 1) {
  const n1 = mit.length;
  const n2 = ohne.length;
  if (n1 < 2 || n2 < 2) return { streuung: 0, se: 0, spielraum: Infinity };

  const m1 = summe(mit) / n1;
  const m2 = summe(ohne) / n2;
  /*
   * Gemeinsame Streuung beider Seiten.
   *
   * Gemeinsam und nicht je Seite: Die Frage ist, wie stark die Werte dieses
   * Menschen überhaupt schwanken – und die Antwort darauf ändert sich nicht
   * dadurch, in welche Gruppe eine Mahlzeit fällt.
   */
  const quadrate = summe(mit.map((x) => (x - m1) ** 2)) + summe(ohne.map((x) => (x - m2) ** 2));
  const varianz = quadrate / (n1 + n2 - 2);
  const streuung = Math.sqrt(varianz);
  const se = Math.sqrt(varianz * (1 / n1 + 1 / n2));

  return { streuung, se, spielraum: strenge(vergleiche) * se };
}

/**
 * Der Spielraum für einen Unterschied *zwischen zwei Unterschieden*.
 *
 * Das ist die Rechnung, die in der App am leichtesten danebengeht, und sie ist
 * mit Abstand die anfälligste. „Wirkt Kaffee in der zweiten Zyklushälfte
 * anders als in der ersten?" vergleicht nicht zwei Mittelwerte, sondern zwei
 * Differenzen – und eine Differenz von Differenzen schwankt um den Faktor
 * Wurzel zwei stärker als jede einzelne davon, bei obendrein kleineren
 * Gruppen.
 *
 * Ohne diese Schranke fand die Zyklusrechnung in einem rein zufälligen
 * Tagebuch neun „wechselnde" Auslöser. Neun von zwanzig, aus nichts.
 */
export function abstandSpielraum(seA, seB, vergleiche = 1, gruppen = 2) {
  if (!Number.isFinite(seA) || !Number.isFinite(seB)) return Infinity;
  return strenge(vergleiche) * gesucht(gruppen) * Math.sqrt(seA ** 2 + seB ** 2);
}

/**
 * Aufschlag dafür, dass aus mehreren Gruppen die größte und die kleinste
 * herausgesucht wurden.
 *
 * Wer aus vier Zyklusphasen die stärkste und die schwächste nimmt, hat schon
 * gesucht, bevor er verglichen hat – und der Abstand zwischen dem größten und
 * dem kleinsten von vier Zufallswerten ist im Mittel deutlich größer als der
 * zwischen zwei beliebigen. Ohne diesen Aufschlag ist die Schranke für vier
 * Gruppen effektiv niedriger als für zwei, obwohl sie höher sein müsste.
 */
function gesucht(gruppen) {
  if (gruppen <= 2) return 1;
  if (gruppen === 3) return 1.25;
  return 1.4;
}

/**
 * Ein Satz dazu, in Worten und ohne Statistikvokabular.
 *
 * Er steht in der App neben den Funden, weil die Zahl sonst wie eine weitere
 * Schwelle aussähe, die sich jemand ausgedacht hat.
 */
export function spielraumSatz(spielraum, vergleiche) {
  if (!Number.isFinite(spielraum)) return '';
  return `Bei ${vergleiche} verglichenen Merkmalen kommt ein Unterschied von `
    + `etwa ${spielraum.toFixed(1)} Stufen auch dann vor, wenn gar nichts `
    + 'dahintersteckt – wer oft genug fragt, findet immer etwas. Erst darüber '
    + 'steht hier ein Urteil.';
}
