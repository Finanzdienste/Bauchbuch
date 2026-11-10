/*
 * Was schon feststeht – und warum eine App das wissen muss.
 *
 * DER FEHLER, DEN DIESE DATEI BEHEBT
 *
 * Diese App rechnet bisher so, als sei nichts bekannt. An mehreren Stellen
 * steht derselbe Vorbehalt, seit der Fassung 30 so, wie die Quellen ihn
 * fassen (siehe kriterienVorbehalt unten):
 *
 *     „Von einem Reizdarm oder Reizmagen sprechen Ärztinnen und Ärzte erst,
 *      wenn andere Ursachen für die Beschwerden abgeklärt und ausgeschlossen
 *      sind."
 *
 * Nur gilt er nicht für jeden. Wer eine Spiegelung hinter sich hat und einen
 * Befund bekommen hat, bei dem *steckt* etwas Organisches dahinter. Die App
 * redet trotzdem weiter, als sei die Frage offen: Sie zeigt „Kriterien
 * erfüllt", wo die Kriterien gar nicht mehr anwendbar sind, und schlägt unter
 * „Was keine App beantwortet" Untersuchungen vor, die längst gelaufen sind.
 *
 * Das ist ungenau an der heikelsten Stelle, und zwar in die unangenehme
 * Richtung: Sie behandelt Bekanntes als unbekannt. Wer das liest, hält seinen
 * Befund für eine von mehreren Möglichkeiten – und geht womöglich zweimal zur
 * selben Untersuchung oder einmal zu wenig zur nächsten.
 *
 * WAS HIER NICHT PASSIERT
 *
 * Keine Diagnose, kein Verdacht, keine Einstufung. Was hier steht, hat jemand
 * gesagt bekommen; die App beurteilt es nicht und rechnet nichts daraus. Sie
 * ändert nur, was sie selbst behauptet:
 *
 *   * Die Kriterien bekommen den Vorbehalt, der dann zutrifft.
 *   * „Was noch fehlt" streicht, was schon geklärt ist.
 *   * Der Praxisbericht nennt die Befunde oben, wo sie hingehören.
 *
 * Die Liste ist bewusst kurz und grob. Sie ist kein Arztbrief und soll keiner
 * werden – wer seine ganze Krankengeschichte hier einträgt, hat am Ende eine
 * zweite Akte, die niemand pflegt.
 */

/**
 * Was die App über einen Befund wissen muss, um anders zu reden.
 *
 * `klaert` sagt, welche offenen Fragen damit beantwortet sind – daran hängt,
 * was aus „Was noch fehlt" verschwindet. Die Kennungen sind die der Verdachte
 * in js/luecken.js.
 *
 * Diese Liste ist mit Absicht knauserig. Gestrichen wird nur, was mit dem
 * Befund *definitionsgemäß* erledigt ist: Eine Gastritis Typ C ist eine
 * chemisch verursachte, also keine bakterielle – Helicobacter ist damit keine
 * offene Frage mehr. Dass ein Befund meist bei einer Spiegelung entsteht und
 * dabei auch anderes aufgefallen wäre, reicht nicht: „meist" ist keine
 * Grundlage, einem Menschen eine Untersuchung aus der Liste zu nehmen.
 *
 * Die Richtung des Irrtums ist hier nicht gleichgültig. Ein Verdacht, der zu
 * viel dasteht, kostet eine Nachfrage in der Sprechstunde. Einer, der zu
 * Unrecht verschwindet, kostet die Untersuchung.
 *
 * `organisch` ist die Angabe, auf die es bei den Kriterien ankommt: Von
 * Reizdarm oder Reizmagen wird erst gesprochen, wenn andere Ursachen
 * abgeklärt sind (gesund.bund.de, Reizmagensyndrom, Stand 05.02.2026;
 * Reizdarmsyndrom, Stand 28.08.2024). Bis zur Fassung 29 stand hier, Rom IV
 * gelte „ausdrücklich nur, solange nichts Organisches gefunden wurde"; das
 * steht so in keiner geprüften Quelle, und laut gesund.bund.de kann ein
 * Reizmagen auch neben einem Befund wie einer Magenschleimhautentzündung
 * bestehen.
 */
export const BEFUNDE = [
  {
    id: 'hiatushernie',
    name: 'Zwerchfellbruch (Hiatushernie)',
    was: 'Ein Teil des Magens rutscht durch das Zwerchfell nach oben.',
    organisch: true,
    klaert: ['reflux'],
    bedeutet: 'Ein bekannter Grund für Reflux: Der Verschluss zwischen Magen '
      + 'und Speiseröhre hält schlechter. Was die App an Sodbrennen und '
      + 'Aufstoßen zählt, hat damit eine Erklärung, die schon feststeht.',
  },
  {
    id: 'gastritis-c',
    name: 'Gastritis Typ C',
    was: 'Magenschleimhautentzündung durch Reizstoffe – nicht durch Bakterien.',
    organisch: true,
    klaert: ['hpylori'],
    bedeutet: 'Typ C heißt: chemisch gereizt. Die häufigsten Ursachen sind '
      + 'Schmerzmittel vom NSAR-Typ (Ibuprofen, Diclofenac, ASS), Gallensaft, '
      + 'der in den Magen zurückläuft, und Alkohol. Was davon bei dir zutrifft, '
      + 'steht in deinem Befund – und die Medikamentenspalte dieser App ist '
      + 'dann die interessanteste Spalte, die sie hat.',
  },
  {
    id: 'gastritis-a',
    name: 'Gastritis Typ A',
    was: 'Magenschleimhautentzündung, bei der sich die Abwehr gegen den '
      + 'eigenen Magen richtet.',
    organisch: true,
    klaert: [],
    bedeutet: 'Hier gehört regelmäßig das Blutbild dazu – Vitamin B12 wird im '
      + 'Magen aufgenommen, und das geht dabei verloren.',
  },
  {
    id: 'gastritis-b',
    name: 'Gastritis Typ B (Helicobacter)',
    was: 'Magenschleimhautentzündung durch das Bakterium Helicobacter pylori.',
    organisch: true,
    klaert: ['hpylori'],
    bedeutet: 'Der eine Fall, in dem eine Behandlung die Ursache beseitigt '
      + 'statt die Beschwerden zu dämpfen.',
  },
  {
    id: 'refluxkrankheit',
    name: 'Refluxkrankheit',
    was: 'Magensaft läuft zurück in die Speiseröhre.',
    organisch: true,
    klaert: ['reflux'],
    bedeutet: 'Die GerdQ-Punktzahl dieser App misst dann nicht mehr, *ob* es '
      + 'Reflux ist, sondern wie es gerade läuft.',
  },
  {
    id: 'zoeliakie',
    name: 'Zöliakie',
    was: 'Unverträglichkeit von Gluten mit Schaden an der Dünndarmschleimhaut.',
    organisch: true,
    klaert: ['zoeliakie'],
    bedeutet: 'Eine Diagnose, die lebenslang gilt und bei der Weglassen keine '
      + 'Erprobung ist, sondern Behandlung.',
  },
  {
    id: 'laktose',
    name: 'Laktoseintoleranz (nachgewiesen)',
    was: 'Milchzucker wird nicht ausreichend gespalten – mit Test bestätigt.',
    organisch: false,
    klaert: ['unvertraeglich'],
    bedeutet: 'Ein Provokationstest auf Laktose erübrigt sich damit; die '
      + 'interessante Frage ist nur noch, wie viel du verträgst.',
  },
  {
    id: 'fruktose',
    name: 'Fruktosemalabsorption (nachgewiesen)',
    was: 'Fruchtzucker wird im Dünndarm schlecht aufgenommen – mit Test bestätigt.',
    organisch: false,
    klaert: ['unvertraeglich'],
    bedeutet: 'Wie bei Laktose: Die Frage ist nicht mehr ob, sondern wie viel.',
  },
  {
    id: 'reizdarm',
    name: 'Reizdarmsyndrom (ärztlich gestellt)',
    was: 'Die Diagnose wurde gestellt, nachdem anderes ausgeschlossen war.',
    organisch: false,
    klaert: ['reizdarm'],
    bedeutet: 'Dann sind die Rom-IV-Kriterien in dieser App keine Suche mehr, '
      + 'sondern eine Verlaufsbeobachtung.',
  },
];

export const BEFUND_VON = Object.fromEntries(BEFUNDE.map((b) => [b.id, b]));

/** Höchstens so viele – die Liste ist eine Einordnung, keine Krankenakte. */
export const JE_BEFUNDE = 12;

/**
 * Ist etwas Organisches bekannt?
 *
 * Die eine Frage, an der die Kriterien hängen. Sie wird hier beantwortet und
 * nicht in js/kriterien.js, damit die Rechnung dort unverändert bleibt: Die
 * Punktzahl ist dieselbe, nur ihre Lesart ändert sich.
 */
export function organischBekannt(befunde) {
  if (!Array.isArray(befunde)) return false;
  return befunde.some((b) => {
    const w = BEFUND_VON[b.id];
    return w ? w.organisch : false;
  });
}

/** Welche offenen Fragen durch die eingetragenen Befunde erledigt sind. */
export function geklaert(befunde) {
  if (!Array.isArray(befunde)) return new Set();
  const raus = new Set();
  befunde.forEach((b) => {
    const w = BEFUND_VON[b.id];
    if (w) (w.klaert || []).forEach((k) => raus.add(k));
  });
  return raus;
}

/**
 * Der Satz, der an die Kriterien gehört, wenn etwas Organisches feststeht.
 *
 * Nicht „die Kriterien gelten nicht" – das wäre zu grob und auch nicht wahr.
 * Was unten steht, beantwortet dann eine andere Frage: nicht mehr „was ist
 * das", sondern „wie läuft es".
 *
 * Der Vorbehalt so, wie die Quellen ihn fassen, und nur für Reizdarm und
 * Reizmagen: gesund.bund.de, Reizmagensyndrom (Stand 05.02.2026, „Wie wird
 * ein Reizmagen diagnostiziert?"): „Von einem Reizmagen wird deshalb erst
 * gesprochen, wenn andere Ursachen für die Beschwerden abgeklärt und
 * ausgeschlossen wurden"; dort steht auch: „Manchmal werden Gallensteine oder
 * eine Magenschleimhautentzündung festgestellt, die die Beschwerden aber
 * nicht ganz erklären. Dann kann ein Reizmagen zusätzlich bestehen." Für den
 * GerdQ gilt der Ausschluss nicht – die Refluxkrankheit steht dort selbst
 * unter den auszuschließenden Ursachen. Bis zur Fassung 29 hieß es „Diese
 * Regelwerke setzen voraus, dass nichts Organisches dahintersteckt", wie im
 * Kriterien-Kasten, wo die Fassung 30 es schon gestrichen hatte
 * (kriterienTeil in js/app.js).
 */
export function kriterienVorbehalt(befunde) {
  const organische = (befunde || [])
    .map((b) => BEFUND_VON[b.id])
    .filter((w) => w && w.organisch);
  if (!organische.length) return '';
  const namen = organische.map((w) => w.name).join(', ');
  return `Bei dir steht schon etwas fest: ${namen}. Von einem Reizdarm oder `
    + 'Reizmagen wird erst gesprochen, wenn andere Ursachen der Beschwerden '
    + 'abgeklärt sind; was dein Befund dafür heißt, klärt die Praxis. Was unten '
    + 'steht, ist deshalb keine Einordnung, sondern eine Verlaufsbeobachtung: wie '
    + 'stark, wie oft, und ob es besser wird.';
}
