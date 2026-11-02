/*
 * Das Gold: was eine ältere Fassung über ein festes Tagebuch gerechnet und
 * angezeigt hat.
 *
 *     node tests/gold/erzeugen.mjs --wurzel <Ordner mit der alten Fassung>
 *
 * Die alte Fassung kommt aus einem git worktree außerhalb der Arbeitskopie,
 * etwa `git worktree add ../alt 27cf388`. Geschrieben werden zwei Dateien
 * neben dieses Skript, und beide werden eingecheckt – die Prüfung in CI
 * braucht dann weder den worktree noch die alte Fassung:
 *
 *   v27-rechnungen.json  alle Rechnungen aus tests/rechnungen.mjs je Startwert
 *   v27-ansichten.json   der Text der Reiter Tag, Verlauf, Muster und Mehr,
 *                        im Browser als App auf dem iPhone, bei fester Uhr
 *
 * Erzeugt wird einmal, bevor sich am Code etwas ändert. Wer es später noch
 * einmal laufen lässt, muss auf dieselbe Fassung zeigen und dasselbe
 * bekommen – das Skript vergleicht deshalb mit `--pruefen` nur, statt zu
 * schreiben. Ändert sich das Tagebuch in tests/rechnungen.mjs, wird das Gold
 * neu geschrieben – immer mit derselben alten Fassung als Wurzel, nie mit
 * dem neuen Code, sonst verglichen die Tests ihn mit sich selbst.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { KEY } from '../umgebung.mjs';
import { kopieServer } from '../vorrat.mjs';
import {
  GOLD_SAATEN, GRUNDDATUM, TAGE, alleRechnungen, tagebuch,
} from '../rechnungen.mjs';

const HIER = path.dirname(fileURLToPath(import.meta.url));

/** Wie in den übrigen Tests: Safari auf dem iPhone, als App vom Startbildschirm. */
const KENNUNG = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/26.0 Mobile/15E148 Safari/604.1';

/** Die Reiter, deren Text verglichen wird. */
export const REITER = ['heute', 'verlauf', 'muster', 'mehr'];

/** Die feste Uhr: der Abend des Grunddatums, in deutscher Zeit. */
export const UHR = { zeit: `${GRUNDDATUM}T18:30:00+01:00`, zone: 'Europe/Berlin' };

/** Die Saat des Tagebuchs, das in den Ansichten steht. */
export const ANSICHT_SAAT = GOLD_SAATEN[0];

/**
 * Der Speicherstand für die Ansichten: das Tagebuch und, was eine App nach
 * Wochen im Gebrauch sonst trägt – begrüßt, gesichert, kein Hinweis offen.
 */
export function ansichtsZustand(saat = ANSICHT_SAAT) {
  const d = tagebuch(saat);
  return {
    ...d,
    begruesst: true,
    tab: 'heute',
    alterName: null,
    startbildschirmWeg: true,
    unterleibGefragt: true,
    lastBackup: { on: GRUNDDATUM, anzahl: d.eintraege.length },
  };
}

/**
 * Den Text von #view je Reiter lesen.
 *
 * innerText statt textContent: Verglichen wird, was zu sehen ist, und nicht,
 * wie der Code seine Vorlagen einrückt. Zeilen werden gestutzt, leere fallen
 * weg – ein Zeilenumbruch mehr im HTML ist keine andere Ansicht.
 *
 * @returns {Promise<Record<string, string[]>>}
 */
export async function ansichtenLesen({ wurzel, port, zustand, uhr = UHR }) {
  const kopie = await kopieServer(wurzel, port, { maxAge: 0 });
  const browser = await chromium.launch();
  try {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: KENNUNG,
      serviceWorkers: 'block',
      timezoneId: uhr.zone,
      locale: 'de-DE',
    });
    await ctx.addInitScript(([k, s]) => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
      try { if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify(s)); } catch { /* about:blank */ }
    }, [KEY, zustand]);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', (e) => fehler.push(e.message));
    await page.clock.setFixedTime(new Date(uhr.zeit));
    await page.goto(kopie.adresse, { waitUntil: 'networkidle' });
    const raus = {};
    for (const tab of REITER) {
      // eslint-disable-next-line no-await-in-loop
      await page.locator(`[data-act="tab"][data-tab="${tab}"]`).click();
      // eslint-disable-next-line no-await-in-loop
      await page.waitForTimeout(400);
      // eslint-disable-next-line no-await-in-loop
      raus[tab] = (await page.locator('#view').innerText())
        .split('\n').map((z) => z.replace(/\s+/g, ' ').trim()).filter(Boolean);
    }
    if (fehler.length) throw new Error(`Fehler in der Seite: ${fehler.join(' | ')}`);
    return raus;
  } finally {
    await browser.close();
    await kopie.zu();
  }
}

/** Die Rechnungen je Startwert, in der Form, in der sie gespeichert werden. */
export async function rechnungenGold(wurzel) {
  const rechnungen = {};
  for (const saat of GOLD_SAATEN) {
    // eslint-disable-next-line no-await-in-loop
    rechnungen[saat] = await alleRechnungen(wurzel, tagebuch(saat));
  }
  return { grunddatum: GRUNDDATUM, tage: TAGE, saaten: GOLD_SAATEN, rechnungen };
}

const istHauptprogramm = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (istHauptprogramm) {
  const arg = (name) => {
    const i = process.argv.indexOf(name);
    return i >= 0 ? process.argv[i + 1] : null;
  };
  const wurzel = arg('--wurzel');
  if (!wurzel) {
    console.error('Bitte mit --wurzel <Ordner der alten Fassung> aufrufen.');
    process.exit(2);
  }
  const port = Number(arg('--port') || process.env.BAUCHBUCH_PORT_GOLD || 8551);
  const nurPruefen = process.argv.includes('--pruefen');
  const dateien = {
    rechnungen: path.join(HIER, 'v27-rechnungen.json'),
    ansichten: path.join(HIER, 'v27-ansichten.json'),
  };
  const inhalt = {
    rechnungen: `${JSON.stringify(await rechnungenGold(path.resolve(wurzel)))}\n`,
    ansichten: `${JSON.stringify({
      uhr: UHR,
      saat: ANSICHT_SAAT,
      ansichten: await ansichtenLesen({ wurzel: path.resolve(wurzel), port, zustand: ansichtsZustand() }),
    }, null, 1)}\n`,
  };
  let gleich = true;
  Object.entries(dateien).forEach(([k, datei]) => {
    if (nurPruefen) {
      let alt = '';
      try { alt = readFileSync(datei, 'utf8'); } catch { /* fehlt */ }
      const ok = alt === inhalt[k];
      gleich = gleich && ok;
      console.log(`${ok ? 'gleich ' : 'ANDERS '} ${path.basename(datei)}`);
    } else {
      writeFileSync(datei, inhalt[k]);
      console.log(`geschrieben: ${path.basename(datei)} (${inhalt[k].length} Zeichen)`);
    }
  });
  process.exit(gleich ? 0 : 1);
}
