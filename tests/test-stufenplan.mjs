/*
 * Erst weglassen, dann Gruppe für Gruppe zurückholen
 *
 * Der Stufenplan verlangt Wochen. Damit ist er das Einzige in dieser App, das
 * jemandem echten Schaden zufügen kann, ohne je einen Fehler zu rechnen – eine
 * FODMAP-Karenz streicht Weizen, Zwiebeln, Hülsenfrüchte, viel Obst und
 * Milchprodukte auf einmal. Wer sie ohne Nutzen weiterführt, verliert
 * Ballaststoffe, Kalzium und Vielfalt in der Darmflora und hat dafür nichts
 * bekommen.
 *
 * Deshalb prüft diese Datei vor allem, ob die App an den zwei Stellen den Mund
 * aufmacht, an denen Anleitungen und Apps reihenweise schweigen:
 *
 *   1. DER ABBRUCH. Bringt die Karenz nichts, ist der Plan zu Ende. Nicht
 *      „dann probieren wir die Wiedereinführung trotzdem" – aufhören, wieder
 *      normal essen, woanders suchen. Eine App, die hier weiterführt, hält
 *      jemanden monatelang auf einer Diät, die nichts tut.
 *   2. DIE MENGE. „Weizen verträgst du nicht" streicht Brot, Nudeln und
 *      Couscous. „Ab zwei Scheiben wird es zu viel" streicht gar nichts. Weil
 *      die Stufe ohnehin über drei Tage steigert, fällt diese Antwort fast
 *      umsonst ab – sie zu verschweigen wäre die teuerste Auslassung des
 *      ganzen Plans.
 *
 * Dazu die Zeitrechnung, an der alles hängt: Der Tag nach einer Stufe gehört
 * noch zur Stufe, und die Pause danach zählt als Karenz.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });

const heute = vorTagen(0);

/**
 * Ein Tagebuch bauen.
 *
 * `vorher` ist die Beschwerdestärke in den Wochen vor der Karenz, `waehrend`
 * die während der Karenz und ihrer Pausen. `stufen` sind die Durchgänge:
 * [gruppe, startVorTagen, [wert Tag 1, Tag 2, Tag 3, Nachklang]].
 */
function bauen({
  karenzTage = 21, startVor = 40, vorher = 6, waehrend = 2, stufen = [], gruppen,
} = {}) {
  const eintraege = [];
  const tage = {};
  const start = vorTagen(startVor);

  // Die Sonderwerte der Stufentage kommen aus einer Tabelle: Tag → Wert.
  const gesetzt = {};
  stufen.forEach(([, vorTagenStart, werte]) => {
    werte.forEach((w, i) => {
      if (w !== null) gesetzt[vorTagen(vorTagenStart - i)] = w;
    });
  });

  for (let i = startVor + karenzTage; i >= 0; i--) {
    const am = vorTagen(i);
    tage[am] = { notiert: true };
    const wert = am in gesetzt ? gesetzt[am] : (am < start ? vorher : waehrend);
    eintraege.push({
      id: `b${i}`, am, um: '14:00', art: 'beschwerde', staerke: wert, arten: ['blaehung'],
    });
  }

  return {
    plan: {
      id: 'sp1',
      start,
      karenzTage,
      gruppen: gruppen || ['laktose', 'fruktane-weizen', 'fruktose'],
      stufen: stufen.map(([gruppe, vorTagenStart]) => ({
        gruppe, start: vorTagen(vorTagenStart),
      })),
      beendet: null,
    },
    eintraege,
    tage,
  };
}

async function pruefen(daten) {
  return page.evaluate(async ([p, e, t, h]) => {
    const m = await import('./js/stufenplan.js');
    const b = m.planBild(p, e, t, h);
    return {
      phase: b.stand.phase,
      karenz: {
        urteil: b.karenz.urteil, satz: b.karenz.satz, besserung: b.karenz.besserung,
        notiert: [b.karenz.vorher.notierte, b.karenz.karenz.notierte],
      },
      stufen: b.stufen.map((x) => ({
        gruppe: x.gruppe, urteil: x.urteil, satz: x.satz, gehtBis: x.gehtBis,
        werte: x.tageswerte, basis: x.basis, schnitt: x.schnitt,
      })),
      offen: b.offen,
      schritt: b.schritt && b.schritt.satz,
    };
  }, [daten.plan, daten.eintraege, daten.tage, heute]);
}

/* ---------- 1. Die Karenz hilft nicht – der Plan ist zu Ende ---------- */

/*
 * DIE WICHTIGSTE PRÜFUNG DIESER DATEI.
 *
 * Vier Wochen ohne FODMAPs, und es geht genauso wie vorher. Damit ist die
 * Sache entschieden, und zwar dagegen. Was hier nicht kommen darf: eine
 * Aufforderung zur Wiedereinführung. Was kommen muss: ein klares Aufhören,
 * mit der Begründung, dass eine Diät ohne Wirkung kein neutraler Zustand ist.
 */
const nutzlos = await pruefen(bauen({ vorher: 5, waehrend: 5, karenzTage: 21, startVor: 30 }));
check(
  nutzlos.karenz.urteil === 'hilft-nicht',
  `ohne Wirkung sagt die App das auch (${nutzlos.karenz.urteil})`,
);
check(
  /dieser Plan zu Ende/.test(nutzlos.karenz.satz),
  'und beendet den Plan, statt weiterzuführen',
);
check(
  /kein Fehlschlag|richtige Folgerung/.test(nutzlos.karenz.satz),
  'ohne daraus ein Versagen zu machen',
);
check(
  /Ballaststoffe|Kalzium/.test(nutzlos.karenz.satz),
  'mit dem Grund, warum Weitermachen schadet und nicht bloß nichts nützt',
);
check(
  !/Wiedereinführung/.test(nutzlos.schritt || ''),
  'und lädt nicht zur Wiedereinführung ein',
);

/* ---------- 2. Die Karenz hilft – aber sie ist nicht das Ziel ---------- */

/*
 * Sechs runter auf zwei. Jetzt muss die App das Gegenteil von dem tun, was der
 * erste Impuls ist: nicht gratulieren und aufhören lassen, sondern zur
 * Wiedereinführung schicken. Wer nach der Karenz aufhört, weil es besser geht,
 * bleibt für immer auf der strengsten Stufe – und das ist der häufigste
 * Ausgang im wirklichen Leben.
 */
const hilft = await pruefen(bauen({ vorher: 6, waehrend: 2, karenzTage: 21, startVor: 30 }));
check(hilft.karenz.urteil === 'hilft', `die Besserung wird gefunden (${hilft.karenz.urteil})`);
check(
  /nicht das Ziel/.test(hilft.karenz.satz),
  'und die App sagt, dass die Karenz nicht das Ziel ist',
);
check(
  /Wiedereinführung/.test(hilft.karenz.satz),
  'sondern der Aufbau für die Wiedereinführung',
);
check(hilft.phase === 'entscheid', `der Plan steht an der Weiche (${hilft.phase})`);

/* ---------- 3. Eine Gruppe, die durchgeht ---------- */

/*
 * Die wertvollste Ausgabe des ganzen Plans, und die, die am leichtesten
 * untergeht: Eine Gruppe darf zurück. Der Ertrag sind nicht die Funde, sondern
 * das, was wieder auf den Teller kommt.
 */
const gut = await pruefen(bauen({
  vorher: 6, waehrend: 2, karenzTage: 21, startVor: 40,
  stufen: [['laktose', 14, [2, 2, 2, 2]]],
}));
check(
  gut.stufen[0].urteil === 'vertraegt',
  `was nichts macht, darf zurück (${gut.stufen[0].urteil})`,
);
check(
  /zurück auf den Teller/.test(gut.stufen[0].satz),
  'und die App sagt das auch so',
);

/* ---------- 4. Eine Gruppe, bei der es auf die Menge ankommt ---------- */

/*
 * Der Fall, für den die Steigerung über drei Tage überhaupt da ist: Eine halbe
 * Scheibe Brot geht, eine ganze auch, zwei nicht. Daraus „verträgst du nicht"
 * zu machen hieße Brot, Nudeln und Couscous zu streichen, wo eine Faustregel
 * gereicht hätte.
 */
const menge = await pruefen(bauen({
  vorher: 6, waehrend: 2, karenzTage: 21, startVor: 40,
  stufen: [['fruktane-weizen', 14, [2, 2, 7, 6]]],
}));
check(
  menge.stufen[0].urteil === 'menge',
  `die Schwelle wird gefunden (${menge.stufen[0].urteil})`,
);
check(
  menge.stufen[0].gehtBis === '1 Scheibe',
  `bis eine Scheibe geht es (${menge.stufen[0].gehtBis})`,
);
check(
  /streichen wäre hier zu viel/.test(menge.stufen[0].satz),
  'und Streichen wäre ausdrücklich zu viel',
);

/* ---------- 5. Eine Gruppe, die schon in kleiner Menge durchschlägt ---------- */

const schlecht = await pruefen(bauen({
  vorher: 6, waehrend: 2, karenzTage: 21, startVor: 40,
  stufen: [['laktose', 14, [7, 8, 8, 7]]],
}));
check(
  schlecht.stufen[0].urteil === 'vertraegt-nicht',
  `schon die kleinste Menge zählt (${schlecht.stufen[0].urteil})`,
);
check(
  /halben Jahr/.test(schlecht.stufen[0].satz),
  'mit dem Hinweis, dass sich das wieder ändern kann',
);

/*
 * Und die Gegenprobe, an der der erste Entwurf dieser Datei scheiterte: Fehlt
 * ausgerechnet der erste Tag im Tagebuch – der mit der kleinsten Menge –, dann
 * darf nicht „schon die kleinste Menge schlägt durch" herauskommen. Das wäre
 * eine Aussage über etwas, das nie beobachtet wurde, und sie streicht eine
 * ganze Gruppe. Derselbe Fehler steckte einmal in js/dosis.js.
 */
const ersterFehlt = await page.evaluate(async ([h]) => {
  const m = await import('./js/stufenplan.js');
  const tag = (n) => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  const eintraege = [];
  const tage = {};
  for (let i = 61; i >= 0; i--) {
    // Tag 1 der Stufe bleibt ohne jede Eintragung – eine echte Lücke.
    if (i === 14) continue;
    tage[tag(i)] = { notiert: true };
    const w = i > 40 ? 6 : ((i === 13 || i === 12) ? 8 : (i === 11 ? 7 : 2));
    eintraege.push({
      id: `b${i}`, am: tag(i), um: '14:00', art: 'beschwerde', staerke: w, arten: ['blaehung'],
    });
  }
  const x = m.planBild({
    id: 'x',
    start: tag(40),
    karenzTage: 21,
    gruppen: ['laktose'],
    stufen: [{ gruppe: 'laktose', start: tag(14) }],
    beendet: null,
  }, eintraege, tage, h).stufen[0];
  return { urteil: x.urteil, satz: x.satz, werte: x.tageswerte };
}, [heute]);

check(
  ersterFehlt.urteil === 'reagiert',
  `ohne den ersten Tag kein Urteil über die kleine Menge (${ersterFehlt.urteil})`,
);
check(
  !/kleinste geprüfte Menge/.test(ersterFehlt.satz),
  'und keine Behauptung über eine Menge, die nie beobachtet wurde',
);
check(
  /Wiederholung/.test(ersterFehlt.satz),
  'sondern der Vorschlag, die Stufe zu wiederholen',
);

/* ---------- 6. Der Tag danach gehört noch zur Stufe ---------- */

/*
 * Was am dritten Tag in der größten Menge gegessen wurde, meldet sich oft erst
 * am nächsten Morgen: FODMAPs wirken im Dickdarm, und dorthin braucht Essen
 * seine Zeit. Zählte dieser Tag zur Pause, ginge die Reaktion zweimal daneben
 * – sie fehlte beim Befund und machte den Karenzwert obendrein schlechter.
 *
 * Hier steht an allen drei Testtagen ein ruhiger Wert und erst am Tag danach
 * eine 8. Das muss trotzdem als Reaktion gelten.
 */
const spaet = await pruefen(bauen({
  vorher: 6, waehrend: 2, karenzTage: 21, startVor: 40,
  stufen: [['laktose', 14, [2, 2, 2, 8]]],
}));
check(
  spaet.stufen[0].urteil !== 'vertraegt',
  `der Nachklang zählt zur Stufe (${spaet.stufen[0].urteil})`,
);
check(
  spaet.stufen[0].werte[2] === 8,
  `und landet beim letzten, größten Tag (${JSON.stringify(spaet.stufen[0].werte)})`,
);

/* ---------- 7. Lücken sind keine guten Tage ---------- */

/*
 * Ein Stufenplan läuft über Wochen, und niemand trägt über Wochen lückenlos
 * ein. Eine Karenz, in der wenig steht, sieht deshalb leicht wie eine ruhige
 * Zeit aus – und wäre es nicht. Ohne genug notierte Tage gibt es kein Urteil.
 */
const luecke = await page.evaluate(async ([h]) => {
  const m = await import('./js/stufenplan.js');
  const start = new Date();
  start.setDate(start.getDate() - 25);
  const iso = (d) => d.toISOString().slice(0, 10);
  const b = m.planBild({
    id: 'x', start: iso(start), karenzTage: 21, gruppen: ['laktose'], stufen: [], beendet: null,
  }, [], {}, h);
  return { urteil: b.karenz.urteil, satz: b.karenz.satz };
}, [heute]);
check(luecke.urteil === 'zuwenig', `ohne Eintragungen kein Urteil (${luecke.urteil})`);
check(
  /kein beschwerdefreier Tag/.test(luecke.satz),
  'und die App sagt, warum eine Lücke kein guter Tag ist',
);

/* ---------- 8. In der Anzeige ---------- */

const daten = bauen({
  vorher: 6, waehrend: 2, karenzTage: 21, startVor: 40,
  stufen: [['laktose', 14, [2, 2, 2, 2]], ['fruktane-weizen', 8, [2, 2, 7, 6]]],
});
await page.evaluate(([k, p, e, t]) => localStorage.setItem(k, JSON.stringify({
  begruesst: true, tab: 'muster', stufenplan: p, eintraege: e, tage: t,
})), [KEY, daten.plan, daten.eintraege, daten.tage]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);

const sicht = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(sicht.includes('Stufenplan'), 'der Plan steht im Muster-Reiter');
check(sicht.includes('verträgst du'), 'mit dem Urteil der ersten Gruppe');
check(sicht.includes('kommt auf die Menge an'), 'und der Mengenschwelle der zweiten');
check(
  /Noch offen:/.test(sicht),
  'und was noch aussteht',
);

/* Der Tagesreiter muss sagen, was heute dran ist – sonst versandet der Plan. */
await page.evaluate(([k]) => {
  const s = JSON.parse(localStorage.getItem(k));
  s.tab = 'heute';
  localStorage.setItem(k, JSON.stringify(s));
}, [KEY]);
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(500);

const tag = (await page.locator('#view').textContent()).replace(/\s+/g, ' ');
check(
  /Stufenplan|Wiedereinführung|Karenz/.test(tag),
  'auf dem Tagesreiter steht, wo der Plan steht',
);
check(
  /Als Nächstes|nächste Gruppe|Fruktose|Pause/.test(tag),
  'und was als Nächstes ansteht',
);

/* ---------- 9. Im Bericht ---------- */

/*
 * Die Ernährungsberatung, an die eine Praxis überweist, fängt sonst bei null
 * an: dieselbe Karenz, dieselben Wochen. Ein Plan mit Ergebnissen erspart
 * genau das – deshalb gehört er auf den Zettel.
 */
const text = await page.evaluate(async ([k, h, v]) => {
  const s = JSON.parse(localStorage.getItem(k));
  const b = await import('./js/bericht.js');
  return b.arztBericht(s, v, h);
}, [KEY, heute, vorTagen(70)]);
check(/STUFENPLAN/.test(text), 'der Bericht hat einen eigenen Abschnitt');
check(/Karenz ab/.test(text), 'mit der Karenz und ihrem Ergebnis');
check(/bis 1 Scheibe/.test(text), 'und der gefundenen Mengenschwelle');

check(fehler.length === 0, `keine Fehler in der Konsole (${fehler.join(' | ') || 'keine'})`);
await page.screenshot({ path: `${SHOT}/stufenplan.png`, fullPage: true });
await browser.close();
ende();
