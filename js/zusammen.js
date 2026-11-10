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
 * Säureblocker. Die Fachinformationen beider Präparate führen die Behandlung
 * mit H2-Blockern, Protonenpumpenhemmern oder Antazida unter den
 * Gegenanzeigen (4.3); zusammen damit kann es „zu einer rascheren Freisetzung
 * der gesamten Wirkstoffmenge kommen“ (4.5) – Medikinet retard,
 * www.fachinfo.de/fi/pdf/009621 (Dezember 2025), Medikinet adult, /013066
 * (September 2025). Fassung 30: „in einem weniger sauren Magen … auf einmal“
 * stand so in keiner der beiden.
 *
 * Warum Body Check das Paar selbst nennt: Die Packungsbeilagen von Medikinet
 * retard (Dezember 2025) und Medikinet adult (patienteninfo-service.de/gi/14524/,
 * September 2025) nennen die Säureblocker nur als Gruppe, ohne Wirkstoff- oder
 * Handelsnamen; in den Fachinformationen von Pantozol 40 mg, Pantozol Control,
 * Nexium mups, Nexium Control, Antra MUPS und Esomeprazol TAD bei Sodbrennen
 * (fachinfo.de 006633, 020222, 004417, 023305, 004171, 021133) kommt
 * Methylphenidat nicht vor. Manche Säureblocker gibt es auch ohne Rezept
 * (Pantozol Control, Nexium Control: „Apothekenpflichtig“, jeweils Abschnitt
 * 11). Wie oft beide aus verschiedenen Praxen kommen, sagt keine Quelle – das
 * stand hier bis zur Fassung 29 und ist gestrichen.
 *
 * DIE STUFEN – sie bestimmen nur die Reihenfolge und ob die Karte auf „Tag"
 * steht; wie wichtig ein Paar für jemanden ist, sagen sie nicht.
 *
 *   A  ein Paar, das die Fachinformation unter den Gegenanzeigen führt (W1),
 *      oder eines, bei dem es so sein könnte, weil die Form fehlt (W1u). Die
 *      Karte auf „Tag" zeigt es, bis es gelesen ist.
 *   B  eine Frage, die sich in Apotheke oder Praxis klären lässt:
 *      Methylphenidat in einer anderen Form als der Kapsel mit zweierlei
 *      Kügelchen zusammen mit einem Säureblocker (W3, W4) – die
 *      Fachinformationen dieser Präparate nennen Säureblocker nicht (Ritalin
 *      LA 010445, Ritalin Adult 015153, Ritalin 002958, Medikinet Tabletten
 *      002039, Kinecteen 021528, Methylphenidat-HCl-ratiopharm Retardtabletten
 *      022094, jeweils 4.5), der Hinweis behauptet deshalb keine Veränderung
 *      (KLAER_SATZ in js/mittel.js); dazu die Paare, bei denen die
 *      Fachinformation eine Veränderung beschreibt (W5, W6).
 *   C  die übrigen Paare, die die Fachinformation unter den Wechselwirkungen
 *      nennt, ohne Häufigkeit und nicht unter den Gegenanzeigen (W8, W9;
 *      W10 und W11 nach „Berichten mit Hinweisen“), oder eines, das nur die
 *      US-Fassung ausdrücklich nennt (W7: Triptane). Fassung 30: Bis hierher
 *      hieß C „selten oder nur in der US-Fassung“ – eine Häufigkeit nennt aber
 *      keine der Quellen, und W9 steht auch in der deutschen Fachinformation.
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
 *
 * Das Muster erkennt Namen, es behauptet nicht, dass sie alle denselben Stoff
 * bezeichnen. Belegt ist: Natriumhydrogencarbonat heißt in
 * Gebrauchsinformationen auch Natriumbicarbonat (GI Natriumhydrogencarbonat
 * 8,4 % B. Braun, Stand 07.2014, Wiedergabe medikamio, Abschnitt 6: „Der
 * Wirkstoff ist Natriumhydrogencarbonat (Natriumbicarbonat).“), und Original
 * Bullrich Salz enthält als Wirkstoff Natriumhydrogencarbonat (GI, 08/2023,
 * medikamio). „Natron“ allein ist im Alltag nicht eindeutig, und andere
 * Bullrich-Produkte sind nicht geprüft.
 */
const W_NATRON = /natron|natriumhydrogencarbonat|natriumbicarbonat|bullrich/;
const W_VITC = /vitamin[\s-]*c\b|ascorbin/;
const W_METAMIZOL = /metamizol|novalgin|novaminsulfon/;
// Nur, was die Fachinformation von Atomoxetin unter den CYP2D6-Hemmern nennt
// (Atomoxetin-ratiopharm, www.fachinfo.de/fi/pdf/022556, September 2024, 4.5:
// „SSRIs (z. B. Fluoxetin, Paroxetin), Chinidin, Terbinafin“; Terbinafin
// erkennt das Muster bisher nicht). Bupropion steht dort nicht unter diesen
// Hemmern – wohl aber unter den Mitteln, die die Krampfschwelle herabsetzen
// können; dieses Paar bildet Body Check nicht ab.
const W_CYP2D6 = /fluoxetin|paroxetin|chinidin/;
// Trizyklika und SSRI: „einigen Antidepressiva (trizyklische Antidepressiva und
// selektive Serotonin-Wiederaufnahme-Inhibitoren)“, deren Metabolismus
// Methylphenidat laut Berichten hemmen kann (FI Ritalin 10 mg,
// www.fachinfo.de/fi/pdf/002958, September 2025, 4.5). Das Muster trifft auch
// Escitalopram, ebenfalls ein SSRI; nicht jedes Mittel dieser Gruppen steht darin.
const W_TRIZ_SSRI = /amitriptylin|nortriptylin|imipramin|clomipramin|doxepin|trimipramin|citalopram|sertralin|fluoxetin|paroxetin/;
const W_CUMARIN = /phenprocoumon|marcumar|falithrom|warfarin/;

/*
 * Was hier als Mittel gegen Magensäure zählt. Die Fachinformationen von
 * Medikinet retard und Medikinet adult (4.3/4.5) nennen H2-Blocker,
 * Protonenpumpenhemmer und Antazida, die Packungsbeilagen „säurebindende“
 * Mittel; Natron (Natriumhydrogencarbonat) ist ein solches Mittel (Original
 * Bullrich Salz, GI 08/2023: „ein Arzneimittel zur Neutralisierung der
 * Magensäure“). Alginate nennen sie nicht eigens: Gaviscon Dual ist laut
 * Packungsbeilage „eine Kombination aus einem Alginat und zwei Antazida“
 * (GI 01/2020, Wiedergabe medikamio), Gaviscon Advance beschreibt eine
 * Schutzschicht, deren Wirkung „physikalischer Natur“ ist (GI 08/2021). Die
 * Gruppe 'alginat' bleibt deshalb hier, aber die Karten sagen bei ihr dazu,
 * dass die Fachinformation Alginate nicht nennt (W_ALGINAT_SATZ unten).
 */
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
 *
 * Mit `heute` zählt für ein Mittel, das gerade eingetragen ist (unter „Meine
 * Mittel" oder in den letzten WECHSEL_TAGE Tagen eingenommen, wie bei den
 * Paaren), nur eine Form aus diesen Tagen vor „Meine Mittel"; eine ältere
 * nicht. Eine Hülle von vor einem halben Jahr sagt nichts über die Packung
 * von heute – sie stäche sonst die Wahl, zu der die Karte W1u rät, und der
 * Hinweis der Stufe A fehlte. Sagt die jüngste Einnahme dieser Tage nichts
 * zur Form und steht unter „Meine Mittel" die Kapsel mit zweierlei
 * Kügelchen, gilt sie auch vor einer anderen Form aus diesen Tagen: im
 * Zweifel die Form, zu der die Fachinformation die Gegenanzeige nennt.
 * Ein Mittel, das gerade nicht eingetragen ist, behält die Form seines
 * letzten Eintrags – sie beschreibt, was damals genommen wurde. Ohne `heute`
 * (die Rechnungen über das ganze Tagebuch) gilt die zuletzt eingetragene Form.
 */
export function formZu(name, standardMittel = [], eintraege = [], heute = null) {
  const k = wKlein(name);
  if (!k) return 'unbekannt';
  const bekannt = (form) => !!form && form !== 'unbekannt';
  const eigene = (eintraege || [])
    .filter((e) => e && e.art === 'medikament' && wKlein(e.mittel) === k)
    .sort((a, b) => (a.am === b.am ? wMinuten(a.um) - wMinuten(b.um) : (a.am < b.am ? -1 : 1)));
  const letzteForm = (liste) => {
    const mit = liste.filter((e) => bekannt(e.form));
    return mit.length ? mit[mit.length - 1].form : null;
  };
  const meine = (standardMittel || []).filter((m) => m && wKlein(m.mittel) === k);
  const gemerkt = meine.find((m) => bekannt(m.form));
  if (heute) {
    const ab = wVorTagen(heute, WECHSEL_TAGE - 1);
    const neu = eigene.filter((e) => e.am >= ab && e.am <= heute);
    if (neu.length || meine.length) {
      const juengste = neu[neu.length - 1];
      if (gemerkt && gemerkt.form === 'pellet' && juengste && !bekannt(juengste.form)) return 'pellet';
      return letzteForm(neu) || (gemerkt && gemerkt.form) || formAusName(name) || 'unbekannt';
    }
  }
  return letzteForm(eigene) || (gemerkt && gemerkt.form) || formAusName(name) || 'unbekannt';
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
 * Die Texte. Jeder hat seine Quelle; was sich nicht belegen ließ, fehlt.
 *
 * Nicht dabei, und warum (Fassung 30 – vorher hieß es, das sei nicht zu
 * belegen, und das stimmte nicht):
 *   * Antazida und Alginat bei Dexamfetamin (W5): Die Attentin-Fachinformation
 *     (www.fachinfo.de/fi/pdf/020945, August 2024, 4.5) nennt unter den
 *     „Stoffe[n], die den pH-Wert im Gastrointestinaltrakt erhöhen“ nur
 *     Natriumbicarbonat beim Namen; W5 greift deshalb nur bei Natron.
 *   * Vitamin C bei Dexamfetamin: Dieselbe Stelle nennt Ascorbinsäure und
 *     Fruchtsaft unter den Stoffen, die „zu einer verminderten Aufnahme von
 *     Dexamfetamin“ führen. Als Paar steht das hier nicht – eine Auswahl,
 *     kein fehlender Beleg.
 *   * Bupropion bei Atomoxetin: Die Atomoxetin-Fachinformation
 *     (www.fachinfo.de/fi/pdf/022556, September 2024, 4.5) nennt Bupropion nicht
 *     unter den CYP2D6-Hemmern, die den Atomoxetin-Spiegel erhöhen (W9), wohl
 *     aber unter den Mitteln, „die die Krampfschwelle herabsetzen können“.
 *     Auch dieses Paar bildet Body Check nicht ab.
 */

/*
 * W1 und W1u – Quellen: Medikinet retard FI, www.fachinfo.de/fi/pdf/009621
 * (Dezember 2025), 4.3 („Bekannte ausgeprägte Anazidität des Magens mit einem
 * pH-Wert über 5,5, bei H2-Rezeptorenblockern, Protonenpumpen-Inhibitoren oder
 * Antazidatherapie“) und 4.5 („darf nicht zusammen mit H2-Rezeptorenblockern,
 * Protonenpumpen-Inhibitoren oder Antazida eingenommen werden, da es dabei zu
 * einer rascheren Freisetzung der gesamten Wirkstoffmenge kommen kann“);
 * Medikinet adult FI, www.fachinfo.de/fi/pdf/013066 (September 2025), 4.3 und
 * 4.5 sinngleich (dieselben drei Gruppen, „rascheren Freisetzung der gesamten
 * Wirkstoffmenge“); Rote Liste 19655-1; Gebrauchsinformation Medikinet adult,
 * patienteninfo-service.de/gi/14524/ (September 2025), Abschnitt 2: als eigener
 * Punkt unter „darf nicht eingenommen werden“ Arzneimittel, „um die Sekretion
 * von Magensäure zu vermindern oder eine starke Übersäuerung des Magens zu
 * behandeln (H2-Rezeptorenblocker, säurebindende Mittel oder
 * Protonenpumpenhemmern)“.
 *
 * Unter den Gegenanzeigen steht also ausdrücklich die Behandlung mit diesen
 * Mitteln, nicht nur ein Magen ohne Säure; die Karte sagt es deshalb so und
 * nicht milder. Sie nennt die Gruppen beim Namen, wie die Fachinformation,
 * und die beiden Präparate, denn andere Kapseln mit zweierlei Kügelchen
 * (Ritalin LA, 010445) nennen Säureblocker nicht. „In einem weniger sauren
 * Magen kann der Wirkstoff früher frei werden“ stand bis zur Fassung 29 da;
 * die Quelle verbindet die raschere Freisetzung mit der Einnahme zusammen mit
 * diesen Mitteln.
 *
 * Wie ${b} beschrieben wird: als Mittel bei Säurebeschwerden. PPI und
 * H2-Blocker verringern die Magensäure, Antazida und Natron binden sie (GI
 * 14524: „zur Verringerung der Magensäurebildung oder gegen Übersäuerung des
 * Magens“; GI Original Bullrich Salz, 08/2023: „zur Neutralisierung der
 * Magensäure … bei Sodbrennen und säurebedingten Magenbeschwerden“), Alginate
 * werden angewendet bei „Beschwerden durch Rückfluss von saurem Mageninhalt“
 * (GI Gaviscon Advance, 08/2021) und verhindern, „dass die im Magen benötigte
 * Magensäure in die Speiseröhre aufsteigt“ (GI Gaviscon Liquid, 05/2022). Bis
 * zur Fassung 29 hieß es für alle „ein Mittel gegen oder gegen zu viel
 * Magensäure“ – für ein Alginat traf das nicht zu. Kurz gehalten, weil die
 * Karte W1u auf kleinen Bildschirmen nicht höher werden soll als bisher
 * (tests/test-rueckfrage.mjs prüft, was danach unter der Meldung liegt).
 */
const W_MITTEL_SATZ = 'ein Mittel bei Säurebeschwerden';

/*
 * Bei einem Alginat (Gruppe 'alginat' in js/mittel.js) sagt die Karte dazu,
 * dass die Fachinformation es nicht nennt – sonst stünde da mehr, als die
 * Quelle hergibt. Dass manche Alginat-Präparate auch Antazida enthalten:
 * GI Gaviscon Dual (siehe W_SAEURE_GRUPPEN oben).
 */
const W_ALGINAT_SATZ = (b) => 'Alginate nennt die Fachinformation nicht eigens; manche '
  + 'Alginat-Präparate enthalten laut Packungsbeilage auch Antazida. Ob das für '
  + `${b} gilt, kann die Apotheke sagen. `;

const wKarteW1 = (b, alginat = false) => 'Zum Nachfragen: In deinen Mitteln stehen Methylphenidat als Kapsel '
  + `mit zweierlei Kügelchen und ${b}, ${W_MITTEL_SATZ}. In der Fachinformation solcher `
  + 'Kapseln (Medikinet retard, Medikinet adult) steht die Behandlung mit H2-Blockern, '
  + 'Protonenpumpenhemmern oder Antazida unter den Gegenanzeigen: Zusammen damit kann die '
  + `gesamte Wirkstoffmenge rascher frei werden. ${alginat ? W_ALGINAT_SATZ(b) : ''}`
  + `Bitte nichts davon eigenmächtig weglassen – auch ${b} nicht – und es zeitnah in der `
  + 'Praxis oder Apotheke ansprechen.';

/*
 * „Welche Form du hast, steht auf der Packung“ stand hier bis zur Fassung 29.
 * Auf der Verpackung steht der Markenname (gesund.bund.de,
 * arzneimittel-beipackzettel, Stand 17.02.2026: „der Markenname, der auf der
 * Verpackung steht“), und die Bezeichnung nennt die Darreichungsform – aber
 * nicht immer die Form, wie diese App sie einteilt: Medikinet retard, Ritalin
 * LA und Equasym Retard heißen alle „Hartkapseln mit veränderter
 * Wirkstofffreisetzung“ (FI 009621, 010445, 012100, jeweils Abschnitt 1).
 * Deshalb verweist die Karte für die Form an die Apotheke.
 */
const wKarteW1u = (a, b, alginat = false) => `Zum Nachfragen: In deinen Mitteln stehen Methylphenidat (${a}) `
  + `und ${b}, ${W_MITTEL_SATZ}. Bei manchen Kapseln (Medikinet retard, Medikinet adult) `
  + 'steht die Behandlung mit H2-Blockern, Protonenpumpenhemmern oder Antazida in der '
  + `Fachinformation unter den Gegenanzeigen. ${alginat ? W_ALGINAT_SATZ(b) : ''}Welche Form `
  + 'dein Präparat hat, weiß die Apotheke; du kannst sie bei deinem Mittel unter „Meine '
  + 'Mittel“ angeben. '
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
 * (Revised 09/2025), 2.6: „Acidifying agents (e.g., ascorbic acid) decrease
 * blood levels, while alkalinizing agents (e.g., sodium bicarbonate) increase
 * blood levels“ (gemeint: „blood levels of amphetamine“); 5.7: Serotoninsyndrom
 * mit anderen serotonergen Mitteln, darunter „triptans“. Gemeint ist also der
 * Blutspiegel des Amfetamins, das aus der Vorstufe entsteht: Lisdexamfetamin
 * wird laut US-Fachinformation (12.3) und Fachinformation Elvanse
 * (www.fachinfo.de/fi/pdf/020737, Oktober 2026, 5.1) „primär von den
 * Erythrozyten zu Dexamfetamin hydrolysiert“. Bis zur Fassung 29 stand hier
 * zusätzlich, der Spiegel der Vorstufe selbst hänge nicht am Urin – das sagt
 * keine der beiden Quellen.
 *
 * W6 steht auch in der deutschen Fachinformation Elvanse (4.5), dort als
 * Ausscheidung und Halbwertszeit: Ascorbinsäure und andere Stoffe, die den
 * Urin ansäuern, „steigern die Ausscheidung von Amfetamin im Urin und
 * verkürzen dessen Halbwertszeit“; Natriumhydrogencarbonat und andere, die ihn
 * alkalisieren, „vermindern die Ausscheidung“. Den Spiegel nennt die US-Fassung,
 * deshalb nennt der Text sie. Triptane (W7) nennt nur die US-Fassung; die
 * deutsche nennt ein Serotonin-Syndrom „selten“ mit SSRI und SNRI.
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
 * www.ema.europa.eu/de/documents/psusa/metamizole-cmdh-scientific-conclusions-and-grounds-variation-amendments-product-information-and-timetable-implementation-psusa-00001997-202003_de.pdf;
 * gleichlautend FI Novalgin Filmtabletten, www.fachinfo.de/fi/pdf/014708
 * (November 2024), 4.5: Metamizol mit Bupropion „kann eine Reduktion der
 * Plasmakonzentration dieser Arzneimittel … bewirken“.
 */
const wTextW8 = 'Laut Fachinformation von Metamizol kann damit der Bupropion-Spiegel sinken – '
  + 'in Praxis oder Apotheke ansprechen.';

/*
 * W9 – Quelle: FI Atomoxetin-ratiopharm Hartkapseln, www.fachinfo.de/fi/pdf/022556
 * (September 2024), 4.5: Bei CYP2D6-Inhibitoren („SSRIs (z. B. Fluoxetin,
 * Paroxetin), Chinidin, Terbinafin“) „ist die AUC von Atomoxetin ca. 6- bis
 * 8-fach … höher“. Die US-Fachinformation Strattera nennt in der Fassung 1/2022
 * (7.2) Paroxetin, Fluoxetin und Chinidin, in der Fassung 6/2026 nur noch
 * Paroxetin und Fluoxetin; bis zur Fassung 29 stand hier nur eine Wiedergabe
 * des US-Labels als Quelle.
 */
const wTextW9 = (b) => `Laut Fachinformation erhöht ${b} den Atomoxetin-Spiegel deutlich – `
  + 'in Praxis oder Apotheke ansprechen.';

/*
 * W10 und W11 – Quelle: Fachinformation Methylphenidat, 4.5, etwa Ritalin 10 mg
 * (www.fachinfo.de/fi/pdf/002958, September 2025) und Methylphenidat-ratiopharm
 * Hartkapseln (/022528, August 2025): „Es liegen jedoch Berichte mit Hinweisen
 * vor, dass Methylphenidat den Metabolismus von Antikoagulanzien vom
 * Cumarin-Typ … und einigen Antidepressiva (trizyklische Antidepressiva und
 * selektive Serotonin-Wiederaufnahme-Inhibitoren) hemmen kann.“
 *
 * Bis zur Fassung 29 stand „Laut Packungsbeilage“ und als Quelle eine alte
 * Gebrauchsinformation von Methylphenidat-ratiopharm 10 mg (Wiedergabe
 * medikamio, ohne Stand), die nur Trizyklika nennt. Die heutigen
 * Packungsbeilagen sprechen nicht vom Abbau, nur davon, dass Methylphenidat
 * die Wirkung anderer Mittel beeinflussen kann.
 */
const wTextW10 = 'Laut Fachinformation gibt es Hinweise, dass Methylphenidat den Abbau mancher '
  + 'Mittel gegen Depression hemmen kann – in Praxis oder Apotheke ansprechen.';
const wTextW11 = 'Laut Fachinformation gibt es Hinweise, dass Methylphenidat den Abbau von '
  + 'Blutverdünnern dieser Art hemmen kann – in Praxis oder Apotheke ansprechen.';

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
    const form = formZu(a.name, standardMittel, eintraege, heute);
    // Nur der Text unterscheidet sich beim Alginat (W_ALGINAT_SATZ), nicht, ob und wo die Karte steht.
    const alginat = b.gruppe === 'alginat';
    if (form === 'pellet') dazu('W1', a, b, wKarteW1(b.name, alginat), W_FRAGE_A);
    else if (form === 'unbekannt') dazu('W1u', a, b, wKarteW1u(a.name, b.name, alginat), W_FRAGE_A);
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

/* ---------- Die Rückfrage auf „Tag" ---------- */

/*
 * Die Formen, bei denen ein Säureblocker einen Hinweis ergibt – dieselben
 * Zweige wie oben in wechselHinweise (pellet → W1, unbekannt → W1u,
 * sodas → W3, sofort und retardtab → W4). Bei der Hülle (oros) und Equasym
 * steht dort nichts; dann wäre die Frage nach dem Säureblocker eine ohne
 * Folge. tests/test-adhs-wissen.mjs prüft je Form, dass beides übereinstimmt.
 */
const W_FORM_MIT_SAEURE = ['pellet', 'unbekannt', 'sodas', 'sofort', 'retardtab'];

/** Ist das ein Mittel gegen Magensäure – so, wie die Paare es zählen? */
export const istSaeureMittel = (name) => wIstSaeure(name);

/*
 * Was die Rückfrage auf „Tag" (js/app.js) unter „Ja" zur Wahl stellt: Namen,
 * die die Erkennung schon kennt – Wirkstoffe und Packungsnamen aus
 * MITTEL_WISSEN (ppi, h2, antazida, alginat) und Natron (W_NATRON). Jeder
 * davon muss istSaeureMittel() sein; tests/test-adhs-wissen.mjs prüft das.
 */
export const SAEURE_WAHL = ['Pantoprazol', 'Pantozol', 'Omeprazol', 'Esomeprazol', 'Nexium',
  'Famotidin', 'Rennie', 'Maaloxan', 'Riopan', 'Talcid', 'Gaviscon', 'Natron'];

/*
 * Der Schlüssel eines Namens für die Rückfrage: klein, auf W_SCHLUESSEL_NAME
 * Zeichen gekürzt und danach noch einmal getrimmt – sonst endete er nach dem
 * Kürzen auf einem Leerzeichen, fiele beim Einlesen weg, und keine Antwort
 * wirkte mehr. js/store.js hat dieselbe Rechnung (dort ohne Import);
 * tests/test-sicherung.mjs prüft, dass beide gleich rechnen.
 */
export const rueckfrageSchluessel = (name) => wKlein(name).slice(0, W_SCHLUESSEL_NAME).trim();

/**
 * Was zu einem eingetragenen Methylphenidat fehlt, damit die Paare oben
 * vollständig sind. Für die Rückfrage auf „Tag".
 *
 * Eingetragen heißt dasselbe wie bei den Paaren (wEingetragen): „Meine
 * Mittel" oder eine Einnahme in den letzten WECHSEL_TAGE Tagen, in derselben
 * Reihenfolge. Je Schlüssel zählt der erste Name, wie beim Entdoppeln der
 * Paare.
 *
 *   form         formZu(name, …, heute)
 *   saeureDa     ein Mittel gegen Magensäure ist eingetragen (wIstSaeure,
 *                also mit Natron). Mit form 'unbekannt' steht dann W1u.
 *   fehltForm    form ist 'unbekannt', und „Weiß ich nicht" steht weder bei
 *                einem eigenen Mittel dieses Namens noch bei seiner jüngsten
 *                Einnahme der letzten WECHSEL_TAGE Tage.
 *   fehltSaeure  !saeureDa und form steht in W_FORM_MIT_SAEURE.
 *
 * Alle Methylphenidat-Namen, auch ohne offene Frage; die Anzeige filtert.
 * Sätze stehen hier keine – was die Karte sagt, steht in js/app.js und
 * stellt nichts Neues fest.
 *
 * @returns {{ name: string, schluessel: string, form: string, saeureDa: boolean,
 *   fehltForm: boolean, fehltSaeure: boolean }[]}
 */
export function mphRueckfragen(standardMittel, eintraege, heute) {
  const namen = wEingetragen(standardMittel, eintraege, heute);
  const saeureDa = namen.some((n) => wIstSaeure(n));
  const ab = wVorTagen(heute, WECHSEL_TAGE - 1);
  const schon = new Set();
  const raus = [];
  namen.filter((name) => wGruppe(name) === 'mph').forEach((name) => {
    const schluessel = rueckfrageSchluessel(name);
    if (!schluessel || schon.has(schluessel)) return;
    schon.add(schluessel);
    const k = wKlein(name);
    const form = formZu(name, standardMittel, eintraege, heute);
    const juengste = (eintraege || [])
      .filter((e) => e && e.art === 'medikament' && wKlein(e.mittel) === k && e.am >= ab && e.am <= heute)
      .sort((a, b) => (a.am === b.am ? wMinuten(a.um) - wMinuten(b.um) : (a.am < b.am ? -1 : 1)))
      .pop();
    const weissNicht = (standardMittel || []).some((m) => m && wKlein(m.mittel) === k && m.form === 'unbekannt')
      || !!(juengste && juengste.form === 'unbekannt');
    raus.push({
      name,
      schluessel,
      form,
      saeureDa,
      fehltForm: form === 'unbekannt' && !weissNicht,
      fehltSaeure: !saeureDa && W_FORM_MIT_SAEURE.includes(form),
    });
  });
  return raus;
}
