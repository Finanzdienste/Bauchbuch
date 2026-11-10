/*
 * Die Vorschläge für heute.
 *
 * Ein Rat ohne Begründung ist ein Befehl, und Befehle über das eigene Essen
 * befolgt man blind oder gar nicht – beides schlecht. Geprüft wird deshalb
 * weniger, *dass* etwas vorgeschlagen wird, als woraus es folgt:
 *
 *   * Jeder Vorschlag nennt sein „warum" und woher es kommt – aus dem
 *     eigenen Verlauf oder aus allgemeinen Hinweisen.
 *   * Der Sportvorschlag richtet sich nach der Lage, beschreibt sie aber nur:
 *     Seit der Fassung 30 nennt keine Karte mehr eine feste Zeit oder
 *     Minutenzahl, die keine Quelle trägt („Erst in zwei Stunden intensiv",
 *     „Zwanzig Minuten gehen", „mindestens eine Stunde, bevor du dich
 *     hinlegst").
 *   * Es steht nirgends, welches Medikament jemand nehmen soll. Das ist die
 *     eine Empfehlung, die diese App nicht gibt, und sie darf sich nicht durch
 *     die Hintertür einschleichen.
 */
import { chromium } from 'playwright';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { URL, KEY, HANDY, SHOT, ROOT, vorTagen, pruefer } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const heute = vorTagen(0);
const setze = async (stand) => {
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)),
    [KEY, { begruesst: true, tab: 'heute', fenster: 4, mindestFaelle: 5, tage: {}, ...stand }]);
  await page.reload({ waitUntil: 'networkidle' });
};

await page.goto(URL, { waitUntil: 'networkidle' });

/* ---------- Ein gepflanzter Auslöser wird zum Vorschlag ---------- */

const mitKaffee = [];
for (let t = 1; t <= 12; t++) {
  mitKaffee.push({ id: `k${t}`, am: vorTagen(t), um: '09:00', art: 'essen', was: 'Frühstück', portion: 'normal', zutaten: [{ id: 'kaffee', rolle: 'getraenk' }] });
  mitKaffee.push({ id: `b${t}`, am: vorTagen(t), um: '10:30', art: 'beschwerde', staerke: 7, arten: ['brennen'] });
  mitKaffee.push({ id: `a${t}`, am: vorTagen(t), um: '18:00', art: 'essen', was: 'Abend', portion: 'normal', zutaten: [] });
}
await setze({ eintraege: mitKaffee });

const rat = await page.locator('.rat').textContent();
check(rat.includes('Heute eher ohne Kaffee'), 'der auffällige Auslöser wird für heute vorgeschlagen');
check(rat.includes('7,0 statt 0,0'), 'mit den Zahlen, aus denen das folgt');
check(rat.includes('12 Mahlzeiten damit'), 'und der Fallzahl');
check(
  (await page.locator('.rat-quelle.q-eigen').count()) > 0,
  'als „aus deinem Verlauf" ausgezeichnet',
);
check(
  rat.includes('Nicht für immer streichen'),
  'mit dem Hinweis, es nicht dauerhaft zu streichen – ein Verdacht ist kein Urteil',
);
check(
  !rat.includes('war keiner') && !rat.includes('in zwei Wochen ohne ihn')
    && rat.includes('lässt sich so allein nicht sicher sagen; das kann die Praxis abklären'),
  'und ohne den Schluss „Ein Auslöser, der sich in zwei Wochen ohne ihn nicht bestätigt, war keiner“ – das sagt ein Tagebuch nicht',
);
await page.screenshot({ path: `${SHOT}/92-rat.png` });

/* ---------- Sport richtet sich nach der Lage ---------- */

await setze({
  eintraege: [{ id: 's1', am: heute, um: '08:00', art: 'beschwerde', staerke: 8, arten: ['krampf'] }],
});
const stark = await page.locator('.rat-sport').textContent();
check(
  stark.includes('Bewegung bei starken Beschwerden') && stark.includes('kann die Praxis einschätzen'),
  'bei starken Beschwerden: was zu Reflux und Anstrengung bekannt ist, und der Verweis auf die Praxis',
);
check(
  !/nur spazieren|Zwanzig Minuten|bringt intensives Training nichts/.test(stark),
  'ohne „Heute nur spazieren“ und ohne Minutenzahl – beides trägt keine Quelle',
);
const schon = await page.locator('.rat-essen').first().textContent();
check(
  schon.includes('Zwieback oder Haferschleim') && schon.includes('nicht ausreichend erforscht')
    && schon.includes('gehört das in die Praxis') && !/Kartoffel|Zucchini|Geflügel|dabei bleiben/.test(schon),
  'die Schonkost nur mit dem, was gesund.bund.de nennt, samt „nicht ausreichend erforscht“',
);

/*
 * Ein leerer Tag ist kein guter Tag.
 *
 * Genau das stand hier einmal, und der Rat glaubte es: Ist der Tageswert 0,
 * hieß es „beschwerdefrei und ausgeruht – heute ist der Tag fürs intensive
 * Training". Ein Tag fängt aber immer leer an. Der Satz erschien deshalb jeden
 * Morgen, auch bei jemandem, der an jedem der letzten Tage eine Sechs
 * eingetragen hatte. Diese Prüfung hielt das nicht auf, sondern schrieb es
 * fest – sie nannte den leeren Tag selbst „beschwerdefrei".
 */
await setze({ eintraege: [] });
const leer = await page.locator('.rat-sport').textContent();
check(
  !/Beschwerdefrei und ausgeruht/.test(leer),
  'ein leerer Tag wird nicht als beschwerdefrei ausgegeben',
);
check(
  /keine Aussage über den Tag/.test(leer),
  'sondern ausdrücklich ohne Aussage über den Tag',
);
check(
  !/spricht nichts gegen|mindestens eine Stunde/.test(leer),
  'und ohne „spricht nichts gegen intensives Training“ und „mindestens eine Stunde, bevor du dich hinlegst“',
);
check(
  /noch nichts eingetragen/.test(leer) && /nicht, dass nichts war/.test(leer),
  'mit dem Unterschied ausgeschrieben, der hier gilt',
);

/*
 * Und die Gegenprobe: Steht für heute etwas da – hier eine Tagesangabe ohne
 * jede Beschwerde –, dann darf der Rat sich darauf berufen. Sonst hätte die
 * Korrektur oben die Aussage nur abgeschafft statt sie richtig zu machen.
 */
await setze({ eintraege: [], tage: { [heute]: { stimmung: 1, stress: 0 } } });
const gut = await page.locator('.rat-sport').textContent();
check(gut.includes('Bewegung heute') && gut.includes('nennen auch anstrengende Bewegung'),
  'an einem eingetragenen Tag ohne Beschwerden: die allgemeinen Richtwerte, die auch anstrengende Bewegung nennen');
check(!/ist heute der Tag dafür|mindestens eine Stunde/.test(gut), 'ohne Zeitregel fürs Hinlegen');
check(
  /etwas eingetragen/.test(gut),
  'und der Beleg sagt, worauf er sich stützt',
);

await setze({
  eintraege: [{ id: 'e1', am: heute, um: '23:59', art: 'essen', was: 'gerade eben', portion: 'normal', zutaten: [] }],
});
// Die Mahlzeit liegt in der Zukunft dieses Tages nur, wenn der Test nach
// Mitternacht liefe – sonst ist sie eben gerade vorbei. Beides ist in Ordnung:
// geprüft wird, dass überhaupt ein Sportvorschlag mit Begründung dasteht.
check(
  (await page.locator('.rat-sport .klein').textContent()).length > 10,
  'auch dieser Vorschlag nennt seinen Grund',
);

/* ---------- Anspannung führt zur Atemübung ---------- */

await setze({
  eintraege: [],
  tage: { [heute]: { stress: 4, schlaf: 3 } },
});
const ruhe = await page.locator('.rat-ruhe').first().textContent();
check(ruhe.length > 0, 'bei viel Anspannung kommt ein Vorschlag zur Ruhe');
const ruheText = await page.locator('.rat').textContent();
check(
  ruheText.includes('4–7–8'),
  'und nennt die Übung beim Namen',
);
check(
  !/schaltet auf den Teil des Nervensystems|zum Runterkommen|ursprünglich fürs Einschlafen|Zwei Minuten Atmen/.test(ruheText)
    && ruheText.includes('kann laut gesund.bund.de die Entspannung fördern')
    && ruheText.includes('nicht hinreichend untersucht'),
  'die Atemkarten sagen nur, was belegt ist: tiefes Atmen „kann“ die Entspannung fördern, vor dem Schlafen nicht hinreichend untersucht',
);
const angespannt = await page.locator('.rat-sport').textContent();
check(
  angespannt.includes('Bewegung und Anspannung') && angespannt.includes('wirken Stress entgegen')
    && !/Intervalle|Reden noch geht|wäre heute richtig/.test(angespannt),
  'an einem angespannten Tag: Bewegung wirkt Stress entgegen – ohne die unbelegte Warnung vor Intervallen',
);

/* ---------- Kein Medikamentenvorschlag ---------- */

await setze({
  eintraege: [
    { id: 'm1', am: vorTagen(1), um: '07:00', art: 'medikament', mittel: 'Pantoprazol', dosis: '20 mg' },
    { id: 'b1', am: heute, um: '10:00', art: 'beschwerde', staerke: 5, arten: ['brennen'] },
  ],
});
const alles = await page.locator('#view').textContent();
check(alles.includes('Pantoprazol'), 'was sie nimmt, steht da');
check(alles.includes('zuletzt'), 'mit dem Datum der letzten Einnahme');
// Das Datum („Di, 03.11.") endet schon mit einem Punkt – danach kein zweiter.
check(/Pantoprazol – zuletzt \S+, \d\d\.\d\d\. Was die Mittel bewirken/.test(alles) && !alles.includes('.. Was die Mittel'),
  `nach dem Datum genau ein Punkt (${(alles.match(/zuletzt [^·]*?Was die Mittel/) || [''])[0]})`);
check(
  alles.includes('schlägt bewusst kein Medikament vor'),
  'und der Satz, dass hier bewusst nichts vorgeschlagen wird',
);
const geraten = alles.match(/nimm (heute |jetzt )?(ein|eine|einen|Pantoprazol|Omeprazol|Ibuprofen)/gi) || [];
check(
  geraten.length === 0,
  `nirgends eine Einnahmeempfehlung${geraten.length ? `: ${geraten.join(', ')}` : ''}`,
);

/* ---------- Nur für heute ---------- */

await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
await page.waitForTimeout(250);
check(
  await page.locator('.rat').count() === 0,
  'an einem vergangenen Tag stehen keine Vorschläge – für gestern kommt jeder Rat zu spät',
);

/* ---------- Vorsicht beim Essen mit einem ADHS-Mittel (seit der Fassung 28) ---------- */

/*
 * Weniger Appetit gehört bei ADHS-Mitteln zu den häufigen Nebenwirkungen.
 * Wer dabei ungewollt abnimmt oder tagsüber keinen Appetit hat, bekommt hier
 * keinen Rat, weniger oder früher zu essen – das wägt die Praxis ab. Ohne
 * Abnehmen und ohne „Kein Appetit" bleibt der Rat zur späten Mahlzeit, mit
 * einem Satz dazu. Alles nur mit dem Schalter ADHS.
 */
const essenRat = [];
for (let t = 1; t <= 12; t++) {
  essenRat.push({ id: `rk${t}`, am: vorTagen(t), um: '09:00', art: 'essen', was: 'Frühstück', portion: 'normal', zutaten: [{ id: 'kaffee', rolle: 'getraenk' }] });
  essenRat.push({ id: `rb${t}`, am: vorTagen(t), um: '10:30', art: 'beschwerde', staerke: 7, arten: ['brennen'] });
  essenRat.push({ id: `ra${t}`, am: vorTagen(t), um: '18:00', art: 'essen', was: 'Abend', portion: 'normal', zutaten: [] });
}
for (let t = 13; t <= 20; t++) {
  essenRat.push({ id: `rs${t}`, am: vorTagen(t), um: '20:30', art: 'essen', was: 'Spät', portion: 'normal', zutaten: [] });
  essenRat.push({ id: `rsb${t}`, am: vorTagen(t), um: '22:00', art: 'beschwerde', staerke: 6, arten: ['druck'] });
}
const einnahme = { id: 'rm1', am: vorTagen(2), um: '07:30', art: 'medikament', mittel: 'Elvanse', dosis: '30 mg' };
const appetit = [1, 2, 3].map((t) => ({ id: `rp${t}`, am: vorTagen(t), um: '08:30', art: 'beschwerde', staerke: 2, arten: ['appetit'] }));
const ratText = async () => (await page.locator('.rat').textContent()) || '';

await setze({ eintraege: [...essenRat, einnahme, ...appetit] });
let r = await ratText();
check(r.includes('Heute eher ohne Kaffee') && r.includes('Spätes Essen und Liegen'),
  'ohne den Schalter ADHS: die Vorschläge zum Essen wie bisher');
await setze({ adhsAn: true, eintraege: [...essenRat, einnahme, ...appetit] });
r = await ratText();
check(!r.includes('Heute eher ohne') && !r.includes('Spätes Essen und Liegen'),
  'mit ADHS-Mittel und „Kein Appetit“ an 3 der letzten 7 Tage: kein Rat, weniger oder später zu essen');
await setze({ adhsAn: true, eintraege: [...essenRat, einnahme, ...appetit.slice(0, 2)] });
r = await ratText();
check(r.includes('Heute eher ohne Kaffee') && r.includes('Spätes Essen und Liegen')
  && r.includes('Wann gegessen wird, wägt deshalb die Praxis ab, nicht diese Karte.')
  && !r.includes('vielleicht nötig'),
'an 2 von 7 Tagen: die Vorschläge bleiben, die späte Mahlzeit bekommt den Satz dazu – ohne „vielleicht nötig“');
const waage = [
  { am: vorTagen(1), kg: 60 }, { am: vorTagen(8), kg: 60.2 }, { am: vorTagen(15), kg: 60.1 },
  { am: vorTagen(70), kg: 64 }, { am: vorTagen(80), kg: 64.2 }, { am: vorTagen(90), kg: 64.1 },
];
await setze({ adhsAn: true, gewicht: waage, abnehmenGewollt: false, eintraege: [...essenRat, einnahme] });
r = await ratText();
check(!r.includes('Heute eher ohne') && !r.includes('Spätes Essen und Liegen'),
  'mit ADHS-Mittel und ungewolltem Abnehmen: ebenfalls kein Rat, weniger oder später zu essen');
await setze({ adhsAn: true, gewicht: waage, abnehmenGewollt: false, eintraege: essenRat });
r = await ratText();
check(r.includes('Heute eher ohne Kaffee') && !r.includes('wägt deshalb die Praxis ab'),
  'ohne Einnahme in den letzten 14 Tagen gilt das alles nicht');

/* Und dieselbe Rechnung ohne Anzeige: raete() liest essenVorsicht, sonst nichts. */
const { raete } = await import(pathToFileURL(path.join(ROOT, 'js', 'rat.js')).href);
const { ausloeserBilanz } = await import(pathToFileURL(path.join(ROOT, 'js', 'auswertung.js')).href);
const grundlage = {
  eintraege: essenRat, tage: {}, heute: vorTagen(0), eigene: [],
  bilanz: ausloeserBilanz(essenRat, { fenster: 4, mindestFaelle: 5 }),
  faktoren: {}, phasen: [], letzteMahlzeitStunden: null, mittel: [{ name: 'Elvanse', zuletzt: 'gestern' }],
};
const ids = (l) => l.map((x) => x.id).join(',');
const ohne = raete(grundlage);
const bremse = raete({ ...grundlage, essenVorsicht: 'bremse' });
const zusatz = raete({ ...grundlage, essenVorsicht: 'zusatz' });
check(ids(ohne).includes('essen-eigen') && ids(ohne).includes('essen-spaet')
  && !ids(bremse).includes('essen-eigen') && !ids(bremse).includes('essen-spaet'),
'raete(): die Bremse nimmt „Heute eher ohne …“ und „Spätes Essen und Liegen“ heraus');
check(JSON.stringify(ohne.filter((x) => x.id !== 'essen-spaet')) === JSON.stringify(zusatz.filter((x) => x.id !== 'essen-spaet'))
  && zusatz.find((x) => x.id === 'essen-spaet').warum.endsWith('wägt deshalb die Praxis ab, nicht diese Karte.'),
'raete(): der Zusatz ändert nur den Grund unter der späten Mahlzeit');
/*
 * Kein Satz rät zu einem Mittel. „Nimm die Liste mit zum Termin" ist der Satz
 * der Fassung 27 unter „Was du nimmst" – er bittet, die Liste mitzunehmen,
 * und ist im Gold der Ansichten festgeschrieben (tests/gold/v27-ansichten.json).
 */
const RAT_RE = /\b(nimm|nehmen Sie|empfehlen|empfohlen|du solltest|hilft gegen)\b/i;
const saetze = [ohne, bremse, zusatz].flat().flatMap((x) => [x.titel, x.text, x.warum])
  .flatMap((t) => String(t).split(/(?<=[.!?])\s+/))
  .filter((t) => t !== 'Nimm die Liste mit zum Termin.');
const geraten2 = saetze.filter((t) => RAT_RE.test(t));
check(geraten2.length === 0, `kein Satz der Vorschläge trifft den Empfehlungs-Ausdruck${geraten2.length ? `: ${geraten2[0]}` : ''}`);

/* ---------- Was die Karten seit der Fassung 30 nicht mehr sagen ---------- */

/*
 * Jede Karte „Für heute“ in jeder Lage, die raete() kennt – und darin keine
 * der Aussagen, die keine Quelle trägt: feste Zeiten und Minutenzahlen für
 * Bewegung, die Schwerkraft, „fünf statt drei“, das umschaltende
 * Nervensystem, der Ursprung von 4–7–8. Dazu, was stattdessen dasteht.
 */
const { SCHONKOST } = await import(pathToFileURL(path.join(ROOT, 'js', 'rat.js')).href);
const { UEBUNGEN, gesamtDauer } = await import(pathToFileURL(path.join(ROOT, 'js', 'atem.js')).href);
const heuteIso = vorTagen(0);
const basis = {
  eintraege: [], tage: {}, heute: heuteIso, eigene: [], bilanz: [],
  faktoren: {}, phasen: [], mittel: [],
};
const lagen = [
  { letzteMahlzeitStunden: null },
  { letzteMahlzeitStunden: 0.5 },
  { letzteMahlzeitStunden: null, eintraege: [{ id: 'l1', am: heuteIso, um: '10:00', art: 'beschwerde', staerke: 3, arten: ['druck'] }] },
  { letzteMahlzeitStunden: null, eintraege: [{ id: 'l2', am: heuteIso, um: '10:00', art: 'beschwerde', staerke: 7, arten: ['krampf'] }] },
  { letzteMahlzeitStunden: null, tage: { [heuteIso]: { stress: 4, schlaf: 3 } } },
  { letzteMahlzeitStunden: null, tage: { [heuteIso]: { stimmung: 1, stress: 0 } } },
  { letzteMahlzeitStunden: null, faktoren: { stress: { genug: true, differenz: 2, hoch: { schnitt: 5, tage: 9 }, niedrig: { schnitt: 2, tage: 20 } } } },
];
const alleRaete = lagen.flatMap((l) => raete({ ...basis, ...l }));
const alleSaetze = alleRaete.concat(ohne, bremse, zusatz).map((x) => `${x.titel} | ${x.text} | ${x.warum}`).join('\n');
const UNBELEGT = [
  /Erst in zwei Stunden/, /Zwanzig Minuten/, /30 bis 45 Minuten/, /mindestens eine Stunde/,
  /Intervalle/, /Reden noch geht/, /spricht nichts dagegen/, /Schwerkraft/, /Fünf kleine Mahlzeiten/,
  /nie viel auf einmal/, /Nervensystems/, /ursprünglich fürs Einschlafen/, /zum Runterkommen/,
  /dabei bleiben bei/, /war keiner/, /vielleicht nötig/, /gut zwei Minuten/,
];
const treffer = UNBELEGT.filter((re) => re.test(alleSaetze));
check(treffer.length === 0, `keine der unbelegten Aussagen von früher steht noch auf einer Karte${treffer.length ? `: ${treffer.join(', ')}` : ''}`);
check(alleSaetze.includes('Bewegung kurz nach dem Essen')
  && alleSaetze.includes('löste Laufen mit vollem Magen mehr Rückfluss aus als nüchtern'),
'kurz nach dem Essen steht, was die Studien mit gesunden Freiwilligen zeigen – keine Frist');
check(alleSaetze.includes('Bei Reflux können nach körperlicher Anstrengung und beim Bücken oder Liegen vermehrt Beschwerden auftreten.'),
  'der Satz zu Reflux und Anstrengung steht so, wie gesund.bund.de ihn hergibt');
check(JSON.stringify(SCHONKOST) === JSON.stringify(['Zwieback', 'Haferschleim', 'Reis', 'Banane']),
  `die Schonkost-Liste nennt nur, was gesund.bund.de nennt (${SCHONKOST.join(', ')})`);
const vierSiebenAcht = UEBUNGEN.find((u) => u.id === '478');
const sek = gesamtDauer(vierSiebenAcht);
check(sek >= 60 && sek < 90 && alleSaetze.includes('mit vier Runden gut eine Minute') && vierSiebenAcht.runden === 4,
  `die Dauer von 4–7–8 auf der Karte passt zur Übung (${sek} Sekunden, ${vierSiebenAcht.runden} Runden)`);
const portion = raete({ ...grundlage, bilanz: [{ id: 'gross', genug: true, differenz: 2, schnittMit: 5, schnittOhne: 2, faelle: 8, gegenFaelle: 20 }] })
  .find((x) => x.id === 'essen-portion');
check(portion && portion.titel === 'Große Portionen' && portion.text.includes('verlässlich untersucht ist das laut gesund.bund.de nicht'),
  'große Portionen: beschrieben als Erfahrung mancher, mit dem Hinweis, dass es nicht verlässlich untersucht ist');

/* ---------- Zeiten und Daten in deutscher Schreibweise ---------- */

/*
 * Zwei Schreibweisen, die schon vor der Fassung 29 falsch waren: „Die letzte
 * Mahlzeit ist 0.4 Stunden her." (englischer Dezimalpunkt, und Bruchteile
 * einer Stunde liest niemand gern) und „Pantoprazol – zuletzt Mi, 04.11.. Was
 * die Mittel …" (das Datum endet schon mit einem Punkt). Hier ist festgehalten,
 * wie es heißen soll: unter einer Stunde in Minuten, ab einer Stunde mit
 * derselben Zehntelstunde wie vorher, nur mit Komma, und die Einzahl, wo sie
 * hingehört. Knapp unter zwei Stunden ergäbe die Zehntelstunde schon „2" –
 * die Karte „Bewegung kurz nach dem Essen" (bis zur Fassung 29 „Erst in zwei
 * Stunden intensiv") steht aber nur bis zwei Stunden; dort steht „knapp 2
 * Stunden". Die Rechnung dahinter – ab wann „frisch gegessen" gilt – bleibt.
 */
const leerGrund = {
  eintraege: [], tage: {}, heute: vorTagen(0), eigene: [], bilanz: [],
  faktoren: {}, phasen: [], mittel: [],
};
const sportGrund = (std) => {
  const s = raete({ ...leerGrund, letzteMahlzeitStunden: std }).find((x) => x.id === 'sport');
  return s ? s.warum : '';
};
const zeiten = [
  [0, 'Die letzte Mahlzeit war gerade eben.'],
  [0.005, 'Die letzte Mahlzeit war gerade eben.'],
  [1 / 60, 'Die letzte Mahlzeit ist 1 Minute her.'],
  [0.4, 'Die letzte Mahlzeit ist 24 Minuten her.'],
  [25 / 60, 'Die letzte Mahlzeit ist 25 Minuten her.'],
  [59 / 60, 'Die letzte Mahlzeit ist 59 Minuten her.'],
  [1, 'Die letzte Mahlzeit ist 1 Stunde her.'],
  [61 / 60, 'Die letzte Mahlzeit ist 1 Stunde her.'],
  [1.5, 'Die letzte Mahlzeit ist 1,5 Stunden her.'],
  [1.26, 'Die letzte Mahlzeit ist 1,3 Stunden her.'],
  [116 / 60, 'Die letzte Mahlzeit ist 1,9 Stunden her.'],
  // Knapp unter der Grenze ergäbe die Zehntelstunde schon „2" – unter einer
  // Karte, die nur bis zwei Stunden steht, ein Widerspruch.
  [117 / 60, 'Die letzte Mahlzeit ist knapp 2 Stunden her.'],
  [1.97, 'Die letzte Mahlzeit ist knapp 2 Stunden her.'],
  [119 / 60, 'Die letzte Mahlzeit ist knapp 2 Stunden her.'],
];
zeiten.forEach(([std, soll]) => {
  const ist = sportGrund(std);
  check(ist === soll, `${std.toFixed(3)} Stunden: „${soll}"${ist === soll ? '' : ` – steht „${ist}"`}`);
});
const alleZeiten = zeiten.map(([std]) => sportGrund(std));
check(alleZeiten.every((t) => !/\d\.\d/.test(t)), 'in keiner dieser Zeiten ein Dezimalpunkt');
check(raete({ ...leerGrund, letzteMahlzeitStunden: 2 }).find((x) => x.id === 'sport').titel !== 'Bewegung kurz nach dem Essen',
  'ab zwei Stunden wie bisher keine Karte „Bewegung kurz nach dem Essen" – die Grenze selbst bleibt');
// Jede ganze Minute bis zur Grenze: Solange die Karte „Bewegung kurz nach dem
// Essen" steht, nennt ihr Grund nie zwei Stunden oder mehr.
const widersprueche = [];
for (let min = 0; min < 120; min++) {
  const r = raete({ ...leerGrund, letzteMahlzeitStunden: min / 60 }).find((x) => x.id === 'sport');
  if (r.titel !== 'Bewegung kurz nach dem Essen') widersprueche.push(`${min} min: ${r.titel}`);
  else if (/ist ([2-9]|\d{2,})(,\d)? Stunden her/.test(r.warum)) widersprueche.push(`${min} min: ${r.warum}`);
}
check(widersprueche.length === 0, `0 bis 119 Minuten: die Karte steht, und ihr Grund nennt nie „2 Stunden"${widersprueche.length ? ` – ${widersprueche.slice(0, 3).join(' | ')}` : ''}`);

const mittelText = (mittel) => raete({ ...leerGrund, mittel }).find((x) => x.id === 'mittel').text;
const mitDatum = mittelText([{ name: 'Pantoprazol', zuletzt: 'Sa, 31.10.' }, { name: 'Omeprazol', zuletzt: 'Mi, 04.11.' }]);
check(mitDatum === 'Pantoprazol – zuletzt Sa, 31.10. · Omeprazol – zuletzt Mi, 04.11. Was die Mittel bewirken, steht unter „Mehr".',
  `endet das letzte Datum mit einem Punkt, kommt keiner dazu (${mitDatum})`);
const ohneDatum = mittelText([{ name: 'Elvanse', zuletzt: 'gestern' }]);
check(ohneDatum === 'Elvanse – zuletzt gestern. Was die Mittel bewirken, steht unter „Mehr".',
  `sonst schließt ein Punkt die Liste ab (${ohneDatum})`);

/*
 * Und in der App, bei fester Uhr: Die Mahlzeit von heute 11:35 ist um 12:00
 * „25 Minuten her", die von 10:30 „1,5 Stunden". Geprüft wird der sichtbare
 * Text, nicht nur raete() – der Weg dahin geht über die Uhrzeit des Eintrags.
 */
const uhrSeite = await browser.newPage({ viewport: HANDY });
uhrSeite.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));
await uhrSeite.clock.setFixedTime(new Date(`${heute}T12:00:00`));
await uhrSeite.goto(URL, { waitUntil: 'networkidle' });
const mahlzeitUm = async (um) => {
  await uhrSeite.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, {
    begruesst: true, tab: 'heute', fenster: 4, mindestFaelle: 5, tage: {},
    eintraege: [{ id: 'u1', am: heute, um, art: 'essen', was: 'Mittag', portion: 'normal', zutaten: [] }],
  }]);
  await uhrSeite.reload({ waitUntil: 'networkidle' });
  return (await uhrSeite.locator('.rat-sport').textContent()) || '';
};
const sport25 = await mahlzeitUm('11:35');
check(sport25.includes('Die letzte Mahlzeit ist 25 Minuten her.'),
  `in der App: „Die letzte Mahlzeit ist 25 Minuten her." (${(sport25.match(/Die letzte Mahlzeit[^.]*\.(\d[^.]*\.)?/) || [''])[0]})`);
const sport90 = await mahlzeitUm('10:30');
check(sport90.includes('Die letzte Mahlzeit ist 1,5 Stunden her.'),
  `in der App: „Die letzte Mahlzeit ist 1,5 Stunden her." (${(sport90.match(/Die letzte Mahlzeit[^.]*\.(\d[^.]*\.)?/) || [''])[0]})`);
const sport118 = await mahlzeitUm('10:02');
check(sport118.includes('Bewegung kurz nach dem Essen') && sport118.includes('Die letzte Mahlzeit ist knapp 2 Stunden her.'),
  `in der App, 118 Minuten: „knapp 2 Stunden" (${(sport118.match(/Die letzte Mahlzeit[^.]*\./) || [''])[0]})`);
await uhrSeite.close();

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
