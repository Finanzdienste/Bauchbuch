/*
 * Nach Wirkweise statt nach Zutat.
 *
 * Der Punkt der Klassen ist die Fallzahl: „Zwiebel" kommt zwölfmal vor, „FODMAP"
 * achtzigmal. Geprüft wird deshalb genau das – dass eine Klasse dort eine
 * Aussage trägt, wo die einzelne Zutat noch zählt, und dass sie trotzdem
 * schweigt, wenn die Vergleichsgruppe fehlt.
 *
 * Und die zweite Hälfte: Eine Klasse ohne Aufschlüsselung wäre eine Sackgasse.
 * Man kann FODMAP nicht weglassen, man kann Zwiebeln weglassen.
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
  await page.waitForTimeout(250);
};

/*
 * Fünf verschiedene FODMAP-Zutaten über zwanzig Tage: je vier Vorkommen.
 *
 * Die Zahl ist mit Absicht so gewählt. Vier liegt *unter* der Schwelle von
 * fünf, ab der die App zu einer einzelnen Zutat etwas sagt – jede für sich
 * bleibt also stumm. Die Klasse sammelt alle zwanzig ein und kommt damit über
 * ihre eigene Schwelle von acht. Genau dieser Sprung ist der Grund, warum es
 * die Klassen gibt, und genau er wird hier geprüft.
 *
 * Die Gegenprobe sind Mahlzeiten ganz ohne angekreuzte Zutat: Sie zählen als
 * „ohne FODMAP", ohne nebenbei eine andere Klasse mitzuschleppen.
 */
const eintraege = [];
const fodmapZutaten = ['zwiebel', 'huelsen', 'rohkost', 'vollkorn', 'milch'];
for (let t = 1; t <= 20; t++) {
  eintraege.push({
    id: `f${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag',
    portion: 'normal', zutaten: [{ id: fodmapZutaten[t % 5], rolle: 'haupt' }],
  });
  eintraege.push({
    id: `b${t}`, am: vorTagen(t), um: '14:00', art: 'beschwerde', staerke: 7, arten: ['blaehung'],
  });
  // Die Gegenprobe: Abendessen ohne angekreuzte Zutat, danach nichts.
  eintraege.push({
    id: `a${t}`, am: vorTagen(t), um: '19:00', art: 'essen', was: 'Abend',
    portion: 'normal', zutaten: [],
  });
}

await setze({ begruesst: true, tab: 'muster', eintraege, tage: {}, fenster: 4, mindestFaelle: 5 });

const klassen = page.locator('.funde-klassen');
check(await klassen.count() === 1, 'es gibt eine Liste nach Wirkweise');
const erste = page.locator('.fund-klasse').first();
const eText = await text(erste);
check(eText.includes('FODMAP'), 'FODMAP steht oben – über fünf Zutaten hinweg gerechnet');
check(eText.includes('20 Mahlzeiten damit'), 'mit der Fallzahl, die einzeln nie zusammengekommen wäre');
check(eText.includes('20 ohne'), 'und der Zahl der Vergleichsmahlzeiten');
check(
  eText.includes('vergärbare') || eText.includes('vergoren'),
  'daneben steht, was die Klasse überhaupt ist – „FODMAP" allein sagt niemandem etwas',
);

/* ---------- Die Aufschlüsselung: ohne sie ist die Klasse eine Sackgasse ---------- */

check(
  eText.includes('Bei dir steckt das in'),
  'die Klasse wird in die Zutaten aufgelöst, die sie in diesem Tagebuch trägt',
);
check(
  fodmapZutaten.every((z) => eText.toLowerCase().includes(z.slice(0, 5))
    || eText.includes('Zwiebel') || eText.includes('Hülsen')),
  'und zwar in die eigenen, nicht in eine allgemeine Liste',
);
check(
  /\(\d+×\)/.test(eText),
  'jede mit ihrer Häufigkeit – die Zwiebel achtmal ist etwas anderes als die Zwiebel einmal',
);

/* ---------- Einzeln reicht es nicht ---------- */

check(
  await page.locator('.funde-zutaten').count() === 0,
  'die einzelnen Zutaten kommen je viermal vor und tragen für sich keine Aussage',
);
const wartet = await text(page.locator('.karte.zaehlt').first());
check(
  wartet.includes('Zwiebel') && wartet.includes('4 von 5'),
  'sie stehen stattdessen unter „Zählt noch" mit dem, was ihnen fehlt',
);

/* ---------- Ohne Vergleichsgruppe schweigt die Klasse ---------- */

const nurFodmap = [];
for (let t = 1; t <= 20; t++) {
  nurFodmap.push({
    id: `n${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag',
    portion: 'normal', zutaten: [{ id: 'zwiebel', rolle: 'haupt' }],
  });
  nurFodmap.push({ id: `nb${t}`, am: vorTagen(t), um: '14:00', art: 'beschwerde', staerke: 7, arten: ['blaehung'] });
}
await setze({ begruesst: true, tab: 'muster', eintraege: nurFodmap, tage: {}, fenster: 4, mindestFaelle: 5 });
check(
  await page.locator('.fund-klasse').count() === 0,
  'wer in jeder Mahlzeit FODMAP hat, bekommt dazu keine Aussage – es fehlt die Vergleichsgruppe',
);
check(
  (await text(page.locator('.karte', { hasText: 'Nach Wirkweise' }))).includes('gebraucht werden je acht'),
  'stattdessen steht da, was fehlt',
);
await page.screenshot({ path: `${SHOT}/98-klassen.png`, fullPage: true });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
