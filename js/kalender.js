/*
 * Die Erinnerung – die einzige Funktion hier, die mehr bringt als jede Rechnung
 *
 * WARUM ÜBERHAUPT
 *
 * Alles in dieser App hängt daran, dass eingetragen wird. Die Auswertung kann
 * so sauber sein, wie sie will: Ein Tagebuch, an das niemand erinnert, endet
 * nach drei Wochen, und dann war die ganze Statistik für nichts. Im README
 * steht der Satz seit dem ersten Tag – nur gab es bis jetzt nichts, was ihn
 * beantwortet hätte.
 *
 * WARUM ES KEINE PUSH-NACHRICHT IST
 *
 * Weil das nicht geht, ohne die Zusage dieser App zu brechen. Eine
 * Benachrichtigung, die ankommt, während die App geschlossen ist, braucht auf
 * dem iPhone die Push-API – und die braucht einen Server, der sie verschickt,
 * plus eine Kennung des Geräts, die dort liegt. Beides gibt es hier nicht und
 * soll es nicht geben. „Kein Server" ist keine Sparmaßnahme, sondern der Grund,
 * warum das Tagebuch nirgends landen kann.
 *
 * WAS STATTDESSEN GEHT
 *
 * Der Kalender, den das Telefon ohnehin hat. Diese Datei baut einen ganz
 * gewöhnlichen Termineintrag nach RFC 5545 – täglich, mit Wecker –, und der
 * wird einmal in den Kalender gelegt. Ab da erinnert das Telefon selbst, auch
 * offline, auch wenn die App nie wieder geöffnet wird, und ohne dass irgendwo
 * eine Adresse, ein Konto oder ein Gerät vermerkt wäre. Der Text entsteht im
 * Browser aus ein paar Zeilen; herausgereicht wird eine Datei, sonst nichts.
 *
 * Die Kehrseite steht in der App: Es ist ein Kalendereintrag und keine
 * Funktion dieser App. Wer ihn löscht, wird nicht mehr erinnert, und die App
 * merkt davon nichts – sie kann in den Kalender nicht hineinsehen. Das ist die
 * Kehrseite davon, dass sie auch sonst nirgends hineinsieht.
 */

/**
 * Zeilen nach RFC 5545 umbrechen: höchstens 75 Oktette, Fortsetzung mit einem
 * führenden Leerzeichen.
 *
 * Sieht nach Kleinkram aus, ist aber der Unterschied zwischen „wird importiert"
 * und „Datei defekt": Manche Kalender lehnen zu lange Zeilen rundheraus ab. Ein
 * Umlaut zählt dabei als zwei Oktette, deshalb wird nach Bytes gemessen und
 * nicht nach Zeichen.
 */
function falten(zeile) {
  const kodierer = new TextEncoder();
  if (kodierer.encode(zeile).length <= 75) return zeile;
  const teile = [];
  let jetzt = '';
  let bytes = 0;
  for (const zeichen of zeile) {
    const n = kodierer.encode(zeichen).length;
    // Fortsetzungszeilen haben ein Leerzeichen vorn, also ein Oktett weniger.
    if (bytes + n > (teile.length ? 74 : 75)) {
      teile.push(jetzt);
      jetzt = '';
      bytes = 0;
    }
    jetzt += zeichen;
    bytes += n;
  }
  teile.push(jetzt);

  /*
   * Kein Umbruch direkt hinter einem Leerzeichen.
   *
   * Beim Auffalten wird die Fortsetzungszeile hinten angehängt und ihr erstes
   * Zeichen (das Faltzeichen) verworfen. Endet die vorige Zeile auf einem
   * *echten* Leerzeichen, steht das am Zeilenende – und Leerzeichen am
   * Zeilenende überleben nicht jeden Transport. Fällt es weg, klebt
   * „Eintragungist" zusammen. Das Leerzeichen wandert deshalb an den Anfang
   * der nächsten Zeile, wo es geschützt hinter dem Faltzeichen steht.
   */
  return teile.reduce((raus, teil, i) => {
    if (i === 0) return [teil];
    const vorher = raus[raus.length - 1];
    if (vorher.endsWith(' ')) {
      raus[raus.length - 1] = vorher.slice(0, -1);
      return [...raus, ` ${teil}`];
    }
    return [...raus, teil];
  }, []).join('\r\n ');
}

/** In einem Textfeld sind Komma, Semikolon, Backslash und Umbruch zu maskieren. */
const schuetzen = (t) => String(t)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\n/g, '\\n');

const zwei = (n) => String(n).padStart(2, '0');

/** Ein Zeitstempel in UTC, wie ihn DTSTAMP verlangt. */
function utcStempel(d) {
  return `${d.getUTCFullYear()}${zwei(d.getUTCMonth() + 1)}${zwei(d.getUTCDate())}`
    + `T${zwei(d.getUTCHours())}${zwei(d.getUTCMinutes())}${zwei(d.getUTCSeconds())}Z`;
}

/** Vorschläge für die Uhrzeit – abends, wenn der Tag zu Ende ist. */
export const ZEIT_VORSCHLAEGE = ['12:00', '18:00', '20:00', '21:00'];

export const KALENDER_NAME = 'bauchbuch-erinnerung.ics';

/** Der gemeinsame Rahmen, in den ein oder mehrere Termine kommen. */
function kalender(inhalt) {
  const zeilen = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Bauchbuch//Erinnerung//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...inhalt,
    'END:VCALENDAR',
  ];
  // CRLF ist im Format vorgeschrieben, und manche Kalender sind darin streng.
  return `${zeilen.map(falten).join('\r\n')}\r\n`;
}

/** Kopfzeilen, die jeder Termin braucht. */
function kopf(jetzt) {
  return [
    // Die Kennung ist aus Zufall und Zeit gebaut und sagt über niemanden etwas.
    `UID:bauchbuch-${Math.random().toString(36).slice(2, 10)}-${utcStempel(jetzt)}`,
    `DTSTAMP:${utcStempel(jetzt)}`,
  ];
}

const wecker = (titel) => [
  'BEGIN:VALARM',
  'ACTION:DISPLAY',
  'TRIGGER:PT0S',
  `DESCRIPTION:${schuetzen(titel)}`,
  'END:VALARM',
];

/**
 * Ein einzelner Termin an einem bestimmten Tag.
 *
 * Für alles, worauf die App wartet und was sie nicht selbst anstoßen kann: die
 * nächste Stufe im Stufenplan, der nächste Durchgang beim Provokationstest.
 * Beides sind Termine in ein paar Tagen, und beides scheitert im Alltag an
 * derselben Stelle – man vergisst es. Die App kann nicht klingeln, der
 * Kalender schon.
 *
 * Wichtig ist die Trennung zur täglichen Erinnerung: Das hier wiederholt sich
 * *nicht*. Ein Termin, der nach dem Durchgang weiter jeden Tag klingelt, wird
 * gelöscht, und mit ihm meistens der tägliche gleich mit.
 *
 * @param {{am: string, uhr?: string, titel: string, text?: string}} was
 */
export function terminEintrag(was, jetzt = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(was.am || ''));
  if (!m) return null;
  const u = /^(\d{1,2}):(\d{2})$/.exec(String(was.uhr || '')) || ['', '09', '00'];
  const stunde = Math.max(0, Math.min(23, Number(u[1])));
  const minute = Math.max(0, Math.min(59, Number(u[2])));

  return kalender([
    'BEGIN:VEVENT',
    ...kopf(jetzt),
    `DTSTART:${m[1]}${m[2]}${m[3]}T${zwei(stunde)}${zwei(minute)}00`,
    'DURATION:PT15M',
    `SUMMARY:${schuetzen(was.titel)}`,
    ...(was.text ? [`DESCRIPTION:${schuetzen(was.text)}`] : []),
    'TRANSP:TRANSPARENT',
    ...wecker(was.titel),
    'END:VEVENT',
  ]);
}

/**
 * Der Termineintrag als Text.
 *
 * Bewusst *ohne* Zeitzone: DTSTART steht als „lokale Zeit ohne Angabe" da
 * (Form 1 nach RFC 5545). Der Termin ist damit um 20 Uhr dort, wo das Telefon
 * gerade steht – und bleibt es auch auf Reisen. Mit einer festen Zeitzone würde
 * die Erinnerung im Urlaub mitten in der Nacht klingeln, und eine vollständige
 * VTIMEZONE-Angabe wäre für einen täglichen Wecker um 20 Uhr eine Menge
 * Zeremonie für nichts.
 *
 * @param {string} uhr    'HH:MM'
 * @param {Date} [jetzt]  für den Test einsetzbar
 */
export function erinnerungsTermin(uhr, jetzt = new Date()) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(uhr || '')) || ['', '20', '00'];
  const stunde = Math.max(0, Math.min(23, Number(m[1])));
  const minute = Math.max(0, Math.min(59, Number(m[2])));

  /*
   * Beginn ist heute. Liegt die Uhrzeit schon in der Vergangenheit, wäre der
   * erste Termin vorbei, bevor er angelegt ist – dann fängt die Reihe morgen
   * an. Sonst hätte jemand, der das um 22 Uhr einrichtet, den Eindruck, es
   * funktioniere nicht.
   */
  const start = new Date(jetzt);
  start.setHours(stunde, minute, 0, 0);
  if (start <= jetzt) start.setDate(start.getDate() + 1);

  const lokal = `${start.getFullYear()}${zwei(start.getMonth() + 1)}${zwei(start.getDate())}`
    + `T${zwei(stunde)}${zwei(minute)}00`;

  return kalender([
    'BEGIN:VEVENT',
    ...kopf(jetzt),
    `DTSTART:${lokal}`,
    'DURATION:PT10M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${schuetzen('Bauchbuch: Tag eintragen')}`,
    `DESCRIPTION:${schuetzen(
      'Zwei Minuten: Was gegessen, wie es dem Bauch ging, Stuhlgang. '
      + 'Auch ein Tag ohne Beschwerden gehört hinein – ein Tag ohne Eintragung '
      + 'ist etwas anderes als ein Tag ohne Beschwerden, und nur der '
      + 'eingetragene zählt in der Auswertung mit.',
    )}`,
    'TRANSP:TRANSPARENT',
    ...wecker('Bauchbuch: Tag eintragen'),
    'END:VEVENT',
  ]);
}
