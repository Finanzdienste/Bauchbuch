/*
 * Kopfschmerzen: eine eigene Eintragsart – und der Nachweis, dass sie in
 * keine Bauchrechnung hineinzählt.
 *
 * Der zweite Teil ist der wichtigere. Ein Kopfschmerz, der als Beschwerde
 * gespeichert würde, machte aus jedem Kaffee davor einen Auslöser und aus
 * jedem Tag einen Beschwerdetag – und niemand sähe es, weil alle Zahlen
 * plausibel blieben. Deshalb wird hier mit Kopfschmerzen *allein* gerechnet
 * und geprüft, dass der Bauch bei null bleibt – und umgekehrt, dass ein Tag
 * mit nur einem Kopfeintrag für den Bauch eine Lücke ist, kein guter Tag.
 *
 * Dazu alles, was ein Kopfschmerztagebuch für die Sprechstunde braucht:
 * Kopfschmerztage und Akutmittel-Tage je 30-Tage-Fenster, die Regel zum
 * Übergebrauch (einen Namen erst, wenn Einnahme UND Kopfschmerztage in zwei
 * von drei Fenstern über der Schwelle liegen), Dauer, wie der Tag weiterging,
 * ob das Mittel geholfen hat, das Fenster um die Periode – und die Verbindung
 * zum Bauch über das Schmerzmittel, verglichen innerhalb der Kopfschmerztage,
 * damit der Anfall auf beiden Seiten steht.
 */
import { chromium } from 'playwright';
import { URL, KEY, HANDY, SHOT, pruefer, vorTagen } from './umgebung.mjs';

const { check, ende } = pruefer();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: HANDY });
const fehler = [];
page.on('pageerror', (e) => fehler.push(`PAGEERROR: ${e.message}`));

const setze = async (zustand) => {
  await page.goto(URL, { waitUntil: 'networkidle' });
  await page.evaluate(([k, s]) => localStorage.setItem(k, JSON.stringify(s)), [KEY, zustand]);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);
};
const lies = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), KEY);
const ids = (wahl) => page.locator(wahl).evaluateAll((els) => els.map((el) => el.dataset.id));
const eng = (t) => t.replace(/\s+/g, ' ');
const karte = async () => eng(await page.locator('.karte-kopf').textContent());
const mahl = (t, id = `m${t}`) => ({ id, am: vorTagen(t), um: '12:00', art: 'essen', was: 'Mittag', tags: [], portion: 'normal' });
const muster = (eintraege, extra = {}) => ({
  begruesst: true, tab: 'muster', eintraege, tage: {}, fenster: 4, mindestFaelle: 5, ...extra,
});
const bericht = async (zustand, n = 30) => {
  await setze({ ...zustand, tab: 'mehr' });
  await page.locator(`[data-act="bericht"][data-n="${n}"]`).click();
  await page.waitForTimeout(300);
  return page.locator('.bericht').inputValue();
};

/* ---------- 1. Der Bogen ---------- */

await setze({ begruesst: true, tab: 'heute', eintraege: [], tage: {} });
check(await page.locator('.anlegen-btn').count() === 6, 'sechs Knöpfe – Kopfschmerz ist dazugekommen');
check(await page.locator('[data-act="neu"][data-art="kopf"]').count() === 1, 'einer davon für den Kopf');
await page.locator('[data-act="neu"][data-art="kopf"]').click();
await page.waitForTimeout(150);
check(await page.locator('.bogen .skala .stufe').count() === 11, 'die Skala von 0 bis 10');
check(await page.locator('.bogen .skala .stufe.an').count() === 0, 'ohne vorbelegte Stufe – eine 4 wäre die bequemste Antwort');
check(await page.locator('[data-act="kopfart"]').count() === 9, 'neun Merkmale, wie er sich anfühlt – mit Erbrechen und Aura');
check(await page.locator('[data-act="kopfdauer"]').count() === 4, 'vier Stufen für die Dauer, bis „länger als 3 Tage"');
check(await page.locator('[data-act="kopf-verlauf"]').count() === 3, 'drei Stufen, wie der Tag weiterging');
check(await page.locator('[data-act="kopf-wirkung"]').count() === 3, 'drei Antworten, ob das Mittel geholfen hat');
check(
  eng(await page.locator('.bogen').textContent()).includes('einmal als Medikament eintragen'),
  'ohne bekanntes Akutmittel erklärt der Bogen, wie es als Tipp dazukommt – statt eines vorzuschlagen',
);
const kopfWarn = await ids('[data-act="warnzeichen"]');
check(
  kopfWarn.includes('donnerschlag') && kopfWarn.includes('kopfausfall') && kopfWarn.includes('kopfnacken')
    && kopfWarn.includes('kopfneu50') && kopfWarn.includes('bluterbrechen') && !kopfWarn.includes('teerstuhl'),
  'die Warnzeichen im Kopfbogen sind die des Kopfes – plus Bluterbrechen, nicht die des Darms',
);

// Ohne Stärke speichern: kein Eintrag.
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(200);
check(await page.locator('.bogen').count() === 1, 'ohne angetippte Stärke bleibt der Bogen offen');
check((await lies()).eintraege.length === 0, 'und im Speicher steht nichts');

await page.locator('[data-act="staerke"][data-n="7"]').click();
await page.locator('[data-act="kopfart"][data-id="pochend"]').click();
await page.locator('[data-act="kopfart"][data-id="kopfuebel"]').click();
await page.waitForTimeout(120);
check(
  eng(await page.locator('.bogen').textContent()).includes('gehört hier zum Kopf'),
  'bei „Mit Übelkeit" steht der Hinweis, sie nicht noch einmal als Bauchbeschwerde einzutragen',
);
await page.locator('[data-act="kopfdauer"][data-id="mittel"]').click();
await page.locator('[data-act="kopf-verlauf"][data-id="ausgefallen"]').click();
await page.locator('[data-act="kopf-wirkung"][data-id="besser"]').click();
await page.waitForTimeout(100);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);

const gespeichert = (await lies()).eintraege;
check(gespeichert.length === 1 && gespeichert[0].art === 'kopf', 'der Eintrag hat die Art „kopf" – nicht „beschwerde"');
const g = gespeichert[0];
check(
  g.staerke === 7 && (g.kopfArten || []).join() === 'pochend,kopfuebel' && g.dauer === 'mittel'
    && g.verlauf === 'ausgefallen' && g.mittelWirkung === 'besser',
  'mit Stärke, Merkmalen, Dauer, Tagesverlauf und Mittelwirkung',
);
check(g.arten === undefined && g.dazuMittel === undefined, 'ohne das Feld „arten" der Bauchbeschwerden und ohne die Tipp-Liste');
const zeile = eng(await page.locator('.strang-zeile').textContent());
check(
  zeile.includes('Kopfschmerz 7') && zeile.includes('4 bis 24 Stunden') && zeile.includes('ausgefallen') && zeile.includes('Mittel: besser'),
  'im Tagesstrang steht alles kurz dabei',
);
const tagKarte = eng(await page.locator('.tagbilanz').textContent());
check(
  tagKarte.includes('Kopfschmerz bis 7') && tagKarte.includes('als Lücke'),
  'die Tageskarte zeigt den Kopf – und sagt, dass der Bauch heute eine Lücke ist, nicht beschwerdefrei',
);

// Im Kalender ist der Tag keine stumme Lücke.
await page.locator('[data-act="tab"][data-tab="verlauf"]').click();
await page.waitForTimeout(250);
check(await page.locator('.rfeld.f-kopf').count() === 1, 'im Monatskalender hat der Kopf-only-Tag eine eigene Stufe');
check(
  (await page.locator('.rfeld.f-kopf').getAttribute('aria-label')).includes('nur Kopfschmerz 7'),
  'und sagt, was dort steht – nicht „nichts eingetragen"',
);
await page.locator('[data-act="tab"][data-tab="heute"]').click();
await page.waitForTimeout(200);

// Zweites Tippen nimmt die Dauer zurück.
await page.locator('.strang-text').click();
await page.waitForTimeout(150);
await page.locator('[data-act="kopfdauer"][data-id="mittel"]').click();
await page.waitForTimeout(100);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
check((await lies()).eintraege[0].dauer === null, 'ein zweites Tippen nimmt die Dauer zurück – „weiß ich nicht mehr" ist zulässig');

/* ---------- 1b. „Dazu genommen" legt das Medikament mit an ---------- */

await setze({ begruesst: true, tab: 'heute', eintraege: [], tage: {}, zuletztMittel: ['Ibuprofen', 'Pantoprazol'] });
await page.locator('[data-act="neu"][data-art="kopf"]').click();
await page.waitForTimeout(150);
const dazu = await ids('[data-act="kopf-dazu"]');
check(dazu.includes('Ibuprofen') && !dazu.includes('Pantoprazol'), 'als Tipp stehen nur Akutmittel da – der Säureblocker nicht');
await page.locator('[data-act="kopf-dazu"][data-id="Ibuprofen"]').click();
await page.locator('[data-act="staerke"][data-n="5"]').click();
await page.waitForTimeout(100);
await page.locator('[data-act="bogen-speichern"]').click();
await page.waitForTimeout(250);
const beide = (await lies()).eintraege;
check(
  beide.length === 2 && beide.some((e) => e.art === 'kopf') && beide.some((e) => e.art === 'medikament' && e.mittel === 'Ibuprofen'),
  'ein Tipp – und das Medikament steht als eigener Eintrag daneben',
);
check(beide.every((e) => e.am === beide[0].am && e.um === beide[0].um), 'zur selben Zeit wie der Kopfschmerz');

/* ---------- 2. Der Bauchbogen bietet die Kopf-Warnzeichen nicht an ---------- */

await page.locator('[data-act="neu"][data-art="beschwerde"]').click();
await page.waitForTimeout(150);
const bauchWarn = await ids('[data-act="warnzeichen"]');
check(bauchWarn.includes('teerstuhl') && !bauchWarn.includes('donnerschlag'), 'im Bauchbogen fehlen die Kopf-Warnzeichen');
check(bauchWarn.length === 10, `die zehn Warnzeichen des Bauches sind noch alle da (${bauchWarn.length})`);
await page.locator('.bogen-zu').click();
await page.waitForTimeout(100);

/* ---------- 3. Der Gegenbeweis: Kopf zählt nirgends als Bauch ---------- */

const nurKopf = [];
for (let t = 1; t <= 20; t++) {
  const am = vorTagen(t);
  nurKopf.push({ id: `e${t}`, am, um: '08:00', art: 'essen', was: 'Kaffee', tags: ['kaffee'], portion: 'normal' });
  nurKopf.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: 8, kopfArten: ['pochend'] });
}
const text = await bericht(muster(nurKopf));
check(text.includes('Tage mit Eintragung        20 von 30'), 'zwanzig notierte Tage – wegen der Mahlzeiten');
check(text.includes('Tage mit Beschwerden       0 ('), 'null Beschwerdetage – zwanzig Kopfschmerztage sind keine Bauchtage');
check(/Stärke im Mittel\s+0 von 10/.test(text), 'die mittlere Bauchstärke bleibt 0');
check(text.includes('Kopfschmerztage            20'), 'und die zwanzig Kopfschmerztage stehen als eigene Zeile in der Übersicht');
check(!text.includes('BESCHWERDEN NACH ART'), 'keine Beschwerdeart – „pochend" ist keine');
check(!/Kaffee\s+8 gegen/.test(text), 'Kaffee wird nicht zum Auslöser mit Stärke 8');
check(text.includes('KOPFSCHMERZEN'), 'dafür ein eigener Abschnitt für den Kopf');
check(/Kopfschmerztage\s+20 · davor 0 · davor 0 \(20 der letzten 30 Tage notiert\)/.test(text), 'mit den drei Fenstern');
check(/Pochend, pulsierend\s+20 Mal/.test(text), 'und den Merkmalen');

await setze(muster(nurKopf));
check(await page.locator('.karte-kopf').count() === 1, 'die Kopfkarte steht auf dem Musterreiter');
check(/Kopfschmerztage je 30 Tage\s*20 \(20 notiert\) · davor 0 · davor 0/.test(await karte()), 'mit den drei Fenstern');
check(!/Kaffee[^.]*auffällig/.test(eng(await page.locator('#view').textContent())), 'Kaffee steht nirgends als auffällig');

// Und die andere Richtung: nur Kopf, keine Mahlzeit – für den Bauch sind das
// zwanzig Lücken, keine zwanzig beschwerdefreien Tage.
const luecken = await bericht(muster(nurKopf.filter((e) => e.art === 'kopf')));
check(luecken.includes('Tage mit Eintragung        0 von 30'), 'ein Tag mit nur einem Kopfeintrag ist für den Bauch keine Eintragung');
check(luecken.includes('Kopfschmerztage            20'), 'für den Kopf aber sehr wohl');

// Dieselbe Regel in den Nennern von Rom IV, GerdQ und Stuhlgang.
const nenner = await page.evaluate(async ([k]) => {
  const a = await import('./js/auswertung.js');
  const kr = await import('./js/kriterien.js');
  const st = await import('./js/stuhl.js');
  const heute = a.tagesWert([], '2020-01-01').am && new Date().toISOString().slice(0, 10);
  const iso = (n) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const bauch = [];
  for (let t = 1; t <= 10; t++) {
    bauch.push({ id: `b${t}`, am: iso(t), um: '12:00', art: 'beschwerde', staerke: 3, arten: ['krampf'] });
    bauch.push({ id: `s${t}`, am: iso(t), um: '09:00', art: 'stuhl', form: 4 });
  }
  const kopf = [];
  for (let t = 11; t <= 20; t++) kopf.push({ id: `k${t}`, am: iso(t), um: '12:00', art: 'kopf', staerke: 6 });
  const ohne = kr.kriterien({ eintraege: bauch, tage: {}, heute, beschwerdenSeit: null, istSaeuremittel: () => false });
  const mit = kr.kriterien({ eintraege: [...bauch, ...kopf], tage: {}, heute, beschwerdenSeit: null, istSaeuremittel: () => false });
  return {
    notiertOhne: ohne.zeitraum.notierteTage, notiertMit: mit.zeitraum.notierteTage,
    stuhlOhne: st.stuhlZahlen(bauch, {}).proTag, stuhlMit: st.stuhlZahlen([...bauch, ...kopf], {}).proTag,
  };
}, [KEY]);
check(nenner.notiertOhne === 10 && nenner.notiertMit === 10, `zehn Kopf-only-Tage ändern den Nenner der Kriterien nicht (${nenner.notiertMit})`);
check(nenner.stuhlOhne === nenner.stuhlMit, `und nicht die Stuhlgänge je notiertem Tag (${nenner.stuhlMit})`);

/* ---------- 4. Warnzeichen aus dem Kopfbogen ---------- */

await setze(muster([
  { id: 'w1', am: vorTagen(1), um: '09:00', art: 'kopf', staerke: 9, warnzeichen: ['donnerschlag'] },
  ...nurKopf,
]));
check(await page.locator('.karte-warn').count() === 1, 'ein schlagartiger Kopfschmerz erzeugt die Warnkarte');
const warnText = eng(await page.locator('.karte-warn').textContent());
check(warnText.includes('so stark war wie nie zuvor'), 'mit seinem Namen');
check(warnText.includes('heute abgeklärt'), 'und mit der Dringlichkeit „sofort"');
check(warnText.includes('Lähmung, Sprachstörung oder Verwirrtheit'), 'die Fußzeile nennt auch den Ausfall');

/* ---------- 5. Schmerzmittel und der Bauch danach ---------- */

// (a) Nur Kopfschmerztage MIT Ibuprofen: Vergleich gegen alle übrigen Tage,
// und der Satz sagt, dass darin der Anfall selbst steckt.
const nsar = new Set([6, 12, 18, 24, 30, 36]);
const nurIbu = [];
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  nurIbu.push(mahl(t));
  if (nsar.has(t)) {
    nurIbu.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: 7, kopfArten: ['drueckend'] });
    nurIbu.push({ id: `i${t}`, am, um: '10:30', art: 'medikament', mittel: 'Ibuprofen', dosis: '400 mg' });
  }
  const imFenster = nsar.has(t) || nsar.has(t + 1);
  nurIbu.push({ id: `b${t}`, am, um: '18:00', art: 'beschwerde', staerke: imFenster ? 6 : 1, arten: ['brennen'] });
}
await setze(muster(nurIbu));
let k = await karte();
check(/Akutmittel am selben Tag\s*an 6 von 6 Tagen \(6 entzündungshemmend\)/.test(k), 'an allen sechs Kopfschmerztagen ein entzündungshemmendes Mittel');
check(
  /mit entzündungshemmendem Schmerzmittel und am Tag danach lag der Bauch im Mittel bei 6, an allen übrigen Tagen bei 1 \(12 gegen 28 Tage\)/.test(k),
  'die Nachwirkung: 6 gegen 1, Tag und Folgetag',
);
check(k.includes('keinen Kopfschmerztag ohne ein solches Mittel'), 'und der Satz sagt, dass der Anfall mit drinsteckt');
let fehlt = eng(await page.locator('#view').textContent());
check(fehlt.includes('An 6 davon wegen Kopfschmerzen'), 'die Frage nach dem Schmerzmittel nennt den Grund');
check(fehlt.includes('Bei Kopfschmerzen nehme ich ein entzündungshemmendes Schmerzmittel'), 'und ist so formuliert, dass man sie vorlesen kann');

// (b) Dazu sechs Kopfschmerztage mit Sumatriptan: Jetzt steht der Anfall auf
// beiden Seiten, und der Unterschied ist das Mittel – mit der Kopfstärke
// beider Seiten als Vorbehalt.
const ibuTage = new Set([4, 10, 16, 22, 28, 34]);
const triTage = new Set([7, 13, 19, 25, 31, 37]);
const beideMittel = [];
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  beideMittel.push(mahl(t));
  if (ibuTage.has(t) || triTage.has(t)) {
    beideMittel.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: ibuTage.has(t) ? 8 : 6, kopfArten: ['pochend'] });
    beideMittel.push({ id: `i${t}`, am, um: '10:30', art: 'medikament', mittel: ibuTage.has(t) ? 'Ibuprofen' : 'Sumatriptan', dosis: '' });
  }
  const nachIbu = ibuTage.has(t) || ibuTage.has(t + 1);
  beideMittel.push({ id: `b${t}`, am, um: '18:00', art: 'beschwerde', staerke: nachIbu ? 6 : 1, arten: ['brennen'] });
}
await setze(muster(beideMittel));
k = await karte();
check(
  /an Kopfschmerztagen ohne ein solches Mittel und am Tag danach bei 1 \(12 gegen 12 Tage\)/.test(k),
  'verglichen wird innerhalb der Kopfschmerztage: mit Ibuprofen gegen mit Sumatriptan',
);
check(k.includes('Beide Seiten haben den Kopfschmerz (im Mittel 8 gegen 6)'), 'mit der Kopfstärke beider Seiten');
check(k.includes('Die Tage mit Mittel waren auch die stärkeren'), 'und dem Vorbehalt, dass ein Mittel eher an den schlimmeren Tagen genommen wird');
check(/Akutmittel am selben Tag\s*an 12 von 12 Tagen \(6 entzündungshemmend, 6 Triptan\)/.test(k), 'die Sorten stehen in einer Zeile');

// (c) Überschneidung: Der Tag nach einem Ibuprofen-Tag ist selbst ein
// Kopfschmerztag mit Sumatriptan – er gehört auf keine Seite.
const paare = [8, 14, 20, 26, 32];
const ueberlappt = [];
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  ueberlappt.push(mahl(t));
  const ibu = paare.includes(t);
  const tri = paare.includes(t + 1);
  if (ibu || tri) {
    ueberlappt.push({ id: `k${t}`, am, um: '10:00', art: 'kopf', staerke: 7, kopfArten: ['pochend'] });
    ueberlappt.push({ id: `i${t}`, am, um: '10:30', art: 'medikament', mittel: ibu ? 'Ibuprofen' : 'Sumatriptan', dosis: '' });
  }
  const wert = ibu ? 6 : (tri ? 6 : 1);
  ueberlappt.push({ id: `b${t}`, am, um: '18:00', art: 'beschwerde', staerke: wert, arten: ['brennen'] });
}
await setze(muster(ueberlappt));
k = await karte();
check(/bei 6, an Kopfschmerztagen ohne ein solches Mittel und am Tag danach bei 1 \(5 gegen 5 Tage\)/.test(k), 'ein Tag, der auf beide Seiten fiele, zählt auf keiner');

// (d) Ohne Medikament kein Satz zur Nachwirkung.
await setze(muster(nurIbu.filter((e) => e.art !== 'medikament')));
k = await karte();
check(!k.includes('entzündungshemmendem Schmerzmittel und am Tag danach'), 'ohne Medikament kein Satz zur Nachwirkung');
check(!k.includes('Akutmittel am selben Tag'), 'und keine Zeile zum Akutmittel');

/* ---------- 6. Periode: Phasen und das Fenster davor ---------- */

const zyklusTage = () => {
  const tage = {};
  for (let t = 1; t <= 60; t++) {
    tage[vorTagen(t)] = { stimmung: 3 };
    if (((60 - t) % 28) + 1 <= 4) tage[vorTagen(t)].blutung = 3;
  }
  return tage;
};
const starts = [60, 32, 4];
const kopfAn = (tageListe) => tageListe.map((t) => ({ id: `z${t}`, am: vorTagen(t), um: '09:00', art: 'kopf', staerke: 5, kopfArten: ['pochend'] }));

// Kopfschmerz an jedem Blutungstag: alle drei Zyklen treffen.
const blutungsKopf = [];
for (let t = 1; t <= 60; t++) if (((60 - t) % 28) + 1 <= 4) blutungsKopf.push(t);
await setze(muster(kopfAn(blutungsKopf), { tage: zyklusTage() }));
k = await karte();
check(k.includes('Nach Zyklusphase') && /Periode\s*an 12 von 12 Tagen/.test(k), 'alle zwölf Periodentage mit Kopfschmerz');
check(/zweite Zyklushälfte\s*an 0 von/.test(k), 'und die zweite Hälfte ohne');
check(k.includes('In 3 von 3 beobachteten Zyklen lag ein Kopfschmerztag in den Tagen um die Periode'), 'das Fenster um die Periode, je Zyklus – die Frage der Neurologie');

// Nur zwei Tage VOR der Blutung: zählt (das ist der Tag, an dem das Östrogen fällt).
await setze(muster(kopfAn(starts.map((t) => t + 2)), { tage: zyklusTage() }));
check((await karte()).includes('In 3 von 3 beobachteten Zyklen'), 'ein Kopfschmerz zwei Tage vor der Blutung liegt im Fenster');
// Drei Tage davor: nicht mehr.
await setze(muster(kopfAn(starts.map((t) => t + 3)), { tage: zyklusTage() }));
check((await karte()).includes('In 0 von 3 beobachteten Zyklen'), 'drei Tage davor nicht mehr – die Grenze ist die der Klassifikation');

/* ---------- 7. Übergebrauch und Häufigkeit: drei Fenster ---------- */

// Je Fenster: `kopf` Kopfschmerztage, an den ersten `triptan` davon Sumatriptan.
const fensterDaten = (kopf, triptan, fensterListe) => {
  const e = [];
  fensterListe.forEach((f) => {
    for (let i = 1; i <= kopf; i++) {
      const t = 30 * f + i;
      e.push({ id: `k${t}`, am: vorTagen(t), um: '09:00', art: 'kopf', staerke: 8, kopfArten: ['pochend'], dauer: 'mittel', verlauf: 'ausgefallen' });
      if (i <= triptan) e.push({ id: `s${t}`, am: vorTagen(t), um: '09:10', art: 'medikament', mittel: 'Sumatriptan', dosis: '' });
    }
  });
  return e;
};
await setze(muster(fensterDaten(12, 12, [0])));
k = await karte();
check(/Akutmittel-Tage je 30 Tage\s*12 \(12 Triptan\) · davor 0 · davor 0/.test(k), 'zwölf Triptan-Tage im jüngsten Fenster');
check(!k.includes('Medikamentenübergebrauch') && k.includes('ein einzelner Monat ist noch keine'), 'ein einzelnes Fenster über der Schwelle: die Zahl und die Regel, kein Name');
check(/Dauer\s*4 bis 24 Stunden \(12×\)/.test(k) && /Ausgefallen, letzte 90 Tage\s*12 Tage/.test(k), 'Dauer und Ausfalltage stehen auf der Karte');

await setze(muster(fensterDaten(12, 12, [0, 1])));
k = await karte();
check(/Akutmittel-Tage je 30 Tage\s*12 \(12 Triptan\) · davor 12 · davor 0/.test(k), 'zwei Fenster über der Einnahmeschwelle');
check(
  !k.includes('Medikamentenübergebrauch') && k.includes('davon stehen hier 12'),
  'aber mit zwölf Kopfschmerztagen kein Name – die Klassifikation verlangt fünfzehn',
);

await setze(muster(fensterDaten(16, 10, [0, 1])));
k = await karte();
check(/Kopfschmerztage je 30 Tage\s*16 \(16 notiert\) · davor 16 · davor 0/.test(k), 'sechzehn Kopfschmerztage je Fenster');
check(k.includes('Medikamentenübergebrauch') && k.includes('auch nicht die, es wegzulassen'), 'mit zehn Triptan-Tagen und sechzehn Kopfschmerztagen in zwei Fenstern steht der Name da – und der Nachsatz gegen den Alleingang');
check(k.includes('Kann mein Schmerz- oder Migränemittel'), 'und die Frage dazu für die Sprechstunde');
check(k.includes('In 2 der drei Fenster über fünfzehn') && k.includes('chronischen Kopfschmerz'), 'und der Satz zur chronischen Form, mit der Fensterzahl');

await setze(muster(fensterDaten(16, 9, [0, 1])));
k = await karte();
check(!k.includes('Medikamentenübergebrauch'), 'neun Triptan-Tage: unter der Schwelle, kein Name');

await setze(muster(fensterDaten(6, 6, [0, 1, 2])));
k = await karte();
check(!k.includes('Medikamentenübergebrauch') && !k.includes('einzelner Monat'), 'sechs Triptan-Tage je Fenster: kein Satz');
check(k.includes('vorbeugende Behandlung'), 'aber ab vier Kopfschmerztagen im Monat die Frage nach der Vorbeugung');

await setze(muster(fensterDaten(16, 0, [0])));
k = await karte();
check(k.includes('ein einzelner Monat ist dafür noch kein Grund') && !k.includes('spricht die Neurologie von einem chronischen'), 'ein Fenster über fünfzehn: die Zahl und die Regel, kein Urteil');
check(k.includes('Die letzten drei Monate'), 'und der Kalender nach Monaten');

// Tägliches ASS zum Blutschutz, drei Kopfschmerztage: viel Mittel, kein Name.
const blutschutz = [];
for (let t = 1; t <= 90; t++) blutschutz.push({ id: `a${t}`, am: vorTagen(t), um: '08:00', art: 'medikament', mittel: 'ASS 100', dosis: '' });
[5, 40, 70].forEach((t) => blutschutz.push({ id: `k${t}`, am: vorTagen(t), um: '10:00', art: 'kopf', staerke: 5 }));
await setze(muster(blutschutz));
k = await karte();
check(!k.includes('Medikamentenübergebrauch') && k.includes('davon stehen hier 1'), 'tägliches ASS ohne Kopfschmerztage bekommt die Zahlen, aber keinen Namen');

/* ---------- 8. Welche Mittel die App kennt ---------- */

const kennt = await page.evaluate(async () => {
  const m = await import('./js/mittel.js');
  const id = (n) => { const g = m.wissenZu(n); return g ? g.id : null; };
  return {
    suma: id('Sumatriptan 50'), riza: id('Rizatriptan'), spray: id('Imigran Nasenspray'),
    wasser: id('Wasser'), passion: id('Passionsblume'), gel: id('Voltaren Schmerzgel'),
    thoma: id('Thomapyrin'), dolormin: id('Dolormin'), ibu: id('Ibu 400'), para: id('Paracetamol'),
    codein: id('Paracetamol Codein'), tramadol: id('Tramadol'), rime: id('Rimegepant'),
    meto: id('Metoprolol'), ass: id('ASS 100'), ato: id('Atogepant'),
  };
});
check(kennt.suma === 'triptan' && kennt.riza === 'triptan' && kennt.spray === 'triptan', 'jedes Triptan wird erkannt – auch als Nasenspray');
check(kennt.wasser === null && kennt.passion === null && kennt.gel === null, '„Wasser" ist kein ASS, und ein Gel fürs Knie kein Magenreiz');
check(kennt.ass === 'nsar' && kennt.ibu === 'nsar' && kennt.dolormin === 'nsar', 'ASS, Ibu und Dolormin sind NSAR');
check(kennt.thoma === 'kombi' && kennt.para === 'nichtnsar' && kennt.meto === 'prophylaxe', 'Kombinationsmittel, Paracetamol und Vorbeugung haben ihre Gruppen');
check(kennt.codein === 'opioid' && kennt.tramadol === 'opioid' && kennt.rime === 'gepant' && kennt.ato === 'prophylaxe', 'Opioide und Gepante auch – und das Codein-Kombi schlägt das Paracetamol');

// Ein tägliches Vorbeugungsmittel bewegt die Akutmittel-Zählung nicht; ein
// unbekannter Name an Kopfschmerztagen steht mit Namen da – ein unbekanntes
// Dauermittel an anderen Tagen nicht.
const dauerMittel = [];
for (let t = 1; t <= 30; t++) {
  dauerMittel.push({ id: `p${t}`, am: vorTagen(t), um: '08:00', art: 'medikament', mittel: 'Metoprolol', dosis: '' });
  if (t > 3) dauerMittel.push({ id: `l${t}`, am: vorTagen(t), um: '07:00', art: 'medikament', mittel: 'L-Thyroxin', dosis: '' });
  if (t <= 3) {
    dauerMittel.push({ id: `k${t}`, am: vorTagen(t), um: '10:00', art: 'kopf', staerke: 6 });
    dauerMittel.push({ id: `z${t}`, am: vorTagen(t), um: '10:10', art: 'medikament', mittel: 'Zaubertrank', dosis: '' });
  }
}
await setze(muster(dauerMittel));
k = await karte();
check(!k.includes('Akutmittel-Tage je 30 Tage') && !k.includes('Akutmittel am selben Tag'), 'Metoprolol zählt nirgends als Akutmittel');
check(k.includes('nicht als Akutmittel erkannt') && k.includes('Zaubertrank (3 Tage)'), 'was an Kopfschmerztagen steht und die App nicht kennt, steht mit Namen da');
check(!k.includes('L-Thyroxin'), 'das tägliche Schilddrüsenmittel nicht – es steht an keinem Kopfschmerztag');

/* ---------- 9. Der Bauch an Kopfschmerztagen ---------- */

const uebel = [];
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  const kopf = t % 4 === 0;
  uebel.push(mahl(t));
  if (kopf) uebel.push({ id: `k${t}`, am, um: '09:00', art: 'kopf', staerke: 7, kopfArten: ['kopfuebel'] });
  uebel.push({ id: `b${t}`, am, um: '13:00', art: 'beschwerde', staerke: kopf ? 6 : 1, arten: ['uebelkeit'] });
}
await setze(muster(uebel));
k = await karte();
check(
  /An Kopfschmerztagen lag der Bauch im Mittel bei 6, an den übrigen Tagen bei 1 \(10 gegen 30 Tage\)/.test(k),
  'der Bauch an Kopfschmerztagen gegen alle übrigen, mit Fallzahlen',
);
check(k.includes('das allein reicht') && k.includes('nichts über das Mittel'), 'als Fußnote mit dem Vorbehalt, dass das zum Anfall gehört – ohne einen Befund zu unterstellen');

/* ---------- 10. Schlaf und Kopfschmerz ---------- */

const naechte = [];
const tageN = {};
for (let t = 1; t <= 40; t++) {
  const am = vorTagen(t);
  const schlecht = t % 2 === 0;
  tageN[am] = { schlaf: schlecht ? 4 : 0 };
  naechte.push(mahl(t));
  const kopf = schlecht ? (t % 10 !== 0) : (t === 1 || t === 3);
  if (kopf) naechte.push({ id: `k${t}`, am, um: '15:00', art: 'kopf', staerke: 5, kopfArten: ['pochend'] });
}
await setze(muster(naechte, { tage: tageN }));
k = await karte();
check(
  /Nach schlechten Nächten an 80 % der Tage Kopfschmerz, nach guten Nächten an 10 % \(20 gegen 20 Tage\)/.test(k),
  'Kopfschmerz nach schlechten gegen gute Nächte, als Anteil mit Fallzahlen',
);
check(k.includes('Vortag'), 'mit dem Vorbehalt, dass schlechter Schlaf auch der Anfang einer Attacke sein kann');

/* ---------- 11. Gastritis Typ C, Zwerchfellbruch und das Schmerzmittel ---------- */

await setze(muster(nurIbu, { befunde: [{ id: 'gastritis-c', am: vorTagen(30) }, { id: 'hiatushernie', am: vorTagen(30) }] }));
fehlt = eng(await page.locator('#view').textContent());
check(fehlt.includes('als Typ C eingetragen'), 'mit Gastritis Typ C im Befund nennt die Frage den Zusammenhang');
check(fehlt.includes('ob sie es bei dir sind, steht in deinem Befund'), '– ohne ihre Gastritis dem Mittel zuzuschreiben');
check(fehlt.includes('mit meiner Gastritis Typ C'), 'und die Sprechstundenfrage passt dazu');
check(fehlt.includes('Engstelle des Bruchs'), 'Zwerchfellbruch plus Schmerzmittel macht aus Blutbild und Ferritin eine konkrete Frage');
check(fehlt.includes('passt bei meinen Kopfschmerzen dazu'), 'und die Kopfkarte stellt die Frage nach dem passenden Akutmittel – ohne eine Migräne zu unterstellen');

/* ---------- 12. Nachtragen von der Tageskarte aus ---------- */

await setze({
  begruesst: true,
  tab: 'heute',
  eintraege: [{ id: 'g1', am: vorTagen(1), um: '14:00', art: 'kopf', staerke: 6, kopfArten: [] }],
  tage: {},
});
check(await page.locator('.karte-nachtrag').count() === 1, 'gestern Kopfschmerz ohne Dauer: die Tageskarte fragt nach');
check(eng(await page.locator('.karte-nachtrag').textContent()).includes('Gestern: Kopfschmerz 6'), 'mit der Stärke von gestern');
await page.locator('[data-act="kopf-nachtrag"][data-feld="dauer"][data-wert="lang"]').click();
await page.waitForTimeout(200);
check((await lies()).eintraege[0].dauer === 'lang', 'ein Tipp trägt die Dauer nach');
check(await page.locator('[data-act="kopf-nachtrag"][data-feld="dauer"]').count() === 0, 'die Dauer wird nicht noch einmal gefragt');
await page.locator('[data-act="kopf-nachtrag"][data-feld="verlauf"][data-wert="unbekannt"]').click();
await page.waitForTimeout(200);
check((await lies()).eintraege[0].verlauf === 'unbekannt', '„Weiß ich nicht mehr" ist eine zulässige Antwort');
check(await page.locator('.karte-nachtrag').count() === 0, 'danach ist die Karte weg');
await setze(muster([{ id: 'g1', am: vorTagen(1), um: '14:00', art: 'kopf', staerke: 6, verlauf: 'unbekannt', dauer: 'unbekannt' }]));
check(!(await karte()).includes('Ausgefallen') && !(await karte()).includes('Dauer'), 'und wird nicht gezählt');

/* ---------- 13. Im Bericht ---------- */

const b2 = await bericht(muster(fensterDaten(16, 10, [0, 1])));
check(/Kopfschmerztage\s+16 · davor 16 · davor 0/.test(b2), 'der Bericht nennt die Kopfschmerztage je Fenster');
check(/Tage mit Akutmittel\s+10 · davor 10 · davor 0 \(zuletzt: 10 Triptan\)/.test(b2), 'und die Tage mit Akutmittel – über alle Einträge, nicht nur die des Berichts');
check(b2.includes('Medikamentenübergebrauch'), 'und den Übergebrauch');
check(b2.includes('Je Kalendermonat') && /Dauer 4 bis 24 Stunden\s+16 Mal/.test(b2), 'den Kalender nach Monaten und die Dauer');
check(b2.includes('Fragen für die Sprechstunde'), 'und die Fragen');

// Der Bericht rechnet mit den Tagesfragen des Zeitraums, nicht mit allen:
// Tagesfragen von vor dem Zeitraum sind keine notierten Tage ohne Kopfschmerz,
// und Zyklen von davor keine Zyklen ohne Kopfschmerz.
const alteTage = {};
for (let t = 1; t <= 120; t++) {
  alteTage[vorTagen(t)] = { stimmung: 2 };
  if (t > 40 && ((120 - t) % 28) < 4) alteTage[vorTagen(t)].blutung = 3;
}
const fuenf = [];
for (let t = 1; t <= 30; t++) fuenf.push(mahl(t));
[2, 8, 14, 20, 26].forEach((t) => fuenf.push({ id: `k${t}`, am: vorTagen(t), um: '10:00', art: 'kopf', staerke: 6 }));
const b3 = await bericht(muster(fuenf, { tage: alteTage }));
check(/Eingetragen\s+5 Mal an 5 Tagen \(17 % der notierten Tage\)/.test(b3), 'fünf von dreißig notierten Tagen im Zeitraum – nicht fünf von hundertzwanzig');
check(!b3.includes('beobachteten Zyklen'), 'und kein Perioden-Urteil aus Zyklen, die vor dem Zeitraum liegen');

/* ---------- 14. Ein Anfall über drei Tage ---------- */

await setze(muster([{ id: 's1', am: vorTagen(2), um: '09:00', art: 'kopf', staerke: 8, dauer: 'status' }]));
check((await karte()).includes('in der Praxis anzurufen'), 'ein frischer Anfall über drei Tage: der Hinweis, in der Praxis anzurufen');
await setze(muster([{ id: 's1', am: vorTagen(40), um: '09:00', art: 'kopf', staerke: 8, dauer: 'status' }]));
check(!(await karte()).includes('in der Praxis anzurufen'), 'sechs Wochen später nicht mehr');

await page.screenshot({ path: `${SHOT}/97-kopf.png`, fullPage: true });

check(fehler.length === 0, `keine Fehler${fehler.length ? `: ${fehler.join(' | ')}` : ''}`);
await browser.close();
ende();
