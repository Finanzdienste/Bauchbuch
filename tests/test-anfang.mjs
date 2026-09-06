/*
 * Die ersten Wochen – die einzige Phase, in der die App nichts zu sagen hat
 *
 * Am fünften Tag hatte der Muster-Reiter über neuntausend Zeichen, und fast
 * alles davon war eine Absage: „noch nichts Belastbares", „fehlt noch
 * Material", „ab etwa zwei Wochen", „noch keine Klasse mit genug Fällen", „zu
 * wenige", „zählt noch". Zehn Karten hintereinander, die alle dasselbe sagten.
 *
 * Jede einzelne war richtig. Zusammen waren sie die wirksamste Art, jemanden
 * das Eintragen aufgeben zu lassen – und zwar genau in den Wochen, die über
 * alles Weitere entscheiden. Im README steht dazu der Satz, der dieses ganze
 * Projekt trägt: „Das größte Risiko für ein Tagebuch ist nicht ein Fehler in
 * der Auswertung, sondern dass nach drei Wochen niemand mehr etwas einträgt."
 *
 * Diese Datei prüft, dass die Kürzung nichts verschweigt. Drei Bedingungen,
 * und die dritte ist die, bei der Kürzen tödlich wäre:
 *
 *   1. KÜRZER. Der Reiter muss in der Frühphase deutlich kürzer sein.
 *   2. GENAUSO EHRLICH. Was fehlt, muss dastehen – mit Zahlen, nicht als
 *      Gefühl. Und es darf nichts behauptet werden, was vorher nicht behauptet
 *      wurde: keine Einordnung, keine Kriterien, kein Auslöser.
 *   3. WARNZEICHEN BLEIBEN. Ein Warnzeichen hat keine Fallzahl. Ein einziges
 *      Mal Blut ist ein einziges Mal zu viel, auch am zweiten Tag – und wäre
 *      es der Kürzung zum Opfer gefallen, hätte diese Verbesserung den
 *      einzigen Teil der App beschädigt, der wirklich dringend ist.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const zeigen = async (stand) => {
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify({
    begruesst: true, tab: 'muster', fenster: 4, mindestFaelle: 5, tage: {}, eintraege: [], ...s,
  })), [KEY, stand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
};

/** Ein Tagebuch mit `n` Tagen: je eine Mahlzeit und eine Beschwerde. */
function tagebuch(n) {
  const eintraege = [];
  const tage = {};
  for (let i = n; i >= 1; i--) {
    const am = vorTagen(i);
    tage[am] = { notiert: true };
    eintraege.push({
      id: `m${i}`, am, um: '12:30', art: 'essen', was: 'Mittag', portion: 'normal',
      zutaten: [{ id: 'kaffee', rolle: 'getraenk' }],
    });
    eintraege.push({
      id: `b${i}`, am, um: '15:00', art: 'beschwerde', staerke: 5, arten: ['blaehung'],
    });
  }
  return { eintraege, tage };
}

/* ---------- 1. Kurz statt Wand ---------- */

const frueh = await zeigen(tagebuch(5));
check(frueh.length < 3000, `am Tag 5 kurz statt Wand (${frueh.length} Zeichen)`);

/*
 * Und zwar deutlich kürzer als später: Wenn beides gleich lang wäre, hätte die
 * Kürzung nichts bewirkt und der Test wäre eine Zierde.
 */
const spaet = await zeigen(tagebuch(40));
check(
  spaet.length > frueh.length * 2,
  `später steht deutlich mehr da (${spaet.length} gegen ${frueh.length})`,
);

/* ---------- 2. Genauso ehrlich, nur einmal statt zehnmal ---------- */

check(
  /5 von 10 notierten Tagen/.test(frueh),
  'was zur Einordnung fehlt, steht mit Zahlen da',
);
check(
  /5 von 14 notierten Tagen/.test(frueh),
  'und was zu den Kriterien fehlt',
);
check(
  /Als Nächstes:/.test(frueh),
  'mit genau einer nächsten Schwelle statt einer Liste aus vieren',
);

/*
 * Die eigentliche Bedingung: Es darf nichts behauptet werden, was vorher nicht
 * behauptet wurde. Die Kürzung nimmt Absagen weg, keine Schwellen.
 */
check(!/passt am ehesten/.test(frueh), 'keine Einordnung aus fünf Tagen');
check(!/erfüllt/.test(frueh), 'keine erfüllten Kriterien aus fünf Tagen');
check(!/auffällig/.test(frueh), 'kein auffälliger Auslöser aus fünf Tagen');

/*
 * Und der Satz, der die Kürzung ehrlich hält: Was hier fehlt, fehlt wirklich.
 * Ohne ihn läse sich der Fortschrittsblock wie ein Spiel mit Punkten, und
 * genau das ist er nicht.
 */
check(
  /keine Punkte zum Sammeln/.test(frueh),
  'und der Hinweis, dass das keine Punkte sind, sondern Fallzahlen',
);

/* ---------- 3. Warnzeichen kennen keine Frühphase ---------- */

/*
 * DIE PRÜFUNG, DERENTWEGEN DIESE DATEI EXISTIERT.
 *
 * Zwei Tage Tagebuch, und darin einmal Blut im Stuhl. Die Auswertung hat zu
 * diesem Zeitpunkt nichts zu sagen und sagt auch nichts – aber das Warnzeichen
 * hat mit Fallzahlen nichts zu tun und muss oben stehen. Wäre es der Kürzung
 * zum Opfer gefallen, hätte diese Verbesserung ausgerechnet den einzigen Teil
 * beschädigt, bei dem es auf Stunden ankommt.
 */
const mitWarnung = await zeigen({
  eintraege: [
    {
      id: 'w1', am: vorTagen(1), um: '20:00', art: 'stuhl', form: 6,
      dringend: false, warnzeichen: ['blutstuhl'],
    },
    {
      id: 'b1', am: vorTagen(1), um: '21:00', art: 'beschwerde', staerke: 7,
      arten: ['krampf'],
    },
  ],
  tage: { [vorTagen(1)]: { notiert: true } },
});
check(
  await page.locator('.karte-warn').count() > 0,
  'das Warnzeichen steht auch am zweiten Tag',
);
check(
  /abgeklärt/.test(mitWarnung),
  'mit der Aufforderung, das abklären zu lassen',
);
check(
  /Notaufnahme|112/.test(mitWarnung),
  'und dem Weg für den Ernstfall',
);
/* Trotzdem ohne Auswertung: Das eine hat mit dem anderen nichts zu tun. */
check(
  !/passt am ehesten/.test(mitWarnung),
  'und trotzdem keine Einordnung aus einem Tag',
);
check(
  /von 10 notierten Tagen/.test(mitWarnung),
  'sondern daneben weiter der Stand, wie weit es noch ist',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/anfang.png`, fullPage: true });
await browser.close();
ende();
