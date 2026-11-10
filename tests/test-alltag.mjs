/*
 * Der Alltag einer App, die nie geschlossen wird – als iPhone, 320 Pixel.
 *
 *   1. Tageswechsel: Wer „Tag" abends offen lässt und morgens zurückkommt,
 *      steht auf dem neuen Tag – auch über ein Neuladen für eine neue Fassung
 *      hinweg, das im Hintergrund passiert ist. Ein von Hand gewählter Tag
 *      bleibt, ein offener Bogen auch.
 *   2. Ein Tag mit nur einem ADHS-Mittel ist für den Bauch eine Lücke – die
 *      Tageskarte sagt das, das Monatsraster nennt ihn nicht „nichts
 *      eingetragen".
 *   3. Die einmalige Karte „Was sich an deinen Zahlen geändert hat": nur,
 *      wenn ein Punkt zutrifft, und nach „Gelesen" nicht mehr.
 *   4. Der Satz zur Tablettenhülle im Stuhl-Bogen.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { ROOT, KEY, pruefer } from './umgebung.mjs';
import { kopieServer } from './vorrat.mjs';

const { check, ende } = pruefer();
const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING ? path.resolve(process.env.BAUCHBUCH_PRUEFLING) : ROOT;
const PORT = Number(process.env.BAUCHBUCH_PORT_ALLTAG || 8531);
if (PORT < 8531 || PORT > 8539) throw new Error(`Port ${PORT} liegt außerhalb von 8531–8539`);

const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';
const SCHMAL = { width: 320, height: 760 };
// Der letzte Tag eines Monats: Über Mitternacht wechselt auch der Monat.
const TAG = '2026-05-31';
const MORGEN = '2026-06-01';
const VORTAG = '2026-05-30';
const um = (hhmm, iso = TAG) => new Date(`${iso}T${hhmm}:00+02:00`);

const kopie = await kopieServer(PRUEFLING, PORT, { maxAge: 0 });
const browser = await chromium.launch();
const fehler = [];
const GRUND = {
  begruesst: true, tab: 'heute', alterName: null, startbildschirmWeg: true, unterleibGefragt: true,
  lastBackup: { on: TAG, anzahl: 1 }, v28Gesagt: true, v29Gesagt: true, tage: {}, standardMittel: [],
  eintraege: [{ id: 'f1', art: 'essen', am: TAG, um: '19:00', was: 'Suppe', zutaten: [], portion: 'normal' }],
};

/**
 * Ein iPhone. `versteckt` lässt die Seite im Hintergrund laden – wie nach
 * einem Neuladen, das beim Verlassen der App passiert ist.
 */
async function iphone(stand, zeit, { versteckt = false, nachNeuladen = null } = {}) {
  const ctx = await browser.newContext({
    viewport: SCHMAL, userAgent: KENNUNG, serviceWorkers: 'block', hasTouch: true, isMobile: true,
    timezoneId: 'Europe/Berlin', locale: 'de-DE',
  });
  // stand === null: ein leerer Speicher, wie nach dem ersten Öffnen.
  await ctx.addInitScript(([k, s, v]) => {
    Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    try { if (s && !localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
    if (v) Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
  }, [KEY, stand === null ? null : { ...GRUND, ...stand }, versteckt]);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
  await page.clock.setFixedTime(zeit);
  if (nachNeuladen) {
    // Erst die Seite öffnen, dann den Zettel hinlegen, den neuLaden() schreibt,
    // und neu laden – so, wie es die App vor einem Neuladen selbst tut.
    await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
    await page.evaluate((z) => sessionStorage.setItem('bauchbuch.nachNeuladen', JSON.stringify(z)), nachNeuladen);
    await page.reload({ waitUntil: 'networkidle' });
  } else {
    await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
  }
  return { ctx, page };
}
/** Die App verlassen oder wieder nach vorn holen. */
const sichtbar = (page, ja) => page.evaluate((v) => {
  Object.defineProperty(document, 'visibilityState', { value: v ? 'visible' : 'hidden', configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}, ja);
const kurz = (page) => page.waitForTimeout(200);
const tipp = async (page, sel) => { await page.locator(sel).first().click(); await kurz(page); };
const tagIst = (page) => page.locator('.tag-datum').inputValue();
const speicher = (page) => page.evaluate(async (k) => {
  const st = await import('/js/store.js');
  st.sofortSchreiben();
  return JSON.parse(localStorage.getItem(k));
}, KEY);

/* ---------- 1. Tageswechsel ---------- */

{
  const { ctx, page } = await iphone({}, um('23:50'));
  check(await tagIst(page) === TAG, 'abends steht „Tag" auf heute');
  await sichtbar(page, false);
  await page.clock.setFixedTime(um('07:15', MORGEN));
  await sichtbar(page, true);
  await kurz(page);
  check(await tagIst(page) === MORGEN, `nach Mitternacht und Rückkehr steht „Tag" auf dem neuen Tag (${await tagIst(page)})`);
  check((await page.locator('.tagkopf h2').innerText()).trim() === 'heute', 'und heißt „heute"');
  await tipp(page, '[data-act="tab"][data-tab="verlauf"]');
  check((await page.locator('.monatkopf h3').innerText()).includes('Juni'), 'auch der Monat im Verlauf ist mitgerückt');
  await ctx.close();
}
{
  // Von Hand gewählter Vortag bleibt.
  const { ctx, page } = await iphone({}, um('23:50'));
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  check(await tagIst(page) === VORTAG, 'von Hand den Vortag gewählt');
  await sichtbar(page, false);
  await page.clock.setFixedTime(um('07:15', MORGEN));
  await sichtbar(page, true);
  await kurz(page);
  check(await tagIst(page) === VORTAG, 'ein von Hand gewählter Tag bleibt nach der Rückkehr');
  await ctx.close();
}
{
  // Ein offener Bogen bleibt offen, und der Tag mit ihm.
  const { ctx, page } = await iphone({}, um('23:50'));
  await tipp(page, '[data-act="neu"][data-art="notiz"]');
  await page.locator('#bogenText').fill('Halb geschrieben');
  await sichtbar(page, false);
  await page.clock.setFixedTime(um('07:15', MORGEN));
  await sichtbar(page, true);
  await kurz(page);
  check(await page.locator('.bogen').count() === 1 && await page.locator('#bogenText').inputValue() === 'Halb geschrieben',
    'ein offener Bogen bleibt offen, mit dem Text darin');
  await tipp(page, 'button.bogen-zu');
  check(await tagIst(page) === TAG, 'und der Tag springt nicht unter ihm weg');
  await ctx.close();
}
{
  // Neue Fassung wartet → beim Verlassen neu geladen (noch vor Mitternacht,
  // im Hintergrund) → Mitternacht → Rückkehr.
  const zettel = {
    zeit: um('23:50').getTime(), warum: 'selbst', tag: TAG, tagWarHeute: true, monat: '2026-05-01', zeitraum: 30,
  };
  const { ctx, page } = await iphone({}, um('23:50'), { versteckt: true, nachNeuladen: zettel });
  check(await tagIst(page) === TAG, 'nach dem Neuladen im Hintergrund steht derselbe Tag');
  await page.clock.setFixedTime(um('06:40', MORGEN));
  await sichtbar(page, true);
  await kurz(page);
  check(await tagIst(page) === MORGEN, `nach Mitternacht und Rückkehr der neue Tag – auch über das Neuladen hinweg (${await tagIst(page)})`);
  await ctx.close();
}
{
  // Das Neuladen selbst liegt schon nach Mitternacht.
  const zettel = {
    zeit: um('00:05', MORGEN).getTime(), warum: 'selbst', tag: TAG, tagWarHeute: true, monat: '2026-05-01', zeitraum: 30,
  };
  const { ctx, page } = await iphone({}, um('00:05', MORGEN), { nachNeuladen: zettel });
  check(await tagIst(page) === MORGEN, 'liegt das Neuladen nach Mitternacht, steht danach der neue Tag');
  await ctx.close();
}
{
  // War beim Neuladen von Hand ein anderer Tag gewählt, bleibt er.
  const zettel = {
    zeit: um('00:05', MORGEN).getTime(), warum: 'selbst', tag: VORTAG, tagWarHeute: false, monat: '2026-05-01', zeitraum: 30,
  };
  const { ctx, page } = await iphone({}, um('00:05', MORGEN), { nachNeuladen: zettel });
  check(await tagIst(page) === VORTAG, 'ein von Hand gewählter Tag übersteht das Neuladen');
  await ctx.close();
}

/* ---------- 2. Ein Tag mit nur einem ADHS-Mittel ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [
      { id: 'm1', art: 'medikament', am: VORTAG, um: '07:30', mittel: 'Attentin', dosis: '5 mg' },
      { id: 'a1', art: 'aktivitaet', am: '2026-05-29', um: '18:00', aktivitaeten: ['laufen'] },
      { id: 'f1', art: 'essen', am: TAG, um: '08:00', was: 'Brot', zutaten: [], portion: 'normal' },
    ],
  }, um('12:00'));
  await tipp(page, '[data-act="tag-blaettern"][data-d="-1"]');
  const karte = (await page.locator('.tagbilanz').innerText()).replace(/\s+/g, ' ');
  check(karte.includes('Eingetragen ist bisher nur ein Mittel.') && karte.includes('noch als Lücke, nicht als beschwerdefrei'),
    `die Tageskarte sagt, dass der Tag für den Bauch eine Lücke ist (${karte.slice(0, 60)})`);
  check(!karte.includes('beschwerdefrei') || karte.includes('nicht als beschwerdefrei'), 'und nennt ihn nicht beschwerdefrei');
  await tipp(page, '[data-act="tab"][data-tab="verlauf"]');
  const feld = page.locator(`.rfeld[data-iso="${VORTAG}"]`);
  check((await feld.getAttribute('class')).includes('f-leer'), 'im Monatsraster bleibt er eine Lücke in der Farbe');
  check((await feld.getAttribute('aria-label')).endsWith('nur Mittel oder Aktivität – zum Bauch nichts eingetragen'),
    `und sagt, dass dort etwas steht (${await feld.getAttribute('aria-label')})`);
  const lauf = page.locator('.rfeld[data-iso="2026-05-29"]');
  check((await lauf.getAttribute('aria-label')).endsWith('nur Mittel oder Aktivität – zum Bauch nichts eingetragen'),
    'ebenso ein Tag nur mit einer Aktivität');
  const leer = page.locator('.rfeld[data-iso="2026-05-20"]');
  check((await leer.getAttribute('aria-label')).endsWith(': nichts eingetragen'), 'ein leerer Tag heißt weiter „nichts eingetragen"');
  check((await page.locator('.legende').innerText()).includes('nichts eingetragen oder zum Bauch nichts'),
    'die Legende sagt beides');
  const b = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  check(b[0] <= b[1], 'der Verlauf passt in 320 Pixel');
  await ctx.close();
}

/* ---------- 3. Die einmalige Hinweiskarte auf „Muster" ---------- */

{
  // Nichts davon trifft zu: keine Karte.
  const { ctx, page } = await iphone({ v28Gesagt: false, tab: 'muster' }, um('12:00'));
  check(await page.locator('.v28-karte').count() === 0, 'ohne einen zutreffenden Punkt keine Hinweiskarte');
  await ctx.close();
}
{
  const { ctx, page } = await iphone({
    v28Gesagt: false,
    tab: 'muster',
    eintraege: [
      { id: 'm1', art: 'medikament', am: VORTAG, um: '07:30', mittel: 'Ritalin LA', dosis: '20 mg' },
      { id: 'm2', art: 'medikament', am: '2026-05-28', um: '07:30', mittel: 'Ritalin LA', dosis: '20 mg' },
      { id: 'c1', art: 'medikament', am: '2026-05-27', um: '15:00', mittel: 'Koffein', dosis: '' },
      { id: 'c2', art: 'medikament', am: '2026-05-26', um: '15:00', mittel: 'Paracetamol Koffein', dosis: '' },
      { id: 'p1', art: 'medikament', am: '2026-05-25', um: '07:00', mittel: 'Agopton', dosis: '15 mg' },
      // Ein Name mit Coffein, den die App nicht kennt, ist keine
      // Koffeintablette; eine Marke mit ASS und Koffein ein Kombinationsmittel.
      { id: 'c3', art: 'medikament', am: '2026-05-23', um: '15:00', mittel: 'Kopfweg mit Coffein', dosis: '' },
      { id: 'c4', art: 'medikament', am: '2026-05-22', um: '15:00', mittel: 'Spalt plus Koffein', dosis: '' },
      // Mit Koffein, aber ohne einen Wirkstoff, den die App kennt: Bis Fassung
      // 27 zählte das als Kombinationsmittel, jetzt gar nicht – das muss die
      // Karte sagen, sonst sinkt die Zahl für den Übergebrauch still.
      { id: 'c5', art: 'medikament', am: '2026-05-19', um: '15:00', mittel: 'Kopfschmerztabletten mit Koffein', dosis: '' },
      // „Omep" ist neu, „Omeprazol" kannte schon die Fassung 27.
      { id: 'p2', art: 'medikament', am: '2026-05-21', um: '07:00', mittel: 'Omep 20', dosis: '' },
      { id: 'p3', art: 'medikament', am: '2026-05-20', um: '07:00', mittel: 'Omeprazol', dosis: '20 mg' },
      { id: 'k1', art: 'kopf', am: '2026-05-25', um: '10:00', staerke: 4, kopfArten: ['licht'] },
      { id: 'f1', art: 'essen', am: '2026-05-25', um: '08:00', was: 'Brot', zutaten: [], portion: 'normal' },
    ],
  }, um('12:00'));
  const karte = (await page.locator('.v28-karte').innerText()).replace(/\s+/g, ' ');
  check(karte.startsWith('Was sich an deinen Zahlen geändert hat'), 'die Hinweiskarte steht da');
  check((await page.locator('#view > .karte').first().getAttribute('class')).includes('v28-karte'), 'ganz oben');
  check(karte.includes('2 Tage, an denen nur ein ADHS-Mittel steht, zählen jetzt als Lücke'), `mit der Zahl der Tage (${karte})`);
  check(karte.includes('Koffein als Tablette zählt nicht mehr als Schmerzmittel') && karte.includes('(1 Eintrag)'),
    'mit Koffein als Tablette – nur der eine Eintrag, der nichts außer Koffein trägt');
  check(karte.includes('Kombinationsmittel') && karte.includes('Paracetamol mit Koffein zählt in der Magenauswertung nicht mehr als NSAR')
    && karte.includes('an zehn oder mehr Tagen im Monat über mehr als drei Monate') && !karte.includes('Grenze von etwa zehn')
    && karte.includes('Paracetamol Koffein') && karte.includes('Spalt plus Koffein') && !karte.includes('Kopfweg'),
  'mit den Schmerzmitteln mit Koffein');
  const kombiSatz = (karte.match(/Schmerzmittel mit Koffein[^.]*\./) || [''])[0];
  check(!/\balle\b/.test(kombiSatz) && kombiSatz.includes('deren Wirkstoff die App erkennt') && !kombiSatz.includes('Kopfschmerztabletten'),
    `der Satz zu den Kombinationsmitteln sagt nicht „alle“ und nennt nur, was die App erkennt (${kombiSatz})`);
  const fremdSatz = (karte.match(/Kopfschmerztabletten mit Koffein[^.]*\.[^.]*\.[^.]*\./) || [''])[0];
  check(fremdSatz.startsWith('Kopfschmerztabletten mit Koffein zählte bisher als Kombinationsmittel')
    && fremdSatz.includes('zählt jetzt nicht mehr mit') && !karte.includes('Kopfweg mit Coffein zählte'),
  `ein Name mit Koffein ohne erkannten Wirkstoff: die Karte sagt, dass er nicht mehr mitzählt (${fremdSatz})`);
  // Seit der Fassung 30 „Mittel gegen Magensäure“ statt „Säureblocker“:
  // Unter den neuen Namen ist auch Maaloxan, ein Antazidum, das Säure bindet.
  const saeureSatz = (karte.match(/[^.]*als Mittel gegen Magensäure erkannt\./) || [''])[0].trim();
  check(/^(Agopton und Omep 20|Omep 20 und Agopton) werden jetzt als Mittel gegen Magensäure erkannt\.$/.test(saeureSatz)
    && !karte.includes('Omeprazol') && !karte.includes('Säureblocker erkannt'),
  `mit den neu erkannten Mitteln gegen Magensäure – ohne das, das schon die Fassung 27 kannte (${saeureSatz})`);
  check(karte.includes('„Licht“ und „Lärm“ jetzt getrennt'), 'und mit Licht und Lärm');
  await tipp(page, '[data-act="v28-gelesen"]');
  check(await page.locator('.v28-karte').count() === 0, '„Gelesen" nimmt sie weg');
  check((await speicher(page)).v28Gesagt === true, 'und merkt es sich');
  await page.reload({ waitUntil: 'networkidle' });
  check(await page.locator('.v28-karte').count() === 0, 'sie kommt nicht wieder');
  await ctx.close();
}

/*
 * Wer erst mit der Fassung 28 anfängt, hatte nie andere Zahlen – die Karte
 * erzählte von einer Änderung, die es für ihn nie gab. Kommen ältere Einträge
 * über eine Sicherung dazu, gilt sie wieder.
 */
const muster = (page) => tipp(page, '[data-act="tab"][data-tab="muster"]');
const karteDa = async (page) => (await page.locator('.v28-karte').count()) === 1;
const einlesen = async (page, stand) => {
  await tipp(page, '[data-act="tab"][data-tab="mehr"]');
  await tipp(page, '[data-act="einfuegen-auf"]');
  await page.locator('[data-act="einfuegen-text"]').fill(JSON.stringify(stand));
  await tipp(page, '[data-act="einfuegen-los"]');
};
const kopfAm = (id, am, arten) => ({ id, art: 'kopf', am, um: '10:00', staerke: 4, kopfArten: arten });
// Eine Sicherung der Fassung 27: ohne den Schlüssel v28Gesagt.
const sicherung27 = {
  begruesst: true,
  eintraege: [
    kopfAm('alt1', '2026-05-20', ['licht']),
    { id: 'alt2', art: 'medikament', am: '2026-05-21', um: '07:30', mittel: 'Elvanse', dosis: '30 mg' },
  ],
  tage: {},
};
/** Neu angefangen: leerer Speicher, „Anfangen", ein Kopfschmerz mit „Licht stört". */
async function neuMitKopf() {
  const { ctx, page } = await iphone(null, um('12:00'));
  await tipp(page, '[data-act="los"]');
  await tipp(page, '[data-act="neu"][data-art="kopf"]');
  await tipp(page, '[data-act="staerke"][data-n="4"]');
  await tipp(page, '[data-act="kopfart"][data-id="lichtscheu"]');
  await tipp(page, '[data-act="bogen-speichern"]');
  return { ctx, page };
}
{
  const { ctx, page } = await neuMitKopf();
  // Dazu ein Tag nur mit einem ADHS-Mittel – auch der wäre ein Punkt der Karte.
  await page.evaluate(async () => {
    const st = await import('/js/store.js');
    st.eintragen({ art: 'medikament', am: '2026-05-30', um: '07:40', mittel: 'Concerta', dosis: '18 mg' });
  });
  const s = await speicher(page);
  check(s.eintraege.length === 2 && s.v28Gesagt === true,
    `ein neuer Stand gilt als gesagt (${s.eintraege.length} Einträge, v28Gesagt ${s.v28Gesagt})`);
  await muster(page);
  check(!(await karteDa(page)), 'neu angefangen: trotz Kopfschmerz und Tag nur mit Mittel keine Hinweiskarte');
  await page.reload({ waitUntil: 'networkidle' });
  await muster(page);
  check(!(await karteDa(page)), 'auch nach dem Neuladen nicht');
  // Eine ältere Sicherung kommt dazu: Jetzt gibt es frühere Einträge.
  await einlesen(page, sicherung27);
  const z = await speicher(page);
  check(z.eintraege.length === 4 && z.v28Gesagt === false,
    `eine Sicherung der Fassung 27 zusammengeführt: die Karte gilt wieder (${z.eintraege.length}, ${z.v28Gesagt})`);
  await muster(page);
  check(await karteDa(page) && (await page.locator('.v28-karte').innerText()).includes('„Licht“ und „Lärm“ jetzt getrennt'),
    'die Hinweiskarte steht da, mit Licht und Lärm');
  await ctx.close();
}
{
  // Ein neues Telefon, die Sicherung vom alten eingelesen: ersetzt, und die
  // Karte gilt wie dort.
  const { ctx, page } = await iphone(null, um('12:00'));
  await tipp(page, '[data-act="los"]');
  await einlesen(page, sicherung27);
  check((await speicher(page)).v28Gesagt === false, 'leer, dann eine Sicherung der Fassung 27: die Karte gilt');
  await muster(page);
  check(await karteDa(page), 'und steht da');
  await ctx.close();
}
{
  // Ein Stand der Fassung 27 im Speicher – ohne den Schlüssel.
  const { ctx, page } = await iphone({
    v28Gesagt: undefined, tab: 'muster', eintraege: [kopfAm('k1', VORTAG, ['licht'])],
  }, um('12:00'));
  check(await karteDa(page) && (await page.locator('.v28-karte').innerText()).includes('„Licht“ und „Lärm“ jetzt getrennt'),
    'ein Stand der Fassung 27 mit Kopfschmerz: die Hinweiskarte steht da');
  // Aus dem geladenen Zustand: Geschrieben wird erst, wenn sich etwas ändert.
  const geladen = await page.evaluate(async () => (await import('/js/store.js')).zustandLesen().v28Gesagt);
  check(geladen === false, `v28Gesagt ist dort false (${geladen})`);
  await ctx.close();
}
{
  // Neu angefangen, dann Sicherungen der Fassung 28: gelesen bleibt gelesen,
  // Einträge, die schon da sind, ändern nichts – eine ungelesene mit neuen
  // Einträgen bringt die Karte.
  const { ctx, page } = await neuMitKopf();
  const hier = (await speicher(page)).eintraege[0];
  await einlesen(page, { ...sicherung27, v28Gesagt: true });
  check((await speicher(page)).v28Gesagt === true, 'eine Sicherung, in der die Karte gelesen ist: bleibt gesagt');
  await einlesen(page, { begruesst: true, eintraege: [hier], tage: {} });
  check((await speicher(page)).v28Gesagt === true, 'eine Sicherung der Fassung 27 nur mit Einträgen, die schon da sind: bleibt gesagt');
  await einlesen(page, {
    begruesst: true, v28Gesagt: false, eintraege: [kopfAm('alt3', '2026-05-18', ['pochend'])], tage: {},
  });
  check((await speicher(page)).v28Gesagt === false, 'eine ungelesene mit neuen Einträgen: die Karte gilt wieder');
  await muster(page);
  check(await karteDa(page), 'und steht da');
  await ctx.close();
}

/* ---------- 4. Die Tablettenhülle ---------- */

{
  const { ctx, page } = await iphone({
    eintraege: [{ id: 'm1', art: 'medikament', am: VORTAG, um: '07:30', mittel: 'Concerta', dosis: '18 mg' }],
  }, um('12:00'));
  await tipp(page, '[data-act="neu"][data-art="stuhl"]');
  const satz = (await page.locator('.huellen-satz').innerText()).trim();
  check(satz === 'Die leere Tablettenhülle kann im Stuhl zu sehen sein – laut Packungsbeilage normal.',
    `im Stuhl-Bogen steht der Satz zur Hülle – nur dieser (${satz})`);
  await ctx.close();
}
{
  const { ctx, page } = await iphone({
    eintraege: [{ id: 'm1', art: 'medikament', am: VORTAG, um: '07:30', mittel: 'Medikinet adult', dosis: '10 mg' }],
  }, um('12:00'));
  await tipp(page, '[data-act="neu"][data-art="stuhl"]');
  check(await page.locator('.huellen-satz').count() === 0, 'bei einer Kapsel nicht');
  await ctx.close();
}
{
  /*
   * Eine Hülle von vor einem halben Jahr, gestern „Weiß ich nicht“, unter
   * „Meine Mittel“ die Kapsel mit zweierlei Kügelchen: Es gilt die Kapsel –
   * im Stuhl-Bogen kein Hüllensatz, auf „Tag“ die Karte der Stufe A, und in
   * der Liste unter „Mehr“ steht die Kapsel als Form.
   */
  const { ctx, page } = await iphone({
    standardMittel: [
      { id: 's1', mittel: 'Methylphenidat', dosis: '10 mg', tageszeit: null, bezug: null, form: 'pellet' },
      { id: 's2', mittel: 'Rifun 40', dosis: '', tageszeit: null, bezug: null, form: null },
    ],
    eintraege: [
      { id: 'm1', art: 'medikament', am: '2025-11-26', um: '07:30', mittel: 'Methylphenidat', dosis: '10 mg', form: 'oros' },
      { id: 'm2', art: 'medikament', am: VORTAG, um: '07:30', mittel: 'Methylphenidat', dosis: '10 mg', form: 'unbekannt' },
    ],
  }, um('12:00'));
  check(await page.locator('.wechsel-karte').count() === 1
    && (await page.locator('.wechsel-karte').innerText()).includes('Kapsel mit zweierlei Kügelchen und Rifun 40'),
  'die Karte der Stufe A steht auf „Tag“ – die alte Hülle sticht die Wahl unter „Meine Mittel“ nicht');
  await tipp(page, '[data-act="neu"][data-art="stuhl"]');
  check(await page.locator('.huellen-satz').count() === 0, 'im Stuhl-Bogen kein Satz zur Hülle');
  await tipp(page, 'button.bogen-zu');
  await tipp(page, '[data-act="tab"][data-tab="mehr"]');
  const mehr = ((await page.locator('#view').innerText()) || '').replace(/\s+/g, ' ');
  check(mehr.includes('Form: Kapsel mit zweierlei Kügelchen') && !mehr.includes('Form: Retardtablette mit Hülle'),
    'unter „Mehr“ steht beim Mittel die Kapsel als Form, nicht die alte Hülle');
  await ctx.close();
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
await kopie.zu();
ende();
