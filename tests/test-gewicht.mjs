/*
 * Die einzige Zahl, die nicht aus dem Gefühl kommt
 *
 * Ein ungewollter Gewichtsverlust ist das stärkste einzelne Zeichen dafür, dass
 * hinter Bauchbeschwerden mehr steckt als eine gereizte Verdauung. Damit hat
 * diese Rechnung als einzige in der App die Aufgabe, jemanden zum Arzt zu
 * schicken – und ausgerechnet sie kann auf zwei Arten Schaden anrichten:
 *
 *   ZU LAUT. Wer bei jedem Wasserverlust Alarm schlägt oder eine gewollte Diät
 *   für ein Alarmzeichen hält, verbrennt genau die Aufmerksamkeit, die im
 *   Ernstfall gebraucht wird. Nach dem dritten Fehlalarm liest niemand mehr hin.
 *
 *   ZU LEISE. Schleichende Verluste bemerkt niemand von selbst – das war ja der
 *   Grund, die Waage überhaupt aufzunehmen. Eine Rechnung, die den echten Fall
 *   verschluckt, wäre schlimmer als gar keine, weil sie beruhigt.
 *
 * Geprüft wird deshalb beides, und dazu die Fangfrage, an der der ganze Entwurf
 * hing: Ein Tag, an dem nur gewogen wurde, darf kein Tag ohne Beschwerden sein.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const heute = vorTagen(0);

/** Die Rechnung direkt befragen – ohne Anzeige dazwischen. */
async function waage(messungen, gewollt = false) {
  return page.evaluate(async ([m, g, h]) => {
    const mod = await import('./js/gewicht.js');
    const r = mod.gewichtsBild(m, h, g);
    return {
      urteil: r.urteil, satz: r.satz, warnung: !!r.warnung, anteil: r.anteil,
    };
  }, [messungen, gewollt, heute]);
}

/** Eine Messreihe: `plan` sind Paare aus „vor n Tagen" und Kilo. */
const reihe = (plan) => plan.map(([tage, kg]) => ({ am: vorTagen(tage), kg }));

/* ---------- 1. Noch nichts auf der Waage ---------- */

const leer = await waage([]);
check(leer.urteil === 'keine', `ohne Messung kein Urteil (${leer.urteil})`);
check(!leer.warnung, 'und schon gar kein Warnzeichen');

/* ---------- 2. Zwei Wiegungen aus derselben Woche ---------- */

/*
 * Vier Kilo weniger in fünf Tagen sind über neun Prozent – und trotzdem darf
 * hier kein Verlust stehen. Wer nach einem Magen-Darm-Infekt wiegt, misst
 * Flüssigkeit. Eine Richtung braucht Abstand, und wo der fehlt, sagt die App
 * lieber nichts als etwas Falsches.
 */
const kurz = await waage(reihe([[0, 60], [5, 64]]));
check(kurz.urteil === 'zu-kurz', `ohne Abstand keine Richtung (${kurz.urteil})`);
check(!kurz.warnung, 'und kein Alarm aus fünf Tagen Wasserhaushalt');
check(
  /Wasser und nicht den Verlauf/.test(kurz.satz),
  'sondern die Begründung, warum hier noch nichts steht',
);

/* ---------- 3. Der Fall, für den das Ganze da ist ---------- */

/*
 * 70 auf 66 Kilo in vier Monaten: fünfeinhalb Prozent, ungewollt. Genau der
 * Verlust, der in jeder Leitlinie unter den Alarmzeichen steht.
 */
const verlustPlan = [[0, 66.2], [10, 66.0], [20, 65.8], [110, 70.1], [120, 69.9], [130, 70.0]];
const verlust = await waage(reihe(verlustPlan));
check(verlust.urteil === 'verlust', `der Verlust wird gefunden (${verlust.urteil})`);
check(verlust.warnung === true, 'und zählt als Warnzeichen');
check(
  /ärztlich\s+abgeklärt/.test(verlust.satz.replace(/\s+/g, ' ')),
  'mit der Folgerung, die dazugehört',
);
/*
 * Und ohne die Anmaßung, die daraus leicht wird: Fünf Prozent sind die Grenze,
 * ab der nachgesehen wird, und keine Diagnose.
 */
check(
  /keine Diagnose/.test(verlust.satz),
  'aber ausdrücklich ohne Diagnose',
);

/* ---------- 4. Derselbe Verlust, nur gewollt ---------- */

/*
 * Dieselben Zahlen, eine andere Antwort auf die Frage nach der Absicht. Wer
 * abnehmen wollte und abgenommen hat, darf dafür kein Warnzeichen bekommen –
 * sonst ist die Karte nach zwei Wochen abgeschaltet, samt Ernstfall.
 */
const gewollt = await waage(reihe(verlustPlan), true);
check(gewollt.urteil === 'verlust-gewollt', `die Absicht zählt (${gewollt.urteil})`);
check(!gewollt.warnung, 'und dann steht dort kein Warnzeichen');
check(
  !/ärztlich\s+abgeklärt/.test(gewollt.satz.replace(/\s+/g, ' ')),
  'auch nicht im Text',
);
/* Aber die Tür bleibt offen – die Absicht kann sich ändern, der Körper auch. */
check(/ändern/.test(gewollt.satz), 'mit dem Hinweis, wo man das umstellt');

/* ---------- 5. Schwankungen sind kein Verlust ---------- */

/*
 * Ein Mensch schwankt am Tag um ein bis zwei Kilo. Wenn das reicht, um Alarm
 * auszulösen, ist die Rechnung wertlos: Sie schlägt dann irgendwann bei jedem
 * an, und damit sagt ihr Anschlagen nichts mehr.
 */
const rauschen = await waage(reihe([
  [0, 68.9], [12, 70.2], [24, 69.1], [100, 69.8], [112, 68.7], [124, 70.3],
]));
check(rauschen.urteil === 'stabil', `Tagesschwankungen bleiben stabil (${rauschen.urteil})`);
check(!rauschen.warnung, 'und lösen keinen Alarm aus');

/* Nach oben gilt dieselbe Grenze – aber ohne Alarmzeichen. */
const zunahme = await waage(reihe([
  [0, 74.0], [10, 74.2], [20, 73.9], [110, 69.9], [120, 70.1],
]));
check(zunahme.urteil === 'zunahme', `deutlich mehr wird auch benannt (${zunahme.urteil})`);
check(!zunahme.warnung, 'zählt aber nicht als Warnzeichen');

/* ---------- 6. Alte Messungen zählen nicht mit ---------- */

/*
 * Was ein Jahr her ist, ist eine andere Geschichte. Sonst hinge jemandem ein
 * Studentengewicht bis ans Lebensende als „Verlust" nach.
 */
const alt = await waage(reihe([[0, 66.0], [10, 66.2], [400, 78.0], [410, 78.4]]));
check(
  alt.urteil === 'zu-kurz',
  `Messungen von vor über einem Jahr taugen nicht als „früher" (${alt.urteil})`,
);

/* ---------- 7. In der App: eintragen und wiederfinden ---------- */

await page.evaluate(([k]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'mehr', eintraege: [], tage: {},
})), [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);

/*
 * Mit Komma, und das ist der Punkt: Auf einem deutschen Handy liefert die
 * Zifferntastatur ein Komma. Ein Feld, das daran scheitert, wird zweimal
 * benutzt und dann nicht mehr – und mit ihm die einzige harte Zahl der App.
 */
await page.locator('[data-act="gewicht-neu"]').fill('67,4');
await page.locator('[data-act="gewicht-los"]').click();
await page.waitForTimeout(300);

const gespeichert = await page.evaluate(([k]) => JSON.parse(localStorage.getItem(k)).gewicht, [KEY]);
check(
  gespeichert.length === 1 && gespeichert[0].am === new Date().toISOString().slice(0, 10),
  `die Messung liegt unter dem heutigen Datum (${JSON.stringify(gespeichert)})`,
);

/*
 * DIE FANGFRAGE.
 *
 * Läge das Gewicht in `eintraege`, wäre der Tag damit ein notierter Tag – und
 * ein notierter Tag ohne Beschwerdeeintrag ist in dieser App ein Tag ohne
 * Beschwerden. Wer sich nur wiegt, hätte sich damit lauter beschwerdefreie Tage
 * gebucht und die Quote nach unten gerechnet, die den Verlauf beschreibt. Das
 * ist der Grund, warum die Waage neben dem Tagebuch steht und nicht darin.
 */
const zaehlung = await page.evaluate(async ([k]) => {
  const s = JSON.parse(localStorage.getItem(k));
  const a = await import('./js/auswertung.js');
  const heutiger = a.tagesWert(s.eintraege, new Date().toISOString().slice(0, 10), s.tage || {});
  return { notiert: heutiger.notiert, eintraege: s.eintraege.length };
}, [KEY]);
check(zaehlung.eintraege === 0, 'das Tagebuch bleibt davon unberührt');
check(
  zaehlung.notiert === false,
  'und ein Tag, an dem nur gewogen wurde, ist kein Tag ohne Beschwerden',
);

/* ---------- 8. Der Verlust steht ganz oben, nicht unter „Mehr" ---------- */

/*
 * Eine Warnung, die man suchen muss, ist keine. Sie gehört dorthin, wo als
 * Erstes hingesehen wird – gleich hinter die übrigen Alarmzeichen.
 */
const tagebuch = [];
const tage = {};
for (let i = 1; i <= 40; i++) {
  const am = vorTagen(i);
  tage[am] = { notiert: true };
  tagebuch.push({
    id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke: 4, arten: ['blaehung'],
  });
}
await page.evaluate(([k, e, t, g]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t, gewicht: g, abnehmenGewollt: false,
})), [KEY, tagebuch, tage, reihe(verlustPlan)]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const oben = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  /ärztlich abgeklärt/.test(oben),
  'der ungewollte Verlust steht im Muster-Reiter',
);
const lage = (await page.locator('.karte-lage').first().textContent()).replace(/\s+/g, ' ');
check(
  /Prozent weniger|ärztlich abgeklärt/.test(lage),
  'und zwar oben in „Was Sache ist"',
);

/* Und im Bericht, den man mitnimmt. */
const text = await page.evaluate(async ([k, h, v]) => {
  const s = JSON.parse(localStorage.getItem(k));
  const b = await import('./js/bericht.js');
  return b.arztBericht(s, v, h);
}, [KEY, heute, vorTagen(180)]);
check(/GEWICHT/.test(text), 'der Bericht hat einen eigenen Abschnitt dafür');
check(/!!/.test(text.split('GEWICHT')[0].slice(-40)), 'und markiert ihn als Warnzeichen');

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/gewicht.png`, fullPage: true });
await browser.close();
ende();
