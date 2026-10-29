/*
 * Wann lädt die App von selbst neu – und wann ausdrücklich nicht?
 *
 * tests/test-nachschub.mjs prüft, dass eine neue Fassung überhaupt ankommt.
 * Hier geht es um den Moment. Ein Neuladen ist für die App das Einfachste und
 * für die, die sie benutzt, das Schlimmste, wenn es zur falschen Zeit kommt:
 * Der halb ausgefüllte Bogen ist weg, die Idee, die gerade im Feld stand, der
 * Tag, zu dem sie zurückgeblättert hatte. Und ein Neuladen, das sich selbst
 * wieder auslöst, ist eine App, die sich nicht mehr bedienen lässt.
 *
 * Die Regel aus js/app.js, die hier von außen nachgemessen wird:
 *
 *   Neu geladen wird nur, wenn der Service Worker wirklich eine andere
 *   Fassung meldet, nichts in Arbeit ist, der Speicher schreiben kann – und
 *   dann entweder beim Verlassen oder gleich nach der Rückkehr, bevor etwas
 *   angetippt wurde. Unter „Mehr" kann man es ausdrücklich verlangen.
 *
 * Jeder Fall läuft in einer eigenen Kopie der App mit eigenem Server und
 * eigenem Browserkontext. Eine neue Fassung ist eine geänderte Zeile in
 * js/app.js plus der neue Fingerabdruck in sw.js – genau das, was der Bau
 * bei einer echten Änderung tut.
 *
 * Gegen einen anderen Ordner prüfen (für absichtlich verfälschte Kopien):
 *
 *     BAUCHBUCH_PRUEFLING=/pfad/zur/kopie node tests/test-auffrischen.mjs
 *
 * Nur einzelne Fälle (zum schnellen Nachsehen, nicht für die CI):
 *
 *     BAUCHBUCH_FAELLE=a,d node tests/test-auffrischen.mjs
 */
import { chromium } from 'playwright';
import { cpSync, existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { KEY, HANDY, EINZEL, vorTagen, pruefer } from './umgebung.mjs';
import {
  appKopie, standNeu, aendern, kopieServer, netzSchalter, sichtbarkeit, zurueckkommen, frage, warteBis,
  shellListe,
} from './vorrat.mjs';

const { check, ende } = pruefer();

/* ---------- Wogegen geprüft wird ---------- */

const PRUEFLING = process.env.BAUCHBUCH_PRUEFLING
  ? path.resolve(process.env.BAUCHBUCH_PRUEFLING)
  : null;
const NUR = (process.env.BAUCHBUCH_FAELLE || '').split(',').map((s) => s.trim()).filter(Boolean);
const laeuft = (k) => !NUR.length || NUR.includes(k);

if (PRUEFLING) console.log(`Prüfling: ${PRUEFLING}`);

/*
 * appKopie() kopiert immer aus dem Repo. Für einen Prüfling braucht es
 * dasselbe aus einem anderen Ordner – nach dessen eigener Liste SHELL, damit
 * eine verfälschte sw.js auch ihre eigene Dateiliste mitbringt.
 */
const kopien = [];
function frischeKopie(name) {
  let ordner;
  if (!PRUEFLING) {
    ordner = appKopie(name);
  } else {
    ordner = mkdtempSync(path.join(tmpdir(), `bauchbuch-${name}-`));
    const dateien = [...new Set([...shellListe(PRUEFLING), 'sw.js', 'index.html'])];
    for (const rel of dateien) {
      const von = path.join(PRUEFLING, rel);
      if (!existsSync(von)) throw new Error(`Prüfling: ${rel} fehlt`);
      mkdirSync(path.dirname(path.join(ordner, rel)), { recursive: true });
      cpSync(von, path.join(ordner, rel));
    }
  }
  kopien.push(ordner);
  return ordner;
}

const EINZEL_URL = PRUEFLING && existsSync(path.join(PRUEFLING, 'dist', 'bauchbuch.html'))
  ? pathToFileURL(path.join(PRUEFLING, 'dist', 'bauchbuch.html')).href
  : EINZEL;

/* ---------- Handgriffe ---------- */

const MIN = 60 * 1000;
const kurz = (ms) => new Promise((ok) => { setTimeout(ok, ms); });
const istWeg = (e) => /context|navigat|Target closed/i.test(String(e && e.message));

/** Im Test selbst warten (nicht in der Seite) – etwa auf einen Serverabruf. */
async function warteHier(bedingung, ms = 15000) {
  const bis = Date.now() + ms;
  while (Date.now() < bis) {
    if (bedingung()) return true;
    // eslint-disable-next-line no-await-in-loop
    await kurz(100);
  }
  return bedingung();
}

/**
 * Eine neue Fassung veröffentlichen: eine Zeile in js/app.js, dann trägt
 * der Bau den neuen Stand in sw.js ein. Die VERSION bleibt, wie sie ist.
 */
function neueFassung(ordner, alt, neu) {
  aendern(ordner, 'js/app.js', `{ id: 'heute', name: '${alt}'`, `{ id: 'heute', name: '${neu}'`);
  return standNeu(ordner);
}

/**
 * Die App verlassen. Lädt sie dabei neu, geschieht das noch im selben
 * Ereignis – das evaluate kann dann ohne Antwort enden. Das ist hier das
 * Ereignis, auf das gewartet wird, kein Fehler.
 */
async function verlassen(page) {
  try { await sichtbarkeit(page, 'hidden'); } catch (e) { if (!istWeg(e)) throw e; }
}

/** Eine Viertelstunde später zurückkommen – erst dann sieht die App nach. */
async function spaeterZurueck(page) {
  await page.clock.fastForward(16 * MIN);
  try { await zurueckkommen(page); } catch (e) { if (!istWeg(e)) throw e; }
}

/** Die Vorräte dieser App im Browser. */
const vorraete = (page) => frage(page, async () => (await caches.keys()).filter((n) => n.startsWith('bauchbuch-')));

/**
 * Warten, bis der Vorrat der neuen Fassung der einzige ist. Erst dann ist
 * sie aktiv – 'activate' räumt die alten weg. Ein Vorrat allein hieße noch
 * nichts: Er wird schon zu Beginn der Installation angelegt.
 */
const nurNeuerVorrat = (page, stand, ms = 30000) => warteBis(page, async (s) => {
  const k = (await caches.keys()).filter((n) => n.startsWith('bauchbuch-'));
  return k.length === 1 && k[0].endsWith(`-${s}`);
}, stand, ms);

/** Läuft in der Seite die Fassung mit diesem Reiternamen, frisch geladen? */
const neueLaeuft = (page, name, ms = 40000) => warteBis(
  page,
  (n) => !!document.querySelector('#tabbar')?.textContent.includes(n) && !window.__alt,
  name,
  ms,
);

const alteSeite = (page) => frage(page, () => window.__alt === true);
const toast = (page) => frage(page, () => document.querySelector('#toast')?.textContent || '');

/**
 * Erster Besuch, dann ein Tagebuch, das die Begrüßung hinter sich hat, und
 * einmal neu laden: Erst ab dann bedient der Service Worker die Seite von
 * Anfang an, so wie bei jedem späteren Öffnen vom Startbildschirm.
 */
async function einrichten(page, adresse, zustand = {}) {
  await page.goto(adresse, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 15000 })
    .catch(() => {});
  await page.evaluate(([k, z]) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'heute', ...z })), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  const bedient = await frage(page, () => !!navigator.serviceWorker.controller);
  // Die Seite fragt beim Start ihren Service Worker, welche Fassung er ist.
  // Diese Antwort ist der Maßstab für „wirklich eine andere" – sie muss da
  // sein, bevor die erste neue Fassung kommt.
  await page.waitForTimeout(1200);
  await page.evaluate(() => { window.__alt = true; });
  return bedient;
}

/* ---------- Ein Fall: Kopie, Server, Kontext, Zähler ---------- */

const browser = await chromium.launch();

async function fall(kennung, titel, port, ablauf, { kontext = {}, uhr = true } = {}) {
  if (!laeuft(kennung)) return;
  console.log(`\n— (${kennung}) ${titel}`);
  const ordner = frischeKopie(`auffrischen-${kennung}`);
  const lage = { eingriff: null };
  const kopie = await kopieServer(ordner, port, {
    maxAge: 600,
    eingriff: (rel, inhalt) => (lage.eingriff ? lage.eingriff(rel, inhalt) : undefined),
  });
  const ctx = await browser.newContext({ viewport: HANDY, ...kontext });
  const page = await ctx.newPage();
  const fehler = [];
  page.on('pageerror', (e) => fehler.push(e.message));
  const z = { ladungen: 0 };
  page.on('load', () => { z.ladungen += 1; });
  // Die Uhr gehört dem Test: Die App sucht höchstens alle fünfzehn Minuten,
  // offen jede halbe Stunde – so lange wartet hier niemand.
  if (uhr) await page.clock.install();
  const netzWeg = netzSchalter(kopie, ctx);
  try {
    await ablauf({
      ordner, kopie, ctx, page, z, fehler, lage, netzWeg,
    });
  } catch (e) {
    check(false, `(${kennung}) der Ablauf lief durch (${String(e && e.message).split('\n')[0]})`);
  } finally {
    check(fehler.length === 0, `(${kennung}) keine Fehler in der Seite (${fehler.join(' | ') || 'keine'})`);
    await ctx.close().catch(() => {});
    await kopie.zu();
  }
}

/* ======================================================================
 * (a) Ein offener Bogen hält das Neuladen auf – bis er gespeichert ist
 * ====================================================================== */

await fall('a', 'offener Bogen', 8221, async ({ ordner, kopie, page, z }) => {
  check(await einrichten(page, kopie.adresse), '(a) der Service Worker bedient die Seite');
  check(await page.locator('.notausgang').count() === 0, '(a) nach dem Start ist der Notausgang nicht mehr im Bild');

  await page.locator('[data-act="neu"][data-art="essen"]').click();
  await page.locator('#bogenWas').fill('Grießbrei mit Zimt');
  const nachStart = z.ladungen;

  const stand = neueFassung(ordner, 'Tag', 'X-Bogen');
  await spaeterZurueck(page);
  check(await nurNeuerVorrat(page, stand), `(a) die neue Fassung ist aktiv geworden (${stand})`);
  // Noch ein Moment Gelegenheit, es falsch zu machen.
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(a) solange der Bogen offen ist, lädt nichts neu (${z.ladungen - nachStart})`,
  );
  check(
    await frage(page, () => document.querySelector('#bogenWas')?.value) === 'Grießbrei mit Zimt',
    '(a) der angefangene Text steht noch im Bogen',
  );

  // Gespeichert und weggelegt: Jetzt ist der Moment, den niemand bemerkt.
  await page.locator('[data-act="bogen-speichern"]').click();
  await page.waitForTimeout(300);
  await verlassen(page);
  check(await neueLaeuft(page, 'X-Bogen'), '(a) beim Verlassen kommt die neue Fassung');
  check(z.ladungen - nachStart === 1, `(a) mit genau einem Neuladen (${z.ladungen - nachStart})`);
  const s = await frage(page, (k) => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
  check(
    !!s && Array.isArray(s.eintraege) && s.eintraege.some((e) => e.was === 'Grießbrei mit Zimt'),
    '(a) der eben gespeicherte Eintrag ist danach im Speicher',
  );
});

/* ======================================================================
 * (b) Text im Ideenfeld – auch ohne Cursor darin
 * ====================================================================== */

/*
 * Auf dem iPhone verliert ein Feld den Fokus, sobald man „Fertig" über der
 * Tastatur tippt oder scrollt. Der Text steht trotzdem noch darin. Deshalb
 * hier ohne Fokus: gefüllt und dann verlassen.
 */
await fall('b', 'Text im Ideenfeld, ohne Fokus', 8222, async ({ ordner, kopie, page, z }) => {
  await einrichten(page, kopie.adresse, { tab: 'ideen' });
  const feld = page.locator('#ideeText');
  await feld.fill('Eine Taste für das Frühstück von gestern');
  await feld.blur();
  check(
    await frage(page, () => document.activeElement?.id !== 'ideeText'),
    '(b) das Ideenfeld hat keinen Fokus mehr',
  );
  const nachStart = z.ladungen;

  const stand = neueFassung(ordner, 'Tag', 'X-Idee');
  await spaeterZurueck(page);
  check(await nurNeuerVorrat(page, stand), `(b) die neue Fassung ist aktiv geworden (${stand})`);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(b) bei der Rückkehr kein Neuladen, solange im Ideenfeld etwas steht (${z.ladungen - nachStart})`,
  );

  await verlassen(page);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(b) auch beim Verlassen nicht (${z.ladungen - nachStart})`,
  );
  check(
    await frage(page, () => document.querySelector('#ideeText')?.value) === 'Eine Taste für das Frühstück von gestern',
    '(b) die Idee steht noch im Feld',
  );
});

/* ======================================================================
 * (c) Nach dem Neuladen derselbe Tag – und der Hinweis genau einmal
 * ====================================================================== */

/*
 * Wer gestern nachträgt, blättert zurück. Stünde der Tag-Reiter nach dem
 * Neuladen wieder auf heute, landete der nächste Eintrag am falschen Tag –
 * ohne dass es jemand merkt.
 *
 * Die neue Fassung wird hier gefunden, während die App offen und angefasst
 * ist (die Suche jede halbe Stunde). Dann wartet sie aufs Verlassen.
 */
await fall('c', 'derselbe Tag nach dem Neuladen', 8223, async ({ ordner, kopie, page, z }) => {
  await einrichten(page, kopie.adresse);
  await page.locator('[data-act="tag-blaettern"][data-d="-1"]').click();
  await page.waitForTimeout(200);
  const gestern = await page.locator('.tag-datum').inputValue();
  check(gestern === vorTagen(1), `(c) der Tag-Reiter steht auf gestern (${gestern})`);
  const nachStart = z.ladungen;

  const stand = neueFassung(ordner, 'Tag', 'X-Tag');
  await page.clock.fastForward(31 * MIN);
  check(await nurNeuerVorrat(page, stand), `(c) die halbstündliche Suche findet die neue Fassung (${stand})`);
  await page.waitForTimeout(2000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(c) offen und angefasst: kein Neuladen unter den Fingern (${z.ladungen - nachStart})`,
  );

  await verlassen(page);
  check(await neueLaeuft(page, 'X-Tag'), '(c) beim Verlassen kommt die neue Fassung');
  check(z.ladungen - nachStart === 1, `(c) mit genau einem Neuladen (${z.ladungen - nachStart})`);
  const danach = await frage(page, () => document.querySelector('.tag-datum')?.value);
  check(danach === gestern, `(c) danach zeigt der Tag-Reiter weiterhin gestern (${danach})`);
  const satz = await toast(page);
  check(/erneuert/.test(satz), `(c) und ein Satz sagt, was passiert ist („${satz}")`);

  // Ein gewöhnliches Neuladen ist kein Update: kein Hinweis, und der Tag
  // fängt wieder bei heute an – so wie beim nächsten Öffnen.
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(600);
  const satz2 = await toast(page);
  check(!/erneuert/.test(satz2), `(c) ein späteres Neuladen von Hand zeigt den Hinweis nicht noch einmal („${satz2}")`);
  const tag2 = await frage(page, () => {
    const f = document.querySelector('.tag-datum');
    return f ? { wert: f.value, heute: f.max } : null;
  });
  check(!!tag2 && tag2.wert === tag2.heute, `(c) und steht wieder auf heute (${tag2 && tag2.wert})`);
});

/* ======================================================================
 * (d) Erst angetippt, dann wird die Fassung fertig
 * ====================================================================== */

/*
 * Die Rückkehr erlaubt ein Neuladen nur, solange noch nichts berührt wurde.
 * Hier kommt die Berührung im selben Augenblick wie die Rückkehr – noch im
 * selben Ereignis, also sicher bevor die Installation fertig sein kann. Das
 * ist der Daumen, der nach dem Öffnen sofort auf „Mahlzeit" geht.
 */
await fall('d', 'angetippt, bevor die Fassung fertig ist', 8224, async ({ ordner, kopie, page, z }) => {
  await einrichten(page, kopie.adresse);
  const nachStart = z.ladungen;
  const stand = neueFassung(ordner, 'Tag', 'X-Tipp');
  await page.clock.fastForward(16 * MIN);
  const zuvor = await page.evaluate(() => {
    const alt = navigator.serviceWorker.controller;
    for (const zustand of ['hidden', 'visible']) {
      Object.defineProperty(document, 'visibilityState', { value: zustand, configurable: true });
      Object.defineProperty(document, 'hidden', { value: zustand === 'hidden', configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    }
    document.querySelector('.topbar').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    return navigator.serviceWorker.controller === alt;
  });
  check(zuvor, '(d) angetippt, während noch die alte Fassung bedient');
  check(await nurNeuerVorrat(page, stand), `(d) danach wird die neue Fassung fertig (${stand})`);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(d) solange sie sichtbar ist, lädt nichts neu (${z.ladungen - nachStart})`,
  );
  await verlassen(page);
  check(await neueLaeuft(page, 'X-Tipp'), '(d) beim Verlassen kommt die neue Fassung');
  check(z.ladungen - nachStart === 1, `(d) mit genau einem Neuladen (${z.ladungen - nachStart})`);
});

/* ======================================================================
 * (e) „Nach neuer Fassung suchen" unter „Mehr"
 * ====================================================================== */

await fall('e', '„Nach neuer Fassung suchen"', 8225, async ({
  ordner, kopie, page, z, netzWeg,
}) => {
  await einrichten(page, kopie.adresse, { tab: 'mehr' });
  const knopf = page.locator('[data-act="fassung-suchen"]');
  check(await knopf.count() === 1, '(e) unter „Mehr" steht „Nach neuer Fassung suchen"');
  const t0 = z.ladungen;

  // Ohne neue Fassung: eine ehrliche Antwort, kein Neuladen.
  await knopf.click();
  check(
    await warteBis(page, () => /neueste Fassung/.test(document.querySelector('#toast')?.textContent || ''), null, 10000),
    `(e) ohne neue Fassung: „${await toast(page)}"`,
  );
  await page.waitForTimeout(2000);
  check(z.ladungen === t0 && await alteSeite(page), `(e) und kein Neuladen (${z.ladungen - t0})`);

  // Mit neuer Fassung: ausdrücklich verlangt, also sofort – obwohl getippt.
  neueFassung(ordner, 'Tag', 'X-Suche');
  await page.locator('[data-act="fassung-suchen"]').click();
  check(await neueLaeuft(page, 'X-Suche'), '(e) mit neuer Fassung: sie kommt sofort');
  check(z.ladungen - t0 === 1, `(e) mit genau einem Neuladen (${z.ladungen - t0})`);
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__alt = true; });

  // Ohne Netz: ein Satz statt eines Fehlers.
  const t1 = z.ladungen;
  await netzWeg(true);
  await page.locator('[data-act="fassung-suchen"]').click();
  check(
    await warteBis(page, () => /kein Netz/.test(document.querySelector('#toast')?.textContent || ''), null, 10000),
    `(e) offline: „${await toast(page)}"`,
  );
  await page.waitForTimeout(1000);
  check(z.ladungen === t1 && await alteSeite(page), `(e) offline kein Neuladen (${z.ladungen - t1})`);
  check(
    await page.locator('[data-act="fassung-suchen"]').isEnabled(),
    '(e) und der Knopf lässt sich danach wieder tippen',
  );
  await netzWeg(false);

  /*
   * Danach wieder gewöhnlich benutzen. Die ausdrückliche Suche ist vorbei –
   * sie hat „kein Netz" gesagt. Eine Fassung, die später von allein gefunden
   * wird (die Suche jede halbe Stunde), darf dann nicht unter den Fingern
   * neu laden, genau wie in (c).
   */
  const stand = neueFassung(ordner, 'X-Suche', 'X-Spaeter');
  await page.locator('.brand').click();
  await page.clock.fastForward(31 * MIN);
  check(await nurNeuerVorrat(page, stand), `(e) die halbstündliche Suche findet die nächste Fassung (${stand})`);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === t1 && await alteSeite(page),
    `(e) nach einer beendeten Suche lädt die App beim Benutzen nicht von selbst neu (${z.ladungen - t1})`,
  );
});

/* ======================================================================
 * (f) Die Drossel: zweimal kurz hintereinander zurück
 * ====================================================================== */

/*
 * Wer die App fünfmal in einer Minute öffnet, um etwas nachzusehen, soll
 * nicht fünfmal sw.js laden – auf dem Land ist jeder Abruf eine Wartezeit.
 */
await fall('f', 'höchstens alle fünfzehn Minuten nachsehen', 8226, async ({ kopie, page }) => {
  await einrichten(page, kopie.adresse);
  // Der Browser selbst sieht nach jedem Seitenaufruf nach. Das abwarten.
  await page.waitForTimeout(1500);
  const abrufe = () => kopie.abrufe.get('sw.js') || 0;
  const vorher = abrufe();

  await spaeterZurueck(page);
  check(await warteHier(() => abrufe() > vorher), '(f) die erste Rückkehr nach einer Viertelstunde fragt den Server');
  await page.waitForTimeout(1200);
  try { await zurueckkommen(page); } catch (e) { if (!istWeg(e)) throw e; }
  await page.waitForTimeout(3000);
  check(abrufe() - vorher === 1, `(f) die zweite gleich danach nicht (${abrufe() - vorher} Abruf von sw.js)`);

  const danach = abrufe();
  await spaeterZurueck(page);
  check(await warteHier(() => abrufe() > danach), '(f) eine Viertelstunde später wieder');
});

/* ======================================================================
 * (g) Schleifenschutz: ein Byte anders ist keine neue Fassung
 * ====================================================================== */

/*
 * Der Browser installiert einen Service Worker, sobald sich sw.js um ein
 * Byte unterscheidet – etwa, weil ein Zwischenserver einen Kommentar
 * anhängt. Hinge das Neuladen daran, lüde die App bei jeder Rückkehr neu,
 * ohne dass sich an ihr etwas geändert hätte.
 */
await fall('g', 'sw.js ändert sich bei jedem Abruf, der Stand nicht', 8227, async ({ kopie, page, z, lage }) => {
  let n = 0;
  lage.eingriff = (rel, inhalt) => (rel === 'sw.js'
    ? Buffer.concat([inhalt, Buffer.from(`\n// Abruf ${++n}\n`)])
    : undefined);
  await einrichten(page, kopie.adresse);
  await page.waitForTimeout(1500);
  check(z.ladungen === 2, `(g) schon beim Einrichten kein zusätzliches Neuladen (${z.ladungen} Ladungen)`);
  await page.evaluate(() => {
    window.__wechsel = 0;
    navigator.serviceWorker.addEventListener('controllerchange', () => { window.__wechsel += 1; });
  });
  const nachStart = z.ladungen;
  for (let i = 1; i <= 3; i++) {
    // eslint-disable-next-line no-await-in-loop
    await spaeterZurueck(page);
    // eslint-disable-next-line no-await-in-loop
    await warteBis(page, (k) => window.__wechsel >= k, i, 15000);
    // eslint-disable-next-line no-await-in-loop
    await page.waitForTimeout(1500);
  }
  const wechsel = await frage(page, () => window.__wechsel ?? -1);
  check(wechsel >= 3, `(g) jedes Mal übernimmt wirklich ein anderer Service Worker (${wechsel}×)`);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(g) und trotzdem kein Neuladen (${z.ladungen - nachStart})`,
  );
});

/* ======================================================================
 * (h) Alles oder nichts: eine unvollständige Fassung bleibt draußen
 * ====================================================================== */

/*
 * Bricht beim Einrichten einer neuen Fassung der Abruf eines Moduls ab – im
 * Keller, in der Bahn –, darf sie nicht aktiv werden. Sonst wäre der alte
 * Vorrat weggeräumt, und ohne Netz bliebe die App weiß.
 */
/** Wie viele Dateien liegen im Vorrat dieser App? */
const vorratGroesse = (page) => frage(page, async () => {
  const name = (await caches.keys()).find((n) => n.startsWith('bauchbuch-'));
  return name ? (await (await caches.open(name)).keys()).length : 0;
});

/** Ist die Installation einer neuen Fassung vorbei – gelungen oder nicht? */
const ruhig = (page) => warteBis(page, async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg && !reg.installing && !reg.waiting;
}, null, 15000);

/**
 * Ohne Netz neu öffnen: Zeichnet die App ihre Reiter, und zwar die der
 * erwarteten Fassung? Das ist die Frage, um die es bei „alles oder nichts"
 * eigentlich geht – nicht, wie die Vorräte heißen.
 */
async function startetOhneNetz(page, netzWeg, reiter) {
  await netzWeg(true);
  let ok = false;
  try {
    await page.reload({ waitUntil: 'load', timeout: 15000 });
    ok = await warteBis(page, (n) => document.querySelectorAll('#tabbar .tab').length >= 6
      && document.querySelector('#tabbar').textContent.includes(n)
      && !document.querySelector('.notausgang'), reiter, 8000);
  } catch {
    ok = false;
  }
  await netzWeg(false);
  return ok;
}

await fall('h', 'eine Datei fehlt beim Einrichten', 8228, async ({
  ordner, kopie, page, z, lage, netzWeg,
}) => {
  await einrichten(page, kopie.adresse);
  const [alterVorrat] = await vorraete(page);
  const kopfAbrufe = () => kopie.abrufe.get('js/kopf.js') || 0;
  let nachStart = z.ladungen;

  const stand = neueFassung(ordner, 'Tag', 'X-Ganz');
  let kaputt = true;
  lage.eingriff = (rel) => (kaputt && rel === 'js/kopf.js' ? { status: 500 } : undefined);
  const k0 = kopfAbrufe();
  await spaeterZurueck(page);
  check(await warteHier(() => kopfAbrufe() > k0), '(h) die neue Fassung versucht, js/kopf.js zu holen, und bekommt 500');
  await ruhig(page);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(h) kein Neuladen in eine unvollständige Fassung (${z.ladungen - nachStart})`,
  );
  const liste = await vorraete(page);
  check(
    liste.length === 1 && liste[0] === alterVorrat,
    `(h) der alte Vorrat bleibt der einzige (${liste.join(', ') || 'keiner'})`,
  );
  check(
    await startetOhneNetz(page, netzWeg, 'Tag'),
    '(h) und die alte Fassung startet weiterhin ohne Netz',
  );

  // Der Fehler ist weg – beim nächsten Nachsehen klappt es.
  kaputt = false;
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__alt = true; });
  nachStart = z.ladungen;
  await spaeterZurueck(page);
  check(await neueLaeuft(page, 'X-Ganz'), '(h) ist die Datei wieder da, kommt die neue Fassung bei der nächsten Rückkehr');
  check(z.ladungen - nachStart === 1, `(h) mit genau einem Neuladen (${z.ladungen - nachStart})`);
  check(await nurNeuerVorrat(page, stand, 5000), `(h) und ihr Vorrat ist jetzt der einzige (${stand})`);

  /*
   * Derselbe Abbruch, aber bei einer Fassung, die nur sw.js selbst ändert –
   * etwa die Netzgeduld oder die Abrufregel. Der Stand ist ein Fingerabdruck
   * über die Dateien in SHELL; sw.js gehört nicht dazu, und VERSION wird nur
   * bei Änderungen an diesen Dateien hochgezählt. Dann trägt die neue
   * Fassung denselben Vorratsnamen wie die laufende. Was eine gescheiterte
   * Installation wegräumt, darf trotzdem nicht der Vorrat sein, von dem die
   * App ohne Netz startet.
   */
  await page.waitForTimeout(800);
  await page.evaluate(() => { window.__alt = true; });
  const vollVorher = await vorratGroesse(page);
  lage.eingriff = (rel, inhalt) => {
    if (rel === 'sw.js') return Buffer.concat([inhalt, Buffer.from('\n// nur sw.js geändert\n')]);
    if (rel === 'js/kopf.js') return { status: 500 };
    return undefined;
  };
  const k1 = kopfAbrufe();
  await spaeterZurueck(page);
  check(await warteHier(() => kopfAbrufe() > k1), '(h) auch eine Fassung, die nur sw.js ändert, scheitert an js/kopf.js');
  await ruhig(page);
  await page.waitForTimeout(1500);
  const vollNachher = await vorratGroesse(page);
  check(
    vollVorher > 0 && vollNachher >= vollVorher,
    `(h) dabei bleibt der laufende Vorrat ganz (${vollVorher} → ${vollNachher} Dateien)`,
  );
  lage.eingriff = null;
  check(
    await startetOhneNetz(page, netzWeg, 'X-Ganz'),
    '(h) und die App startet danach weiterhin ohne Netz',
  );
});

/* ======================================================================
 * (i) Der Speicher geht nicht – dann kein Neuladen
 * ====================================================================== */

/*
 * Kann die App nicht speichern, steht alles, was seit dem Start eingetragen
 * wurde, nur im Arbeitsspeicher. Ein Neuladen wäre dann ein Datenverlust.
 *
 * Nur localStorage wirft, sessionStorage nicht – so wie bei einem vollen
 * Speicher. Würfe auch sessionStorage, hielte schon der Notbehelf in
 * neuLaden() an, und dieser Fall prüfte nicht mehr die Speicherfrage selbst.
 */
await fall('i', 'Speichern geht nicht', 8229, async ({ ordner, kopie, ctx, page, z }) => {
  await einrichten(page, kopie.adresse);
  // Erst jetzt: Das Tagebuch liegt schon da, der Service Worker steuert.
  await ctx.addInitScript(() => {
    const echt = Storage.prototype.setItem;
    Storage.prototype.setItem = function setItem(k, v) {
      if (this === window.localStorage) throw new DOMException('Der Speicher ist voll', 'QuotaExceededError');
      return echt.call(this, k, v);
    };
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  check(
    /gespeichert werden|Speicher ist voll/.test(await frage(page, () => document.querySelector('#view')?.textContent || '')),
    '(i) die App sagt, dass sie nicht speichern kann',
  );
  await page.evaluate(() => { window.__alt = true; });
  const nachStart = z.ladungen;

  const stand = neueFassung(ordner, 'Tag', 'X-Speicher');
  await spaeterZurueck(page);
  check(await nurNeuerVorrat(page, stand), `(i) die neue Fassung ist aktiv geworden (${stand})`);
  await page.waitForTimeout(3000);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(i) bei der Rückkehr kein Neuladen, obwohl nichts angetippt wurde (${z.ladungen - nachStart})`,
  );
  await page.locator('[data-act="tab"][data-tab="mehr"]').click();
  await page.waitForTimeout(300);
  const mehr = await frage(page, () => document.querySelector('#view')?.textContent || '');
  check(/liegt bereit/.test(mehr), '(i) unter „Mehr" steht, dass eine neue Fassung bereitliegt');
  // Verlassen wäre sonst der unbemerkte Moment – hier ist es der, in dem
  // alles seit dem Start Eingetragene verloren ginge.
  await verlassen(page);
  await page.waitForTimeout(2500);
  check(
    z.ladungen === nachStart && await alteSeite(page),
    `(i) auch beim Verlassen nicht (${z.ladungen - nachStart})`,
  );
});

/* ======================================================================
 * (j) Die Einzeldatei hat keinen Service Worker – und sagt das
 * ====================================================================== */

await fall('j', 'Einzeldatei über file://', 8221, async ({ page }) => {
  await page.goto(EINZEL_URL, { waitUntil: 'load' });
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({ begruesst: true, tab: 'mehr' })), KEY);
  await page.reload({ waitUntil: 'load' });
  await page.waitForTimeout(500);
  const text = await frage(page, () => document.querySelector('#fassung-text')?.textContent || '');
  check(/Einzeldatei/.test(text), `(j) „Mehr" sagt „Einzeldatei" („${text.slice(0, 60)}…")`);
  check(
    await page.locator('[data-act="fassung-suchen"]').count() === 0,
    '(j) und bietet keine Suche an, die es dort nicht gibt',
  );
  check(await page.locator('.notausgang').count() === 0, '(j) der Notausgang ist nach dem Start weg');
}, { uhr: false });

/* ======================================================================
 * (k) Der Notausgang, wenn das Skript nicht startet
 * ====================================================================== */

/*
 * Auf dem Startbildschirm gibt es weder Adressleiste noch Herunterziehen.
 * Startet js/app.js nicht, ist „Lädt nicht? Neu laden" der einzige Weg
 * hinaus. Ohne Service Worker, damit page.route die Anfrage wirklich sieht.
 */
await fall('k', 'Notausgang', 8222, async ({ kopie, ctx }) => {
  const kaputt = await ctx.newPage();
  const kaputtFehler = [];
  kaputt.on('pageerror', (e) => kaputtFehler.push(e.message));
  await kaputt.route('**/js/app.js', (r) => r.abort());
  await kaputt.goto(kopie.adresse, { waitUntil: 'load' });
  await kaputt.waitForTimeout(1000);
  const frueh = await kaputt.evaluate(() => {
    const p = document.querySelector('.notausgang');
    return p ? Number(getComputedStyle(p).opacity) : -1;
  });
  check(frueh >= 0 && frueh < 0.1, `(k) nach einer Sekunde ist der Notausgang noch unsichtbar (Deckkraft ${frueh})`);
  await kaputt.waitForTimeout(3500);
  const spaet = await kaputt.evaluate(() => {
    const p = document.querySelector('.notausgang');
    return p ? { deck: Number(getComputedStyle(p).opacity), text: p.textContent } : null;
  });
  check(
    !!spaet && spaet.deck > 0.95 && /Lädt nicht\?/.test(spaet.text),
    `(k) nach 4,5 s steht „Lädt nicht?" da (Deckkraft ${spaet && spaet.deck})`,
  );
  check(await kaputt.locator('.notausgang a').isVisible(), '(k) mit einem Weg zum Neuladen');

  const gut = await ctx.newPage();
  await gut.goto(kopie.adresse, { waitUntil: 'load' });
  await warteBis(gut, () => document.querySelectorAll('#tabbar .tab').length >= 6, null, 8000);
  check(await gut.locator('.notausgang').count() === 0, '(k) im Normalfall ist der Notausgang nach dem Start nicht im DOM');
  check(kaputtFehler.length === 0, `(k) auch die Seite ohne Skript wirft keinen Fehler (${kaputtFehler.join(' | ') || 'keine'})`);
}, { kontext: { serviceWorkers: 'block' }, uhr: false });

await browser.close();
for (const k of kopien) rmSync(k, { recursive: true, force: true });
ende();
