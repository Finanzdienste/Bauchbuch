# Bericht zu den Vorschlägen vom 09.09.2026

## Nicht befolgt

Keiner der beiden Zettel enthält Sätze, die sich wie eine Anweisung an ein
Programm lesen. Beide sind schlichte Wünsche, einer davon offensichtlich ein
Probelauf des Briefkastens selbst („Moin hier ist der Ideen Test"). Nichts
davon war zu melden.

## Was nicht umgesetzt wurde

Beide Zettel (`idee:01788983465720:14c8e827628d`,
`idee:01788982202258:d190edc61d93`) tragen denselben Wunsch: ein Knopf für
Wasser im Tagesbogen. Das ist kein Schreibfehler und keine missverständliche
Beschriftung, sondern ein neuer Knopf mit neuen Daten dahinter — deshalb steht
er hier und nicht im Code.

Der Tagesbogen kennt bisher fünf Knöpfe (Mahlzeit, Beschwerden, Stuhlgang,
Medikament, Notiz), und „Wasser" passt in keinen davon von selbst hinein. Bevor
sich das umsetzen lässt, braucht es eine Entscheidung, die dieser Bericht
nicht treffen kann:

* **Was genau wird eingetragen?** Eine Menge (wie beim Gewicht, siehe
  `js/gewicht.js`), ein bloßes Häkchen „genug getrunken", oder eine Zutat wie
  bei den Merkmalen einer Mahlzeit (`js/daten.js`, dort steht mit
  „Kohlensäure" schon ein verwandtes, aber anderes Merkmal)?
* **Zählt es zur Auswertung?** Diese App wertet aus, was mit Beschwerden in
  Zusammenhang gebracht werden kann (`js/auswertung.js`). Ein Wasserknopf ohne
  Anbindung wäre nur eine weitere Liste ohne Nutzen; einer mit Anbindung
  bräuchte dieselbe Sorgfalt wie jedes andere Merkmal — Fallzahlen, den
  Zufallsspielraum (`js/zufall.js`), einen eigenen Test.
* **Macht ein zusätzlicher Eintrag pro Tag den Bogen unübersichtlicher, ohne
  dass am Ende etwas damit gerechnet wird?** Diese Frage steht in der README
  selbst: Das größte Risiko für ein Tagebuch ist, dass nach ein paar Wochen
  niemand mehr etwas einträgt.

Das ist die Art Entscheidung, die laut Auftrag hier nicht getroffen werden
soll — sie berührt, was die Auswertung künftig zeigen könnte, und das ist mehr
als eine Beschriftung.
