/*
 * Mittel, die zusammen eine Frage aufwerfen.
 *
 * Kein Wechselwirkungsprüfer – den gibt es in jeder Apotheke, und er kennt
 * jedes Präparat. Hier stehen nur die wenigen Paare, bei denen ein ADHS-Mittel
 * auf etwas trifft, das in diesem Tagebuch ohnehin oft steht: Säureblocker,
 * Natron, Vitamin C, Schmerz- und Migränemittel, einige Mittel gegen
 * Depression. Und nur, was eine Fach- oder Gebrauchsinformation dazu sagt
 * (Quellen bei jedem Satz unten; der Nachweis je Satz liegt außerhalb des
 * Repositorys).
 *
 * Der eine Fall, um den es vor allem geht: Methylphenidat als Kapsel mit
 * zweierlei Kügelchen (Medikinet retard, Medikinet adult) und ein
 * Säureblocker. Die Fachinformation führt die Behandlung mit einem
 * Säureblocker unter den Gegenanzeigen – in einem weniger sauren Magen kann
 * der ganze Wirkstoff auf einmal frei werden. Säureblocker und
 * Methylphenidat werden oft von zwei verschiedenen Praxen verordnet, und auf
 * keiner der beiden Packungen steht der Name der anderen.
 *
 * DIE STUFEN
 *
 *   A  ein Paar, das die Fachinformation unter den Gegenanzeigen führt (W1),
 *      oder eines, bei dem es so sein könnte, weil die Form fehlt (W1u). Die
 *      Karte auf „Tag" zeigt es, bis es gelesen ist.
 *   B  ein Paar, bei dem die Fachinformation eine Veränderung beschreibt.
 *   C  ein Paar, das in der Fachinformation steht, aber selten ist oder nur
 *      in der US-Fassung.
 *
 * Jeder Text endet bei Praxis oder Apotheke, und keiner sagt, eines der
 * Mittel wegzulassen – auch nicht den Säureblocker: Wer ihn von sich aus
 * absetzt, hat womöglich ein anderes Problem als vorher.
 *
 * Rein: alles kommt als Argument herein, importiert wird nur mittel.js.
 */
import { formAusName, KLAER_SATZ, wissenZu } from './mittel.js';

/** Wie weit zurück ein eingenommenes Mittel als „eingetragen" gilt. */
export const WECHSEL_TAGE = 30;

/*
 * Muster für Mittel, die keine eigene Gruppe in mittel.js haben. Klein
 * geschrieben verglichen, wie alle Namen.
 *
 * Natron ist bewusst keine Gruppe: Als Mittel gegen Sodbrennen zählt es
 * dort nirgends mit, und eine neue Gruppe änderte Zahlen, die bisher
 * stimmten. Hier zählt es nur für die Paare.
 */
const W_NATRON = /natron|natriumhydrogencarbonat|natriumbicarbonat|bullrich/;
const W_VITC = /vitamin[\s-]*c\b|ascorbin/;
const W_METAMIZOL = /metamizol|novalgin|novaminsulfon/;
// Nur, was die Fachinformation von Atomoxetin nennt. Bupropion war dort nicht
// zu belegen und steht deshalb nicht dabei.
const W_CYP2D6 = /fluoxetin|paroxetin|chinidin/;
const W_TRIZ_SSRI = /amitriptylin|nortriptylin|imipramin|clomipramin|doxepin|trimipramin|citalopram|sertralin|fluoxetin|paroxetin/;
const W_CUMARIN = /phenprocoumon|marcumar|falithrom|warfarin/;

const W_SAEURE_GRUPPEN = ['ppi', 'h2', 'antazida', 'alginat'];

const wKlein = (name) => String(name || '').toLowerCase().trim();

/**
 * So viele Zeichen eines Namens stehen im Schlüssel eines Paars – so viele,
 * wie ein Name unter „Meine Mittel" haben darf. Ein Schlüssel ist damit
 * höchstens 3 + 1 + 80 + 1 + 80 = 165 Zeichen lang; js/store.js nimmt beim
 * Einlesen bis 170 an.
 */
export const W_SCHLUESSEL_NAME = 80;
const wGruppe = (name) => {
  const g = wissenZu(name);
  return g ? g.id : null;
};
const wIstSaeure = (name) => W_SAEURE_GRUPPEN.includes(wGruppe(name)) || W_NATRON.test(wKlein(name));

/** Ein ISO-Datum minus n Tage – in UTC gerechnet, ohne Uhrzeit. */
function wVorTagen(iso, n) {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d - n)).toISOString().slice(0, 10);
}

/** Minuten nach Mitternacht – für die Reihenfolge am selben Tag. */
const wMinuten = (um) => {
  const [h, m] = String(um || '00:00').split(':').map(Number);
  return (Number(h) || 0) * 60 + (Number(m) || 0);
};

/**
 * Die Form eines Methylphenidat-Namens.
 *
 * In dieser Reihenfolge: die zuletzt eingetragene Form bei diesem Namen, die
 * Form unter „Meine Mittel", die Form, die der Name eindeutig nennt
 * („Medikinet adult"), sonst 'unbekannt'. Ein Eintrag geht vor „Meine
 * Mittel": Wer die Packung wechselt, trägt die neue Form zuerst beim Mittel
 * ein, und die gemerkte bleibt oft stehen.
 *
 * „Weiß ich nicht" ist dabei auf jeder Stufe keine Auskunft, sondern zählt wie
 * eine fehlende Angabe. Sonst überdeckte ein Eintrag mit „Weiß ich nicht" die
 * Form, die man danach unter „Meine Mittel" wählt – genau dorthin schickt die
 * Karte W1u – und sogar einen Namen, der die Form eindeutig nennt.
 */
export function formZu(name, standardMittel = [], eintraege = []) {
  const k = wKlein(name);
  if (!k) return 'unbekannt';
  const bekannt = (form) => !!form && form !== 'unbekannt';
  const mitForm = (eintraege || [])
    .filter((e) => e && e.art === 'medikament' && wKlein(e.mittel) === k && bekannt(e.form))
    .sort((a, b) => (a.am === b.am ? wMinuten(a.um) - wMinuten(b.um) : (a.am < b.am ? -1 : 1)));
  if (mitForm.length) return mitForm[mitForm.length - 1].form;
  const gemerkt = (standardMittel || []).find((m) => m && wKlein(m.mittel) === k && bekannt(m.form));
  if (gemerkt) return gemerkt.form;
  return formAusName(name) || 'unbekannt';
}

/**
 * Was als „eingetragen" gilt: alles unter „Meine Mittel" und alles, was in
 * den letzten WECHSEL_TAGE Tagen eingenommen wurde. Je Name einmal, in der
 * Schreibweise des jüngsten Eintrags.
 */
function wEingetragen(standardMittel, eintraege, heute) {
  const namen = new Map();
  const merke = (name) => {
    const k = wKlein(name);
    if (k) namen.set(k, String(name).trim());
  };
  (standardMittel || []).forEach((m) => m && merke(m.mittel));
  const ab = heute ? wVorTagen(heute, WECHSEL_TAGE - 1) : '';
  (eintraege || [])
    .filter((e) => e && e.art === 'medikament' && (!heute || (e.am >= ab && e.am <= heute)))
    .sort((a, b) => (a.am === b.am ? wMinuten(a.um) - wMinuten(b.um) : (a.am < b.am ? -1 : 1)))
    .forEach((e) => merke(e.mittel));
  return [...namen.values()];
}

/*
 * Die Texte. Jeder hat seine Quelle; was sich nicht belegen ließ, fehlt –
 * auch als Bedingung: Antazida, Alginat und Vitamin C bei Dexamfetamin
 * (W5) und Bupropion bei Atomoxetin (W9) sind deshalb nicht dabei.
 */

/*
 * W1 und W1u – Quellen: Medikinet retard FI, www.fachinfo.de/fi/pdf/009621
 * (12/2025), 4.3/4.5; Rote Liste 19655-1; Medikinet adult FI,
 * www.fachinfo.de/fi/pdf/013066 (09/2025), 4.3; Gebrauchsinformation Medikinet
 * adult (Wiedergabe apomio.de, patienteninfo-service.de/gi/14524/).
 *
 * Unter den Gegenanzeigen steht dort ausdrücklich die Behandlung mit
 * H2-Blockern, Protonenpumpenhemmern oder Antazida, nicht nur ein Magen ohne
 * Säure; die Karte sagt es deshalb so und nicht milder.
 */
const wKarteW1 = (b) => 'Zum Nachfragen: In deinen Mitteln stehen Methylphenidat als Kapsel '
  + `mit zweierlei Kügelchen und ${b}, ein Mittel gegen oder gegen zu viel Magensäure. In der `
  + 'Fachinformation solcher Kapseln steht die Einnahme zusammen mit solchen Mitteln unter den '
  + 'Gegenanzeigen: In einem weniger sauren Magen kann der Wirkstoff früher frei werden. '
  + `Bitte nichts davon eigenmächtig weglassen – auch ${b} nicht – und es zeitnah in der `
  + 'Praxis oder Apotheke ansprechen.';

const wKarteW1u = (a, b) => `Zum Nachfragen: In deinen Mitteln stehen Methylphenidat (${a}) `
  + `und ${b}, ein Mittel gegen oder gegen zu viel Magensäure. Bei manchen `
  + 'Methylphenidat-Kapseln (Medikinet retard, Medikinet adult) steht die Einnahme zusammen '
  + 'mit solchen Mitteln in der Fachinformation unter den Gegenanzeigen. Welche Form du hast, '
  + 'steht auf der Packung; du kannst sie bei deinem Mittel unter „Meine Mittel“ angeben. '
  + `Bitte nichts eigenmächtig weglassen – auch ${b} nicht – und es in Praxis oder Apotheke `
  + 'klären.';

/*
 * W5 – Quelle: Attentin 10/20 mg FI, www.fachinfo.de/fi/pdf/020945 (08/2024),
 * 4.5 (Natriumhydrogencarbonat erhöht die Resorption).
 */
const wTextW5 = 'Laut Fachinformation erhöhen basische Mittel wie Natron die Aufnahme von '
  + 'Dexamfetamin – ob das bei dir eine Rolle spielt, klären Ärztin oder Apotheke.';

/*
 * W6 und W7 – Quelle: US-Fachinformation Vyvanse,
 * www.accessdata.fda.gov/drugsatfda_docs/label/2025/021977s054%2C208510s011lbl.pdf
 * (Urin-pH: Ascorbinsäure, Natriumhydrogencarbonat; Serotoninsyndrom mit Triptanen).
 * Gemeint ist dort der Blutspiegel des Amfetamins, das aus der Vorstufe
 * entsteht – Lisdexamfetamin selbst wird im Blut gespalten, sein Spiegel
 * hängt nicht am Urin.
 */
const wTextW6 = 'Laut US-Fachinformation senken Mittel, die den Urin saurer machen, etwa '
  + 'Vitamin C, den Spiegel des Wirkstoffs, der im Körper aus Lisdexamfetamin entsteht; '
  + 'basische wie Natron erhöhen ihn – ob das bei dir eine Rolle spielt, klären Ärztin oder '
  + 'Apotheke.';
const wTextW7 = 'Die US-Fachinformation von Lisdexamfetamin nennt Triptane unter den Mitteln, '
  + 'mit denen ein Serotoninsyndrom möglich ist. Wenn du beides nimmst: in Praxis oder '
  + 'Apotheke ansprechen.';

/*
 * W8 – Quelle: EMA, CMDh-Schlussfolgerungen PSUSA 00001997 (2020) zu Metamizol,
 * www.ema.europa.eu/de/documents/psusa/metamizole-cmdh-scientific-conclusions-and-grounds-variation-amendments-product-information-and-timetable-implementation-psusa-00001997-202003_de.pdf
 */
const wTextW8 = 'Laut Fachinformation von Metamizol kann damit der Bupropion-Spiegel sinken – '
  + 'in Praxis oder Apotheke ansprechen.';

/*
 * W9 – Quelle: US-Label Strattera (Wiedergabe medlibrary.org): Fluoxetin, Paroxetin
 * und Chinidin erhöhen die Atomoxetin-Exposition deutlich.
 */
const wTextW9 = (b) => `Laut Fachinformation erhöht ${b} den Atomoxetin-Spiegel deutlich – `
  + 'in Praxis oder Apotheke ansprechen.';

/*
 * W10 und W11 – Quelle: Gebrauchsinformation Methylphenidat-ratiopharm 10 mg
 * (Wiedergabe medikamio.com/de-de/medikamente/methylphenidat-ratiopharm-10-mg-tabletten/pil):
 * Cumarin-Antikoagulanzien und Mittel gegen Depressionen, deren Abbau gehemmt werden kann.
 */
const wTextW10 = 'Laut Packungsbeilage kann Methylphenidat den Abbau mancher Mittel gegen '
  + 'Depression hemmen – in Praxis oder Apotheke ansprechen.';
const wTextW11 = 'Laut Packungsbeilage kann Methylphenidat den Abbau von Blutverdünnern dieser '
  + 'Art hemmen – in Praxis oder Apotheke ansprechen.';

/* Die Fragen für die Sprechstunde, in Ich-Form wie überall im Bericht. */
const W_FRAGE_A = 'Passt mein Säureblocker zu meinem Methylphenidat?';
const W_FRAGE_B = 'Ich nehme Methylphenidat und ein säurebindendes oder säurehemmendes Mittel. '
  + 'Passt das zu meiner Freisetzungsform?';
const wFrageZwei = (a, b) => `Passen ${a} und ${b} zusammen?`;

const W_STUFE = {
  W1: 'A', W1u: 'A', W3: 'B', W4: 'B', W5: 'B', W6: 'B', W7: 'C', W8: 'C', W9: 'C', W10: 'C', W11: 'C',
};
const W_RANG = { A: 0, B: 1, C: 2 };

/**
 * Die Hinweise zu den eingetragenen Mitteln.
 *
 * Eingetragen ist, was unter „Meine Mittel" steht oder in den letzten
 * WECHSEL_TAGE Tagen eingenommen wurde. Jedes Paar höchstens einmal; Stufe A
 * zuerst.
 *
 * `schluessel` ist „W1|<a>|<b>" mit kleingeschriebenen Namen – daran merkt
 * sich die App, dass eine Karte gelesen ist (`wechselGelesen`). Ändert sich
 * ein Name, ist es ein neues Paar und wird neu gezeigt. Jeder Name steht mit
 * höchstens W_SCHLUESSEL_NAME Zeichen darin: Unter „Meine Mittel" sind 80
 * erlaubt, im Eintrag beliebig viele, und eine Sicherung nimmt nur kurze
 * Schlüssel mit (sicherungLesen in js/store.js) – sonst erschiene eine
 * gelesene Karte nach dem Einlesen wieder. Zwei Namen, die sich erst nach
 * 80 Zeichen unterscheiden, gelten damit als dasselbe Mittel.
 *
 * Methylphenidat mit Retardtablette mit Hülle (Concerta) oder Equasym und
 * einem Säureblocker ergibt keinen Hinweis: Belegt war dazu nichts, und ein
 * beruhigender Satz wäre genauso unbelegt.
 *
 * @param {object[]} standardMittel  „Meine Mittel"
 * @param {object[]} eintraege
 * @param {string} heute  ISO-Datum
 * @returns {{id: string, stufe: string, schluessel: string, namen: string[],
 *   text: string, frage: string}[]}
 */
export function wechselHinweise(standardMittel, eintraege, heute) {
  const namen = wEingetragen(standardMittel, eintraege, heute);
  const mit = namen.map((name) => ({ name, k: wKlein(name), gruppe: wGruppe(name) }));
  const von = (gruppe) => mit.filter((m) => m.gruppe === gruppe);
  const raus = [];
  const dazu = (id, a, b, text, frage) => {
    const schluessel = `${id}|${a.k.slice(0, W_SCHLUESSEL_NAME)}|${b.k.slice(0, W_SCHLUESSEL_NAME)}`;
    if (raus.some((h) => h.schluessel === schluessel)) return;
    raus.push({ id, stufe: W_STUFE[id], schluessel, namen: [a.name, b.name], text, frage });
  };
  const paare = (gruppe, passt, tu) => von(gruppe).forEach((a) => mit
    .filter((b) => b.k !== a.k && passt(b))
    .forEach((b) => tu(a, b)));

  // Methylphenidat und Säureblocker – je nach Form.
  paare('mph', (b) => wIstSaeure(b.name), (a, b) => {
    const form = formZu(a.name, standardMittel, eintraege);
    if (form === 'pellet') dazu('W1', a, b, wKarteW1(b.name), W_FRAGE_A);
    else if (form === 'unbekannt') dazu('W1u', a, b, wKarteW1u(a.name, b.name), W_FRAGE_A);
    else if (form === 'sodas') dazu('W3', a, b, KLAER_SATZ, W_FRAGE_B);
    else if (form === 'sofort' || form === 'retardtab') dazu('W4', a, b, KLAER_SATZ, W_FRAGE_B);
  });
  paare('dex', (b) => W_NATRON.test(b.k), (a, b) => dazu('W5', a, b, wTextW5, wFrageZwei(a.name, b.name)));
  paare('lisdex', (b) => W_NATRON.test(b.k) || W_VITC.test(b.k),
    (a, b) => dazu('W6', a, b, wTextW6, wFrageZwei(a.name, b.name)));
  paare('lisdex', (b) => b.gruppe === 'triptan', (a, b) => dazu('W7', a, b, wTextW7, wFrageZwei(a.name, b.name)));
  paare('bupro', (b) => W_METAMIZOL.test(b.k), (a, b) => dazu('W8', a, b, wTextW8, wFrageZwei(a.name, b.name)));
  paare('atomox', (b) => W_CYP2D6.test(b.k), (a, b) => dazu('W9', a, b, wTextW9(b.name), wFrageZwei(a.name, b.name)));
  paare('mph', (b) => W_TRIZ_SSRI.test(b.k), (a, b) => dazu('W10', a, b, wTextW10, wFrageZwei(a.name, b.name)));
  paare('mph', (b) => W_CUMARIN.test(b.k), (a, b) => dazu('W11', a, b, wTextW11, wFrageZwei(a.name, b.name)));

  return raus.sort((x, y) => W_RANG[x.stufe] - W_RANG[y.stufe]);
}
