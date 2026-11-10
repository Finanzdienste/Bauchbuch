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
  vText.includes('Helicobacter pylori') && vText.includes('Atemtest')
    && vText.includes('ob der Keim danach weg ist, wird nachgeprüft') && !vText.includes('abhaken'),
  'Helicobacter mit dem Test dazu – behandelbar, aber ohne Erfolgsversprechen',
);
check(
  vText.includes('Zöliakie') && vText.includes('wenn schon 6 bis 12 Monate glutenfrei gegessen wurde')
    && !vText.includes('falsch unauffällig'),
  'Zöliakie mit dem Fallstrick, so wie die EMA ihn nennt: nach 6 bis 12 Monaten glutenfrei verlieren die Tests ihren Nutzen',
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

/* ---------- Fassung 30: derselbe Wortlaut wie der Kriterien-Kasten ---------- */

/*
 * Bis zur Fassung 29 stand hier, was die Fassung 30 im Kriterien-Kasten und im
 * Bericht schon gestrichen hatte: „ab 8 gilt Reflux als wahrscheinlich", „die
 * PDS-/EPS-Kriterien sind erfüllt", „setzen voraus, dass nichts Organisches
 * dahintersteckt", und ein Säureblocker ohne Besserung stellte die
 * Refluxkrankheit auf „spricht eher dagegen". Geprüft direkt an der Funktion,
 * mit einem Säureblocker ohne Besserung, einem Punktwert über 8 und allen
 * Magenbeschwerden über den alten Schwellen.
 */
{
  const d = {
    kriterien: {
      dauer: { seit: '2024-01' },
      zeitraum: { notierteTage: 60, tagebuchTage: 120 },
      gerdq: { belastbar: true, punkte: 11, wahrscheinlich: true, erfasst: 7 },
      dyspepsie: {
        pruefbar: true,
        pds: { tage: 40, proWoche: 4.7, erfuellt: true },
        eps: { tage: 30, proWoche: 3.5, erfuellt: true },
      },
      reizdarm: {
        pruefbar: true, schmerzErfuellt: false, schmerzTage: 2, proWoche: 0.2,
        merkmale: [], typ: { typ: null, fehlt: 5 }, erfuellt: false,
      },
    },
    stuhl: { gesamt: 20 },
    bezug: { genug: true },
    benutzt: { oberbauch: true, saettigung: true },
    nachtwachAn: true,
    musterIds: [],
    essen: { bewertbar: 0 },
    nsarTage: 0,
    nsarKopfTage: 0,
    warnIds: [],
    krampfAnteil: 0,
    klassen: [],
    mittel: [{ name: 'Pantoprazol', wochen: 6, saeureVersuchAusgereizt: true }],
    mahlzeitenOhneZutaten: 0,
  };
  const { luecken } = await import('../js/luecken.js');
  const l = luecken(d);
  const reflux = l.verdaechte.find((v) => v.id === 'reflux');
  const dys = l.verdaechte.find((v) => v.id === 'dyspepsie');
  const alles = JSON.stringify(l);
  check(reflux.stand === 'offen' && reflux.dagegen.length === 0 && reflux.dafuer.length === 0
    && reflux.offen.includes('Pantoprazol läuft seit 6 Wochen, ohne dass die Bauchwerte darunter besser geworden wären')
    && reflux.offen.includes('nennen manche Fachinformationen weitere Untersuchungen')
    && reflux.offen.includes('Punktwert angelehnt an den GerdQ: 11 von 18'),
  `Refluxkrankheit: Säureblocker und Punktwert ohne Deutung, kein „spricht eher dagegen" (${reflux.stand})`);
  check(dys.stand === 'offen' && dys.dafuer.length === 0
    && dys.offen.includes('Druck, Völlegefühl oder früh satt an 40 Tagen'),
  `funktionelle Dyspepsie: die Magenbeschwerden nur gezählt, kein „passt zum Verlauf" (${dys.stand})`);
  const weg = ['gilt Reflux als wahrscheinlich', 'Schwelle von 8', 'Kriterien sind erfüllt', 'verlangt sind 3',
    'nichts Organisches', 'Wäre Säure die Ursache', 'vier bis acht Wochen', 'Das entscheidet die Spiegelung',
    'Rom-Kriterien verlangen', 'der einzige Weg', 'absetzen', 'falsch negativ', 'erst testen, dann weglassen',
    'fast so viel wie',
    // Fassung 30, zweite Runde: die Reizdarm-Zeile, die Schmerzmittel und
    // Helicobacter (Belege jeweils am Verdacht in js/luecken.js).
    'Reizdarmsyndrom sind erfüllt', 'eigene Diagnose mit eigener Behandlung', 'wird oft vergessen',
    'macht das Labor', 'häufigste vermeidbare', 'greifen die Magenschleimhaut direkt an',
    'in zwei Wochen behandeln', 'abhaken', 'Ab dreißig rechnet Body Check die Kästen'];
  const noch = weg.filter((w) => alles.includes(w));
  check(noch.length === 0, `keine der gestrichenen Aussagen mehr (${noch.join(', ') || 'keine'})`);
  // Einfache Sternchen setzt die Anzeige nicht um – sie stünden wörtlich da.
  const sterne = l.verdaechte.flatMap((v) => [v.was, v.offen, v.frage, ...v.dafuer, ...v.dagegen,
    v.untersuchung.replace(/\*\*(.+?)\*\*/g, '$1')]).filter((x) => /\*/.test(x || ''));
  check(sterne.length === 0, `kein Sternchen, das wörtlich auf dem Bildschirm stünde (${sterne.length})`);

  /*
   * Die Frage zum Vorlesen sagt „erfüllt" nur, wenn der Reizdarm-Kasten unter
   * „Kriterien" es auch sagt. Bis zur Fassung 30 stand es fest in der Frage,
   * auch neben „spricht eher dagegen".
   */
  const rd = l.verdaechte.find((v) => v.id === 'reizdarm');
  check(rd.stand === 'unwahrscheinlich' && !/erfüllt/.test(rd.frage) && rd.frage.includes('Zöliakie'),
    `Reizdarm „spricht eher dagegen“: die Frage behauptet keine erfüllten Kriterien (${rd.frage})`);
  const lErfuellt = luecken({
    ...d,
    kriterien: {
      ...d.kriterien,
      reizdarm: {
        pruefbar: true, schmerzErfuellt: true, schmerzTage: 30, proWoche: 3.5,
        merkmale: [], typ: { typ: null, fehlt: 5 }, erfuellt: true,
      },
    },
  });
  const rdJa = lErfuellt.verdaechte.find((v) => v.id === 'reizdarm');
  check(rdJa.stand === 'gestuetzt' && rdJa.frage.includes('Rom-IV-Kriterien für ein Reizdarmsyndrom erfüllt'),
    `Reizdarm erfüllt: dann und nur dann sagt die Frage es (${rdJa.frage})`);

  /*
   * Mit Gastritis Typ C und einem Schmerzmittel: was feststeht und was nicht –
   * ohne „Sicher ist nur …", das stärker war als jede Quelle.
   */
  const lTypC = luecken({ ...d, befundIds: ['gastritis-c'], nsarTage: 2 });
  const nsarC = lTypC.verdaechte.find((v) => v.id === 'nsar');
  const satzC = nsarC.dafuer.find((x) => x.includes('Typ C')) || '';
  check(satzC.includes('ob sie es bei dir sind, steht in deinem Befund')
    && satzC.includes('besonders sorgfältige ärztliche Überwachung') && satzC.includes('Praxis oder Apotheke')
    && !satzC.includes('Sicher ist nur'),
  `Typ C mit Schmerzmittel: belegter Wortlaut statt „Sicher ist nur …“ (${satzC.slice(0, 80)}…)`);
}

/*
 * „Was noch fehlt" beschreibt die Kästen so, wie sie rechnen: Reizdarm und
 * Magenbeschwerden ab dreißig notierten Tagen, der Punktwert zu Reflux aus der
 * letzten Woche (js/kriterien.js).
 */
{
  const { tagebuchLuecken } = await import('../js/luecken.js');
  const t = tagebuchLuecken({
    kriterien: {
      dauer: { seit: '2024-01' },
      zeitraum: { notierteTage: 20, tagebuchTage: 20 },
      gerdq: { belastbar: true, punkte: 9, erfasst: 7 },
    },
    stuhl: { gesamt: 0 },
    bezug: { genug: true },
    benutzt: { oberbauch: true, saettigung: true },
    nachtwachAn: true,
    mahlzeitenOhneZutaten: 0,
  });
  const tage = t.find((x) => x.id === 'tage');
  const stuhl = t.find((x) => x.id === 'stuhl');
  check(tage && tage.text.includes('Ab dreißig rechnet Body Check den Reizdarm-Kasten und die Magenbeschwerden')
    && tage.text.includes('der Punktwert zu Reflux braucht nur die letzte Woche'),
  `unter dreißig Tagen: welche Kästen auf die dreißig warten und welcher nicht (${tage && tage.text.slice(0, 60)}…)`);
  check(stuhl && !stuhl.text.includes('nichts zählen') && stuhl.text.includes('die Angaben zu Häufigkeit und Form'),
    'ohne Stuhlgang: dem Reizdarm-Kasten fehlen die Angaben, gezählt wird trotzdem');
}

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
