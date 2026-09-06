/*
 * Die Erinnerung – und warum sie ein Kalendereintrag ist
 *
 * Das Wichtigste an einem Tagebuch ist nicht die Auswertung, sondern dass es
 * geführt wird. Eine echte Push-Nachricht bräuchte auf dem iPhone einen Server,
 * der sie verschickt, und eine Kennung des Geräts, die dort liegt – und damit
 * genau das, was diese App nicht hat und nicht haben soll. Der Kalender kann
 * dasselbe, ohne dass irgendetwas das Gerät verlässt.
 *
 * Der Haken an dieser Lösung: Sie ist entweder korrekt oder wertlos. Eine
 * `.ics`, die der Kalender nicht annimmt, sieht im Browser genauso aus wie eine,
 * die er annimmt – man merkt es erst auf dem Telefon, und dann sitzt man da.
 * Diese Datei prüft deshalb nicht „enthält BEGIN:VCALENDAR", sondern die
 * Kleinigkeiten, an denen so ein Import wirklich scheitert:
 *
 *   * CRLF am Zeilenende. Vorgeschrieben, und manche Kalender sind streng.
 *   * Keine Zeile über 75 Oktette, Fortsetzung mit führendem Leerzeichen –
 *     und ein Umlaut zählt als zwei Oktette.
 *   * Komma und Semikolon in Textfeldern maskiert, sonst zerfällt der Text in
 *     Parameter.
 *   * Eine Wiederholung und ein Wecker, sonst erinnert nichts.
 *
 * Und die eine inhaltliche Sache: Wer das um 22 Uhr einrichtet und 20 Uhr
 * wählt, darf nicht einen Termin bekommen, der zwei Stunden vorher war.
 */
import { chromium } from 'playwright';
import { URL, HANDY, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const bauen = (uhr, jetztISO) => page.evaluate(async ([u, j]) => {
  const m = await import('./js/kalender.js');
  return m.erinnerungsTermin(u, j ? new Date(j) : undefined);
}, [uhr, jetztISO || null]);

const text = await bauen('20:00');

/* ---------- Der Rahmen ---------- */

check(text.startsWith('BEGIN:VCALENDAR\r\n'), 'die Datei fängt an, wie sie muss');
check(text.trimEnd().endsWith('END:VCALENDAR'), 'und hört so auf');
check(/^VERSION:2\.0$/m.test(text.replace(/\r/g, '')), 'mit der Fassung des Formats');

/*
 * CRLF, überall. Ein einzelnes \n ohne \r davor reicht manchen Kalendern, um
 * die Datei abzulehnen – und niemand sieht der Datei das an.
 */
check(
  !/[^\r]\n/.test(text),
  'jede Zeile endet mit CRLF, wie das Format es verlangt',
);

/* ---------- Zeilenlänge in Oktetten ---------- */

/*
 * Die Beschreibung ist lang und voller Umlaute – genau der Fall, in dem eine
 * naive Umsetzung nach Zeichen statt nach Bytes zählt und dann doch zu lange
 * Zeilen schreibt.
 */
const zeilen = text.split('\r\n');
const kodierer = new TextEncoder();
const zuLang = zeilen.filter((z) => kodierer.encode(z).length > 75);
check(zuLang.length === 0, `keine Zeile über 75 Oktette (${zuLang.length} zu lang)`);
check(
  zeilen.some((z) => z.startsWith(' ')),
  'die lange Beschreibung wird tatsächlich umgebrochen – sonst prüft das oben nichts',
);

/*
 * Und keine Zeile endet auf einem Leerzeichen. Beim Auffalten wird die
 * Fortsetzung hinten angehängt; Leerzeichen am Zeilenende überleben aber nicht
 * jeden Transport, und dann klebt „Eintragungist" zusammen. Genau so sah die
 * erste Fassung aus.
 */
check(
  !zeilen.some((z) => z.endsWith(' ')),
  'keine Zeile endet auf einem Leerzeichen',
);
check(
  /Eintragung ist etwas anderes/.test(
    text.replace(/\r\n /g, '').replace(/\r\n/g, ''),
  ),
  'und aufgefaltet steht der Satz lückenlos da',
);

/* ---------- Maskierung ---------- */

/*
 * In der Beschreibung stehen Kommas. Unmaskiert zerlegt ein Kalender den Text
 * daran in mehrere Werte, und was danach steht, verschwindet.
 */
const beschreibung = text.replace(/\r\n /g, '').split('\r\n')
  .find((z) => z.startsWith('DESCRIPTION:') && z.length > 60);
check(!!beschreibung, 'es gibt eine Beschreibung');
check(
  !/[^\\],/.test(beschreibung),
  'jedes Komma darin ist maskiert',
);
check(
  /Tag ohne Eintragung/.test(beschreibung),
  'und sie sagt den Satz, um den es in dieser App geht',
);

/* ---------- Wiederholung und Wecker ---------- */

check(/RRULE:FREQ=DAILY/.test(text), 'der Termin wiederholt sich täglich');
check(/BEGIN:VALARM/.test(text) && /ACTION:DISPLAY/.test(text), 'und hat einen Wecker');
check(/TRIGGER:PT0S/.test(text), 'der zur Terminzeit auslöst und nicht davor');

/*
 * Ohne Zeitzone, mit Absicht: So ist die Erinnerung um 20 Uhr dort, wo das
 * Telefon gerade steht. Mit fester Zeitzone klingelte sie im Urlaub nachts.
 */
const dtstart = zeilen.find((z) => z.startsWith('DTSTART'));
check(
  /^DTSTART:\d{8}T\d{6}$/.test(dtstart),
  `DTSTART ohne Zeitzone und ohne Z (${dtstart})`,
);

/* ---------- Der erste Termin liegt nie in der Vergangenheit ---------- */

/*
 * Wer das abends um 22 Uhr einrichtet und 20 Uhr wählt, bekäme sonst einen
 * ersten Termin, der zwei Stunden vorbei ist – und den Eindruck, es
 * funktioniere nicht.
 */
const spaet = await bauen('20:00', '2026-03-10T22:30:00');
check(
  /DTSTART:20260311T200000/.test(spaet),
  `abends eingerichtet fängt die Reihe morgen an (${(spaet.match(/DTSTART:\S+/) || [])[0]})`,
);

const frueh = await bauen('20:00', '2026-03-10T09:00:00');
check(
  /DTSTART:20260310T200000/.test(frueh),
  `morgens eingerichtet fängt sie heute an (${(frueh.match(/DTSTART:\S+/) || [])[0]})`,
);

/* Und eine unsinnige Eingabe kippt das Format nicht. */
const kaputt = await bauen('25:99');
check(
  /^DTSTART:\d{8}T\d{6}$/.test(kaputt.split('\r\n').find((z) => z.startsWith('DTSTART'))),
  'auch eine unmögliche Uhrzeit ergibt eine gültige Datei',
);

/* ---------- Und in der App ---------- */

await page.evaluate(() => localStorage.setItem('bauchbuch.state.v1',
  JSON.stringify({ begruesst: true, tab: 'mehr' })));
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(sicht.includes('Täglich erinnern lassen'), 'die Karte steht unter „Mehr"');
check(
  /keine Funktion dieser App/.test(sicht),
  'mit der Ehrlichkeit, dass die App den Kalender nicht kennt',
);
/*
 * Und mit dem Grund, warum es keine Push-Nachricht ist. Ohne ihn sähe die
 * Lösung nach Bequemlichkeit aus statt nach dem Preis einer Zusage.
 */
check(
  /Server/.test(sicht) && /Kennung deines Ger/.test(sicht),
  'und dem Grund, warum es keine echte Benachrichtigung gibt',
);

/* Die Zeitwahl wirkt sich aus. */
await page.locator('[data-act="erinnern-zeit"][data-z="12:00"]').click();
await page.waitForTimeout(300);
check(
  await page.locator('[data-act="erinnern-zeit"][data-z="12:00"].an').count() === 1,
  'die gewählte Uhrzeit bleibt markiert',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await browser.close();
ende();
