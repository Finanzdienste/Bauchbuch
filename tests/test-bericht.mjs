/*
 * Der Zettel für den Arzttermin.
 *
 * Er ist der Grund, aus dem man so ein Tagebuch überhaupt führt: In zehn
 * Minuten Sprechstunde erinnert sich niemand an sechs Wochen. Deshalb wird
 * geprüft, dass die Zahlen darin stimmen und nicht nur schön aussehen – und
 * dass er nichts behauptet, was er nicht gezählt hat.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, vorTagen, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const eintraege = [];
// Zehn Tage: mittags Kaffee, danach Brennen. Abends nichts.
for (let t = 0; t < 10; t++) {
  const am = vorTagen(t);
  eintraege.push({ id: `m${t}`, am, um: '12:00', art: 'essen', was: 'Mittag', tags: ['kaffee'], portion: 'normal' });
  eintraege.push({ id: `w${t}`, am, um: '13:00', art: 'beschwerde', staerke: 6, arten: ['brennen'] });
  eintraege.push({ id: `a${t}`, am, um: '18:30', art: 'essen', was: 'Abend', tags: [], portion: 'klein' });
  eintraege.push({ id: `p${t}`, am, um: '07:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg' });
}
eintraege.push({ id: 'n1', am: vorTagen(2), um: '22:00', art: 'notiz', text: 'Viel Stress im Büro.' });

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege, tage: {}, fenster: 4, mindestFaelle: 5, begruesst: true, tab: 'mehr' }]);
await page.reload({ waitUntil: 'networkidle' });

await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(300);
check(await page.locator('.bericht').count() === 1, 'der Bericht erscheint');
const text = await page.locator('.bericht').inputValue();

check(text.startsWith('Magen-Tagebuch'), 'er hat eine Überschrift');
check(text.includes('Tage mit Eintragung        10 von 30'), 'zehn von dreißig Tagen notiert');
check(text.includes('Tage mit Beschwerden       10 (100 %'), 'alle zehn davon mit Beschwerden');
check(/Stärke im Mittel\s+6/.test(text), 'die mittlere Stärke ist 6');
check(text.includes('Höchster Wert              6'), 'und der höchste ebenfalls');
check(text.includes('Mahlzeiten eingetragen     20'), 'zwanzig Mahlzeiten');
check(text.includes('Medikamenteneinnahmen      10'), 'zehn Einnahmen');
check(/Brennen\s+10 Mal/.test(text), 'die Beschwerdeart mit ihrer Häufigkeit');
check(/mittags\s+10 Mal/.test(text), 'die Tageszeit, in der es auftrat');
// Mit Dosis: „Pantoprazol – 10 Mal" verschwiege, ob es 20 oder 40 mg waren.
check(text.includes('Pantoprazol 20 mg – 10 Mal'), 'das eingenommene Mittel, mit seiner Dosis');
check(text.includes('Viel Stress im Büro.'), 'die Notiz steht mit dabei');
check(
  /Kaffee\s+6 gegen 0 \(10 Mahlzeiten damit, 10 ohne\)/.test(text),
  'der auffällige Auslöser mit beiden Mittelwerten und beiden Fallzahlen',
);
check(
  text.includes('gezählt, nicht gedeutet'),
  'und der Satz, dass hier nichts gedeutet wird',
);
// „Diagnose" darf vorkommen – aber nur in dem Satz, der sagt, dass keine
// gestellt wird. Behauptet werden darf sie nirgends.
check(
  text.includes('stellt keine Diagnose'),
  'der Bericht sagt von sich, dass er keine Diagnose stellt',
);
const behauptet = text.match(/Diagnose:|Diagnose lautet|Ursache ist|verursacht durch/gi) || [];
check(
  behauptet.length === 0,
  `nirgends eine zugeschriebene Ursache${behauptet.length ? `: ${behauptet.join(', ')}` : ''}`,
);

/* ---------- Was neu dazugekommen ist, steht auch auf dem Zettel ---------- */

/*
 * Ein Verlauf, an dem sich alles Neue zeigt – und zwar so gebaut, dass jede
 * Rechnung ihre Vergleichsgruppe hat. Daran scheitert es sonst still:
 *
 *   * Schmerz an drei von vier Tagen, nicht an allen. Ohne schmerzfreie Tage
 *     lassen sich die Rom-Merkmale „ändert sich die Häufigkeit/Form dabei?"
 *     gegen nichts vergleichen, und die Kriterien bleiben ungeprüft.
 *   * An Schmerztagen weicher Stuhl, sonst unauffälliger – das ist das
 *     Merkmal, das hier erfüllt sein soll.
 *   * Pantoprazol erst in der zweiten Hälfte, damit es eine Zeit davor gibt.
 *     Die Beschwerden bleiben gleich: der ausgereizte Säureblockerversuch.
 */
const lang = [];
for (let t = 90; t >= 1; t--) {
  const am = vorTagen(t);
  const schmerz = t % 4 !== 0;
  if (schmerz) {
    lang.push({ id: `lb${t}`, am, um: '11:00', art: 'beschwerde', staerke: 6,
      arten: ['krampf', 'oberbauch'], stuhlbezug: 'besser' });
  }
  lang.push({ id: `ls${t}`, am, um: '09:00', art: 'stuhl', form: schmerz ? 6 : 4 });
  if (t <= 45) lang.push({ id: `lm${t}`, am, um: '07:00', art: 'medikament', mittel: 'Pantoprazol' });
  lang.push({ id: `le${t}`, am, um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal',
    zutaten: t % 2 ? [{ id: 'milch', rolle: 'haupt' }] : [] });
}
await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
  [KEY, { eintraege: lang, tage: {}, fenster: 4, mindestFaelle: 5, begruesst: true,
    tab: 'mehr', beschwerdenSeit: '2023-01' }]);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="bericht"][data-n="90"]').click();
await page.waitForTimeout(400);
const voll = await page.locator('.bericht').inputValue();

check(voll.includes('STUHLGANG (BRISTOL)'), 'der Stuhlgang steht als eigener Abschnitt drin');
check(/Typ 6-7 \(weich\)\s+\d+/.test(voll), 'mit den Anteilen nach Bristol-Gruppe');
check(voll.includes('KRITERIEN'), 'die Kriterien stehen auf dem Zettel');
check(
  voll.includes('Rom IV, Reizdarmsyndrom'),
  'mit dem Regelwerk beim Namen – so heißt es auch in der Praxis',
);
check(
  voll.includes('GerdQ') && voll.includes('von 18 Punkten'),
  'und der GerdQ mit seiner Punktzahl',
);
check(
  voll.includes('Erfüllte Kriterien sind KEINE Diagnose'),
  'unmittelbar gefolgt von dem Satz, dass das keine Diagnose ist',
);
check(
  voll.includes('Beschwerden seit 2023-01'),
  'die Dauer der Beschwerden, ohne die eine Rom-Bedingung ungeprüft bliebe',
);
check(voll.includes('HAT ES ETWAS BEWIRKT?'), 'das Ansprechen auf die Mittel steht drin');
check(
  voll.includes('Das ist selbst ein Befund'),
  'und der Säureblocker ohne Wirkung wird als Befund benannt – das ist die nützlichste Zeile',
);
check(
  !/^.{80,}$/m.test(voll),
  'keine Zeile länger als achtzig Zeichen – der Zettel wird ausgedruckt',
);

/* ---------- Ein leerer Zeitraum sagt das ---------- */

await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.locator('[data-act="bericht"][data-n="30"]').click();
await page.waitForTimeout(300);
const leer = await page.locator('.bericht').inputValue();
check(
  leer.includes('wurde nichts eingetragen'),
  'ohne Eintragungen steht das im Bericht statt einer Reihe von Nullen',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();

/* ==================== Die Teile der Fassung 28 ==================== */

/*
 * Ohne Browser: arztBericht() ist eine reine Funktion. Die Tagebücher kommen
 * aus tests/adhs-daten.mjs (mit Störwegen, je Startwert ein anderes Mittel) –
 * erst hier geladen, weil es die Zeitzone auf UTC stellt und der Teil oben mit
 * der Uhr dieses Rechners arbeitet.
 *
 * Geprüft wird, was der Entwurf für den Zettel verlangt:
 *
 *   * Keine Zeile hat 80 Zeichen oder mehr – auch mit einem 80 Zeichen langen
 *     Mittelnamen, 40 Zeichen Dosis und allen Abschnitten an.
 *   * Mit den Schaltern aus fehlen ADHS-MITTEL, ESSENSRHYTHMUS und KIEFER,
 *     NACKEN, SCHIENE; der Abschnitt-Rest steht in tests/test-adhs-gegenprobe.mjs.
 *   * Ein Zeitraum nur mit ADHS-Einnahmen und Antworten zur Schiene zeigt die
 *     neuen Abschnitte statt „nichts eingetragen" – aber nur mit Schalter.
 *   * Vorher-Nachher beim ADHS-Mittel ohne Urteil (B4), Paare samt Frage,
 *     die Form unter Methylphenidat, W1 und W1u oben in IN KÜRZE.
 */
const { adhsTagebuch, appModul, GRUND } = await import('./adhs-daten.mjs');
const { isoPlus } = await import('./rechnungen.mjs');
const { arztBericht } = await appModul('bericht.js');
const { kopfFragen, aufwachZahlen } = await appModul('kopf.js');

const abschnitt = (text, titel) => {
  const i = text.split('\n').findIndex((z) => z === titel || z.startsWith(`${titel} (`));
  if (i < 0) return '';
  const rest = text.split('\n').slice(i);
  return rest.slice(0, rest.indexOf('')).join('\n');
};
const zuLang = (text) => text.split('\n').filter((z) => z.length >= 80);

/*
 * Ein Tagebuch mit allem: das Stimulans unter einem 80 Zeichen langen Namen
 * mit 40 Zeichen Dosis, dazu ein Mittel gegen Depression (ein Paar der Stufe
 * C), ein Schmerzmittel am Kopf, Kopfschmerzen schon beim Aufwachen und mit
 * den Kiefer-Merkmalen, Blutungstage für die Zyklusphasen und eine Notiz, die
 * über jede Zeile hinausgeht. Kein Säureblocker: Dieses Tagebuch hat schon
 * Massagepistole und Schiene.
 */
function allesTagebuch(saat, name, dosis) {
  const d = adhsTagebuch(saat);
  const eintraege = d.eintraege.map((e) => (e.mittel === d.mittel ? { ...e, mittel: name, dosis } : e));
  const tage = JSON.parse(JSON.stringify(d.tage));
  for (let i = 0; i < 120; i++) {
    const iso = isoPlus(GRUND, -i);
    // Alle 27 Tage fünf Blutungstage.
    if (i % 27 < 5) tage[iso] = { ...(tage[iso] || {}), blutung: 2 };
  }
  for (let i = 1; i <= 5; i++) {
    const am = isoPlus(GRUND, -3 * i);
    eintraege.push(
      { id: `kw${i}`, art: 'kopf', am, um: '06:40', staerke: 5, kopfArten: ['aufwachen', 'beidseitig', 'kauen'] },
      { id: `ki${i}`, art: 'medikament', am, um: '07:00', mittel: 'Ibuprofen', dosis: '400 mg', zuKopf: `kw${i}` },
    );
  }
  eintraege.push(
    { id: 'ser1', art: 'medikament', am: isoPlus(GRUND, -4), um: '20:30', mittel: 'Sertralin', dosis: '50 mg' },
    { id: 'n1', art: 'notiz', am: isoPlus(GRUND, -2), um: '21:00', text: `${'Eine Notiz, die weit über eine Zeile hinausgeht '.repeat(3)}und am Ende.` },
  );
  eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
  return {
    ...d, eintraege, tage, standardMittel: [{ id: 'sm1', mittel: name, dosis, tageszeit: 'morgens', bezug: null, form: null }],
  };
}

const LANG_MIT = 'Ritalin Adult in einer Packung mit einem ungewöhnlich langen Zusatz zum Namen xy';
const LANG_OHNE = `RitalinAdult${'X'.repeat(68)}`;
const DOSIS = '20 mg morgens, 10 mg mittags, je nach Tag.';
check(LANG_MIT.length === 80 && LANG_OHNE.length === 80 && DOSIS.length === 42, 'Testnamen: 80 Zeichen, Dosis über 40 Zeichen');

for (const [saat, name] of [[4, LANG_MIT], [9, LANG_OHNE]]) {
  const d = allesTagebuch(saat, name, DOSIS);
  const text = arztBericht({ ...d, adhsAn: true, spannungAn: true }, isoPlus(GRUND, -89), GRUND);
  const teile = ['IN KÜRZE', 'KOPFSCHMERZEN', 'NACH AKTIVITÄTEN', 'KIEFER, NACKEN, SCHIENE', 'EINGENOMMENE MITTEL',
    'HAT ES ETWAS BEWIRKT?', 'ADHS-MITTEL', 'NOTIZEN', 'NACH ZYKLUSPHASE', 'WIE LANGE NACH DEM ESSEN'];
  const fehlt = teile.filter((t) => !abschnitt(text, t));
  check(!fehlt.length && text.includes('Merkmale (Zahl der Kopfschmerzen)') && text.includes('oft schon beim')
    && text.includes('Stimmung (0 gut') && text.includes('Zusammen eingetragen:') && text.includes('Form: '),
  `Tagebuch ${saat}: alle Abschnitte an${fehlt.length ? ` – es fehlt: ${fehlt.join(', ')}` : ''}`);
  const lang = zuLang(text);
  check(!lang.length, `Tagebuch ${saat} (Name ${name.includes(' ') ? 'mit' : 'ohne'} Leerzeichen): keine Zeile mit 80 `
    + `Zeichen oder mehr${lang.length ? `: ${lang[0]}` : ''}`);
  // Name und Dosis stehen in voller Länge da, nur umbrochen.
  const mittel = abschnitt(text, 'EINGENOMMENE MITTEL').replace(/\s+/g, '');
  check(mittel.includes(`${name}${DOSIS}`.replace(/\s+/g, '')), `Tagebuch ${saat}: Name und Dosis in voller Länge`);
}

/* ---------- Schalter aus: die drei Abschnitte fehlen ---------- */

{
  const d = allesTagebuch(4, 'Medikinet adult', '20 mg');
  const von = isoPlus(GRUND, -89);
  const an = arztBericht({ ...d, adhsAn: true, spannungAn: true }, von, GRUND);
  for (const [a, s] of [[null, null], [false, false], [true, false], [false, true]]) {
    const aus = arztBericht({ ...d, adhsAn: a, spannungAn: s }, von, GRUND);
    const adhs = !!abschnitt(aus, 'ADHS-MITTEL') || !!abschnitt(aus, 'ESSENSRHYTHMUS');
    const kiefer = !!abschnitt(aus, 'KIEFER, NACKEN, SCHIENE');
    check(adhs === (a === true) && kiefer === (s === true) && !aus.includes('Stimmung (0 gut') === (a !== true),
      `ADHS ${a}, Kiefer ${s}: genau die eingeschalteten Abschnitte stehen da`);
  }
  check(!!abschnitt(an, 'ADHS-MITTEL') && !!abschnitt(an, 'KIEFER, NACKEN, SCHIENE'), 'mit beiden Schaltern beide');
}

/* ---------- Nur neue Angaben im Zeitraum ---------- */

{
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 30; i++) {
    const am = isoPlus(GRUND, -i);
    eintraege.push({ id: `c${i}`, art: 'medikament', am, um: '07:30', mittel: 'Concerta', dosis: '36 mg', form: 'oros' });
    tage[am] = { schiene: i % 3 ? 1 : 0 };
  }
  const von = isoPlus(GRUND, -29);
  const bericht = (a, s) => arztBericht({ eintraege, tage, adhsAn: a, spannungAn: s }, von, GRUND);
  const an = bericht(true, true);
  check(!an.includes('wurde nichts eingetragen') && !!abschnitt(an, 'ADHS-MITTEL')
    && abschnitt(an, 'KIEFER, NACKEN, SCHIENE').includes('Schiene: 20 Nächte getragen, 10 nicht'),
  'nur ADHS-Einnahmen und Antworten zur Schiene: mit Schaltern die neuen Abschnitte statt „nichts eingetragen“');
  check(an.includes('Tage mit Eintragung        0 von 30') && an.includes('Medikamenteneinnahmen      30'),
    'die Bauchzeilen stehen dabei auf null, die Einnahmen gezählt');
  check(bericht(null, null).includes('In diesem Zeitraum wurde nichts eingetragen.')
    && bericht(false, false).includes('In diesem Zeitraum wurde nichts eingetragen.'),
  'ohne Schalter bleibt es bei „nichts eingetragen“');
  check(!bericht(true, null).includes('wurde nichts eingetragen') && !bericht(null, true).includes('wurde nichts eingetragen'),
    'je ein Schalter reicht für seinen Teil');
  // Nur Tage „ohne Mittel" und Angaben zum Nacken: ebenso.
  const nurTage = {};
  for (let i = 0; i < 10; i++) nurTage[isoPlus(GRUND, -i)] = { adhsPause: 'geplant', verspannt: 2 };
  const pause = arztBericht({ eintraege: [], tage: nurTage, adhsAn: true, spannungAn: null }, von, GRUND);
  check(abschnitt(pause, 'ESSENSRHYTHMUS').includes('Als Tage ohne ADHS-Mittel notiert: 10'),
    'nur Tage ohne Mittel: ESSENSRHYTHMUS mit ihrer Zahl, ohne Einnahmen kein ADHS-Abschnitt');
}

/* ---------- Mittel: Form, Paare, B4, IN KÜRZE ---------- */

{
  // Methylphenidat als Kapsel mit zweierlei Kügelchen und ein Säureblocker
  // (W1); davor 30 Tage ohne Mittel, damit Vorher-Nachher rechnen kann.
  const eintraege = [];
  for (let i = 0; i < 60; i++) {
    const am = isoPlus(GRUND, -i);
    eintraege.push({ id: `f${i}`, art: 'essen', am, um: '07:00', was: 'Brot', portion: 'normal', zutaten: [] });
    eintraege.push({ id: `b${i}`, art: 'beschwerde', am, um: '11:00', staerke: 2 + (i % 3), arten: ['druck'] });
    if (i < 30) {
      eintraege.push({ id: `m${i}`, art: 'medikament', am, um: '07:15', mittel: 'Medikinet retard', dosis: '20 mg' });
      eintraege.push({ id: `n${i}`, art: 'medikament', am, um: '07:20', mittel: 'Nexium', dosis: '20 mg' });
    }
  }
  eintraege.push({ id: 'w1', art: 'beschwerde', am: GRUND, um: '13:00', staerke: 3, arten: ['druck'], warnzeichen: ['blutstuhl'] });
  eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
  const text = arztBericht({ eintraege, tage: {} }, isoPlus(GRUND, -59), GRUND);
  const kurz = abschnitt(text, 'IN KÜRZE').split('\n  - ').map((x) => x.replace(/\s+/g, ' ').trim());
  check(kurz[1].startsWith('Im Tagebuch stehen Dinge') && kurz[2].startsWith('Eingetragen sind Methylphenidat als Kapsel '
    + 'mit zweierlei Kügelchen und ein Säureblocker – laut Fachinformation zusammen eine Gegenanzeige'),
  `IN KÜRZE: W1 als erster Satz nach den Warnzeichen (${(kurz[2] || '').slice(0, 40)}…)`);
  check(kurz.length - 1 <= 5, `IN KÜRZE: höchstens fünf Sätze (${kurz.length - 1})`);
  const mittel = abschnitt(text, 'EINGENOMMENE MITTEL');
  check(mittel.includes('Medikinet retard 20 mg – 30 Mal\n    Form: Kapsel mit zweierlei Kügelchen'),
    'unter dem Methylphenidat steht seine Form');
  check(/Zusammen eingetragen: Medikinet retard \(Methylphenidat, Kapsel mit\s+zweierlei Kügelchen\) und Nexium\./.test(mittel)
    && mittel.includes('Frage: Passt mein Säureblocker zu meinem Methylphenidat?'),
  'das Paar steht bei den Mitteln, mit der Frage für die Sprechstunde');
  // So streng, wie die Fachinformation es sagt: eine Gegenanzeige, nicht bloß „nicht vorgesehen".
  check(/unter den\s+Gegenanzeigen/.test(mittel) && !/nicht zusammen\s+vor/.test(mittel),
    'beim Paar steht die Gegenanzeige aus der Fachinformation');
  check(!/weglassen|absetzen|nimm|empfohlen|du solltest/i.test(mittel), 'und ohne Rat, etwas wegzulassen oder zu nehmen');
  const bewirkt = abschnitt(text, 'HAT ES ETWAS BEWIRKT?');
  check(bewirkt.includes('Medikinet retard') && bewirkt.replace(/\s+/g, ' ').includes('Seit dem ersten Eintrag')
    && !/nichts geändert|Kein Unterschied zur Zeit davor|besser geworden|schlechter geworden/.test(bewirkt.split('Nexium')[0]),
  'B4: beim ADHS-Mittel nur „Seit dem ersten Eintrag …“, kein Urteil');
  check(!abschnitt(text, 'IN KÜRZE').includes('Medikinet retard hat'), 'IN KÜRZE sagt über das ADHS-Mittel nichts aus');

  // W1u: Methylphenidat ohne Form und ein Mittel gegen Sodbrennen.
  const ohneForm = eintraege.map((e) => (e.mittel === 'Medikinet retard' ? { ...e, mittel: 'Methylphenidat' }
    : (e.mittel === 'Nexium' ? { ...e, mittel: 'Rennie' } : e))).filter((e) => !e.warnzeichen);
  const t2 = arztBericht({ eintraege: ohneForm, tage: {} }, isoPlus(GRUND, -59), GRUND);
  const kurz2 = abschnitt(t2, 'IN KÜRZE').split('\n  - ').map((x) => x.replace(/\s+/g, ' ').trim());
  check(kurz2[1].startsWith('Eingetragen sind Methylphenidat ohne Angabe der Form und ein Säureblocker'),
    'IN KÜRZE: W1u ohne Warnzeichen als erster Satz');
  check(kurz2[1].includes('bei manchen Kapseln laut Fachinformation zusammen eine Gegenanzeige')
    && /unter den\s+Gegenanzeigen/.test(abschnitt(t2, 'EINGENOMMENE MITTEL')),
  'W1u: in IN KÜRZE und beim Paar die Gegenanzeige, wie die Fachinformation sie nennt');
  check(abschnitt(t2, 'EINGENOMMENE MITTEL').includes('Form: nicht angegeben'), 'ohne Form steht „nicht angegeben“');
  // Mit Form „Retardtablette mit Hülle": kein Satz zum Säureblocker.
  const oros = ohneForm.map((e) => (e.mittel === 'Methylphenidat' ? { ...e, mittel: 'Concerta' } : e));
  const t3 = arztBericht({ eintraege: oros, tage: {} }, isoPlus(GRUND, -59), GRUND);
  check(!t3.includes('Zusammen eingetragen') && !t3.includes('Eingetragen sind Methylphenidat'),
    'Concerta mit Rennie: kein Paar, auch oben nicht');
}

/* ---------- Ebene 0: der Vorbehalt am Zeitprofil ---------- */

{
  // Jede Beschwerde liegt eine Dreiviertelstunde nach dem Mittel und eine
  // Stunde nach dem Frühstück – das Zeitfenster misst beides.
  const eintraege = [];
  for (let i = 1; i <= 15; i++) {
    const am = isoPlus(GRUND, -i);
    eintraege.push(
      { id: `f${i}`, art: 'essen', am, um: '07:00', was: 'Frühstück', portion: 'normal', zutaten: [] },
      { id: `m${i}`, art: 'medikament', am, um: '07:15', mittel: 'Elvanse', dosis: '30 mg' },
      { id: `b${i}`, art: 'beschwerde', am, um: '08:00', staerke: 4, arten: ['druck'] },
      { id: `a${i}`, art: 'essen', am, um: '13:00', was: 'Mittag', portion: 'normal', zutaten: [] },
    );
  }
  const text = arztBericht({ eintraege, tage: {}, adhsAn: null, spannungAn: null }, isoPlus(GRUND, -29), GRUND);
  check(abschnitt(text, 'WIE LANGE NACH DEM ESSEN').replace(/\s+/g, ' ').includes('15 dieser 15 Beschwerden lagen zugleich '
    + 'in den 4 Stunden nach einem ADHS-Mittel – das Zeitfenster nach dem Essen und das nach dem Mittel fallen hier '
    + 'zusammen.'), 'unter „Wie lange nach dem Essen“ der Vorbehalt, auch ohne Schalter');
  check(!abschnitt(text, 'ADHS-MITTEL'), 'aber ohne Schalter kein Abschnitt ADHS-MITTEL');
}

/* ---------- Ebene 0: der Vorbehalt an Massage, Massagepistole und Wärme ---------- */

{
  // Massage an jedem vierten Abend, Kopfschmerz an etwa jedem dritten Tag,
  // jeder Tag durch einen Stuhlgang notiert. Unter NACH AKTIVITÄTEN steht die
  // Kopfzeile – und neben ihr gehört derselbe Vorbehalt wie auf „Muster“,
  // ob „Kiefer, Nacken, Schiene“ an ist oder nicht.
  const tagebuch = (aktivitaet) => {
    const eintraege = [];
    let z = 7;
    const r = () => { z = (z * 48271) % 2147483647; return z / 2147483647; };
    for (let i = 0; i < 120; i++) {
      const am = isoPlus(GRUND, -i);
      eintraege.push({ id: `s${i}`, art: 'stuhl', am, um: '07:00', form: 4 });
      if (i % 4 === 0) eintraege.push({ id: `g${i}`, art: 'aktivitaet', am, um: '18:00', aktivitaeten: [aktivitaet] });
      if (r() < 0.35) eintraege.push({ id: `k${i}`, art: 'kopf', am, um: '15:00', staerke: 4, kopfArten: [] });
    }
    return eintraege.sort((a, b) => (a.am === b.am ? (a.um < b.um ? -1 : 1) : (a.am < b.am ? -1 : 1)));
  };
  const von = isoPlus(GRUND, -119);
  const massage = tagebuch('massage');
  const an = arztBericht({ eintraege: massage, tage: {}, adhsAn: null, spannungAn: true }, von, GRUND);
  const aus = arztBericht({ eintraege: massage, tage: {}, adhsAn: null, spannungAn: false }, von, GRUND);
  const teil = abschnitt(aus, 'NACH AKTIVITÄTEN');
  const flach = teil.replace(/\s+/g, ' ');
  check(teil.includes('Massage/Physio') && /Kopf an \d+ von \d+ Tagen/.test(teil),
    `unter NACH AKTIVITÄTEN steht die Kopfzeile zur Massage (${teil.split('\n').filter((z) => /Massage\/Physio|Kopf an/.test(z)).map((z) => z.trim()).join(' / ')})`);
  check(flach.includes('(Massiert oder gewärmt wird oft, wenn sich etwas anbahnt – ein Kopfschmerz danach kann '
    + 'schon unterwegs gewesen sein; danach wird es außerdem oft von selbst besser.)')
    && flach.split('anbahnt').length === 2,
  'und darunter einmal der Vorbehalt, auch mit „Kiefer, Nacken, Schiene“ aus');
  check(abschnitt(an, 'NACH AKTIVITÄTEN') === teil, 'mit dem Schalter an steht dort dasselbe, Zeichen für Zeichen');
  check(!zuLang(teil).length, `keine Zeile mit 80 Zeichen oder mehr${zuLang(teil).length ? `: ${zuLang(teil)[0]}` : ''}`);
  const yoga = arztBericht({ eintraege: tagebuch('yoga'), tage: {}, adhsAn: null, spannungAn: false }, von, GRUND);
  check(/Kopf an \d+ von/.test(abschnitt(yoga, 'NACH AKTIVITÄTEN')) && !yoga.includes('anbahnt'),
    'beim Dehnen steht der Vorbehalt nicht');
}

/* ---------- Die Aufwach-Frage ---------- */

{
  const eintraege = [];
  const tage = {};
  for (let i = 0; i < 12; i++) {
    const am = isoPlus(GRUND, -2 * i);
    eintraege.push({ id: `k${i}`, art: 'kopf', am, um: '06:30', staerke: 4, kopfArten: i < 4 ? ['aufwachen'] : ['drueckend'] });
    tage[am] = { schiene: 1 };
  }
  const z = { anzahl: 12, letzte30: 0 };
  const fragen = (aufwach, spannungAn) => kopfFragen({ zahlen: z, mittel: null, aufwach, spannungAn }).join(' ');
  const aw = aufwachZahlen(eintraege, tage, GRUND);
  check(aw.aufwachen === 4 && aw.schiene === 12, `gezählt über die letzten 30 Tage (${aw.aufwachen} beim Aufwachen, ${aw.schiene} Nächte mit Schiene)`);
  check(fragen(aw, false).startsWith('Ich habe oft schon beim Aufwachen Kopfschmerzen. Gehören Schlaf (Schnarchen, '
    + 'Atemaussetzer), Koffein oder meine Schmerzmittel mit auf die Liste?'), 'ab vier Kopfschmerzen beim Aufwachen die Frage');
  check(fragen(aw, true).startsWith('Ich trage eine Aufbissschiene und habe oft schon beim Aufwachen Kopfschmerzen.'),
    'mit „Kiefer, Nacken, Schiene“ und zehn Nächten Schiene die Fassung mit der Schiene');
  check(!fragen({ aufwachen: 3, schiene: 12 }, true).includes('Aufwachen')
    && fragen({ aufwachen: 4, schiene: 9 }, true).startsWith('Ich habe oft'),
  'unter vier keine Frage, unter zehn Nächten ohne die Schiene');
  check(!fragen(null, true).includes('Aufwachen'), 'ohne Zählung bleibt es bei den alten Fragen');
}

ende();
