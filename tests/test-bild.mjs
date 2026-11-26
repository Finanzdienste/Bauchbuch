/*
 * Die Einordnung – der Teil, der am nächsten an eine Diagnose herankommt.
 *
 * Genau deshalb wird er am schärfsten geprüft. Drei Dinge müssen stimmen:
 *
 *   1. **Warnzeichen kommen durch, immer und ganz oben.** Ein einziges Mal
 *      Blut erbrochen ist ein einziges Mal zu viel; das darf keine Schwelle
 *      wegfiltern und keine Statistik verdünnen.
 *   2. **Das Bild passt zum Verlauf.** Nüchternschmerz muss als
 *      Nüchternschmerz erkannt werden und nicht als „Völlegefühl nach dem
 *      Essen" – die beiden führen in verschiedene Sprechstunden.
 *   3. **Es bleibt eine Beschreibung.** Kein Satz, der behauptet, jemand
 *      *habe* etwas. Jedes Muster nennt seine Belege mit Zahlen und die
 *      Untersuchung, die es klären würde.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, vorTagen, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const setze = async (stand) => {
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, stand]);
  await page.reload({ waitUntil: 'networkidle' });
};

await page.goto(URL, { waitUntil: 'networkidle' });

/* ---------- 1. Ein Warnzeichen schlägt alles ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [
    { id: 'w1', am: vorTagen(3), um: '20:00', art: 'beschwerde', staerke: 5, arten: ['brennen'], warnzeichen: ['teerstuhl'] },
    { id: 'w2', am: vorTagen(1), um: '20:00', art: 'beschwerde', staerke: 4, arten: ['brennen'], warnzeichen: ['gewicht'] },
  ],
  tage: {},
});

check(await page.locator('.karte-warn').count() === 1, 'die Warnung steht als eigene Karte da');
const warnText = await page.locator('.karte-warn').textContent();
check(warnText.includes('heute abgeklärt'), 'bei einem dringenden Zeichen heißt es „heute"');
check(warnText.includes('Schwarzer, klebriger Stuhl'), 'das Zeichen wird benannt');
check(warnText.includes('verdautes Blut'), 'mit dem Grund, warum es eines ist');
check(warnText.includes('Ungewölltes'.slice(0, 3)) || warnText.includes('Gewichtsverlust'),
  'das zweite Zeichen steht ebenfalls da');
check(warnText.includes('Notaufnahme'), 'und der Hinweis, nicht auf einen Termin zu warten');
check(
  (await page.locator('#view').innerHTML()).indexOf('karte-warn')
    < (await page.locator('#view').innerHTML()).indexOf('Einordnung'),
  'die Warnung steht vor allem anderen',
);
await page.screenshot({ path: `${SHOT}/90-warnung.png` });

/* ---------- 2. Nüchternschmerz gegen Völlegefühl ---------- */

/** 14 Tage: mittags essen, erst spät abends Beschwerden – also nüchtern. */
const nuechtern = [];
for (let t = 1; t <= 14; t++) {
  nuechtern.push({ id: `e${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal', zutaten: [] });
  nuechtern.push({ id: `b${t}`, am: vorTagen(t), um: '23:00', art: 'beschwerde', staerke: 6, arten: ['brennen'] });
}
await setze({ begruesst: true, tab: 'muster', eintraege: nuechtern, tage: {}, fenster: 4, mindestFaelle: 5 });

const musterA = await page.locator('.muster-kopf b').allTextContents();
check(musterA.includes('Nüchternschmerz'), `Nüchternschmerz erkannt (${musterA.join(', ')})`);
check(musterA[0] === 'Nüchternschmerz', 'und steht als Erstes, weil es am besten passt');
const ersterA = await page.locator('.muster.erst').textContent();
check(ersterA.includes('passt am ehesten'), 'das Erste ist als solches ausgezeichnet');
check(/\d+ von \d+/.test(ersterA), 'die Belege nennen Zahlen, nicht Eindrücke');
check(ersterA.includes('Magenspiegelung'), 'die klärende Untersuchung steht dabei');
check(ersterA.includes('Zwölffingerdarm'), 'und die Ursache, die dazu klassisch passt');
/*
 * Fassung 30, dritte Runde: keine „Übersäuerung ohne Geschwür“ als Restbefund
 * nach unauffälliger Spiegelung, keine Rangfolge ohne Quelle, und die Frage
 * sagt nur, was das Muster zählt – nicht „bessert sich nach dem Essen“.
 * Belege über MUSTER in js/bild.js.
 */
const ganzA = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(!ganzA.includes('Übersäuerung') && !ganzA.includes('Bleibt übrig, wenn die Spiegelung')
  && !ganzA.includes('das klassische Muster') && !ganzA.includes('bessert sich nach dem Essen')
  && ganzA.includes('eher bei leerem Magen und bessern sich nach dem Essen oft')
  && ganzA.includes('kommt oft nüchtern, mit Abstand zum Essen'),
'Nüchternschmerz: ohne Restbefund „Übersäuerung“, mit dem Wortlaut von gesund.bund.de');

/** Dieselbe Menge, aber Beschwerden eine Stunde nach dem Essen. */
const nachEssen = [];
for (let t = 1; t <= 14; t++) {
  nachEssen.push({ id: `e${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag', portion: 'gross', zutaten: [] });
  nachEssen.push({ id: `b${t}`, am: vorTagen(t), um: '13:00', art: 'beschwerde', staerke: 6, arten: ['druck', 'appetit'] });
}
await setze({ begruesst: true, tab: 'muster', eintraege: nachEssen, tage: {}, fenster: 4, mindestFaelle: 5 });
const musterB = await page.locator('.muster-kopf b').allTextContents();
check(musterB[0] === 'Völlegefühl nach dem Essen',
  `derselbe Umfang, anderer Zeitpunkt, anderes Bild (${musterB[0]})`);
check(
  !musterB.includes('Nüchternschmerz'),
  'und Nüchternschmerz kommt jetzt gar nicht vor',
);
const ersterB = await page.locator('.muster.erst').textContent();
check(ersterB.includes('Funktionelle Dyspepsie'), 'die häufigste Ursache dazu wird genannt');
await page.screenshot({ path: `${SHOT}/91-bild.png` });

/* ---------- 3. Es bleibt eine Beschreibung ---------- */

const ganz = await page.locator('#view').textContent();
check(ganz.includes('keine Diagnose'), 'die Einordnung sagt von sich, dass sie keine Diagnose ist');
check(
  ganz.includes('Auseinander hält sie eine Untersuchung'),
  'und warum das so ist',
);
const behauptung = ganz.match(/\b(du hast|Sie haben|leidest an|Diagnose lautet|es handelt sich um)\b/gi) || [];
check(
  behauptung.length === 0,
  `kein Satz, der eine Krankheit zuschreibt${behauptung.length ? `: ${behauptung.join(', ')}` : ''}`,
);
check(
  ganz.includes('Grundlage:') && /Grundlage: \d+ notierte Tage/.test(ganz),
  'die Grundlage steht darunter – 14 Tage sind etwas anderes als 140',
);
check(
  (await page.locator('.fragen li').count()) > 0,
  'es fallen Fragen für den Termin ab',
);

/* ---------- Zu dünn heißt: nichts behaupten ---------- */

await setze({
  begruesst: true,
  tab: 'muster',
  eintraege: [
    { id: 'x1', am: vorTagen(1), um: '20:00', art: 'beschwerde', staerke: 9, arten: ['brennen', 'sodbrennen'] },
    { id: 'x2', am: vorTagen(2), um: '21:00', art: 'beschwerde', staerke: 9, arten: ['brennen'] },
  ],
  tage: {},
});
check(await page.locator('.muster').count() === 0,
  'zwei Eintragungen ergeben kein Bild, auch wenn sie eindeutig aussehen');
/*
 * Und es bleibt nicht bei einem Nein: Es muss dastehen, wie weit es noch ist.
 *
 * Der Wortlaut hat sich geändert – früher zehn Karten, die nacheinander „noch
 * nicht genug" sagten, jetzt ein Fortschrittsblock. Die Bedingung ist
 * dieselbe geblieben und wird hier schärfer geprüft als vorher: nicht
 * irgendein Hinweis, sondern die Zahlen, die fehlen.
 */
const zuwenig = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  /2 von 10 notierten Tagen/.test(zuwenig),
  'stattdessen steht da, wie weit es bis zur Einordnung noch ist',
);
check(
  /2 von 5 Eintragungen zu Beschwerden/.test(zuwenig),
  'und zwar für beide Bedingungen, nicht nur für eine',
);

/* ---------- Fassung 33: K1–K4, der Satz der Stufe „sofort" überall ---------- */

/*
 * Jedes Warnzeichen der Stufe „sofort" sagt in seinem eigenen Satz, was zu
 * tun ist – nicht nur die Warnkarte darunter. Ebenso die Zeichen der Stufe
 * „zeitnah", die eine Bedingung für „sofort" nennen (Sturz, Schwangerschaft,
 * Sehstörung nach dem 50.). Ein bloßes „sofort" oder „Nicht abwarten" ohne
 * Notaufnahme und 112 gibt es nicht mehr. Belege in js/bild.js.
 */
{
  const SOFORT = /nicht auf einen Termin warten – Notaufnahme oder 112\./i;
  const liste = await page.evaluate(() => import('./js/bild.js').then((m) => m.WARNZEICHEN));
  const ohne = liste.filter((w) => w.dringlichkeit === 'sofort' && !SOFORT.test(w.warum)).map((w) => w.id);
  check(ohne.length === 0, `jedes „sofort“-Zeichen: nicht auf einen Termin warten – Notaufnahme oder 112${ohne.length ? ` – fehlt: ${ohne.join(', ')}` : ''}`);
  const mitBedingung = ['kopfsturz', 'kopfschwanger', 'kopfneu50'].filter((id) => !SOFORT.test(liste.find((w) => w.id === id).warum));
  check(mitBedingung.length === 0, `Sturz, Schwangerschaft und Sehstörung nach dem 50.: mit demselben Satz${mitBedingung.length ? ` – fehlt: ${mitBedingung.join(', ')}` : ''}`);
  const blank = liste.filter((w) => /:\s*sofort\b|sofort, nicht zeitnah|Nicht abwarten\.|nicht der nächste Termin/.test(w.warum)).map((w) => w.id);
  check(blank.length === 0, `kein bloßes „sofort“ und kein anderer Wortlaut mehr${blank.length ? ` – noch: ${blank.join(', ')}` : ''}`);
  // K1: Brustschmerz für sich, länger als fünf Minuten, und der Hals.
  const brust = liste.find((w) => w.id === 'ausstrahlung');
  check(brust.dringlichkeit === 'sofort' && /Brust, der länger als fünf Minuten anhält/.test(brust.name)
    && /Arm, Hals, Kiefer oder Rücken/.test(brust.name) && !/mit Luftnot oder kaltem Schweiß/.test(brust.name),
  `Brustschmerz schon für sich, länger als fünf Minuten, Ausstrahlung auch in den Hals (${brust.name})`);
  // K2: die Zeichen nach einem Sturz so, wie gesund.bund.de sie nennt.
  const sturz = liste.find((w) => w.id === 'kopfsturz').warum;
  check(['Bewusstlosigkeit', 'Gedächtnislücken', 'Erbrechen', 'Schwindel'].every((x) => sturz.includes(x)),
    'nach einem Sturz: Bewusstlosigkeit, Gedächtnislücken, Erbrechen, Schwindel');
  // W4–W6 aus derselben Liste.
  check(!liste.find((w) => w.id === 'blutstuhl').warum.includes('häufigste Ursache'),
    'frisches Blut ohne „Hämorrhoiden die häufigste Ursache“');
  check(liste.find((w) => w.id === 'kopfausfall').warum.includes('5 bis 60 Minuten')
    && !liste.find((w) => w.id === 'kopfausfall').warum.includes('spätestens einer Stunde ganz vorbei'),
  'die Aura mit 5 bis 60 Minuten je Zeichen (ICHD-3), nicht „nach spätestens einer Stunde ganz vorbei“');
}

/*
 * K4: Schon beim Ankreuzen steht im Beschwerde- und im Kopfbogen der Satz
 * für die Zeichen der Stufe „sofort" – wie im Stuhlbogen.
 */
for (const art of ['beschwerde', 'kopf']) {
  await setze({ begruesst: true, tab: 'heute', eintraege: [], tage: {} });
  await page.locator(`[data-act="neu"][data-art="${art}"]`).click();
  await page.waitForTimeout(150);
  const bogen = ((await page.locator('details.warnbogen').textContent()) || '').replace(/\s+/g, ' ');
  check(bogen.includes(': nicht auf einen Termin warten – Notaufnahme oder 112.')
    && bogen.includes(art === 'kopf' ? 'Kopfschmerz mit Fieber und steifem Nacken' : 'Schmerz oder Druck in der Brust'),
  `im ${art === 'kopf' ? 'Kopf' : 'Beschwerde'}bogen steht beim Ankreuzen: Notaufnahme oder 112 (${bogen.slice(0, 90)}…)`);
  await page.keyboard.press('Escape');
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
