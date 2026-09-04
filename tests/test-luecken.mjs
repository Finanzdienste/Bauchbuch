/*
 * Was noch fehlt – und was keine App beantwortet.
 *
 * Der Abschnitt macht aus einem Tagebuch eines, das weiterfragt. Er kann auf
 * zwei Arten schaden, und gegen beide wird hier geprüft:
 *
 *   1. Indem er die zwei Sorten Lücken vermischt. „Trag mehr ein" und „dafür
 *      braucht es einen Bluttest" sind verschiedene Aufforderungen, und wer
 *      sie verwechselt, trägt fleißig weiter ein statt einen Termin zu machen.
 *   2. Indem er die Möglichkeiten nach Wahrscheinlichkeit sortiert aussehen
 *      lässt. Oben steht, wozu das Tagebuch am meisten zu sagen hat – nicht,
 *      was am ehesten zutrifft. Das ist ein Unterschied.
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
  // Der Abschnitt ist zugeklappt – zehn Möglichkeiten mit je vier Absätzen
  // sind Nachschlagestoff, kein Text zum täglichen Lesen.
  const klappe = page.locator('.verdachtbogen');
  if (await klappe.count()) await klappe.locator('summary').click();
  await page.waitForTimeout(150);
};

/* ---------- Ein Tagebuch mit deutlichen Lücken ---------- */

const duenn = [];
for (let t = 1; t <= 20; t++) {
  duenn.push({
    id: `e${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag',
    portion: 'normal', zutaten: [],
  });
  duenn.push({ id: `b${t}`, am: vorTagen(t), um: '14:00', art: 'beschwerde', staerke: 6, arten: ['krampf'] });
}
await setze({
  begruesst: true, tab: 'muster', eintraege: duenn, tage: {}, fenster: 4,
  mindestFaelle: 5, tagesfragen: ['stimmung', 'stress'],
});

const offen = page.locator('.karte', { hasText: 'Was noch fehlt' }).first();
const oText = await text(offen);
check(await page.locator('.luecken').count() === 1, 'die Liste der eigenen Lücken steht da');
check(
  oText.includes('Stuhlgang eintragen'),
  'ganz oben die größte: ohne Stuhlgang lässt sich ein Reizdarm gar nicht prüfen',
);
check(
  oText.includes('Seit wann hast du das?'),
  'und die eine Angabe, die aus dem Tagebuch nicht hervorgeht',
);
check(
  await page.locator('.luecken li').count() <= 5,
  'höchstens fünf auf einmal – eine Liste mit fünfzehn Punkten liest niemand',
);

/*
 * Und deshalb rücken die leichteren Punkte erst nach, wenn die schweren
 * erledigt sind. Hier ist alles Große beisammen – Stuhlgang, „seit wann",
 * genug Tage, die Rom-Frage – und übrig bleiben die kleinen zwei.
 */
const voll = [];
const vollTage = {};
for (let t = 1; t <= 40; t++) {
  vollTage[vorTagen(t)] = { stimmung: 1, stress: 2 };
  voll.push({
    id: `ve${t}`, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag',
    portion: 'normal', zutaten: [],
  });
  voll.push({
    id: `vb${t}`, am: vorTagen(t), um: '14:00', art: 'beschwerde', staerke: 6,
    arten: ['krampf', 'oberbauch', 'saettigung'], stuhlbezug: 'besser',
  });
  voll.push({ id: `vs${t}`, am: vorTagen(t), um: '09:00', art: 'stuhl', form: 4 });
}
await setze({
  begruesst: true, tab: 'muster', eintraege: voll, tage: vollTage, fenster: 4,
  mindestFaelle: 5, beschwerdenSeit: '2023-01', tagesfragen: ['stimmung', 'stress'],
});
const nachgerueckt = await text(page.locator('.karte', { hasText: 'Was noch fehlt' }).first());
check(
  nachgerueckt.includes('Die Frage „Nachts davon wach" anschalten'),
  'auch eine abgeschaltete Tagesfrage wird als Lücke benannt, nicht stillschweigend hingenommen',
);
check(
  nachgerueckt.includes('Bei Mahlzeiten ankreuzen'),
  'und Mahlzeiten ohne angekreuzte Zutat, die für keine einzige Auslöserfrage zählen',
);
check(
  !nachgerueckt.includes('Stuhlgang eintragen'),
  'was erledigt ist, verschwindet aus der Liste – sonst wäre sie ein Vorwurf statt einer Anleitung',
);

await setze({
  begruesst: true, tab: 'muster', eintraege: duenn, tage: {}, fenster: 4,
  mindestFaelle: 5, tagesfragen: ['stimmung', 'stress'],
});

/* ---------- Die zweite Liste ist ausdrücklich eine andere ---------- */

const verdacht = page.locator('.karte', { hasText: 'Was keine App beantwortet' });
check(await verdacht.count() === 1, 'die Untersuchungen stehen in einer eigenen Karte');
const vText = await text(verdacht);
check(
  await page.locator('.verdacht').count() >= 8,
  'mit den Möglichkeiten einzeln, nicht als Absatz',
);
check(
  vText.includes('Helicobacter pylori') && vText.includes('Atemtest'),
  'Helicobacter mit dem Test dazu – die einzige Möglichkeit hier, die sich behandeln und abhaken lässt',
);
check(
  vText.includes('Zöliakie') && vText.includes('solange noch Gluten gegessen wird'),
  'Zöliakie mit dem Fallstrick: Wer vorher weglässt, bekommt ein falsch unauffälliges Ergebnis',
);
check(
  vText.includes('Gallensteine') && vText.includes('Ultraschall'),
  'auch die Gallenblase – im Tagebuch leicht mit einer Gastritis zu verwechseln',
);
check(
  vText.includes('Calprotectin'),
  'und beim Reizdarm, was vorher ausgeschlossen gehört',
);
check(
  await page.locator('.frage-zeile').count() >= 8,
  'je Möglichkeit ein fertiger Satz zum Vorlesen – dafür ist der ganze Aufwand gut',
);
check(
  vText.includes('Keine Reihenfolge nach Wahrscheinlichkeit'),
  'und der Hinweis, dass die Reihenfolge keine Rangliste ist',
);
await page.screenshot({ path: `${SHOT}/100-luecken.png`, fullPage: true });

/* ---------- Was im Tagebuch steht, taucht als „dafür spricht" auf ---------- */

const mitNsar = [...duenn];
for (let t = 1; t <= 12; t++) {
  mitNsar.push({ id: `n${t}`, am: vorTagen(t), um: '08:00', art: 'medikament', mittel: 'Ibuprofen' });
}
await setze({
  begruesst: true, tab: 'muster', eintraege: mitNsar, tage: {}, fenster: 4,
  mindestFaelle: 5, tagesfragen: ['stimmung', 'stress'],
});
const nsar = page.locator('.verdacht', { hasText: 'Schaden durch Schmerzmittel' });
const nText = await text(nsar);
check(nText.includes('passt zum Verlauf'), 'zwölf Tage Ibuprofen: das steht als gestützt da');
check(
  nText.includes('An 12 Tagen'),
  'mit der Zahl aus dem eigenen Tagebuch als Beleg',
);
check(
  nText.includes('Keine nötig, um die Frage zu stellen'),
  'und ehrlich dazu: Für diese eine Frage braucht es keine Untersuchung',
);

/* ---------- Ohne Anlass wird nichts behauptet ---------- */

check(
  (await text(page.locator('.verdacht', { hasText: 'Blutarmut, Eisenmangel' }).last()))
    .includes('nicht beurteilbar'),
  'wozu das Tagebuch nichts sagen kann, steht als „nicht beurteilbar" da statt als „unauffällig"',
);

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
