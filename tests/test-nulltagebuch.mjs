/*
 * Dreihundert Tagebücher, in denen nichts steckt – mit allem, was echte
 * Tagebücher an Täuschung mitbringen.
 *
 * Kein Mittel, kein Essen zur Einnahme, keine Schiene, keine Verspannung und
 * keine Massage wirkt in diesen Tagebüchern auf irgendetwas. Was sie trotzdem
 * enthalten, sind die Störwege (tests/adhs-daten.mjs): Pausen am Wochenende
 * und im Urlaub, wo es Bauch und Kopf ohnehin anders geht; dünneres Eintragen
 * an Tagen ohne Mittel und nach Nächten ohne Schiene; „Zum Essen?" erst nach
 * einer Beschwerde angetippt; Alkohol vor Nächten ohne Schiene; nachgetragene
 * Uhrzeiten; Tage „wegen Beschwerden" ohne Mittel.
 *
 * Jedes Urteil hier ist ein falsches. Erlaubt sind:
 *
 *   * je Rechnung höchstens 6 Prozent „möglich" oder „auffällig" unter den
 *     Tagebüchern, in denen sie genug Fälle hat – und das müssen mindestens
 *     100 sein, sonst prüft die Zeile nichts;
 *   * je Karte höchstens 10 Prozent der Tagebücher mit irgendeinem Urteil.
 *
 * Fester Startwert: Dieselben 300 Tagebücher bei jedem Lauf.
 */
import { pruefer } from './umgebung.mjs';
import { adhsTagebuch, appModul, rechnungenVon } from './adhs-daten.mjs';

const { check, ende } = pruefer();
const { adhsAuswertung } = await appModul('adhs.js');
const { spannungAuswertung } = await appModul('spannung.js');

const ANZAHL = 300;
const URTEIL = ['auffaellig', 'moeglich', 'unauffaellig'];
const TREFFER = ['auffaellig', 'moeglich'];
const start = Date.now();

const je = {};
const karte = { adhs: { n: 0, mit: 0 }, spannung: { n: 0, mit: 0 } };
const stoerungen = {};
for (let saat = 1; saat <= ANZAHL; saat++) {
  const d = adhsTagebuch(saat, { stoerwege: true });
  const r = rechnungenVon(adhsAuswertung(d), spannungAuswertung(d));
  const imTagebuch = { adhs: { genug: false, urteil: false }, spannung: { genug: false, urteil: false } };
  Object.entries(r).forEach(([name, v]) => {
    const z = je[name] || (je[name] = { genug: 0, treffer: 0 });
    if (!v.genug) return;
    z.genug += 1;
    if (TREFFER.includes(v.art)) z.treffer += 1;
    if (v.stoerung) stoerungen[v.stoerung] = (stoerungen[v.stoerung] || 0) + 1;
    const k = name.startsWith('a') ? 'adhs' : 'spannung';
    imTagebuch[k].genug = true;
    if (URTEIL.includes(v.art)) imTagebuch[k].urteil = true;
  });
  ['adhs', 'spannung'].forEach((k) => {
    if (!imTagebuch[k].genug) return;
    karte[k].n += 1;
    if (imTagebuch[k].urteil) karte[k].mit += 1;
  });
}
const sekunden = (Date.now() - start) / 1000;

Object.entries(je).sort().forEach(([name, z]) => {
  const rate = z.genug ? z.treffer / z.genug : 0;
  check(z.genug >= 100 && rate <= 0.06,
    `${name}: ${z.treffer} von ${z.genug} Tagebüchern mit genug Fällen „möglich“ oder „auffällig“ `
    + `(${(rate * 100).toFixed(1)} %, höchstens 6 %; mindestens 100 Tagebücher)`);
});
[['adhs', 'ADHS-Mittel'], ['spannung', 'Kiefer, Nacken, Schiene']].forEach(([k, titel]) => {
  const rate = karte[k].n ? karte[k].mit / karte[k].n : 0;
  check(karte[k].n >= 100 && rate <= 0.1,
    `Karte „${titel}“: in ${karte[k].mit} von ${karte[k].n} Tagebüchern irgendein Urteil (${(rate * 100).toFixed(1)} %, höchstens 10 %)`);
});
// Die Störwege wirken: Jede der Regeln hat in diesen Tagebüchern zu tun.
check(['wochentag', 'bloecke', 'dichte', 'vornacht'].every((s) => stoerungen[s] > 0),
  `die Störwege greifen – Urteile zurückgehalten wegen Wochentag ${stoerungen.wochentag || 0}, Blöcken `
  + `${stoerungen.bloecke || 0}, Dichte ${stoerungen.dichte || 0}, Nacht davor ${stoerungen.vornacht || 0}`);
check(sekunden < 90, `${ANZAHL} Tagebücher in ${sekunden.toFixed(0)} Sekunden (unter 90)`);

ende();
