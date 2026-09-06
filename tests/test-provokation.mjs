/*
 * Die Frage stellen, statt auf die Antwort zu warten
 *
 * Der Provokationstest ist der einzige Teil dieser App, der jemanden auffordert,
 * sich absichtlich schlecht zu fühlen. Damit hat er eine Bringschuld, die keine
 * andere Rechnung hier hat: Er muss danach mehr wissen als vorher. Sonst waren
 * es vier verdorbene Morgen für nichts.
 *
 * Drei Wege, auf denen er diese Schuld verfehlen könnte, und für jeden ein
 * Tagebuch, dessen richtige Antwort feststeht:
 *
 *   1. ER FINDET, WAS DA IST. Wer dreimal nüchtern Milch trinkt und dreimal
 *      Beschwerden bekommt, während die Leerdurchgänge ruhig bleiben, muss ein
 *      „bestätigt sich" lesen – sonst ist das Verfahren wertlos.
 *   2. ER FÄLLT NICHT AUF DEN LEEREN MAGEN HEREIN. Das ist der eigentliche
 *      Fallstrick, und er ist bei Magenbeschwerden garantiert vorhanden:
 *      Nüchternschmerz. Wer an den Testmorgen leidet und an den Leermorgen
 *      genauso, hat nichts über die Milch erfahren. Sagt die App hier
 *      „bestätigt sich", schickt sie jemanden grundlos in ein Leben ohne
 *      Milchprodukte.
 *   3. ER ZÄHLT NUR, WAS PROTOKOLL WAR. Wer im Beobachtungsfenster frühstückt,
 *      hat keinen Durchgang gemacht, sondern gefrühstückt. Solche Durchgänge
 *      müssen herausfallen, sichtbar und mit Begründung.
 *
 * Dazu die Asymmetrie, die dieses Verfahren ehrlich hält: Ein Test ohne Befund
 * wiegt schwerer als einer mit, weil die Erwartung nur in eine Richtung schiebt.
 * Das muss dastehen, sonst liest sich „bestätigt sich nicht" wie ein Misserfolg.
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

/**
 * Ein Tagebuch aus Durchgängen bauen.
 *
 * `plan` ist eine Liste von [vorTagen, leer, staerke]. Jeder Eintrag legt einen
 * Durchgang um 08:00 an und – wenn `staerke` über 0 liegt – eine Beschwerde um
 * 10:00, also mitten im Vierstundenfenster.
 */
function bauen(plan, extra = []) {
  const laeufe = [];
  const eintraege = [];
  plan.forEach(([tage, leer, staerke], i) => {
    const am = vorTagen(tage);
    laeufe.push({ am, um: '08:00', leer });
    if (staerke > 0) {
      eintraege.push({
        id: `b${i}`, am, um: '10:00', art: 'beschwerde', staerke, arten: ['blaehung'],
      });
    }
  });
  return {
    provokation: {
      id: 'p1', art: 'klasse', ziel: 'laktose', was: '250 ml Milch',
      nuechtern: 4, fenster: 4, laeufe, beendet: null,
    },
    eintraege: [...eintraege, ...extra],
  };
}

async function pruefen(daten) {
  return page.evaluate(async ([p, e, h]) => {
    const m = await import('./js/provokation.js');
    const b = m.provokationsBild(p, e, h);
    return {
      urteil: b.urteil,
      wort: b.wort,
      satz: b.satz,
      grundlage: b.grundlage,
      echte: b.echte,
      leere: b.leere,
      verworfen: b.verworfen,
      reagiert: b.reagiert,
      schnitt: b.schnitt,
      vergleich: b.vergleich,
      weg: b.laeufe.filter((l) => !l.sauber).map((l) => l.warum.join('; ')),
    };
  }, [daten.provokation, daten.eintraege, heute]);
}

/* ---------- 1. Der Befund, den es zu finden gilt ---------- */

/*
 * Dreimal Milch, dreimal deutliche Beschwerden; zwei Leerdurchgänge, beide
 * ruhig. Klarer wird es im wirklichen Leben nie.
 */
const klar = await pruefen(bauen([
  [20, false, 7], [17, false, 6], [14, false, 8],
  [11, true, 1], [8, true, 0],
]));
check(klar.urteil === 'bestaetigt', `der klare Fall wird gefunden (${klar.urteil})`);
check(klar.grundlage === 'leerdurchgang', 'und gegen die Leerdurchgänge gemessen');
check(klar.reagiert === 3, `in allen drei Durchgängen (${klar.reagiert})`);

/*
 * Und der Satz muss die Grenze mitliefern. „Bestätigt sich" ohne den Hinweis
 * auf die fehlende Verblindung wäre eine Diagnose, und die steht hier niemandem
 * zu: Wer weiß, was im Glas ist, bekommt davon auch echte Beschwerden.
 */
check(
  /Verblindung/.test(klar.satz),
  'mit dem Hinweis, dass niemand verblindet war',
);
check(
  /kein Nachweis|starker Verdacht/.test(klar.satz),
  'und ohne aus dem Verdacht einen Nachweis zu machen',
);

/* ---------- 2. Der leere Magen – die Falle, die es zu vermeiden gilt ---------- */

/*
 * DER WICHTIGSTE FALL DIESER DATEI.
 *
 * Dieselben Beschwerden an den Testmorgen – aber an den Leermorgen genauso.
 * Dieser Mensch hat Nüchternschmerz, ein eigenes Muster, das diese App an
 * anderer Stelle sogar auflistet. Über Milch sagt das nichts.
 *
 * Ohne Leerdurchgang sähe dieses Tagebuch aus wie Fall 1: dreimal nüchtern
 * Milch, dreimal Beschwerden. Genau deshalb gibt es den Leerdurchgang.
 */
const nuechtern = await pruefen(bauen([
  [20, false, 7], [17, false, 6], [14, false, 7],
  [11, true, 7], [8, true, 6],
]));
check(
  nuechtern.urteil === 'nicht-bestaetigt',
  `der leere Magen wird nicht der Milch angelastet (${nuechtern.urteil})`,
);
check(
  nuechtern.reagiert === 0,
  `kein Durchgang liegt über dem Leerwert (${nuechtern.reagiert})`,
);

/* ---------- 3. Ein Ergebnis ohne Befund ist eines ---------- */

/*
 * Es darf sich nicht wie ein Fehlschlag lesen. Der negative Test ist hier
 * sogar der belastbarere – die Erwartung schiebt nur in eine Richtung –, und
 * genau das muss dastehen, sonst macht jemand aus Enttäuschung weiter.
 */
check(
  /belastbarste|mehr wert/.test(nuechtern.satz),
  'und die App sagt, dass das ein starkes Ergebnis ist',
);
check(
  /nur in eine Richtung|Erwartung/.test(nuechtern.satz),
  'mit der Begründung, warum es mehr wiegt als ein positives',
);

/* ---------- 4. Mal so, mal so ist auch eine Antwort ---------- */

/*
 * Der häufigste Fall im echten Leben: einmal heftig, zweimal nichts. Daraus
 * „bestätigt sich" zu machen wäre falsch, „bestätigt sich nicht" auch. Es
 * heißt, dass etwas anderes mitspielt – die Menge oder der Tag.
 */
const wechsel = await pruefen(bauen([
  [20, false, 8], [17, false, 1], [14, false, 0],
  [11, true, 0], [8, true, 1],
]));
check(wechsel.urteil === 'wechselhaft', `mal so, mal so (${wechsel.urteil})`);
check(
  /Menge oder am Tag/.test(wechsel.satz),
  'mit dem, was das heißt',
);
check(
  /Weglassen wäre hier wahrscheinlich zu viel/.test(wechsel.satz),
  'und der Warnung, dass Streichen zu weit ginge',
);

/* ---------- 5. Wer frühstückt, hat keinen Durchgang gemacht ---------- */

/*
 * In das Beobachtungsfenster des ersten Durchgangs wird eine Mahlzeit gelegt,
 * in das Nüchternfenster des zweiten eine weitere. Beide Durchgänge müssen
 * herausfallen – und zwar sichtbar, mit Begründung. Stillschweigend zu
 * verwerfen wäre schlimmer als mitzuzählen: Dann fehlten Durchgänge, und
 * niemand wüsste, warum.
 */
const unsauber = await pruefen(bauen(
  [[20, false, 7], [17, false, 6], [14, false, 8], [11, true, 0], [8, true, 1]],
  [
    { id: 'm1', am: vorTagen(20), um: '09:30', art: 'essen', was: 'Brötchen', zutaten: [] },
    { id: 'm2', am: vorTagen(17), um: '06:00', art: 'essen', was: 'Müsli', zutaten: [] },
  ],
));
check(unsauber.verworfen === 2, `zwei Durchgänge fallen heraus (${unsauber.verworfen})`);
check(unsauber.echte === 1, `einer bleibt übrig (${unsauber.echte})`);
check(unsauber.urteil === 'laeuft', `und damit steht noch kein Urteil (${unsauber.urteil})`);
check(
  unsauber.weg.some((w) => /im Beobachtungsfenster/.test(w))
  && unsauber.weg.some((w) => /Stunden davor/.test(w)),
  `mit dem Grund an jedem einzelnen (${JSON.stringify(unsauber.weg)})`,
);

/* ---------- 6. Ein einzelner Durchgang beweist nichts ---------- */

const einer = await pruefen(bauen([[14, false, 9]]));
check(einer.urteil === 'laeuft', `ein Durchgang ist kein Ergebnis (${einer.urteil})`);
check(
  /beweist nichts/.test(einer.satz),
  'und die App sagt auch, warum nicht',
);

/*
 * Drei Durchgänge ohne jeden Leerdurchgang: Dann fehlt der Vergleich, und die
 * App muss ihn einfordern statt gegen irgendetwas zu rechnen. Ein Tagebuch
 * ohne Alltagstage hat auch keine zweite Seite.
 */
const ohneLeer = await pruefen(bauen([[20, false, 7], [17, false, 6], [14, false, 8]]));
check(
  ohneLeer.urteil === 'laeuft',
  `ohne Vergleich kein Urteil (${ohneLeer.urteil})`,
);
check(
  /Leerdurchgänge/.test(ohneLeer.satz),
  'sondern die Aufforderung, zwei Leerdurchgänge zu machen',
);

/* ---------- 7. In der Anzeige ---------- */

const daten = bauen([
  [20, false, 7], [17, false, 6], [14, false, 8], [11, true, 1], [8, true, 0],
]);
const tage = {};
const mahlzeiten = [];
for (let i = 1; i <= 30; i++) {
  tage[vorTagen(i)] = { notiert: true };
  // Ein Mittagessen je Tag, weit außerhalb aller Testfenster (die liegen
  // morgens um 8). Der Muster-Reiter braucht Mahlzeiten, sonst nimmt er eine
  // Abkürzung – und der Test soll den gewöhnlichen Weg prüfen.
  mahlzeiten.push({
    id: `mz${i}`, am: vorTagen(i), um: '13:00', art: 'essen', was: 'Mittag',
    portion: 'normal', zutaten: [{ id: 'reis', rolle: 'haupt' }],
  });
}

await page.evaluate(([k, p, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', provokation: p, eintraege: e, tage: t,
})), [KEY, daten.provokation, [...daten.eintraege, ...mahlzeiten], tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(sicht.includes('Provokationstest: 250 ml Milch'), 'der Test steht im Muster-Reiter');
check(sicht.includes('bestätigt sich'), 'mit dem Urteil');
check(
  /Leerdurchgang/.test(sicht),
  'und die Leerdurchgänge stehen im Protokoll',
);

/*
 * Der Allergie-Satz ist der einzige in diesem Modul, der aus einem anderen
 * Grund dasteht als alle übrigen: Eine Unverträglichkeit ist unangenehm, eine
 * Allergie kann in Minuten gefährlich werden. Er darf nirgends fehlen, wo
 * jemand aufgefordert wird, etwas absichtlich zu sich zu nehmen.
 */
check(
  /Allergie und keine Unverträglichkeit/.test(sicht),
  'und die Warnung vor der Allergie steht dabei',
);

/*
 * Und ohne eine einzige Mahlzeit im Tagebuch trotzdem.
 *
 * Der Muster-Reiter nimmt ohne Mahlzeiten eine Abkürzung – dort fällt die
 * Auslöserrechnung weg, die ohne Mahlzeiten nichts zu sagen hätte. Diese
 * Abkürzung hat schon einmal die Warnzeichen verschluckt, und beim Schreiben
 * dieser Datei verschluckte sie den laufenden Test gleich mit: Wer eine
 * Provokation laufen hat und in dieser Zeit wenig einträgt – weil er ja auch
 * wenig isst –, verlor genau dann die einzige Stelle, an der sein Ergebnis
 * steht. Ein Test, dessen Ergebnis verschwindet, ist schlimmer als keiner.
 */
await page.evaluate(([k, p, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', provokation: p, eintraege: e, tage: t,
})), [KEY, daten.provokation, daten.eintraege, tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const ohneEssen = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  ohneEssen.includes('Provokationstest: 250 ml Milch'),
  'auch ohne eine einzige Mahlzeit bleibt der laufende Test stehen',
);
check(
  ohneEssen.includes('bestätigt sich'),
  'mitsamt seinem Ergebnis',
);

/* Und auf dem Tagesreiter der nächste Schritt, sonst versandet der Test. */
await page.evaluate(([k]) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.tab = 'heute';
  localStorage.setItem(k, JSON.stringify(s));
}, [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const tag = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(/Provokationstest|Durchgang/.test(tag), 'auf dem Tagesreiter steht, was ansteht');

/*
 * Und im Bericht – mit den Leerdurchgängen.
 *
 * In der Sprechstunde ist „ich vertrage keine Milch" eine Meinung. Erst die
 * Leerdurchgänge machen daraus eine Beobachtung, die jemand nachvollziehen
 * kann. Stünden sie nicht dabei, wäre der Abschnitt wertlos.
 */
const text = await page.evaluate(async ([k, h, v]) => {
  const s = JSON.parse(localStorage.getItem(k));
  const b = await import('./js/bericht.js');
  return b.arztBericht(s, v, h);
}, [KEY, heute, vorTagen(60)]);
check(/PROVOKATIONSTESTS/.test(text), 'der Bericht hat einen eigenen Abschnitt');
check(/3 Durchgänge, 2 Leerdurchgänge/.test(text), 'mit den Zahlen beider Seiten');
check(
  /nur in eine Richtung/.test(text),
  'und dem Satz, warum ein Test ohne Befund hier schwerer wiegt',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/provokation.png`, fullPage: true });
await browser.close();
ende();
