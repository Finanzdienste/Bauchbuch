/*
 * Die Vorschläge für heute.
 *
 * Ein Rat ohne Begründung ist ein Befehl, und Befehle über das eigene Essen
 * befolgt man blind oder gar nicht – beides schlecht. Geprüft wird deshalb
 * weniger, *dass* etwas vorgeschlagen wird, als woraus es folgt:
 *
 *   * Jeder Vorschlag nennt sein „warum" und woher es kommt – aus ihrem
 *     eigenen Verlauf oder aus dem, was allgemein empfohlen wird.
 *   * Der Sportvorschlag richtet sich nach der Lage: bei starken Beschwerden
 *     nichts Intensives, kurz nach dem Essen auch nicht, an einem guten Tag
 *     ruhig.
 *   * Es steht nirgends, welches Medikament sie nehmen soll. Das ist die eine
 *     Empfehlung, die diese App nicht gibt, und sie darf sich nicht durch die
 *     Hintertür einschleichen.
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
await page.screenshot({ path: `${SHOT}/92-rat.png` });

/* ---------- Sport richtet sich nach der Lage ---------- */

await setze({
  eintraege: [{ id: 's1', am: heute, um: '08:00', art: 'beschwerde', staerke: 8, arten: ['krampf'] }],
});
check(
  (await page.locator('.rat-sport').textContent()).includes('nur spazieren'),
  'bei starken Beschwerden heute kein intensives Training',
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
  /Wenn es dir heute gut geht/.test(leer),
  'sondern als Bedingung formuliert',
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
check(gut.includes('auch intensiv'), 'an einem eingetragenen Tag ohne Beschwerden geht es');
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
check(
  (await page.locator('.rat').textContent()).includes('4–7–8'),
  'und nennt die Übung beim Namen',
);
check(
  (await page.locator('.rat-sport').textContent()).includes('Moderate Ausdauer'),
  'an einem angespannten Tag wird moderat statt intensiv vorgeschlagen',
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
check(r.includes('Heute eher ohne Kaffee') && r.includes('Die letzte Mahlzeit früher legen'),
  'ohne den Schalter ADHS: die Vorschläge zum Essen wie bisher');
await setze({ adhsAn: true, eintraege: [...essenRat, einnahme, ...appetit] });
r = await ratText();
check(!r.includes('Heute eher ohne') && !r.includes('Die letzte Mahlzeit früher legen'),
  'mit ADHS-Mittel und „Kein Appetit“ an 3 der letzten 7 Tage: kein Rat, weniger oder später zu essen');
await setze({ adhsAn: true, eintraege: [...essenRat, einnahme, ...appetit.slice(0, 2)] });
r = await ratText();
check(r.includes('Heute eher ohne Kaffee') && r.includes('Die letzte Mahlzeit früher legen')
  && r.includes('ist die späte Mahlzeit vielleicht nötig – das wägt die Praxis ab, nicht diese Karte.'),
'an 2 von 7 Tagen: die Vorschläge bleiben, die späte Mahlzeit bekommt den Satz dazu');
const waage = [
  { am: vorTagen(1), kg: 60 }, { am: vorTagen(8), kg: 60.2 }, { am: vorTagen(15), kg: 60.1 },
  { am: vorTagen(70), kg: 64 }, { am: vorTagen(80), kg: 64.2 }, { am: vorTagen(90), kg: 64.1 },
];
await setze({ adhsAn: true, gewicht: waage, abnehmenGewollt: false, eintraege: [...essenRat, einnahme] });
r = await ratText();
check(!r.includes('Heute eher ohne') && !r.includes('Die letzte Mahlzeit früher legen'),
  'mit ADHS-Mittel und ungewolltem Abnehmen: ebenfalls kein Rat, weniger oder später zu essen');
await setze({ adhsAn: true, gewicht: waage, abnehmenGewollt: false, eintraege: essenRat });
r = await ratText();
check(r.includes('Heute eher ohne Kaffee') && !r.includes('vielleicht nötig'),
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
'raete(): die Bremse nimmt „Heute eher ohne …“ und „Die letzte Mahlzeit früher legen“ heraus');
check(JSON.stringify(ohne.filter((x) => x.id !== 'essen-spaet')) === JSON.stringify(zusatz.filter((x) => x.id !== 'essen-spaet'))
  && zusatz.find((x) => x.id === 'essen-spaet').warum.endsWith('das wägt die Praxis ab, nicht diese Karte.'),
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

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
