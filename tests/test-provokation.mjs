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
 *      Fallstrick: Manche Magenbeschwerden treten gerade bei leerem Magen auf
 *      (Quellen in js/provokation.js). Wer an den Testmorgen leidet und an den Leermorgen
 *      genauso, hat nichts über die Milch erfahren. Sagt die App hier
 *      „bestätigt sich", schickt sie jemanden grundlos in ein Leben ohne
 *      Milchprodukte.
 *   3. ER ZÄHLT NUR, WAS PROTOKOLL WAR. Wer im Beobachtungsfenster frühstückt,
 *      hat keinen Durchgang gemacht, sondern gefrühstückt. Solche Durchgänge
 *      müssen herausfallen, sichtbar und mit Begründung.
 *
 * Dazu, was dieses Verfahren ehrlich hält: Ohne Verblindung ist keines der
 * Ergebnisse ein Nachweis, und Erwartung kann Beschwerden verstärken wie
 * abschwächen. Seit der Fassung 30 steht das so da – vorher hieß es, ein Test
 * ohne Befund wiege schwerer, weil die Erwartung nur in eine Richtung schiebe;
 * das trägt keine Quelle (siehe Kopf von js/provokation.js).
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
      laeufe: b.laeufe.length,
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
 * zu: Wer weiß, was im Glas ist, kann schon davon echte Beschwerden bekommen.
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
 * Hier sind es Beschwerden bei leerem Magen, ein eigenes Muster, das diese App
 * an anderer Stelle sogar auflistet. Über Milch sagt das nichts.
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
 * Es darf sich nicht wie ein Fehlschlag lesen, aber auch nicht wie eine
 * Entwarnung. Seit der Fassung 30 steht dabei, dass auch dieses Ergebnis ohne
 * Verblindung kein Nachweis ist – Erwartung kann Beschwerden verstärken und
 * abschwächen (de Graaf 2024, PMID 38040019) –, und nicht mehr, es sei das
 * belastbarste.
 */
check(
  /keine Reaktion/.test(nuechtern.satz) && /kein Nachweis/.test(nuechtern.satz)
    && !/belastbarste|mehr wert|nur in eine Richtung/.test(nuechtern.satz),
  'die App sagt, was sich gezeigt hat, und dass das kein Nachweis ist',
);
check(
  /verstärken, aber auch abschwächen/.test(nuechtern.satz) && /Praxis/.test(nuechtern.satz),
  'mit dem Grund – Erwartung wirkt in beide Richtungen – und dem Verweis auf die Praxis',
);

/* ---------- 4. Mal so, mal so ist auch eine Antwort ---------- */

/*
 * Einmal heftig, zweimal nichts. Daraus „bestätigt sich" zu machen wäre
 * falsch, „bestätigt sich nicht" auch. Woran es liegt, lässt sich daraus nicht
 * sicher ablesen – und seit der Fassung 30 gibt die App dazu keinen Rat
 * („Weglassen wäre hier wahrscheinlich zu viel; eher lohnt … eine kleinere
 * Menge“), sondern verweist auf die Praxis.
 */
const wechsel = await pruefen(bauen([
  [20, false, 8], [17, false, 1], [14, false, 0],
  [11, true, 0], [8, true, 1],
]));
check(wechsel.urteil === 'wechselhaft', `mal so, mal so (${wechsel.urteil})`);
check(
  /nicht sicher ablesen/.test(wechsel.satz) && /Menge/.test(wechsel.satz),
  'mit dem, was das heißen kann – und was nicht',
);
check(
  !/Weglassen|kleineren Menge|der häufigste/.test(wechsel.satz) && /Praxis/.test(wechsel.satz),
  'ohne Rat zum Essen, mit dem Verweis auf die Praxis',
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

/* ---------- 6b. Eine Beschwerde nur mit „morgens" ---------- */

/*
 * Die Reaktion abends mit dem Knopf „morgens" nachgetragen: Ob sie vor oder
 * nach dem Glas kam, ist offen. Sie zählt als Wert des Durchgangs – bei
 * Durchgängen mit der Sache wie bei Leerdurchgängen. Früher fielen damit
 * genau die Durchgänge mit Reaktion heraus, und übrig blieb „bestätigt sich
 * nicht", obwohl gerade die Reaktionen aussortiert waren.
 */
const knopfMorgen = (tage, i, staerke) => ({
  id: `k${i}`, am: vorTagen(tage), um: '08:00', art: 'beschwerde', staerke, ungefaehr: true, tageszeit: 'morgens',
});
const mitKnopf = (plan) => {
  const d = bauen(plan.map(([t, leer]) => [t, leer, 0]));
  d.provokation.laeufe = d.provokation.laeufe.map((l) => ({ ...l, um: '07:40' }));
  d.eintraege = plan.filter(([, , st]) => st > 0).map(([t, , st], i) => knopfMorgen(t, i, st));
  return d;
};
const knopfReaktion = await pruefen(mitKnopf([
  [30, false, 7], [27, false, 7], [24, false, 7], [21, false, 7], [18, false, 7], [15, false, 7],
  [12, false, 0], [9, false, 0], [6, false, 0], [29, true, 0], [23, true, 0], [17, true, 0],
]));
check(knopfReaktion.urteil === 'bestaetigt' && knopfReaktion.verworfen === 0,
  `Reaktionen nur mit „morgens" eingetragen: kein Durchgang fällt heraus, und es bestätigt sich (${knopfReaktion.urteil}, ${knopfReaktion.verworfen} verworfen)`);
check(!/belastbarste/.test(knopfReaktion.satz), 'und nirgends steht „das belastbarste Ergebnis"');
const knopfNuechtern = await pruefen(mitKnopf([
  [20, false, 7], [17, false, 6], [14, false, 7], [11, true, 7], [8, true, 6],
]));
check(knopfNuechtern.urteil === 'nicht-bestaetigt',
  `Nüchternschmerz „morgens" an Test- und Leermorgen: der leere Magen wird nicht der Milch angelastet (${knopfNuechtern.urteil})`);
const knopfLauf = await page.evaluate(async ([t]) => {
  const m = await import('./js/provokation.js');
  return m.laufBild([{ id: 'x', art: 'beschwerde', am: t, um: '08:00', staerke: 5, ungefaehr: true, tageszeit: 'morgens' }],
    { am: t, um: '07:40' }, { nuechtern: 4, fenster: 4 });
}, [vorTagen(5)]);
check(knopfLauf.sauber && knopfLauf.wert === 5 && knopfLauf.ungefaehr, 'ein einzelner Durchgang: sauber, mit der Beschwerde als Wert, und gekennzeichnet');

/* ---------- 6c. Der Grund, der wirklich dahintersteht ---------- */

const zuDicht = await pruefen(bauen([[20, false, 7], [19, false, 6]]));
check(zuDicht.urteil === 'laeuft' && zuDicht.verworfen === 1 && !/gegessen/.test(zuDicht.satz)
    && /1 zählt nicht mit, warum, steht beim Durchgang/.test(zuDicht.satz),
  `zu dicht am vorigen: der Satz sagt nicht „gegessen" (${zuDicht.satz.slice(0, 110)})`);
const einmalGegessen = await pruefen(bauen([[20, false, 7], [17, false, 6]],
  [{ id: 'm1', am: vorTagen(20), um: '09:30', art: 'essen', was: 'Brötchen', zutaten: [] }]));
check(/\(1 zählt nicht mit, weil dabei gegessen wurde\)/.test(einmalGegessen.satz),
  'wo gegessen wurde, sagt er das – und „zählt" in der Einzahl');
const zweimalGegessen = await pruefen(bauen([[20, false, 7], [17, false, 6], [14, false, 5]], [
  { id: 'm1', am: vorTagen(20), um: '09:30', art: 'essen', was: 'Brötchen', zutaten: [] },
  { id: 'm2', am: vorTagen(17), um: '06:00', art: 'essen', was: 'Müsli', zutaten: [] },
]));
check(/\(2 zählen nicht mit, weil dabei gegessen wurde\)/.test(zweimalGegessen.satz), 'und „zählen" in der Mehrzahl');
const zettelDicht = await page.evaluate(async ([p, e, v, h]) => {
  const b = await import('./js/bericht.js');
  return b.arztBericht({ provokation: p, eintraege: e, tage: {} }, v, h);
}, [bauen([[20, false, 7], [19, false, 6]]).provokation, bauen([[20, false, 7], [19, false, 6]]).eintraege, vorTagen(60), heute]);
check(/1 nicht auswertbar(?! \(dabei gegessen\))/.test(zettelDicht), 'auch der Bericht schreibt dort nicht „dabei gegessen"');

/* ---------- 6d. Reaktion in der Mehrzahl, aber noch im Zufall ---------- */

/*
 * Zwei von drei Durchgängen mit deutlicher Reaktion, die Leerdurchgänge
 * ruhig – aber bei so wenigen Werten noch im Spielraum des Zufalls. Das ist
 * kein „bestätigt sich", und erst recht kein „kein Unterschied".
 */
const deutet = await pruefen(bauen([[20, false, 6], [17, false, 6], [14, false, 0], [11, true, 0], [8, true, 0]]));
check(deutet.urteil === 'offen' && deutet.wort === 'deutet sich an',
  `zwei von drei mit Reaktion, noch im Zufall: „deutet sich an" (${deutet.urteil})`);
check(!/Kein Unterschied|belastbarste/.test(deutet.satz) && /weitere Durchgänge und Leerdurchgänge/.test(deutet.satz),
  'ohne „kein Unterschied", mit dem, was jetzt hilft');
const weiter = await page.evaluate(async ([p, e, h]) => {
  const m = await import('./js/provokation.js');
  return m.naechsterSchritt(p, h, m.provokationsBild(p, e, h).urteil);
}, [bauen([[20, false, 6], [17, false, 6], [14, false, 0], [11, true, 0], [8, true, 0]]).provokation,
  bauen([[20, false, 6], [17, false, 6], [14, false, 0], [11, true, 0], [8, true, 0]]).eintraege, heute]);
check(weiter && weiter.dran === true, `und der nächste Schritt ist dran, statt „genug beisammen" (${weiter && weiter.satz})`);

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
 * Grund dasteht als alle übrigen: Eine Nahrungsmittelallergie kann zu einer
 * anaphylaktischen Reaktion führen (Quelle in js/provokation.js). Er darf
 * nirgends fehlen, wo jemand aufgefordert wird, etwas absichtlich zu sich zu
 * nehmen. Seit der Fassung 30 nennt er einen Verdacht statt einer Diagnose
 * („Das wäre eine Allergie“).
 */
check(
  /können auf eine Allergie\s+hindeuten/.test(sicht) && /ärztlich abgeklärt/.test(sicht)
    && !/Das wäre eine Allergie/.test(sicht),
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
// Dass der Test nicht verblindet ist, steht dabei; wie der Bericht das
// begründet, steht in js/bericht.js.
check(
  /Nicht verblindet/.test(text),
  'und dem Hinweis, dass der Test nicht verblindet ist',
);
// Wie in der App: Ohne Verblindung ist keines der Ergebnisse ein Nachweis.
// Bis zur Fassung 29 stand im Bericht „Die Erwartung schiebt nur in eine
// Richtung" – das widerlegt de Graaf 2024 (PMID 38040019, js/bericht.js).
check(
  text.replace(/\s+/g, ' ').includes('Ohne Verblindung ist keines der Ergebnisse ein Nachweis – weder das mit noch das ohne Reaktion')
    && !/nur in eine\s+Richtung|wiegt hier schwerer/.test(text),
  'der Bericht sagt dasselbe wie die App: kein Ergebnis ist ohne Verblindung ein Nachweis',
);

/*
 * Erbliche Fruktoseintoleranz: so deutlich ausgeschlossen wie die Allergie
 * (NICHT_BEI_ALLERGIE). Laut EMA sollen Menschen mit dieser Erkrankung
 * Arzneimittel mit Fruchtzucker oder Sorbit nicht einnehmen (Beleg in
 * js/provokation.js). Bis zur Fassung 30 hieß es „Nicht gedacht bei …“.
 */
{
  const warum = await page.evaluate(() => import('./js/provokation.js')
    .then((m) => Object.fromEntries(m.PRUEFBAR.map((x) => [x.id, x.warum]))));
  check(['fruktose', 'sorbit'].every((id) => warum[id].includes('nicht anwenden bei der seltenen erblichen Fruktoseintoleranz')
    || warum[id].includes('Nicht anwenden bei der seltenen erblichen Fruktoseintoleranz'))
    && !Object.values(warum).some((w) => w.includes('Nicht gedacht')),
  'Fruktose und Sorbit: „Nicht anwenden“ bei erblicher Fruktoseintoleranz, kein „Nicht gedacht bei …“');
}

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/provokation.png`, fullPage: true });
await browser.close();
ende();
