/*
 * Jede Idee einzeln – und jede genau einmal.
 *
 * Bis zum 28.10.2026 ging bei jedem Versand die ganze Liste an den Kasten,
 * samt Überschrift und erledigten Ideen. Das hatte drei Folgen, und keine
 * davon sah man in der App:
 *
 *   * Wer die Ideen liest, bekam jede so oft, wie danach noch welche kamen.
 *   * Ab 2000 Zeichen lehnte der Kasten die Liste ab – für immer, denn die
 *     Liste wird nur länger. Ab da kam gar nichts mehr an.
 *   * Gezählt wurde „wie lang war die Liste beim letzten Mal". Eine Idee
 *     löschen und eine neue schreiben ergab dieselbe Länge; die neue galt als
 *     verschickt und kam nie an, während der Reiter „alle angekommen" sagte.
 *
 * Jetzt trägt jede Idee ihr eigenes `geschickt`, und hinaus geht jede für
 * sich. Dieser Test schreibt jede Anfrage an den Kasten mit und hält sie gegen
 * das, was eingetragen wurde: wie viele, in welcher Reihenfolge, mit welchem
 * Rumpf, und was danach im Speicher steht.
 *
 * Er läuft gegen einen eigenen Server (Port 8251), nicht gegen den
 * gemeinsamen. Mit BAUCHBUCH_PRUEFLING=<ordner> prüft er einen anderen Ordner
 * als das Projekt – so lässt sich nachweisen, dass er rot wird, wenn in einer
 * Kopie genau eine Bedingung verfälscht ist.
 */
import { chromium } from 'playwright';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, KEY, HANDY, SHOT, vorTagen, pruefer } from './umgebung.mjs';
import {
  kopieServer, frage, warteBis, zurueckkommen,
} from './vorrat.mjs';

const { check, ende } = pruefer();

const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING
  ? path.resolve(process.env.BAUCHBUCH_PRUEFLING)
  : ROOT;
if (!existsSync(path.join(PRUEFLING, 'index.html'))) {
  throw new Error(`${PRUEFLING} enthält keine index.html – das ist keine Kopie der App`);
}
console.log(`Prüfling: ${PRUEFLING}\n`);

// maxAge 0: Hier geht es nicht um Zwischenspeicher, sondern um den Kasten.
// Eine Haltbarkeit brächte nur eine zweite Fehlerquelle mit.
const server = await kopieServer(PRUEFLING, 8251, { maxAge: 0 });
const browser = await chromium.launch();
const seitenFehler = [];

/* ==================== Werkzeug ==================== */

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/**
 * Ein Kasten zum Mitschreiben.
 *
 * `verhalten(text, nr)` entscheidet je Anfrage: 'ok', 'haengen' (die Anfrage
 * kommt an und wird erst beantwortet, wenn der Test es will) oder
 * `{ status, fehler }` für eine Absage mit Begründung – so, wie der echte
 * Kasten absagt.
 *
 * Mitgeschrieben wird der rohe Rumpf *und* der gelesene. Der rohe zeigt eine
 * Überschrift oder eine zweite Idee, auch wenn der Rumpf kein JSON mehr wäre.
 */
function kasten() {
  const k = { posts: [], haengend: [], verzoegerung: 0, verhalten: () => 'ok' };
  k.texte = () => k.posts.map((p) => p.text);
  k.versuche = (t) => k.posts.filter((p) => p.text === t).length;
  // Angekommen ist, was der Kasten mit 200 beantwortet hat. Nur das zählt für
  // „genau einmal" – ein abgelehnter Versuch ist bei niemandem angekommen.
  k.angekommen = (t) => k.posts.filter((p) => p.text === t && p.antwort === 200).length;
  return k;
}

/** Eine frische Seite mit eigenem Speicher, einem Stand darin und dem Kasten davor. */
async function seite(k, zustand) {
  const ctx = await browser.newContext({
    viewport: HANDY,
    permissions: ['clipboard-read', 'clipboard-write'],
  });
  /*
   * Der Stand liegt im Speicher, bevor das erste Skript der App läuft – und
   * nur beim ersten Laden. Ein Neuladen im Test soll den Stand sehen, den die
   * App selbst geschrieben hat, nicht wieder den Anfangsstand.
   */
  await ctx.addInitScript(([key, wert]) => {
    if (sessionStorage.getItem('__pruefstand')) return;
    sessionStorage.setItem('__pruefstand', '1');
    localStorage.setItem(key, wert);
  }, [KEY, JSON.stringify(zustand)]);

  const page = await ctx.newPage();
  page.on('pageerror', (e) => seitenFehler.push(`PAGEERROR: ${e.message}`));

  await page.route('**/idee', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const roh = req.postData() || '';
    let rumpf = null;
    try { rumpf = JSON.parse(roh); } catch { rumpf = null; }
    const eintrag = {
      roh, rumpf, text: rumpf && typeof rumpf.text === 'string' ? rumpf.text : null, antwort: null,
    };
    k.posts.push(eintrag);
    const antworte = (w) => {
      const ok = w === 'ok';
      eintrag.antwort = ok ? 200 : w.status;
      return route.fulfill({
        status: eintrag.antwort,
        headers: { ...CORS, 'content-type': 'application/json' },
        body: JSON.stringify(ok ? { ok: true } : { fehler: w.fehler }),
      // Hat die Seite inzwischen selbst aufgegeben (Abbruch nach 20 s), ist
      // die Anfrage schon erledigt. Das ist hier kein Fehler des Tests.
      }).catch(() => {});
    };
    const was = k.verhalten(eintrag.text, k.posts.length);
    if (was === 'haengen') {
      return new Promise((weiter) => { k.haengend.push((w = 'ok') => weiter(antworte(w))); });
    }
    if (k.verzoegerung) await new Promise((r) => { setTimeout(r, k.verzoegerung); });
    return antworte(was);
  });

  // Nicht 'networkidle': Eine hängende Anfrage an den Kasten hielte das
  // Warten darauf beliebig lange auf.
  await page.goto(server.adresse, { waitUntil: 'load' });
  await page.locator('#tabbar .tab').first().waitFor({ timeout: 15000 });
  return { ctx, page };
}

/** Warten, bis eine Bedingung hier im Test stimmt (z. B. „drei Anfragen da"). */
async function bis(bedingung, ms = 10000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    if (bedingung()) return true;
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => { setTimeout(r, 50); });
  }
  return bedingung();
}

const pause = (ms) => new Promise((r) => { setTimeout(r, ms); });

/** Die Ideen, wie sie im Speicher stehen. */
const gespeichert = async (page) => (await frage(
  page, (k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY,
)) || {};

/**
 * Warten, bis der Speicher eine Bedingung erfüllt. Die App schreibt mit
 * kurzer Verzögerung; wer sofort nachsieht, liest den Stand von vorher.
 */
async function speicherBis(page, fn, ms = 5000) {
  const ende = Date.now() + ms;
  while (Date.now() < ende) {
    // eslint-disable-next-line no-await-in-loop
    const s = await gespeichert(page).catch(() => ({}));
    try { if (s && Array.isArray(s.ideen) && fn(s)) return true; } catch { /* noch nicht */ }
    // eslint-disable-next-line no-await-in-loop
    await pause(100);
  }
  return false;
}

/*
 * Eine Idee eintragen – und vorher nachsehen, ob sie im Feld steht.
 *
 * Das tut auch ein Mensch. Kommt gerade eine ältere Idee beim Kasten an,
 * zeichnet die App den Reiter neu und ersetzt das Feld. Bis zum 29.10.2026
 * ging dabei der Fokus verloren, und was in diesem Augenblick getippt wurde,
 * landete nirgends; seitdem nimmt male() Fokus und Cursor mit (geprüft in
 * Fall 6). Das Nachsehen bleibt als Sicherung, und gezählt wird es: Eine
 * Zahl über null am Ende heißt, dass das Feld wieder etwas verschluckt.
 */
let nachgetippt = 0;
async function eintragen(page, text) {
  const feld = page.locator('#ideeText');
  for (let n = 0; n < 5; n++) {
    // eslint-disable-next-line no-await-in-loop
    await feld.fill(text);
    // eslint-disable-next-line no-await-in-loop
    if (await feld.inputValue() === text) break;
    nachgetippt += 1;
  }
  await page.locator('[data-act="idee-neu"]').click();
}

const ansicht = async (page) => (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
const kurz = (t) => (t === null || t === undefined ? String(t) : `${t.slice(0, 18)}…`);

/** Eine Idee, wie die App sie speichert – für Stände, die der Test vorlegt. */
const idee = (id, text, tageAlt, extra = {}) => ({
  id, am: vorTagen(tageAlt), text, erledigt: false, ...extra,
});

/* ==================== 1. Drei Ideen, drei Zettel ==================== */

/*
 * Rasch hintereinander, und der Kasten lässt sich jeweils 300 ms Zeit. So
 * ist die erste noch unterwegs, wenn die zweite und dritte eingetragen
 * werden – der Fall, in dem ein Durchgang „alles, was gerade offen ist"
 * einsammelt. Auch dann muss jede einzeln hinaus.
 */
{
  console.log('— 1. Drei Ideen nacheinander');
  const k = kasten();
  k.verzoegerung = 300;
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  const drei = [
    'Probezettel Ahorn.',
    'Probezettel Birke.',
    'Probezettel Eiche.',
  ];
  for (const t of drei) {
    // eslint-disable-next-line no-await-in-loop
    await eintragen(page, t);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(60);
  }
  await bis(() => k.posts.length >= 3);
  // Kommt danach noch etwas hinterher, wäre eine Idee doppelt gegangen.
  await pause(1500);

  check(k.posts.length === 3, `drei Ideen ergeben drei Anfragen an den Kasten (${k.posts.length})`);
  check(
    k.posts.every((p) => p.rumpf && Object.keys(p.rumpf).join(',') === 'text'),
    'jeder Rumpf ist JSON mit genau einem Feld, text',
  );
  check(
    drei.every((t, i) => k.posts[i] && k.posts[i].text === t),
    `jede Anfrage trägt genau ihre eine Idee, die älteste zuerst (${k.texte().map(kurz).join(' | ')})`,
  );
  check(
    !k.posts.some((p) => /Body Check|Bauchbuch/.test(p.roh) || /Verbesserungsvorschl/.test(p.roh)),
    'keine Anfrage trägt die Überschrift der Liste',
  );
  check(
    k.posts.every((p) => drei.filter((t) => (p.text || p.roh).includes(t)).length === 1),
    'und in keiner steht eine der anderen Ideen mit drin',
  );
  check(drei.every((t) => k.angekommen(t) === 1), 'jede der drei ist genau einmal angekommen');
  await speicherBis(page, (s) => s.ideen.every((i) => i.geschickt === true));
  const s = await gespeichert(page);
  check(
    s.ideen.length === 3 && s.ideen.every((i) => i.geschickt === true),
    'im Speicher sind alle drei als verschickt vermerkt',
  );
  check(
    /Alle bei \p{L}+ angekommen/u.test(await ansicht(page))
      && await page.locator('.karte.karte-merk').count() === 0,
    'und der Reiter sagt, dass alle angekommen sind',
  );
  await ctx.close();
}

/* ==================== 2. Löschen und neu schreiben ==================== */

/*
 * Der Fehler der alten Zählung: verschickte Idee löschen, neue eintragen –
 * die Liste ist so lang wie beim letzten Versand, also galt die neue als
 * schon draußen. Sie kam nie an, und der Reiter sagte „alle angekommen".
 */
{
  console.log('\n— 2. Eine verschickte löschen, eine neue eintragen');
  const k = kasten();
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  const erste = 'Probezettel vor dem Löschen.';
  const neue = 'Probezettel nach dem Löschen.';
  await eintragen(page, erste);
  await bis(() => k.angekommen(erste) === 1);
  await speicherBis(page, (s) => s.ideen.length === 1 && s.ideen[0].geschickt === true);
  check(k.angekommen(erste) === 1, 'die erste Idee ist beim Kasten');

  await page.locator('.idee').first().locator('[data-act="idee-weg"]').click();
  await speicherBis(page, (s) => s.ideen.length === 0);
  check((await gespeichert(page)).ideen.length === 0, 'sie ist aus der eigenen Liste gelöscht');

  await eintragen(page, neue);
  await bis(() => k.angekommen(neue) >= 1, 5000);
  await pause(1000);
  check(
    k.angekommen(neue) === 1,
    `die neue Idee geht hinaus, obwohl die Liste wieder so lang ist wie vorher (${k.versuche(neue)} Anfragen)`,
  );
  check(k.versuche(erste) === 1, 'die gelöschte wird dabei nicht noch einmal geschickt');
  check(k.posts.length === 2, `insgesamt zwei Anfragen, eine je Idee (${k.posts.length})`);
  await speicherBis(page, (s) => s.ideen.length === 1 && s.ideen[0].geschickt === true);
  const s = await gespeichert(page);
  check(
    s.ideen.length === 1 && s.ideen[0].text === neue && s.ideen[0].geschickt === true,
    'im Speicher ist die neue als verschickt vermerkt – erst nachdem sie draußen war',
  );
  await ctx.close();
}

/* ==================== 3. Dreißig Ideen, zusammen über 2000 Zeichen ==================== */

/*
 * Die Grenze des Kastens gilt je Zettel. Dreißig Ideen à hundert Zeichen sind
 * zusammen 3000 – als Liste abgelehnt, einzeln jede für sich in Ordnung. Ein
 * „zu lang" darf hier nirgends stehen, weder auf dem Reiter noch im Hinweis
 * unten, denn keine einzelne Idee ist zu lang.
 */
const fuell = 'Fülltext ohne Bedeutung, nur damit die Zeile lang genug wird, um hundert Zeichen zu erreichen, ganz bestimmt';
const dreissig = Array.from({ length: 30 }, (_, i) => `Vorschlag ${String(i + 1).padStart(2, '0')}: ${fuell}`.slice(0, 99).concat('.'));

{
  console.log('\n— 3a. Dreißig Ideen à hundert Zeichen, eine nach der anderen eingetragen');
  check(
    dreissig.every((t) => t.length === 100) && dreissig.join('').length > 2000,
    `die Probe: 30 × 100 Zeichen, zusammen ${dreissig.join('').length}`,
  );
  const k = kasten();
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  const toasts = [];
  await page.exposeFunction('__toast', (t) => toasts.push(t));
  // Jeder Satz, der im Hinweis unten erscheint, wird mitgeschrieben – ein
  // „zu lang", das nach 2,4 s wieder verschwindet, sähe der Test sonst nie.
  await page.evaluate(() => {
    const el = document.getElementById('toast');
    new MutationObserver(() => window.__toast(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  });
  for (const t of dreissig) {
    // eslint-disable-next-line no-await-in-loop
    await eintragen(page, t);
  }
  await bis(() => k.posts.length >= 30, 30000);
  await pause(1500);

  check(k.posts.length === 30, `dreißig Anfragen, eine je Idee (${k.posts.length})`);
  check(
    k.posts.every((p) => p.text && p.text.length === 100 && Object.keys(p.rumpf).join(',') === 'text'),
    'jede trägt genau eine Idee mit ihren hundert Zeichen',
  );
  check(
    dreissig.every((t) => k.angekommen(t) === 1),
    'jede der dreißig ist genau einmal angekommen',
  );
  check(
    dreissig.every((t, i) => k.posts[i] && k.posts[i].text === t),
    'in der Reihenfolge, in der sie eingetragen wurden',
  );
  const text = await ansicht(page);
  check(
    !/zu lang/i.test(text) && !toasts.some((t) => /zu lang/i.test(t)),
    `nirgends steht „zu lang" (${toasts.filter((t) => /zu lang/i.test(t)).length} solche Hinweise)`,
  );
  await speicherBis(page, (s) => s.ideen.length === 30 && s.ideen.every((i) => i.geschickt));
  const s = await gespeichert(page);
  check(
    s.ideen.length === 30 && s.ideen.every((i) => i.geschickt === true) && !s.ideenFehler,
    'alle dreißig sind als verschickt vermerkt, kein Fehler gespeichert',
  );
  await ctx.close();
}

/*
 * Derselbe Berg, aber auf einmal: dreißig Ideen, die liegen geblieben sind
 * (eine Woche ohne Netz). Beim Öffnen der App geht der ganze Stapel hinaus –
 * in einem Durchgang, einzeln, die älteste zuerst. Das ist die Lage, in der
 * die alte Liste mit „zu lang" für immer stecken blieb.
 */
{
  console.log('\n— 3b. Dreißig liegen gebliebene Ideen beim Öffnen');
  const k = kasten();
  // Neueste vorn, wie die App sie speichert: dreissig[29] ist die jüngste.
  const ideen = dreissig.map((t, i) => idee(`stapel${i}`, t, 30 - i, { geschickt: false })).reverse();
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'heute', ideen });
  await bis(() => k.posts.length >= 30, 30000);
  await pause(1500);
  check(k.posts.length === 30, `der ganze Stapel geht hinaus, ohne den Ideenreiter zu öffnen (${k.posts.length})`);
  check(
    dreissig.every((t, i) => k.posts[i] && k.posts[i].text === t && k.angekommen(t) === 1),
    'jede einzeln und genau einmal, die älteste zuerst',
  );
  await speicherBis(page, (s) => s.ideen.every((i) => i.geschickt));
  const s = await gespeichert(page);
  check(s.ideen.every((i) => i.geschickt === true) && !s.ideenFehler, 'und alle sind als verschickt vermerkt');
  await ctx.close();
}

/* ==================== 4. Der Kasten lehnt die zweite ab ==================== */

/*
 * Drei liegen bereit, die zweite wird abgelehnt. Was dann richtig ist:
 *
 *   * Die erste ist angekommen und bleibt als verschickt vermerkt – sonst
 *     ginge sie beim nächsten Versuch ein zweites Mal hinaus.
 *   * Die dritte wird gar nicht erst versucht. Ein Kasten, der gerade
 *     ablehnt, wird nicht in schneller Folge weiter beschickt; der nächste
 *     Anlass macht dort weiter.
 *   * Der Grund steht auf dem Reiter, im Wortlaut des Kastens.
 *
 * Und wenn der Kasten wieder annimmt, verschickt „Nochmal" genau die beiden,
 * die fehlen – keine doppelt.
 */
{
  console.log('\n— 4. Der Kasten lehnt die zweite von dreien ab');
  const A = 'Die älteste: Probezettel Nummer eins.';
  const B = 'Die mittlere: Probezettel Nummer zwei.';
  const C = 'Die jüngste: Probezettel Nummer drei.';
  const GRUND = 'Der Kasten ist gerade überlastet. Bitte später noch einmal.';
  let wiederDa = false;
  const k = kasten();
  k.verhalten = (t) => (t === B && !wiederDa ? { status: 503, fehler: GRUND } : 'ok');
  const { ctx, page } = await seite(k, {
    begruesst: true,
    tab: 'ideen',
    ideen: [idee('c', C, 1, { geschickt: false }), idee('b', B, 2, { geschickt: false }),
      idee('a', A, 3, { geschickt: false })],
  });
  const karte = page.locator('.karte.karte-merk');
  await karte.getByText(GRUND, { exact: false }).waitFor({ timeout: 10000 }).catch(() => {});
  // Was jetzt noch an den Kasten ginge, wäre ein Versuch zu viel.
  await pause(1500);

  check(
    k.posts.length === 2 && k.posts[0].text === A && k.posts[1].text === B,
    `erst die älteste, dann die zweite – und dann nichts mehr (${k.texte().map(kurz).join(' | ')})`,
  );
  check(k.versuche(C) === 0, 'die dritte wurde nach der Absage nicht mehr versucht');
  await speicherBis(page, (s) => s.ideen.find((i) => i.id === 'a').geschickt === true);
  let s = await gespeichert(page);
  const marke = (id) => (s.ideen.find((i) => i.id === id) || {}).geschickt;
  check(marke('a') === true, 'die erste ist als verschickt vermerkt');
  check(marke('b') === false && marke('c') === false, 'die zweite und dritte gelten weiter als offen');
  check(s.ideenFehler === GRUND, `der Grund ist gespeichert („${s.ideenFehler}")`);
  const stand = (await karte.count()) ? (await karte.first().textContent()).replace(/\s+/g, ' ') : '';
  check(stand.includes(GRUND), `der Grund steht auf dem Reiter, im Wortlaut des Kastens („${stand.slice(0, 50)}…")`);
  check(
    /2 Ideen sind nicht rausgegangen/.test(stand),
    'und die Überschrift zählt die beiden, die fehlen – nicht drei, nicht eine',
  );
  const nochmal = karte.locator('[data-act="ideen-senden"]');
  check(
    (await nochmal.count()) === 1 && (await nochmal.textContent()).trim() === 'Nochmal',
    'es gibt einen Knopf „Nochmal"',
  );
  await page.screenshot({ path: `${SHOT}/ideen-einzeln-absage.png` });

  wiederDa = true;
  await nochmal.click();
  await bis(() => k.posts.length >= 4);
  await pause(1500);

  check(
    k.posts.length === 4 && k.posts[2].text === B && k.posts[3].text === C,
    `„Nochmal" verschickt die zweite und dann die dritte (${k.texte().slice(2).map(kurz).join(' | ')})`,
  );
  check(
    k.angekommen(A) === 1 && k.angekommen(B) === 1 && k.angekommen(C) === 1,
    `jede ist genau einmal angekommen, keine doppelt (A ${k.angekommen(A)}, B ${k.angekommen(B)}, C ${k.angekommen(C)})`,
  );
  check(k.versuche(A) === 1, 'die erste wurde nicht ein zweites Mal geschickt');
  await speicherBis(page, (z) => z.ideen.every((i) => i.geschickt) && !z.ideenFehler);
  s = await gespeichert(page);
  check(s.ideen.every((i) => i.geschickt === true) && !s.ideenFehler, 'danach ist alles verschickt und kein Fehler mehr gespeichert');
  check(
    await karte.count() === 0 && !(await ansicht(page)).includes(GRUND),
    'und die alte Meldung ist vom Reiter verschwunden',
  );
  await ctx.close();
}

/* ==================== 5. Ein alter Stand ohne Marken ==================== */

/*
 * Wer die App vor dem 28.10.2026 benutzt hat, hat Ideen ohne `geschickt` und
 * nur die alte Zahl `ideenGeschickt`. Neue Ideen standen vorn, also sind die
 * hinteren die alten – und so viele davon waren draußen, wie die Zahl sagt.
 *
 * Gelandet wird auf dem Tagesbogen, nicht auf dem Ideenreiter: So öffnet man
 * die App gewöhnlich, und auch dann muss die eine liegengebliebene hinaus.
 * Die beiden alten dürfen es nicht – wer die Ideen liest, hat sie schon.
 */
{
  console.log('\n— 5. Alter Stand: drei Ideen, ideenGeschickt 2');
  const alt1 = 'Alt und längst draußen: größere Schrift.';
  const alt2 = 'Auch schon draußen: eine Suche im Verlauf.';
  const neu = 'Noch nicht draußen: Erinnerung am Abend.';
  const k = kasten();
  const { ctx, page } = await seite(k, {
    begruesst: true,
    tab: 'heute',
    ideenGeschickt: 2,
    ideen: [
      { id: 'n', am: vorTagen(1), text: neu, erledigt: false },
      { id: 'b', am: vorTagen(5), text: alt2, erledigt: false },
      { id: 'a', am: vorTagen(9), text: alt1, erledigt: true },
    ],
  });
  await bis(() => k.posts.length >= 1, 8000);
  await pause(2000);
  check(
    k.posts.length === 1 && k.posts[0].text === neu,
    `nach dem Laden geht genau die neueste hinaus (${k.texte().map(kurz).join(' | ') || 'nichts'})`,
  );
  check(k.versuche(alt1) === 0 && k.versuche(alt2) === 0, 'die beiden alten nicht noch einmal');
  await speicherBis(page, (s) => s.ideen.every((i) => typeof i.geschickt === 'boolean'));
  const s = await gespeichert(page);
  check(
    s.ideen.length === 3 && s.ideen.every((i) => i.geschickt === true),
    'danach tragen alle drei die Marke „verschickt"',
  );
  check(
    s.ideen.map((i) => i.id).join(',') === 'n,b,a' && s.ideen[2].erledigt === true,
    'die Umrechnung hat an Reihenfolge und „erledigt" nichts verändert',
  );
  await ctx.close();
}

/* ==================== 6. Der Entwurf überlebt das Neuzeichnen ==================== */

/*
 * Kommt im Hintergrund eine ältere Idee an, wird der Reiter neu gezeichnet –
 * und dabei wird das Ideenfeld ersetzt. Wer in dem Moment schon die nächste
 * schrieb, hätte sie verloren, stünde der Entwurf nur im Feld.
 *
 * Damit der Test nicht durch Zufall grün ist, wird das alte Feld markiert:
 * Nach der Antwort muss ein *neues* Feld dastehen (es wurde also wirklich
 * neu gezeichnet), und in ihm der halbe Satz.
 */
{
  console.log('\n— 6. Der Text im Feld bleibt stehen');
  const k = kasten();
  k.verhalten = (t, nr) => (nr === 1 ? 'haengen' : 'ok');
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  const zuerst = 'Die erste, die unterwegs hängt.';
  const halb = 'Probezettel, halb getippt, und dann';
  await eintragen(page, zuerst);
  await bis(() => k.posts.length === 1 && k.haengend.length === 1);
  check(k.haengend.length === 1, 'die erste Idee ist unterwegs und hängt');

  const feld = page.locator('#ideeText');
  await feld.click();
  await feld.pressSequentially(halb, { delay: 5 });
  await page.evaluate(() => { document.getElementById('ideeText').__altesFeld = true; });

  k.haengend.shift()('ok');
  await speicherBis(page, (s) => s.ideen.length === 1 && s.ideen[0].geschickt === true);
  const neuGezeichnet = await warteBis(
    page,
    () => !!document.getElementById('ideeText') && !document.getElementById('ideeText').__altesFeld,
    null,
    5000,
  );
  check(neuGezeichnet, 'die Antwort des Kastens hat den Reiter neu gezeichnet (das Feld ist ein neues)');
  check(
    await feld.inputValue() === halb,
    `im neuen Feld steht der halbe Satz weiter („${await feld.inputValue()}")`,
  );
  // Und der Fokus: Ohne ihn schließt auf dem Telefon die Tastatur, und was
  // danach getippt wird, landet nirgends.
  const fokus = await page.evaluate(() => document.activeElement && document.activeElement.id);
  check(fokus === 'ideeText', `der Fokus bleibt im neuen Feld (${fokus || 'body'})`);
  // Weitertippen, ohne erst ins Feld zu tippen – wie jemand, der gar nicht
  // gemerkt hat, dass im Hintergrund etwas passiert ist.
  const rest = ' zu Ende getippt.';
  await page.keyboard.type(rest, { delay: 5 });
  check(
    await feld.inputValue() === halb + rest,
    `und was danach getippt wird, kommt hinten an („${await feld.inputValue()}")`,
  );

  await page.locator('[data-act="idee-neu"]').click();
  await bis(() => k.posts.length >= 2);
  await pause(800);
  check(
    k.posts.length === 2 && k.posts[1].text === halb + rest,
    'und eingetragen geht genau dieser Satz als eigene Idee hinaus',
  );
  check(k.angekommen(zuerst) === 1, 'die hängende erste ist genau einmal angekommen');

  /* ---------- 7. Das Feld nimmt nicht mehr an, als der Kasten nimmt ---------- */

  console.log('\n— 7. Höchstens 2000 Zeichen');
  check(await feld.getAttribute('maxlength') === '2000', 'das Ideenfeld hat maxlength 2000');
  // Die Grenze genau getroffen: 2000 Zeichen gehen als eine Idee hinaus,
  // unverändert und ohne „zu lang".
  const voll = `Lang: ${'x'.repeat(1993)}.`;
  check(voll.length === 2000, 'die Probe ist genau 2000 Zeichen lang');
  await eintragen(page, voll);
  await bis(() => k.posts.length >= 3);
  await pause(800);
  check(
    k.posts.length === 3 && k.posts[2].text === voll && k.posts[2].antwort === 200,
    `eine Idee mit genau 2000 Zeichen geht unverändert hinaus (${(k.posts[2] && k.posts[2].text || '').length})`,
  );
  check(!/zu lang/i.test(await ansicht(page)), 'und nirgends steht „zu lang"');
  // Wer mehr eintippt, bekommt es gar nicht erst ins Feld.
  await feld.click();
  await page.keyboard.insertText('y'.repeat(2100));
  const laenge = (await feld.inputValue()).length;
  check(laenge === 2000, `mehr als 2000 Zeichen nimmt das Feld nicht an (${laenge})`);
  await ctx.close();
}

/* ==================== 8. Kopiert ist auch weitergegeben ==================== */

/*
 * „Kopieren" und „Anders schicken" sind der Weg, wenn der Kasten nicht
 * annimmt. Wer kopiert hat, hat die Ideen weitergegeben; danach dürfen sie
 * nicht auch noch über den Kasten nachkommen, sobald er wieder da ist – sonst
 * kämen sie doppelt an, nur auf zwei Wegen. Neue Ideen gehen danach ganz
 * gewöhnlich hinaus.
 */
{
  console.log('\n— 8. Nach „Kopieren" geht für diese nichts mehr hinaus');
  const A = 'Kopiert eins: Probezettel Kupfer.';
  const B = 'Kopiert zwei: Probezettel Zinn.';
  const C = 'Danach: Probezettel Messing.';
  const ZU = 'Der Kasten ist heute geschlossen.';
  let offen = false;
  const k = kasten();
  k.verhalten = () => (offen ? 'ok' : { status: 503, fehler: ZU });
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  const karte = page.locator('.karte.karte-merk');

  await eintragen(page, A);
  await karte.getByText(ZU, { exact: false }).waitFor({ timeout: 5000 }).catch(() => {});
  await eintragen(page, B);
  await bis(() => k.posts.length >= 2);
  await karte.getByText(ZU, { exact: false }).waitFor({ timeout: 5000 }).catch(() => {});
  check(
    k.angekommen(A) === 0 && k.angekommen(B) === 0 && (await ansicht(page)).includes(ZU),
    'der Kasten nimmt nichts an, und der Reiter sagt es',
  );

  const kopieren = karte.locator('[data-act="ideen-kopieren"]');
  check(await kopieren.count() === 1, 'neben der Meldung steht „Kopieren"');
  await kopieren.click();
  await speicherBis(page, (s) => s.ideen.every((i) => i.geschickt));
  const ablage = await page.evaluate(() => navigator.clipboard.readText());
  check(ablage.includes(A) && ablage.includes(B), 'in der Zwischenablage stehen beide');
  const s = await gespeichert(page);
  check(s.ideen.length === 2 && s.ideen.every((i) => i.geschickt === true), 'beide sind als verschickt vermerkt');
  check(await karte.count() === 0, 'und es steht nichts mehr aus');

  /*
   * Jetzt nimmt der Kasten wieder an, und alles, was sonst einen Versand
   * anstößt, kommt der Reihe nach: Wechsel weg und zurück auf den Reiter,
   * ein Neuladen der App. Für die beiden kopierten darf nichts hinausgehen.
   */
  offen = true;
  const vorher = k.posts.length;
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await page.locator('[data-act="tab"][data-tab="ideen"]').click();
  await pause(800);
  await page.reload({ waitUntil: 'load' });
  await page.locator('#ideeText').waitFor({ timeout: 10000 });
  await pause(2000);
  check(
    k.posts.length === vorher,
    `nach „Kopieren" geht für diese beiden keine Anfrage mehr an den Kasten (${k.posts.length - vorher})`,
  );

  await eintragen(page, C);
  await bis(() => k.posts.length > vorher);
  await pause(1000);
  const neu = k.posts.slice(vorher);
  check(
    neu.length === 1 && neu[0].text === C && neu[0].antwort === 200,
    `eine neue Idee danach geht allein hinaus (${neu.map((p) => kurz(p.text)).join(' | ')})`,
  );
  await ctx.close();
}

/* ==================== 9. Was während eines Versands passiert ==================== */

/*
 * Ein Versand kann dauern – auf dem Land, im Zug, bis zu zwanzig Sekunden.
 * Was in dieser Zeit eingetragen, gelöscht oder angetippt wird, darf weder
 * liegen bleiben noch doppelt hinausgehen, und die App darf nicht
 * „Angekommen" sagen, bevor etwas angekommen ist.
 */
{
  console.log('\n— 9a. Eine Idee kommt nach, während die ältere unterwegs ist');
  const A = 'Unterwegs: die erste, die hängt.';
  const B = 'Nachgekommen: die zweite, während die erste hängt.';
  const k = kasten();
  k.verhalten = (t, nr) => (nr === 1 ? 'haengen' : 'ok');
  const { ctx, page } = await seite(k, { begruesst: true, tab: 'ideen' });
  await eintragen(page, A);
  await bis(() => k.haengend.length === 1);
  await eintragen(page, B);
  // Weg vom Reiter: Ab hier stößt kein Blick auf die Ideen mehr etwas an.
  await page.locator('[data-act="tab"][data-tab="heute"]').click();
  await pause(300);
  check(k.posts.length === 1, `solange die erste hängt, geht keine zweite Anfrage los (${k.posts.length})`);
  k.haengend.shift()('ok');
  await bis(() => k.posts.length >= 2, 5000);
  await pause(800);
  check(
    k.texte().join(' | ') === `${A} | ${B}` && k.angekommen(B) === 1,
    `die nachgekommene geht danach von selbst hinaus (${k.texte().map(kurz).join(' | ')})`,
  );
  await ctx.close();
}

{
  console.log('\n— 9b. Gelöscht, während eine ältere unterwegs ist');
  const A = 'Lösch-Probe eins, hängt unterwegs.';
  const B = 'Lösch-Probe zwei, bleibt stehen.';
  const C = 'Lösch-Probe drei, wird gelöscht.';
  const k = kasten();
  k.verhalten = (t, nr) => (nr === 1 ? 'haengen' : 'ok');
  const { ctx, page } = await seite(k, {
    begruesst: true,
    tab: 'ideen',
    ideen: [idee('i3', C, 1, { geschickt: false }), idee('i2', B, 2, { geschickt: false }), idee('i1', A, 3, { geschickt: false })],
  });
  await bis(() => k.haengend.length === 1);
  check(k.posts.length === 1 && k.posts[0].text === A, `beim Start geht die älteste zuerst los (${kurz(k.posts[0] && k.posts[0].text)})`);
  await page.locator('[data-act="idee-weg"][data-id="i3"]').click();
  await speicherBis(page, (st) => !st.ideen.some((i) => i.id === 'i3'));
  k.haengend.shift()('ok');
  await bis(() => k.posts.length >= 2, 5000);
  await pause(1000);
  check(
    k.texte().join(' | ') === `${A} | ${B}`,
    `die gelöschte geht nicht mehr hinaus (${k.texte().map(kurz).join(' | ')})`,
  );
  await ctx.close();
}

{
  console.log('\n— 9c. „Jetzt gleich" während eines laufenden Versands');
  const A = 'Hängt, bis der Test sie loslässt.';
  const k = kasten();
  k.verhalten = () => 'haengen';
  const { ctx, page } = await seite(k, {
    begruesst: true, tab: 'ideen', ideen: [idee('j1', A, 1, { geschickt: false })],
  });
  const toasts = [];
  await page.exposeFunction('__toast9', (t) => toasts.push(t));
  await page.evaluate(() => {
    const el = document.getElementById('toast');
    new MutationObserver(() => window.__toast9(el.textContent)).observe(el, { childList: true, characterData: true, subtree: true });
  });
  await bis(() => k.haengend.length === 1);
  await page.locator('.karte.karte-merk [data-act="ideen-senden"]').click();
  await pause(1000);
  check(
    !toasts.some((t) => /Angekommen/.test(t)),
    `solange nichts angekommen ist, sagt die App das auch nicht (${toasts.join(' / ') || 'nichts'})`,
  );
  check(k.posts.length === 1, `und das Antippen startet keinen zweiten Versand derselben Idee (${k.posts.length})`);
  k.haengend.shift()('ok');
  await bis(() => toasts.some((t) => /Angekommen/.test(t)), 5000);
  check(toasts.some((t) => /Angekommen/.test(t)), 'erst nach der Antwort heißt es „Angekommen"');
  check(k.angekommen(A) === 1 && k.posts.length === 1, `angekommen genau einmal (${k.posts.length} Anfragen)`);
  await ctx.close();
}

{
  console.log('\n— 9d. Nach einem Fehlschlag: die Rückkehr in die App versucht es noch einmal');
  const A = 'Kam beim Start nicht durch.';
  const ZU = 'Gerade geschlossen.';
  let offen = false;
  const k = kasten();
  k.verhalten = () => (offen ? 'ok' : { status: 503, fehler: ZU });
  // Auf dem Tag-Reiter: Kein Blick auf die Ideen stößt hier etwas an.
  const { ctx, page } = await seite(k, {
    begruesst: true, tab: 'heute', ideen: [idee('r1', A, 1, { geschickt: false })],
  });
  await bis(() => k.posts.length >= 1);
  await speicherBis(page, (st) => !!st.ideenFehler);
  await pause(1500);
  check(k.posts.length === 1, `beim Start ein Versuch, und nach dem Fehlschlag keiner hinterher (${k.posts.length})`);
  // Noch zu: Eine Rückkehr ist genau ein neuer Versuch, kein Kreis.
  await zurueckkommen(page);
  await bis(() => k.posts.length >= 2, 5000);
  await pause(1500);
  check(k.posts.length === 2, `eine Rückkehr, ein neuer Versuch (${k.posts.length})`);
  offen = true;
  await zurueckkommen(page);
  await bis(() => k.angekommen(A) === 1, 5000);
  await pause(500);
  check(
    k.angekommen(A) === 1 && k.posts.length === 3,
    `nach der nächsten Rückkehr ist sie angekommen (${k.posts.length} Versuche)`,
  );
  check(await speicherBis(page, (st) => st.ideen[0].geschickt === true && !st.ideenFehler), 'und gilt als verschickt, ohne Fehler');
  await ctx.close();
}

/* ==================== Zum Schluss ==================== */

if (nachgetippt) {
  console.log(`HINWEIS  ${nachgetippt}-mal stand der Text nach dem Eintippen nicht im Feld, weil es gerade neu gezeichnet wurde`);
}
check(seitenFehler.length === 0, `keine Fehler in der Seite${seitenFehler.length ? `: ${seitenFehler.join(' | ')}` : ''}`);
await browser.close();
await server.zu();
ende();
