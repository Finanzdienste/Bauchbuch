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

/* ---------- Einzeltermine für das, worauf die App wartet ---------- */

/*
 * Stufenplan und Provokationstest bestehen zur Hälfte aus Warten: drei Tage
 * Pause, zwei Tage Abstand. Genau diese Fristen gehen im Alltag verloren –
 * nicht weil sie schwer wären, sondern weil sich niemand einen Termin in vier
 * Tagen merkt, den ihm keiner sagt.
 */
const einzeln = await page.evaluate(async () => {
  const m = await import('./js/kalender.js');
  return m.terminEintrag({
    am: '2026-04-20',
    uhr: '09:00',
    titel: 'Bauchbuch: Laktose – Milchzucker anfangen',
    text: 'Pause: noch 3 Tage zurück auf die Karenz, damit die nächste Gruppe '
      + 'nicht misst, was die letzte hinterlassen hat.',
  }, new Date('2026-04-16T10:00:00'));
});
check(/DTSTART:20260420T090000/.test(einzeln), 'der Einzeltermin liegt am richtigen Tag');
check(/SUMMARY:Bauchbuch: Laktose/.test(einzeln), 'und trägt, worum es geht');
check(/BEGIN:VALARM/.test(einzeln), 'mit Wecker');

/*
 * Und ausdrücklich ohne Wiederholung: Ein Wecker, der nach dem Durchgang
 * weiter jeden Tag klingelt, wird gelöscht – und meistens der tägliche gleich
 * mit. Das ist der Unterschied zwischen einer Erinnerung und einer Plage.
 */
check(!/RRULE/.test(einzeln), 'aber ohne Wiederholung');
check(
  !einzeln.split('\r\n').some((z) => new TextEncoder().encode(z).length > 75),
  'auch hier keine Zeile über 75 Oktette',
);

/* Ein unbrauchbares Datum ergibt keine kaputte Datei, sondern gar keine. */
const ohne = await page.evaluate(async () => {
  const m = await import('./js/kalender.js');
  return m.terminEintrag({ am: 'irgendwann', titel: 'x' });
});
check(ohne === null, 'ohne gültiges Datum kommt kein Termin heraus');

/*
 * Und die Fristen kommen aus den Modulen, die sie ohnehin rechnen – nicht aus
 * der Anzeige. Zwei Stellen, die dieselbe Frist nachrechnen, laufen früher
 * oder später auseinander.
 */
const fristen = await page.evaluate(async () => {
  const sp = await import('./js/stufenplan.js');
  const pv = await import('./js/provokation.js');
  const tag = (n) => {
    const d = new Date('2026-04-20T12:00:00');
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const plan = sp.planBild({
    id: 'x',
    start: tag(40),
    karenzTage: 21,
    gruppen: ['laktose', 'fruktose'],
    stufen: [{ gruppe: 'laktose', start: tag(5) }],
    beendet: null,
  }, [], {}, tag(0));
  const prov = pv.naechsterSchritt({
    was: '250 ml Milch',
    fenster: 4,
    laeufe: [{ am: tag(1), um: '08:00', leer: false }],
  }, tag(0));
  return { plan: plan.schritt && plan.schritt.am, prov: prov && prov.am };
});
/*
 * Die Stufe lief vom 15. bis 17., der 18. ist Nachklang – und damit schon
 * wieder ein Karenztag, nur einer, an dem noch beobachtet wird. Vom 18. an
 * drei Tage Karenz ergibt den 21. Der Nachklangtag zählt also mit, und das ist
 * richtig so: Gegessen wird an ihm nichts aus der Gruppe mehr.
 */
check(
  fristen.plan === '2026-04-21',
  `der Stufenplan nennt den Tag der nächsten Gruppe (${fristen.plan})`,
);
check(
  fristen.prov === '2026-04-21',
  `und der Provokationstest den des nächsten Durchgangs (${fristen.prov})`,
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
