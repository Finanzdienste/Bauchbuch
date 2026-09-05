/*
 * Der Unterleib – der Teil, der jemandem Jahre sparen kann.
 *
 * Endometriose wird im Mittel sieben bis zehn Jahre lang für einen Reizdarm
 * gehalten. Wenn diese App das Muster erkennt, ist das der wertvollste Satz,
 * den sie ausgibt. Wenn sie es falsch erkennt, schickt sie jemanden in eine
 * Sprechstunde, in der nichts gefunden wird – und beim nächsten Mal glaubt
 * ihr niemand mehr.
 *
 * Geprüft wird deshalb in beide Richtungen, und die zweite ist die wichtigere:
 *
 *   * Das volle Muster wird erkannt.
 *   * Ohne eingeschaltete Fragen sagt die App NICHT „unauffällig", sondern
 *     gar nichts. Ein „unauffällig" auf leerer Grundlage hätte genau die
 *     Wirkung, die es hier zu verhindern gilt: dass niemand mehr nachfragt.
 *   * Ein einzelnes Merkmal reicht nicht.
 *   * Schmerz am Eingang ist etwas anderes als tiefer Schmerz und zählt
 *     nicht als Beleg.
 *   * Sex ohne Schmerz wird nicht mit „kam nicht vor" verwechselt.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const text = async (loc) => (await loc.textContent()).replace(/\s+/g, ' ').trim();
const setze = async (zustand) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
};

/*
 * Ein Tagebuch mit dem vollen Bild: 120 Tage, Blutung alle 28 Tage für fünf
 * Tage, der Bauch zur Blutung hin deutlich schlechter, Sex mit wiederholtem
 * tiefem Schmerz, starker Regelschmerz.
 */
function tagebuch({ tiefeSchmerzen = 4, regelStark = true, zyklisch = true, sexFragen = true } = {}) {
  const eintraege = [];
  const tage = {};
  let sexZaehler = 0;

  for (let i = 1; i <= 120; i++) {
    const am = vorTagen(i);
    const imZyklus = i % 28;
    const blutet = imZyklus < 5;
    const staerke = blutet && zyklisch ? 7 : 2;

    tage[am] = { notiert: true, stress: 2, schlaf: 3 };
    if (blutet) {
      tage[am].blutung = 3;
      if (sexFragen) tage[am].regelschmerz = regelStark ? 4 : 1;
    }

    eintraege.push({
      id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke,
      arten: ['krampf', 'blaehung'],
    });
    eintraege.push({
      id: `e${i}`, am, um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal', zutaten: [],
    });

    // Stuhlgang, während der Blutung dringend.
    if (i % 2 === 0) {
      eintraege.push({
        id: `s${i}`, am, um: '09:00', art: 'stuhl',
        bristol: blutet ? 6 : 4, dringend: blutet,
      });
    }

    // Sex etwa alle zehn Tage.
    if (i % 10 === 0) {
      sexZaehler += 1;
      tage[am].sex = 1;
      if (sexFragen) {
        const tut = sexZaehler <= tiefeSchmerzen;
        tage[am].sexschmerz = tut ? 3 : 0;
        tage[am].sextief = tut ? 1 : 0;
      }
    }
  }

  return {
    begruesst: true,
    tab: 'muster',
    eintraege,
    tage,
    beschwerdenSeit: '2025-01',
    tagesfragen: sexFragen
      ? ['stimmung', 'stress', 'schlaf', 'blutung', 'sex', 'sexschmerz', 'sextief', 'regelschmerz']
      : ['stimmung', 'stress', 'schlaf', 'blutung', 'sex'],
  };
}

/* ---------- Das volle Bild wird erkannt ---------- */

await setze(tagebuch());
const muster = await text(page.locator('#view'));
check(muster.includes('Unterleib'), 'das Unterleibsmuster erscheint');
check(muster.includes('Endometriose'), 'und nennt Endometriose als abzuklärende Möglichkeit');
check(
  muster.includes('Tiefer Schmerz beim Sex'),
  'mit dem tiefen Schmerz als Beleg',
);
check(
  /sieben bis zehn Jahre/.test(muster),
  'samt dem Grund, warum das überhaupt dasteht',
);

/*
 * Und es bleibt eine Frage. „Endometriose" als Feststellung wäre in einer App
 * ohne Untersuchung falsch – und die Formulierung ist das Einzige, was
 * zwischen einer nützlichen Frage und einer Selbstdiagnose steht.
 */
check(
  !/Du hast Endometriose|Es ist Endometriose|Diagnose: Endometriose/i.test(muster),
  'aber nie als Feststellung',
);
check(
  muster.includes('abzuklären') || muster.includes('Abklärung') || muster.includes('abgeklärt'),
  'sondern als etwas, das abzuklären wäre',
);

/* ---------- Ohne die Fragen: schweigen, nicht entwarnen ---------- */

await setze(tagebuch({ sexFragen: false }));
const ohne = await text(page.locator('#view'));
check(
  !ohne.includes('Unterleib und Zyklus zusammen auffällig'),
  'ohne eingeschaltete Fragen erscheint das Muster nicht',
);
check(
  !/kein Hinweis auf Endometriose|unauffällig.*Endometriose/i.test(ohne),
  'und vor allem wird nicht entwarnt – nicht gefragt ist nicht unauffällig',
);

/* ---------- Ein Merkmal allein reicht nicht ---------- */

// Nur starker Regelschmerz, sonst nichts: kein zyklischer Bauch, kein Schmerz
// beim Sex. Ein Regelschmerz für sich ist keine Auskunft.
await setze(tagebuch({ tiefeSchmerzen: 0, zyklisch: false }));
const einzeln = await text(page.locator('#view'));
check(
  !einzeln.includes('Unterleib und Zyklus zusammen auffällig'),
  'starker Regelschmerz allein löst kein Muster aus',
);

/* ---------- Die Rechnung selbst ---------- */

const rechnung = await page.evaluate(async () => {
  const u = await import('./js/unterleib.js');
  const a = await import('./js/auswertung.js');

  const tage = {};
  const eintraege = [];
  const iso = (n) => new Date(Date.now() - n * 864e5).toISOString().slice(0, 10);
  for (let i = 1; i <= 40; i++) {
    tage[iso(i)] = { notiert: true };
    eintraege.push({ id: `b${i}`, am: iso(i), um: '12:00', art: 'beschwerde', staerke: 3 });
  }

  // Vier Mal Sex, zweimal mit Schmerz – aber nur am Eingang, nicht tief.
  [4, 8, 12, 16].forEach((n, i) => {
    tage[iso(n)].sex = 1;
    tage[iso(n)].sexschmerz = i < 2 ? 3 : 0;
    tage[iso(n)].sextief = 0;
  });
  const aussen = u.unterleibsBild(eintraege, tage, a.tagesWert);

  // Dieselben vier Male, diesmal tief.
  [4, 8, 12, 16].forEach((n, i) => { tage[iso(n)].sextief = i < 2 ? 1 : 0; });
  const innen = u.unterleibsBild(eintraege, tage, a.tagesWert);

  // Und einmal ohne jede Angabe zum Schmerz.
  [4, 8, 12, 16].forEach((n) => {
    delete tage[iso(n)].sexschmerz;
    delete tage[iso(n)].sextief;
  });
  const leer = u.unterleibsBild(eintraege, tage, a.tagesWert);

  return {
    aussenTief: aussen.sexSchmerz.tiefWiederholt,
    aussenSchmerz: aussen.sexSchmerz.mitSchmerz,
    innenTief: innen.sexSchmerz.tiefWiederholt,
    leerPruefbar: leer.sexSchmerz.pruefbar,
    leerErhoben: leer.erhoben,
  };
});

check(
  rechnung.aussenSchmerz === 2 && !rechnung.aussenTief,
  'Schmerz am Eingang wird gezählt, gilt aber nicht als tiefer Schmerz',
);
check(rechnung.innenTief, 'tiefer Schmerz zweimal zählt dagegen');
check(!rechnung.leerPruefbar, 'ohne Angabe ist die Frage nicht prüfbar');
check(!rechnung.leerErhoben, 'und dann gilt gar nichts als erhoben');

/* ---------- Der Bericht ---------- */

await setze(tagebuch());
await page.locator('[data-act="tab"][data-tab="mehr"]').click();
await page.waitForTimeout(250);
await page.locator('[data-act="bericht"][data-n="90"]').click();
await page.waitForTimeout(500);
const bericht = await page.locator('.bericht').inputValue();
check(bericht.includes('Endometriose'), 'der Arztbericht führt Endometriose auf');
check(
  bericht.includes('Zu klären') || bericht.includes('Abzuklären'),
  'als etwas zu Klärendes, nicht als Befund',
);

/* ---------- Der Hinweis, der die Fragen entdeckbar macht ---------- */

/*
 * Standardmäßig aus ist richtig – und wäre eine Sackgasse, wenn niemand je
 * davon erführe. Also fragt die App nach, aber nur, wenn ihre eigenen Daten
 * in die Richtung zeigen, und mit dem Grund dabei.
 */
await setze(tagebuch({ sexFragen: false }));
const hinweisText = await text(page.locator('#view'));
check(
  hinweisText.includes('Zwei Fragen, die hier weiterhelfen könnten'),
  'bei zyklischem Bauch schlägt die App die Fragen vor',
);
check(
  /Stufen.* schlechter als/.test(hinweisText) && hinweisText.includes('sieben bis zehn'),
  'und sagt dazu, warum – mit ihrer eigenen Zahl',
);

await page.locator('[data-act="unterleib-an"]').click();
await page.waitForTimeout(400);
const nachAn = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(
  ['sexschmerz', 'sextief', 'regelschmerz'].every((f) => nachAn.tagesfragen.includes(f)),
  'ein Tipp schaltet alle drei Fragen ein',
);
check(
  !(await text(page.locator('#view'))).includes('Zwei Fragen, die hier weiterhelfen'),
  'und der Hinweis verschwindet',
);

/*
 * Und „nein" heißt nein. Ein Vorschlag, den man dreimal wegtippen muss, ist
 * keiner – besonders nicht bei diesem Thema.
 */
await setze(tagebuch({ sexFragen: false }));
await page.locator('[data-act="unterleib-nein"]').click();
await page.waitForTimeout(400);
check(
  !(await text(page.locator('#view'))).includes('Zwei Fragen, die hier weiterhelfen'),
  '„Nein danke" lässt ihn sofort verschwinden',
);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(400);
check(
  !(await text(page.locator('#view'))).includes('Zwei Fragen, die hier weiterhelfen'),
  'und er kommt auch nach dem Neuladen nicht wieder',
);
const nachNein = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
check(
  !nachNein.tagesfragen.includes('sexschmerz'),
  'ohne dass dabei etwas eingeschaltet worden wäre',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/unterleib.png`, fullPage: true });
await browser.close();
ende();
