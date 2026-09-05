# Bauchbuch

Ein Gesundheitstagebuch mit Schwerpunkt Magen und Verdauung. Man trägt ein, was
man gegessen hat und wie es einem danach ging – dazu Stimmung, Anspannung,
Schlaf, Bewegung und Zyklus. Nach ein paar Wochen zeigt die App, was
zusammenfällt, ordnet das Bild ein und macht daraus einen Zettel für den
nächsten Arzttermin.

**Gesundheitsdaten verlassen dieses Gerät nie.** Es gibt keinen Server, kein
Konto, keine Anmeldung und keine Zählung von Aufrufen. Die Eintragungen liegen
im `localStorage` des Browsers, in dem sie gemacht wurden, und gehen dort nicht
weg. Das Einzige, was diese App je verschickt, sind die Verbesserungsvorschläge
unter „Ideen" – die gehen von selbst hinaus, kurz nachdem sie eingetragen
wurden, und in der App steht das auch. Das ist keine Absichtserklärung, sondern
eine dreifach geprüfte Eigenschaft: siehe [Die Zusage](#die-zusage).

---

## Was die App kann

**Tag.** Fünf Knöpfe: Mahlzeit, Beschwerden, Stuhlgang, Medikament, Notiz.
Eine Mahlzeit bekommt einen freien Text, eine Portionsgröße und angekreuzte
Merkmale aus einer kurzen Liste (Kaffee, Fettiges, Scharfes, Zwiebeln,
Kohlensäure …). Beschwerden bekommen eine Stärke von 0 bis 10, eine oder
mehrere Arten, die Frage nach dem Stuhlgang („danach besser, schlechter,
unverändert?") und eine Notiz. Der Stuhlgang wird über die
**Bristol-Skala** eingetragen – sieben Stufen mit Bild, von harten Klümpchen
bis flüssig. Dazu für den ganzen Tag: Anspannung, Schlaf, Zyklus, und ob die
Beschwerden nachts geweckt haben.

**Verlauf.** Ein Balken je Tag über 14, 30 oder 90 Tage, ein Monatskalender
und vier Zahlen: notierte Tage, Anteil mit Beschwerden, mittlere Stärke,
beschwerdefreie Tage in Folge. Darüber die **Richtung**: die letzten vierzehn
notierten Tage gegen die vierzehn davor – „es wird besser", „es wird
schlechter" oder „kein deutlicher Unterschied". Erst ab einer ganzen Stufe
Unterschied wird überhaupt eine Richtung genannt: Beschwerden schwanken von
selbst, und aus jeder Schwankung eine Richtung zu machen wäre ein Orakel, das
mal grundlos Mut macht und mal grundlos Angst. Verglichen werden *notierte*
Tage, nicht Kalendertage – sonst meldete die App ausgerechnet in der Woche
Besserung, in der es jemandem zu schlecht zum Eintragen war.

**Muster.** Die eigentliche Auskunft, in dieser Reihenfolge – und die
Reihenfolge ist eine Aussage: Warnzeichen, die Einordnung des Bildes, die
**Kriterien** (Rom IV und GerdQ, siehe unten), der **Auslassversuch**, die
Bilanz **nach Wirkweise**, dann die nach einzelnen Zutaten, das **Ansprechen
auf die Mittel**, Tageszeit, Beschwerdeart, Stuhlgang, **was noch fehlt** und
die Zyklusphase. Wer nur die ersten beiden Karten liest, hat trotzdem das
Wichtigste.

**Ruhe.** Vier Atemübungen – 4–7–8, Quadrat, Gleichmaß, Bauchatmung – mit Ton,
damit man die Augen zumachen kann. Der Ton entsteht im Browser aus einem
Oszillator: keine Datei, kein Download, läuft offline. Bei jeder Übung ist das
Ausatmen mindestens so lang wie das Einatmen; umgekehrt täte die Übung das
Gegenteil.

**Noch mal wie letztes Mal.** Beim Eintragen einer Mahlzeit stehen frühere
Mahlzeiten als antippbare Vorlage bereit – und zwar vollständig: Text, Zutaten
samt Rollen, Portion. Die Vorlage kommt vom jüngsten Vorkommen. Das ist der
Unterschied zwischen drei Sekunden und fünfzehn, und er entscheidet mehr als
jede Rechnung im Programm: Das größte Risiko für ein Tagebuch ist nicht ein
Fehler in der Auswertung, sondern dass nach drei Wochen niemand mehr etwas
einträgt.

**Noch mal wie immer.** Auf dem Tagesreiter stehen die zwei bis drei
Mahlzeiten, die es zuletzt am häufigsten gab, als Knopf: ein Tipp, und der
Eintrag steht – mit demselben Namen, denselben Zutaten, derselben Portion und
der jetzigen Uhrzeit. Erst ab dem zweiten Vorkommen; eine Mahlzeit, die es
einmal gab, ist keine Gewohnheit. Und nur für heute: An einem vergangenen Tag
wäre „jetzt" gelogen.

**Ideen.** Ein Zettel für Verbesserungsvorschläge zur App selbst. Wer die App
benutzt, sitzt selten neben dem, der sie baut – deshalb gibt es hier gar
keinen Knopf zu suchen: **Was eingetragen wird, geht von selbst an den, der
die App gebaut hat**, etwa eine Minute später. Die Minute ist Absicht, damit
sich ein Satz noch ausbessern oder zurücknehmen lässt; „Jetzt gleich"
überspringt sie. Das steht so auch in der App, zweimal – wer hier tippt, soll
wissen, dass es gelesen wird. Es geht dabei **nur diese Liste** raus, sonst
nichts (siehe *Die Zusage*). „Anders schicken" nimmt stattdessen das
Teilen-Menü des Geräts, „Kopieren" die Zwischenablage. Ideen stehen neben den
Eintragungen, nicht in ihnen, und tauchen in keiner Auswertung auf.

**Mehr.** Sicherung als JSON-Datei und zurück – **wahlweise mit Passwort
verschlüsselt** (siehe unten) –, der Bericht für den Arzttermin, die
**Arzttermine** selbst, die Übersicht „Was die Mittel bewirken", seit wann die
Beschwerden bestehen, die Einstellungen der Auswertung, welche Tagesfragen
erscheinen sollen, eigene Auslöser, Ton, vier Farbvarianten.

### Die Sicherung mit Passwort

Der wundeste Punkt dieser App hatte nie mit Medizin zu tun: Die Sicherung war
eine offene JSON-Datei im Download-Ordner. Ein Tagebuch über den Körper eines
Menschen, im Klartext, auf einem Gerät, das man verleiht, verliert oder
irgendwann verkauft. Alles andere hier ist gegen Übertragung geschützt – und
die einzige Kopie lag frei herum.

Verschlüsselt wird im Browser selbst, mit dem, was er mitbringt: **PBKDF2** mit
250 000 Runden macht aus dem Passwort einen Schlüssel und ist dabei absichtlich
langsam, **AES-GCM** verschlüsselt und versiegelt in einem – wer an der Datei
etwas ändert, bekommt sie nicht mehr auf, statt stillschweigend Unsinn zu
entschlüsseln. Keine Bibliothek, kein Netz: `tools/pruefung/keine-leitung.py`
bleibt zufrieden.

Zwei Ehrlichkeiten stehen dazu in der App selbst:

* **Passwort vergessen heißt Sicherung weg.** Keine Hintertür, kein
  Zurücksetzen, niemand zum Fragen – das ist der Preis dafür, dass es auch für
  alle anderen keine gibt.
* **Ohne sichere Adresse gibt es das nicht.** `crypto.subtle` gibt der Browser
  nur über https oder auf dem eigenen Rechner frei; die Ein-Datei-Fassung aus
  dem Download-Ordner (`file://`) hat das nicht. Dort steht kein Knopf, der
  nichts täte, sondern ein Satz, der sagt warum – und die offene Sicherung
  bleibt erreichbar, denn gar keine wäre schlimmer als eine offene.

Beim Einlesen erkennt die App an der Datei, ob sie verschlüsselt ist, und fragt
erst dann nach dem Passwort. Ein falsches Passwort ändert nichts am Tagebuch.

### Der Bericht seit dem letzten Termin

„Letzte 30 Tage" ist eine runde Zahl, die niemanden interessiert. Was in der
Sprechstunde besprochen wird, ist die Zeit seit dem letzten Mal – und niemand
rechnet die im Kopf aus. Unter „Mehr" lassen sich Arzttermine eintragen (nur
das Datum, mehr braucht es nicht); dann deckt der Bericht genau die Zeit seit
dem jüngsten davon ab und sagt das in seinem Kopf auch. Die Richtung rechnet
dabei nicht heimlich von davor mit: Sie bleibt im Zeitraum, oder sie fehlt.

### Schon geprüft

Ein abgeschlossener Auslassversuch lässt sich abhaken **und behalten**. Er
steht danach in einer eigenen Liste und im Bericht – auch und gerade der, der
*dagegen* sprach. Ohne dieses Gedächtnis schickt die nächste Sprechstunde
denselben Verdacht noch einmal los, und ein Versuch, der nichts ergab, hat
genauso viel Arbeit gekostet wie einer, der etwas ergab. Die Zahlen werden bei
jeder Anzeige neu gerechnet statt eingefroren, damit dort nichts steht, was
nicht mehr zum Tagebuch passt.

### Vorschläge für heute

Auf dem Tagesreiter steht, was für heute naheliegt: worauf sie heute eher
verzichten würde, ob Bewegung gerade intensiv oder moderat sinnvoll ist, ob
eine Atemrunde ansteht. Jeder Vorschlag trägt sein **warum** sichtbar mit sich
und die Angabe, woher es kommt:

* **aus deinem Verlauf** – aus den eigenen Eintragungen gerechnet, mit den
  Zahlen daneben („nach 12 Mahlzeiten mit Kaffee im Mittel 7,0 statt 0,0").
* **allgemein** – gilt für einen Durchschnitt, den es nicht gibt. Sticht der
  eigene Verlauf.

Ein Rat ohne Begründung ist ein Befehl, und Befehle über das eigene Essen
befolgt man blind oder gar nicht. Beides ist schlecht.

**Was hier nicht vorkommt: welches Medikament sie nehmen soll.** Diese Wahl
hängt an Diagnose, anderen Mitteln, Nieren, Leber, Schwangerschaft – nichts
davon weiß die App, und keines davon kann sie erfragen, ohne so zu tun, als
wüsste sie es dann. Was stattdessen kommt: was sie selbst eingenommen hat, wann
zuletzt, was es bewirkt, und die Frage dazu für den nächsten Termin.

### Wie weit Richtung Diagnose

So weit, wie ein Tagebuch ehrlich kommt – und keinen Schritt weiter.

Nicht weiter, weil weiter geraten wäre: Gastritis, Magengeschwür,
Refluxkrankheit, funktionelle Dyspepsie und ein Reizdarm machen im Tagebuch
teils dasselbe Bild. Auseinander hält sie eine Magenspiegelung, ein Test auf
Helicobacter, ein Blutbild, ein Atemtest. Eine App, die sich trotzdem für eine
entscheidet, nimmt der Untersuchung ihre Frage weg.

Was `js/bild.js` stattdessen liefert:

1. **Warnzeichen.** Blut erbrochen, schwarzer Stuhl, Schluckstörung,
   ungewollter Gewichtsverlust, nächtliches Aufwachen, Schmerz mit Ausstrahlung
   in Arm oder Kiefer. Sie werden im Beschwerde- *und* im Stuhlbogen
   angekreuzt – die zwei wichtigsten stehen dort, nicht hier –, tauchen in
   keiner Statistik auf und stehen im Reiter „Muster" wie im Bericht ganz oben,
   mit `sofort` oder `zeitnah`. Ohne Schwelle: Ein einziges Mal ist ein
   einziges Mal zu viel.
2. **Muster mit Belegen.** Säuretypisch, Nüchternschmerz, Völlegefühl nach dem
   Essen, darmbetont, Zusammenhang mit Schmerzmitteln, zyklusgebunden,
   anspannungsgebunden. Jedes nennt seine Belege mit Zahlen – „14 von 14
   zuordenbaren Beschwerden kamen erst vier Stunden nach der letzten Mahlzeit".
   Angezeigt wird nur, was mindestens zwei Belege hat.
3. **Was dahinterstecken kann und was es unterscheidet.** Also welche
   Untersuchung welche Frage beantwortet – die nützlichste Zeile des
   Programms.
4. **Fertige Fragen für den Termin.**

#### Die Kriterien: Rom IV und GerdQ

`js/kriterien.js` geht einen Schritt weiter als eine Beschreibung und rechnet
die Regelwerke nach, mit denen in der Sprechstunde tatsächlich eingeordnet
wird. Sie bestehen aus nichts als Beschwerden und Zeiträumen – also genau aus
dem, was in einem Tagebuch steht.

* **Rom IV, Reizdarmsyndrom.** Bauchschmerz im Mittel mindestens einmal pro
  Woche, verbunden mit mindestens zwei von drei Merkmalen: Zusammenhang mit dem
  Stuhlgang, Änderung der Häufigkeit, Änderung der Form. Dazu der Typ –
  Verstopfung, Durchfall, gemischt – aus der Verteilung der Bristol-Stufen.
* **Rom IV, funktionelle Dyspepsie**, getrennt nach ihren beiden Formen: PDS
  (Völlegefühl und frühes Sattsein, mindestens drei Tage die Woche) und EPS
  (Schmerz oder Brennen im Oberbauch, mindestens einen Tag die Woche). Sie
  werden verschieden behandelt.
* **GerdQ.** Sechs Fragen zu den letzten sieben Tagen, 0 bis 18 Punkte, ab 8
  gilt eine Refluxkrankheit als wahrscheinlich. Zwei der sechs zählen
  *umgekehrt*: Oberbauchschmerz und Übelkeit sprechen eher gegen Reflux. Das
  ist kein Fehler, das ist der Trick des Fragebogens – er misst nicht, wie
  schlecht es jemandem geht, sondern wie typisch das Muster ist.

Drei Dinge stehen dabei, jedes Mal:

1. **Erfüllte Kriterien sind keine Diagnose.** Beide Regelwerke setzen
   ausdrücklich voraus, dass nichts Organisches dahintersteckt – und das weiß
   nur eine Untersuchung. „Erfüllt" heißt: Wenn Spiegelung und Blutbild
   unauffällig sind, passt dieser Name. Weniger als eine Diagnose, mehr als ein
   Gefühl – und genau der Satz, mit dem sich ein Termin anfangen lässt.
2. **Ein Tagebuch untererfasst.** Der GerdQ wird sonst gefragt, hier wird
   gezählt; wer einen Tag nicht einträgt, hat laut Tagebuch nichts gehabt. Jede
   Punktzahl ist eher zu niedrig als zu hoch – sie ist eine Untergrenze.
3. **Was nicht prüfbar ist, wird nicht behauptet.** Reicht der Zeitraum nicht
   oder fehlen die Vergleichstage, steht „noch nicht prüfbar" da und daneben,
   was fehlt. Auch im Bericht: Ein Regelwerk stillschweigend wegzulassen sieht
   auf Papier aus wie „trifft nicht zu", und das ist etwas anderes.

Die eine Angabe, die aus dem Tagebuch grundsätzlich nicht hervorgeht, wird
gefragt: **seit wann** die Beschwerden bestehen. Ein Tagebuch beginnt an dem
Tag, an dem jemand anfängt zu schreiben, und das ist fast nie der Tag, an dem
es angefangen hat.

#### Der Auslassversuch

Alles andere in dieser App zählt, was ohnehin passiert. Das hat eine harte
Grenze: Wer an schlechten Tagen anders isst, findet sein Essen auffällig, ohne
dass es damit zu tun hätte. Aus Beobachtung wird kein Beweis, egal wie lange
man beobachtet.

`js/versuch.js` dreht das um. Man lässt etwas weg – und isst es danach
**bewusst wieder**. Erst diese zweite Hälfte entscheidet: Nach zwei Wochen ohne
irgendwas geht es fast jedem besser, weil der Sommer kommt oder der Stress
nachlässt. Kommen die Beschwerden mit der Wiedereinführung zurück, ist das
schwer anders zu erklären.

Vorgeschlagen wird, was in der Bilanz auffällt, **Klassen vor einzelnen
Zutaten**: Hinter „Zwiebel" steckt fast immer die ganze Klasse, und wer nur die
Zwiebel weglässt, isst die übrigen Fruktane weiter und lernt nichts. Der Stand
steht täglich auf dem Tagesreiter, samt dem Knopf für die Wiedereinführung –
hier versandet so ein Versuch sonst.

Das Ergebnis nennt drei Zahlen (davor, ohne, danach) und ist zurückhaltend:

* Nur besser, aber nicht zurückgekommen → **unklar**, mit den möglichen
  Erklärungen, statt eine davon zu wählen.
* Steht das Weggelassene in der Auslasszeit doch im Tagebuch → **nicht
  auswertbar**. Ohne Vorwurf, aber auch ohne günstiges Ergebnis.
* Unter fünf notierten Tagen je Seite → **zu wenige Tage**.

Dabei steht jedes Mal der Vorbehalt: ein einziger Mensch, keine Verblindung,
keine Kontrolle. Wer weiß, dass er heute die Milch weglässt, erwartet auch,
dass es besser wird. Der stärkste Hinweis, den ein Tagebuch hergibt – und kein
Nachweis.

#### Ob die Mittel etwas bewirken

Sie trägt ein, was sie nimmt, und niemand rechnet nach. `js/ansprechen.js`
vergleicht die Beschwerdestärke unter einem Mittel gegen einen gleich langen
Zeitraum davor.

Der interessante Fall ist nicht die Besserung, sondern ihr Ausbleiben: Ein
Säureblocker, der nach vier bis acht Wochen nichts geändert hat, spricht gegen
die Säure als Ursache – und damit für eine funktionelle Störung oder für etwas,
das noch nicht gefunden wurde. Das ist eine der wenigen Stellen, an denen ein
Tagebuch eine Untersuchung ersetzt.

Was hier trotzdem nicht passiert: kein „nimm mehr", kein „setz es ab", kein
„wechsle das Präparat". Ein Säureblocker wird nach längerer Einnahme nicht von
einem Tag auf den anderen weggelassen – der Magen antwortet dann mit mehr Säure
als vorher. Und eine Besserung wird nicht als Beweis verkauft: Man fängt ein
Mittel meistens an, *weil* es gerade besonders schlecht ist.

#### Was noch fehlt

`js/luecken.js` sagt, was die App **nicht** sieht – bei einem Tagebuch die
nützlichere Hälfte. Zwei Sorten, streng getrennt, weil sie verschiedene
Schlüsse verlangen:

1. **Lücken im Tagebuch.** Offen, weil etwas nicht eingetragen wurde: kein
   Stuhlgang, kein „seit wann", zu wenige notierte Tage, eine abgeschaltete
   Tagesfrage, Mahlzeiten ohne angekreuzte Zutat. Mit der Angabe, wie viel noch
   fehlt, das Gewichtigste zuerst. Was erledigt ist, verschwindet.
2. **Lücken, die keine App schließt.** Zehn Möglichkeiten – Helicobacter,
   Geschwür, Reflux, funktionelle Dyspepsie, Reizdarm, Laktose/Fruktose,
   Zöliakie, Gallensteine, Schmerzmittelschaden, Blutarmut –, je mit dem, was
   im Tagebuch dafür spricht, was dagegen, was offen bleibt, der Untersuchung,
   die es entscheidet, und einem **fertigen Satz zum Vorlesen**.

Keine Reihenfolge nach Wahrscheinlichkeit. Oben steht, wozu das Tagebuch am
meisten zu sagen hat, nicht, was am ehesten zutrifft – ein Unterschied, dessen
Verwischung Leute in die falsche Sprechstunde schickt.

Der Zyklus wird aus den eingetragenen Blutungstagen gerechnet, nicht
vorhergesagt. Ohne abgeschlossenen Zyklus gibt es keine mittlere Länge und
damit keine Phasen; 28 Tage still anzunehmen wäre bequem und bei jedem, dessen
Zyklus 24 oder 34 Tage dauert, durchgehend falsch. **Nicht zur Verhütung
geeignet** – der Eisprung wird hier nicht gemessen, sondern geschätzt.

### Was die Mittel bewirken

Wer Magenbeschwerden hat, hat bald mehrere Schachteln im Schrank, und die
Beipackzettel beantworten selten die Frage, die man wirklich hat: Was macht das
eigentlich, und warum ausgerechnet vor dem Frühstück? `js/mittel.js` beschreibt
neun Wirkstoffgruppen – von Protonenpumpenhemmern über Antazida bis zur
Helicobacter-Behandlung – in ganzen Sätzen: wie sie arbeiten, wann man sie
üblicherweise nimmt, worauf zu achten ist. Unter „Mehr" stehen zuerst die
Mittel, die tatsächlich eingetragen wurden, mit Häufigkeit und Erklärung; beim
Eintragen erscheint die Erklärung gleich im Bogen.

Dazu gehören zwei Gruppen, die keine Magenmittel sind: entzündungshemmende
Schmerzmittel und Kortison. Eine Übersicht über Magenmittel, in der das fehlt,
was den Magen erst reizt, ist die halbe Wahrheit – und die gefährlichere Hälfte.

Drei Regeln hält der Text ein, und `tests/test-mittel.mjs` zählt sie nach:
**keine Dosierungen**, **keine Empfehlung** („nimm", „hilft gegen" kommen
nirgends vor), und der Verweis auf Ärztin oder Apotheke steht sichtbar darüber.

## Wie die Auswertung rechnet – und was sie nicht behauptet

Verglichen wird die mittlere Beschwerdestärke in den *n* Stunden nach
Mahlzeiten **mit** einem Merkmal gegen alle **übrigen** Mahlzeiten. Also nicht
gegen null, sondern gegen den eigenen Alltag: Sonst wäre bei jedem Menschen mit
täglichen Beschwerden jedes Lebensmittel „auffällig", das er täglich isst.

Drei Regeln halten das davon ab, Kaffeesatzleserei zu werden:

1. **Fallzahl.** Ein Merkmal erscheint erst mit mindestens fünf Mahlzeiten
   dafür *und* fünf dagegen (einstellbar). Darunter steht es unter „Zählt
   noch", mit der Angabe, wie viele fehlen.
2. **Die Zahlen stehen daneben.** Immer beide Mittelwerte, beide Fallzahlen,
   beide Quoten – auch wenn sie unbequem sind.
3. **Es heißt „auffällig", nicht „verursacht".** Ab einem Punkt Unterschied
   „möglicherweise", ab zwei „auffällig". Darunter: kein Unterschied.

Was dabei herauskommt, ist eine Häufigkeit. Die App stellt keine Diagnose und
ersetzt keine ärztliche Beratung.

### Liegt es wirklich daran?

Der Vergleich oben kann nicht wissen, *warum* jemand isst, was er isst. Kaffee
gibt es an Arbeitstagen, und Arbeitstage sind die angespannten. Verschlechtert
Anspannung den Bauch, sieht der Kaffee schuldig aus, ohne es zu sein – und wer
ihn daraufhin streicht, isst fortan einseitiger und hat nichts gewonnen.

Jeder Fund wird deshalb ein zweites Mal gerechnet, aber **innerhalb**
vergleichbarer Tage: nur ruhige gegen ruhige, nur angespannte gegen
angespannte, dasselbe für Schlaf und für die Blutung. Vier Urteile sind
möglich:

| | |
| --- | --- |
| **hält stand** | in jeder prüfbaren Schicht derselbe Unterschied – das spricht fürs Essen |
| **nur unter Umständen** | auffällig nur an angespannten Tagen, sonst nicht – eher die Umstände, oder beides zusammen |
| **verschwindet** | unter gleichen Umständen bleibt nichts übrig – der Verdacht kam vom Zusammenfallen |
| **nicht prüfbar** | dafür reichen die Daten nicht |

Das kostet Fallzahl, und deshalb sind die Bedingungen streng: Jede Schicht
braucht auf **beiden** Seiten mindestens vier Mahlzeiten, es müssen mindestens
**zwei** Schichten prüfbar sein, und Schichten zählen nur im Paar – wer nie
eine Blutung einträgt, bei dem ist „außerhalb der Blutung" keine Auskunft,
sondern der ungeschichtete Vergleich unter anderem Namen. Reicht das nicht,
steht dort „nicht prüfbar" und kein abgeschwächtes Urteil.

Im Arztbericht hat das Folgen: Ein Fund, dessen Unterschied unter gleichen
Umständen verschwindet, steht **nicht** unter „auffällig", sondern in einem
eigenen Abschnitt darunter. Verschwiegen wird er nicht – sonst kommt derselbe
Verdacht in der nächsten Sprechstunde ungeprüft wieder.

Die Schichtung schwächt übrigens nicht nur ab, sie kann einen Befund auch
*erzeugen*: Wer an ruhigen Tagen selten und an Stresstagen viel Kaffee trinkt,
bei dem kann sich die Wirkung im Gesamtschnitt fast aufheben und erst innerhalb
der Schichten sichtbar werden. Beides ist derselbe Rechenfehler – das
Simpson-Paradox – nur in verschiedene Richtungen.

### Wie lange nach dem Essen

Das feste Fenster von vier Stunden ist eine Konvention, keine Physiologie – und
es wirft die nützlichste Auskunft weg, die in einem Tagebuch steckt: *wann
genau*. Der Bauch braucht Zeit, und je nach Ort verschieden lange.

| | |
| --- | --- |
| **0–2 Stunden** | Der Magen ist noch voll: Säure, Dehnung, Entleerung |
| **2–4 Stunden** | Dünndarm, Fett, Galle |
| **4–8 Stunden** | Erst jetzt ist der Rest im Dickdarm. Was dort vergärt – FODMAP, Laktose, Ballaststoffe – kann sich gar nicht früher melden |

Für die Sprechstunde ist das ein Unterschied ums Ganze: „nach dem Essen tut es
weh" führt zum Säureblocker, „sechs Stunden nach dem Essen tut es weh" zur
Ernährungsberatung. Beides steht im selben Tagebuch.

Daraus folgt auch der wichtigste Zusatz: Ein Auslöser, der erst nach sechs
Stunden wirkt, ist im Vier-Stunden-Fenster nicht etwa schwach auffällig –
er kommt dort **gar nicht vor**. Deshalb gibt es „Erst später auffällig" als
eigene Karte und einen eigenen Abschnitt im Bericht. Gesucht wird dort
ausdrücklich **nur** jenseits des eingestellten Fensters: Ein früher
Schwerpunkt wäre der Bilanz ohnehin aufgefallen, und ihn ein zweites Mal zu
melden hieße, dieselbe Zahl zweimal zu zählen.

**Und der Preis, der dabei genannt wird.** Wer dreimal am Tag isst, dessen
Beschwerde vier Stunden nach dem Frühstück ist gleichzeitig eine Stunde nach
dem Mittagessen. Sie gehört deshalb **der letzten Mahlzeit davor und keiner
anderen** – sonst stünde am Ende jede Beschwerde in jedem Fenster. Das bedeutet
umgekehrt: Das späte Fenster einer Mahlzeit ist nur dann *beobachtbar*, wenn in
diesen Stunden nichts dazwischengegessen wurde und das Tagebuch noch lief. Ist
es das nicht, zählt es als nicht erhoben und nicht als beschwerdefrei. Wer also
wissen will, was der Dickdarm macht, braucht mehr Tage als jemand, der nach dem
Magen fragt – und die App sagt das, statt die Lücke mit einer Null zu füllen.

### Nach Wirkweise statt nach Zutat

„Zwiebel" ist als Antwort schwach – nicht weil sie falsch wäre, sondern weil
sie zu selten vorkommt. Zwölf Mahlzeiten mit Zwiebel im ganzen Tagebuch ergeben
eine wackelige Zahl, und die nächste Frage („und Knoblauch? und Weizen?") fängt
wieder bei null an.

Jede Zutat trägt deshalb ihre **Klassen** – FODMAP, Laktose, Fett, Säure,
Schließmuskel, Koffein, Histamin, Gluten, Schärfe, Gas –, und `klassenBilanz()`
rechnet dieselbe Bilanz eine Ebene höher. Über alle FODMAP-reichen Mahlzeiten
kommen statt zwölf Fällen achtzig zusammen: der Unterschied zwischen einer
Ahnung und einer Zahl. Und es ist die brauchbarere Auskunft, weil sie auch für
das Lebensmittel gilt, das noch gar nicht im Tagebuch steht.

Weil eine Klasse in mehr Mahlzeiten steckt und oft in kleinen Mengen, sind ihre
Schwellen andere: acht Fälle je Seite statt fünf, und ab einem halben Punkt
Unterschied „möglicherweise" statt ab einem. Ein halber Punkt über achtzig
Mahlzeiten ist ein stabileres Ergebnis als zwei Punkte über zwölf.

Zwei Ehrlichkeiten gehören dazu, und sie stehen in der App: Die Zuordnung ist
**grob** – ein Apfel ist FODMAP-reich, eine Banane kaum, und beide wären hier
Obst. Und eine Klasse allein ist eine Sackgasse, denn weglassen kann man keine
Klasse, sondern nur Zutaten; deshalb steht unter jeder, welche eigenen Zutaten
sie in *diesem* Tagebuch trägt, mit ihrer Häufigkeit. Eigene Auslöser bekommen
keine Klasse: Was in „Fenchelknolle" steckt, weiß die App nicht, und es zu
raten wäre schlimmer als es wegzulassen.

Eine Unterscheidung trägt das Ganze: **Ein Tag ohne Beschwerden ist etwas
anderes als ein Tag ohne Eintragung.** Beide sind „null", und sie sind das
Gegenteil voneinander. Lücken häufen sich ausgerechnet in den Wochen, in denen
es jemandem zu schlecht ging, um etwas einzutragen – wer sie als gute Tage
zählt, baut eine App, die genau dann Besserung meldet. Deshalb trägt jeder Tag
ein `notiert`, und der Verlauf zeigt eine Lücke als Lücke.

## Die Zusage

**Gesundheitsdaten verlassen dieses Gerät nie.** Kein Eintrag, kein Tag, keine
Auswertung, kein Bericht, keine Kennung, keine Zählung von Aufrufen.

Die Zusage lautete lange schärfer — „die App sendet überhaupt nichts" — und
sie ist einmal enger gefasst worden:

| | |
| --- | --- |
| **früher** | Die App sendet nichts. |
| **jetzt** | Die App sendet nichts außer den Ideen, die du unter „Ideen" einträgst. |

Der Grund war kein Sinneswandel, sondern eine Sackgasse: Der Reiter „Ideen"
nahm Verbesserungsvorschläge entgegen, und niemand bekam sie je zu sehen. Wer
etwas eintrug, hatte es *aufgeschrieben* — angekommen war es nirgends. Der
Umweg über das Teilen-Menü half, aber ein Umweg bleibt ein Umweg, und Umwege
werden nicht gegangen.

Was sich dadurch **nicht** geändert hat, ist der Grund für das Ganze. Und ein
Satz in einer README ist keine Eigenschaft, also halten ihn drei Prüfungen:

* **`tools/pruefung/keine-leitung.py`** — der schnelle Nachweis ohne Browser.
  Genau **eine** Datei darf eine fremde Adresse enthalten (`js/briefkasten.js`)
  und genau **eine** Adresse darf darin stehen. Diese Datei importiert
  `store.js` nicht und darf `localStorage` und `eintraege` nicht anfassen — sie
  bekommt einen fertigen Text übergeben und kann an ein Tagebuch gar nicht
  herankommen. Überall sonst: keine Adresse, kein `XMLHttpRequest`, kein
  `sendBeacon`, kein `WebSocket`, keine eingebundene Schrift, kein CSS-Import.
* **`tests/test-still.mjs`** — was hinausgeht und was dabei nicht mitgeht. Ein
  Browser geht durch die ganze App, jede Anfrage wird mitgeschrieben. Das ganze
  Tagebuch anfassen: null. Eine Idee eintragen und innerhalb der Bedenkzeit
  wieder löschen: immer noch null — **was zurückgenommen wird, geht nicht
  hinaus.** Nach der Bedenkzeit: genau eine Anfrage, an genau eine Adresse, mit
  genau einem Feld, und ihr Rumpf wird gegen das Tagebuch im Speicher gehalten.
  Taucht daraus auch nur ein Wort auf, ist der Test rot. Danach zehn Minuten
  und viel Herumblättern: kein zweiter Aufruf.
* **`tests/test-schweigen.mjs`** — dass das Tagebuch nie etwas auslöst. Ein
  volles Tagebuch über 90 Tage *ohne* offene Idee, dann wird alles angefasst,
  was sich anfassen lässt: Reiter, Zeiträume, Monate, Aufklapper, Bericht,
  Sicherung, Atemübung, Neuladen — und danach werden **sechs Stunden
  vorgespult**. Erwartet werden null Anfragen. Läuft irgendwo eine Uhr, die von
  selbst etwas hinausschickt, schlägt sie hier an. Zum Schluss dasselbe mit
  Ideen, die schon draußen waren: die gehen kein zweites Mal.

Alle drei laufen bei jedem Push. Und sie sind gegen sich selbst geprüft: Eine
zweite Adresse, eine Adresse in einem anderen Modul, ein Zugriff auf das
Tagebuch in der Tür, ein `sendBeacon`, ein zur Fehlersuche angehängtes
Tagebuch, eine Uhr die stündlich „nur mal nachsieht" — jeder dieser Versuche
lässt die Prüfungen scheitern.

Denn genau darum geht es: Ein Programm, das etwas verschicken *kann*, ist eine
Zeile davon entfernt, **mehr** zu verschicken — beim Starten, beim
Reiterwechsel, „einmal nachts zum Sichern". Jede dieser Zeilen wäre für sich
harmlos gemeint und würde diese App zu einer anderen machen.

**Die Bedenkzeit.** Vorschläge gehen nicht in dem Moment hinaus, in dem der
Satz fertig getippt ist, sondern eine Minute nach der letzten Änderung. Wer
„Die Uhrzeit ist blö" schreibt und kurz überlegt, soll das noch ausbessern
können; wer eine Idee gleich wieder löscht, soll sie nicht schon verschickt
haben. Die Uhr läuft nur, solange die App offen ist — es gibt keinen Dienst im
Hintergrund und keine Warteschlange, die später doch noch sendet.

Wohin die Ideen gehen: in einen eigenen kleinen Kasten
([Finanzdienste/Briefkasten](https://github.com/Finanzdienste/Briefkasten)),
der einen Text entgegennimmt und sonst nichts kann — kein Feld für ein
Tagebuch, keins für einen Namen, keins für eine Kennung. Er speichert den
Wortlaut und wann er ankam.

Klappt es nicht, wird nicht in einer Schleife weiterprobiert: In der Anzeige
steht, dass noch etwas unterwegs ist, und der nächste Anlass — eine Änderung,
ein Blick auf den Reiter — nimmt einen neuen Anlauf. „Jetzt gleich" überspringt
die Bedenkzeit; „Anders schicken" übergibt den Text stattdessen an das
Teilen-Menü des Geräts, das *den Nutzer* fragt, wohin, und „Kopieren" an die
Zwischenablage.

## Benutzen

Drei Wege, alle gleichwertig:

| Weg | Wie |
| --- | --- |
| **Eine Datei** | `dist/bauchbuch.html` herunterladen und öffnen. Läuft per Doppelklick, ohne Server, ohne Netz. Auf dem Handy: öffnen, „Zum Startbildschirm hinzufügen". |
| **Aus dem Ordner** | `index.html` braucht einen Webserver, weil ES-Module und der Service Worker das verlangen: `npm run serve`, dann `http://127.0.0.1:8199/`. |
| **Über GitHub Pages** | Wenn eingerichtet, unter der Adresse des Repositories. |

Die Ein-Datei-Fassung ist nicht die zweite Wahl, sondern für diese App der
naheliegende Weg: Sie braucht keine Adresse, die irgendwo im Netz steht, und
das Tagebuch entsteht trotzdem an genau einer Stelle – im Browser dessen, der
es führt.

**Sicherung.** Was nur in einem Browser liegt, ist mit dem Browser weg:
gelöschte Website-Daten, ein neues Handy, ein privates Fenster. Unter „Mehr"
gibt es eine Sicherungsdatei, gewöhnliches JSON, auch ohne diese App lesbar –
und dieselbe Sicherung zusätzlich als Text zum Kopieren, weil Herunterladen
nicht überall geht.

Die App fragt von sich aus danach: nach 30 neuen Eintragungen oder nach 14
Tagen, und zwar auf dem Tagesreiter statt in den Einstellungen. Ein Hinweis an
einer Stelle, die man selten aufmacht, ist Dekoration. Erst ab 15 Eintragungen
überhaupt – nach dem dritten Eintrag zu betteln, treibt Leute aus der App. Und
„Später" heißt sieben Tage, nicht „nie".

**Aufs Papier.** „Drucken" unter „Mehr" nimmt den Reiter *Muster* mit: die
Einordnung, die Warnzeichen und den Verlauf als Bild. Für den Druck wird die
Farbgebung umgedreht – weiß statt schwarz, denn ein dunkler Bildschirm ist auf
Papier eine halbe Patrone und schlecht lesbar dazu. Aufklappbare Abschnitte
werden vorher geöffnet, sonst fehlten sie stillschweigend.

## Als App, nicht als Lesezeichen

Bauchbuch ist eine installierbare App: Manifest, Symbole in allen Größen (auch
maskierbar, sonst schneidet Android schief zu), Service Worker, `standalone`.
Auf dem Startbildschirm liegt sie als eigenes Symbol, öffnet ohne
Browserleiste und startet ohne Netz.

Damit man das auch findet, bietet die App es unter „Mehr" von sich aus an:
Wo der Browser die Installation meldet (Android/Chrome), steht ein Knopf; wo
nicht (Safari), die Anleitung dafür. Läuft sie bereits als App, sagt sie das
und schweigt ansonsten.

Langes Drücken auf das Symbol führt direkt weiter – **Mahlzeit eintragen**,
**Beschwerden eintragen**, **Atemübung**. Die Verknüpfungen sind Startparameter
derselben Datei (`?neu=essen`, `?tab=ruhe`); die Adresse wird danach wieder
sauber gemacht, damit ein Neuladen nicht denselben Bogen ein zweites Mal
aufreißt.

Zwei Wege, ein Unterschied:

| | Startbildschirm | Ohne Browserleiste |
| --- | --- | --- |
| **Über die Adresse (Pages)** | ja | ja – volle App |
| **Aus der einen Datei (`file://`)** | ja, mit Symbol | nein, öffnet im Browser |

Der Grund ist keine Nachlässigkeit: Browser installieren nur von einer
gesicherten Adresse. Wer die App als *App* will, nimmt die Adresse; wer gar
keine Adresse im Netz will, nimmt die Datei und lebt mit der Browserleiste.

## Entwickeln

```
npm ci                              # nur Playwright, nur für die Tests
npx playwright install chromium
python3 tools/build-single.py       # dist/bauchbuch.html neu bauen
node tests/lauf.mjs                 # alle Tests
node tests/lauf.mjs muster rechnen  # einzelne
npm run serve                       # http://127.0.0.1:8199/
```

Die App selbst hat keine Abhängigkeit und keinen Bauschritt. Der einzige
erzeugte Stand ist `dist/bauchbuch.html`; er wird bei jedem Push nachgebaut und
mit dem eingecheckten verglichen.

### Aufbau

```
index.html          Gerüst: Kopfleiste, ein <main>, die Reiterleiste
css/styles.css      ein Blatt, Farben als Variablen auf :root
js/datum.js         Datum und Uhrzeit, hängt von nichts ab
js/text.js          Text und Zahlen fürs Auge
js/daten.js         die Kataloge: Auslöser, Beschwerdearten, Skalenworte
js/chart.js         Balken und Vergleichsbalken als SVG-Zeichenkette
js/store.js         der Speicher – localStorage, mehr gibt es nicht
js/auswertung.js    die Rechenschicht: Merkmale, Fenster, Bilanz, Verlauf
js/schichten.js     hält jeden Fund gegen die Umstände – Anspannung,
                    Schlaf, Zyklus –, damit nicht der Kaffee büßt, was
                    der Arbeitstag angerichtet hat
js/zeitprofil.js    wie lange nach dem Essen – und was das über den Ort
                    sagt: Magen, Dünndarm oder Dickdarm
js/unterleib.js     Schmerz beim Sex, Regelschmerz, der Zusammenhang
                    mit Bauch und Stuhlgang
js/mittel.js        was die Wirkstoffgruppen bewirken – reine Daten
js/klang.js         Töne aus einem Oszillator, keine Dateien
js/atem.js          die Atemübungen – Daten, nicht der Ablauf
js/zyklus.js        Zyklen und Phasen aus Blutungstagen
js/stuhl.js         Bristol-Form, Anteile, Reizdarm-Typ
js/kriterien.js     Rom IV und GerdQ, nachgerechnet
js/versuch.js       der Auslassversuch mit Wiedereinführung
js/ansprechen.js    ob ein Mittel etwas bewirkt – und was Ausbleiben heißt
js/luecken.js       was noch fehlt und was keine App beantwortet
js/bild.js          Warnzeichen, Muster, Differentialdiagnosen, Fragen
js/rat.js           Vorschläge für heute, jeder mit seinem Grund
js/briefkasten.js   die einzige Stelle, die nach draußen spricht –
                    ein Text, eine Adresse, nur die Ideen
js/tresor.js        die Sicherung mit Passwort – PBKDF2 und AES-GCM aus
                    dem Browser, ohne Bibliothek
js/bericht.js       der Zettel für den Arzttermin, als reiner Text
js/app.js           die Anzeige: ein Zustand, eine Zeichenfunktion,
                    ein Klick-Empfänger für alles
sw.js               Service Worker – ohne Netz benutzbar
```

Die Richtung ist Einbahnstraße: Die Anzeige darf rechnen lassen, die Rechnung
weiß nichts von der Anzeige. `tools/pruefung/schichten.py` prüft das, sucht
Kreise und stellt sicher, dass jedes Modul sowohl im Bündel
(`tools/build-single.py`) als auch im Offline-Vorrat (`sw.js`) steht. Fehlt es
in einer der Listen, geht genau eine der beiden Fassungen still kaputt.

### Tests

Einunddreißig Dateien, über 660 Prüfungen, alle in einem echten Chromium. Kein
Rahmenwerk: Jeder Test ist ein eigenes Programm und meldet sein Ergebnis über
den Rückgabewert.

| Datei | Was sie prüft |
| --- | --- |
| `test-rechnen.mjs` | die Rechenschicht an ausgedachten Verläufen mit bekanntem Ergebnis |
| `test-eintrag.mjs` | eintragen, ändern, löschen, blättern |
| `test-muster.mjs` | ein gepflanzter Zusammenhang wird gefunden, ein zu dünner nicht |
| `test-verlauf.mjs` | Kacheln, Balken, Kalender – und die Lücke bleibt eine Lücke |
| `test-bericht.mjs` | die Zahlen im Arztbericht |
| `test-sicherung.mjs` | sichern, alles löschen, wieder einlesen – über echte Dateien |
| `test-persist.mjs` | die Ein-Datei-Fassung übersteht Neuladen und Neustart |
| `test-offline.mjs` | Service Worker, offline eintragen, offline auswerten |
| `test-ideen.mjs` | eintragen, abhaken, kopieren, die Erinnerung ans Verschicken – und Ideen bleiben aus der Auswertung heraus |
| `test-mittel.mjs` | die Zuordnung freier Namen zur Wirkstoffgruppe, und der Ton der Texte |
| `test-zutaten.mjs` | Reihenfolge nach Häufigkeit, Rollen statt Gramm, Umrechnung alter Stände |
| `test-zyklus.mjs` | Zyklen, Phasen – und das Schweigen ohne Grundlage |
| `test-bild.mjs` | Warnzeichen kommen durch; Nüchternschmerz wird nicht mit Völlegefühl verwechselt |
| `test-rat.mjs` | jeder Vorschlag mit Grund, und keine Medikamentenempfehlung |
| `test-atem.mjs` | Phasenlängen, Ablauf, Abbruch beim Reiterwechsel, stummer Betrieb |
| `test-app.mjs` | Installieren, Verknüpfungen des Symbols, Druckansicht |
| `test-stuhl.mjs` | Bristol eintragen, die Anteile, und das Warnzeichen aus dem Stuhlbogen |
| `test-kriterien.mjs` | Rom IV und GerdQ in beide Richtungen – erfüllt *und* nicht erfüllt |
| `test-klassen.mjs` | die Klasse trägt, wo die Zutat noch zählt – und schweigt ohne Vergleichsgruppe |
| `test-versuch.mjs` | vor allem, wann *nicht* „spricht dafür" herauskommt |
| `test-ansprechen.mjs` | der ausgereizte Säureblocker, und kein Rat zum Absetzen |
| `test-luecken.mjs` | die zwei Sorten Lücken bleiben getrennt |
| `test-trend.mjs` | vor allem, wann *keine* Richtung genannt wird – und dass Lücken keine guten Tage sind |
| `test-tresor.mjs` | in der Datei steht nichts Lesbares; falsches Passwort und veränderte Datei gehen nicht auf |
| `test-termin.mjs` | das Fenster fängt am Termin an und die Richtung rechnet nicht von davor mit |
| `test-schnell.mjs` | ein Tipp legt dieselbe Mahlzeit an, nichts Erfundenes – und die Versuchs-Historie bleibt stehen |
| `test-still.mjs` | bis zum Tastendruck null Anfragen; danach genau eine, ohne ein Wort aus dem Tagebuch |
| `test-schweigen.mjs` | volles Tagebuch, alles angefasst – und trotzdem null Anfragen |
| `test-unterleib.mjs` | die Fragen bleiben aus, bis jemand sie einschaltet; und Regelschmerz allein ergibt noch kein Muster |
| `test-zeitprofil.mjs` | wann nach dem Essen es kommt – und dass eine Beschwerde genau einer Mahlzeit gehört, nicht dreien |
| `test-stoerfaktor.mjs` | der Scheinbefund verschwindet unter gleichen Umständen, der echte bleibt – und zu wenig heißt „nicht prüfbar", nicht „unauffällig" |

Die Auswertung wird nicht daran geprüft, ob im Browser etwas Grünes steht,
sondern an Verläufen, deren richtiges Ergebnis vorher feststeht. Der wichtigste
Fall ist der, in dem die App **schweigen** muss: Bei zwei Mahlzeiten mit
Alkohol und zweimal Stärke 10 darf nichts herauskommen. Eine App, die daraus
eine Regel macht, bringt jemanden dazu, sein Essen umzustellen, ohne dass es
dafür einen Grund gibt.

## Herkunft

Aufbau, Testläufer, der Ein-Datei-Bau und die Schichtungsprüfung stammen aus
einem Schwesterprojekt und sind hier übernommen und angepasst. Nicht
mitgekommen ist dessen Telemetrie: Gesundheitsdaten eines anderen Menschen
gehören in kein Auswertungssystem. Einen Rückkanal gibt es inzwischen doch,
aber einen ausdrücklich schmalen – er trägt die Ideen zur App und nichts
sonst, und was er nicht trägt, prüft `tools/pruefung/keine-leitung.py` bei
jedem Push nach.
