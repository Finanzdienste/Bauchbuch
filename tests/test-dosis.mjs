/*
 * Wie viel verträgst du – nicht ob
 *
 * „Zwiebeln sind auffällig" legt genau eine Handlung nahe: streichen. Und das
 * ist fast immer zu viel. Die meisten Unverträglichkeiten sind Mengenfragen –
 * wer eine Zwiebelsuppe nicht verträgt, verträgt oft drei Ringe auf dem Brot.
 * Der Unterschied zwischen diesen beiden Auskünften ist der Unterschied
 * zwischen einem Leben mit einer Streichliste und einem mit einer Faustregel,
 * und er entscheidet, ob jemand nach vier Wochen noch dabei ist.
 *
 * Geprüft werden vier Tagebücher, deren richtige Antwort feststeht:
 *
 *   1. EINE SCHWELLE. Als Würze harmlos, als Hauptzutat nicht. Genau das muss
 *      herauskommen – und der Satz muss sagen, dass Weglassen zu viel wäre.
 *   2. AUCH IN KLEINER MENGE. Schon die Würze schlägt durch. Dann darf keine
 *      Entwarnung für kleine Mengen kommen.
 *   3. IN JEDER MENGE HARMLOS. Auch als Hauptzutat nichts. Das ist die
 *      wertvollste Entlastung, die es hier gibt – aber nur so viel wert wie
 *      die größte geprüfte Menge.
 *   4. IMMER DIESELBE ROLLE. Der häufigste Fall im echten Leben. Dann gibt es
 *      keine Antwort, wohl aber etwas zu tun: es einmal kleiner essen.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

/*
 * Ein Tagebuch mit einer Mahlzeit am Tag.
 *
 * `wirkung` sagt, wie viele Stufen jede Rolle ausmacht – als Abbildung von
 * Rolle auf Zuschlag. `rollen` gibt an, welche Rollen überhaupt vorkommen;
 * sie wechseln sich reihum ab.
 */
function bauen({ rollen = ['wuerze', 'haupt'], wirkung = {}, tage: anzahl = 80 } = {}) {
  const eintraege = [];
  const tage = {};
  for (let i = 1; i <= anzahl; i++) {
    const am = vorTagen(i);
    tage[am] = { notiert: true };
    // Zwei Drittel der Tage mit der Zutat, ein Drittel ohne – die
    // Vergleichsgruppe muss besetzt sein.
    const mit = i % 3 !== 0;
    const rolle = rollen[Math.floor(i / 3) % rollen.length];
    eintraege.push({
      id: `m${i}`, am, um: '12:00', art: 'essen', was: 'Mittag', portion: 'normal',
      zutaten: mit
        ? [{ id: 'zwiebel', rolle }]
        : [{ id: 'reis', rolle: 'haupt' }],
    });
    eintraege.push({
      id: `b${i}`, am, um: '14:00', art: 'beschwerde',
      staerke: Math.min(10, 2 + (mit ? (wirkung[rolle] || 0) : 0)),
      arten: ['blaehung'],
    });
  }
  return { eintraege, tage };
}

async function dosis(daten) {
  return page.evaluate(async ([e]) => {
    const d = await import('./js/dosis.js');
    const r = d.dosisBild(e, 'zwiebel', 4);
    return {
      urteil: r.urteil,
      satz: r.satz,
      gehtBis: r.gehtBis ? r.gehtBis.id : null,
      abStufe: r.abStufe ? r.abStufe.id : null,
      bisStufe: r.bisStufe ? r.bisStufe.id : null,
      pruefbar: r.stufen.filter((s) => s.pruefbar).map((s) => s.id),
    };
  }, [daten.eintraege]);
}

/* ---------- 1. Die Schwelle ---------- */

const schwelle = await dosis(bauen({
  rollen: ['wuerze', 'haupt'],
  wirkung: { wuerze: 0, haupt: 4 },
}));
check(schwelle.urteil === 'schwelle', `es kommt auf die Menge an (${schwelle.urteil})`);
check(schwelle.gehtBis === 'wuerze', `bis zur Würze geht es (${schwelle.gehtBis})`);
check(schwelle.abStufe === 'haupt', `ab Hauptzutat nicht mehr (${schwelle.abStufe})`);

/*
 * Und der Satz muss die Folgerung mitliefern. Eine Schwelle zu finden und
 * trotzdem „auffällig" stehen zu lassen, hieße den ganzen Aufwand wegwerfen.
 */
check(
  /Weglassen.*zu viel/.test(schwelle.satz),
  'und die App sagt, dass Weglassen zu viel wäre',
);

/* ---------- 2. Auch in kleiner Menge ---------- */

const immer = await dosis(bauen({
  rollen: ['wuerze', 'haupt'],
  wirkung: { wuerze: 4, haupt: 4 },
}));
check(immer.urteil === 'auch-wenig', `schon die Würze fällt auf (${immer.urteil})`);
check(
  !/Weglassen.*zu viel/.test(immer.satz),
  'und keine Entwarnung für kleine Mengen',
);
check(
  /nicht dabei/.test(immer.satz),
  'sondern der Satz, dass keine Menge durchgeht',
);

/* ---------- 3. In jeder geprüften Menge harmlos ---------- */

const harmlos = await dosis(bauen({
  rollen: ['wuerze', 'haupt'],
  wirkung: { wuerze: 0, haupt: 0 },
}));
check(harmlos.urteil === 'unauffaellig', `nichts fällt auf (${harmlos.urteil})`);
check(harmlos.bisStufe === 'haupt', 'geprüft bis zur größten Menge');
check(
  /spricht gegen/.test(harmlos.satz),
  'und das ist dann auch eine Aussage, keine Verlegenheit',
);

/*
 * Die Gegenprobe zur Entwarnung: Wurde nur die kleine Menge geprüft, darf die
 * App nicht so tun, als wäre die Sache erledigt.
 */
const nurWenig = await dosis(bauen({
  rollen: ['wuerze'],
  wirkung: { wuerze: 0 },
}));
check(
  nurWenig.urteil === 'unauffaellig' && nurWenig.bisStufe === 'wuerze',
  `nur die Würze geprüft (${nurWenig.bisStufe})`,
);
check(
  /Über größere Mengen sagt das nichts/.test(nurWenig.satz),
  'und die App sagt ausdrücklich, dass das nichts über mehr aussagt',
);

/* ---------- 4. Nur die große Menge geprüft ---------- */

/*
 * Der häufigste Fall im echten Leben: Wer Zwiebeln isst, isst sie fast immer
 * mitgekocht. Dann fällt die Hauptzutat auf – und daraus „auch in kleiner
 * Menge" zu machen wäre der Fehler, den diese ganze Datei verhindern soll.
 * Über kleine Mengen ist nichts gesagt, weil keine geprüft wurde.
 */
const einerlei = await dosis(bauen({ rollen: ['haupt'], wirkung: { haupt: 4 } }));
check(einerlei.urteil === 'ab-hier', `nur die große Menge geprüft (${einerlei.urteil})`);
check(
  /Ob kleinere Mengen durchgehen, ist damit nicht gesagt/
    .test(einerlei.satz.replace(/\s+/g, ' ')),
  'und das steht auch so da',
);
check(
  /kleinerer Rolle vorkommen/.test(einerlei.satz.replace(/\s+/g, ' ')),
  'mit dem Vorschlag, es einmal kleiner zu essen',
);
check(
  /weglassen.*mehr als nötig/i.test(einerlei.satz.replace(/\s+/g, ' ')),
  'und der Warnung, dass Streichen womöglich zu weit ginge',
);

/* ---------- Und in der Anzeige ---------- */

const daten = bauen({ rollen: ['wuerze', 'haupt'], wirkung: { wuerze: 0, haupt: 4 } });
await page.evaluate(([k, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', eintraege: e, tage: t,
})), [KEY, daten.eintraege, daten.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(sicht.includes('Wie viel davon?'), 'die Frage steht unter dem Fund');
check(sicht.includes('kommt auf die Menge an'), 'mit dem Urteil');

/*
 * Und zwar aufgeklappt: Eine gefundene Schwelle ist die Auskunft, die den
 * Alltag ändert. Sie hinter einem Dreieck zu verstecken hieße, sie nicht ernst
 * zu nehmen.
 */
check(
  await page.locator('.stand.d-schwelle[open]').count() > 0,
  'und offen, weil das die Auskunft ist, die den Alltag ändert',
);
check(
  /\d+ Mahlzeiten/.test(await page.locator('.stand.d-schwelle').first().textContent()),
  'mit den Fallzahlen je Menge',
);

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/dosis.png`, fullPage: true });
await browser.close();
ende();
