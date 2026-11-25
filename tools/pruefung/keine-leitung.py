#!/usr/bin/env python3
"""Prueft, was diese App verschickt - und vor allem, was nicht.

    python3 tools/pruefung/keine-leitung.py

DIE ZUSAGE HAT SICH EINMAL GEAENDERT, UND ZWAR NUR IN EINE RICHTUNG: enger.

    frueher   "Die App sendet nichts."
    jetzt     "Die App sendet nichts ausser den Ideen, die du selbst
               eintippst und selbst abschickst."

Der Grund war kein Sinneswandel, sondern eine Sackgasse: Der Reiter "Ideen"
nahm Verbesserungsvorschlaege entgegen, und niemand bekam sie je zu sehen. Wer
etwas eintrug, hatte es aufgeschrieben; angekommen war es nirgends.

WAS SICH NICHT GEAENDERT HAT, und der eigentliche Grund fuer das Ganze war:
**Gesundheitsdaten verlassen dieses Geraet nie.** Kein Eintrag, kein Tag,
keine Auswertung, kein Bericht, keine Kennung, keine Zaehlung von Aufrufen.

Diese Datei ist der schnelle Nachweis: Sie braucht keinen Browser, laeuft in
einer Sekunde und faellt auch dann auf, wenn die Browsertests gerade aus einem
anderen Grund rot sind. Die gruendlicheren stehen daneben:

    tests/test-still.mjs      schreibt jede Anfrage mit; erlaubt genau den
                              einen POST nach Tastendruck und haelt seinen
                              Rumpf gegen ein volles Tagebuch
    tests/test-schweigen.mjs  klickt die ganze App mit Tagebuchdaten durch
                              und verlangt: null Anfragen

Erlaubt bleibt fetch() auf eigene Dateien - der Service Worker lebt davon.

WAS HIER ABSICHTLICH NICHT GEPRUEFT WIRD: tools/

Unter tools/ steht seit dem Rueckkanal auch ein Werkzeug, das ins Netz greift
(tools/vorschlaege-holen.mjs, es holt die Vorschlaege aus dem Briefkasten).
Das ist kein Loch in dieser Pruefung, sondern liegt ausserhalb ihres
Gegenstands: Geprueft wird, was auf dem Geraet der Nutzerin laeuft. Nach dort geliefert
werden index.html, css/, js/, sw.js und die daraus erzeugte
dist/bauchbuch.html - und deren Inhalt bestimmt die feste Liste MODULES in
tools/build-single.py, nicht ein Suchmuster. Was unter tools/ liegt, laeuft auf
einem Rechner von GitHub und sieht kein Tagebuch; es kaeme selbst dann nicht
mit, wenn es wollte.

Wer das aendert - etwa indem tools/ irgendwann doch ausgeliefert wird -, muss
diese Liste hier erweitern. Deshalb steht der Grund dabei und nicht nur die
Auslassung.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

DATEIEN = sorted(ROOT.glob('js/*.js')) + [ROOT / 'sw.js', ROOT / 'index.html']

# Die eine Datei, in der eine fremde Adresse stehen darf, und die einzige
# Adresse, die dort stehen darf. Kommt eine zweite dazu oder wandert diese
# woandershin, schlaegt die Pruefung an.
TUER = 'js/briefkasten.js'
ZIEL = 'https://briefkasten.tobias-kruse-184.workers.dev/idee'

# Die zweite Tuer (Fassung 31): Teilen mit einer Vertrauensperson. Sie hat
# keine feste Adresse - nur diese eine Vorlage, deren Projekt erst ein
# Kopplungslink liefert und die erst nach ausdruecklichem Ja benutzt wird.
TUER2 = 'js/teilen.js'
ZIEL2 = 'https://${kp.r}.supabase.co/rest/v1/rpc/${fn}'

# Was in keiner Zeile stehen darf - auch nicht in der Tuer. Die Wege hier
# umgehen entweder jede Sichtbarkeit (sendBeacon feuert noch beim Schliessen
# des Tabs) oder halten eine Leitung offen, die niemand mehr sieht.
VERBOTEN = [
    (re.compile(r'\bXMLHttpRequest\b'), 'XMLHttpRequest'),
    (re.compile(r'navigator\.sendBeacon'), 'sendBeacon'),
    (re.compile(r'\bWebSocket\b'), 'WebSocket'),
    (re.compile(r'\bEventSource\b'), 'EventSource'),
    (re.compile(r'\bimportScripts\b'), 'importScripts'),
    (re.compile(r'<script[^>]+src="https?:'), 'ein Skript von auswaerts'),
    (re.compile(r'@import\s+url\('), 'ein CSS-Import'),
]

ADRESSE = re.compile(r'https?://[^\s"\'`)]+')

fehler = []

for datei in DATEIEN:
    rel = str(datei.relative_to(ROOT))
    text = datei.read_text(encoding='utf-8')
    for nr, zeile in enumerate(text.splitlines(), 1):
        for muster, was in VERBOTEN:
            if muster.search(zeile):
                fehler.append(f'{rel}:{nr}: {was} - {zeile.strip()[:90]}')

        for treffer in ADRESSE.findall(zeile):
            # In der Tuer ist genau eine Adresse erlaubt.
            if rel == TUER and treffer.rstrip("',;.") == ZIEL:
                continue
            if rel == TUER2 and treffer.rstrip("',;.`") == ZIEL2:
                continue
            fehler.append(f'{rel}:{nr}: eine Adresse - {treffer[:90]}')

# Die Tuer muss es geben, und die Adresse muss darin stehen. Ohne diese
# Pruefung faellt niemandem auf, wenn der Versand still verschwindet - und ein
# Reiter, der Ideen sammelt und nichts damit tut, ist genau der Zustand, aus
# dem das hier entstanden ist.
tuer = ROOT / TUER
if not tuer.exists():
    fehler.append(f'{TUER} fehlt - der Versand haette keinen Ort mehr')
else:
    quelle = tuer.read_text(encoding='utf-8')
    if ZIEL not in quelle:
        fehler.append(f'{TUER}: die Adresse des Briefkastens steht nicht mehr drin')
    # Die Tuer darf den Speicher nicht kennen. Solange sie store.js nicht
    # importiert und die Tagebuchfelder nicht anfasst, kann sie gar nicht an
    # ein Tagebuch herankommen - sie bekommt einen fertigen Text uebergeben
    # und sonst nichts.
    for verdaechtig in ('store.js', 'localStorage', 'eintraege'):
        for nr, zeile in enumerate(quelle.splitlines(), 1):
            nackt = zeile.strip()
            if nackt.startswith(('*', '//', '/*')):
                continue
            if re.search(rf'\b{re.escape(verdaechtig)}\b', zeile):
                fehler.append(
                    f'{TUER}:{nr}: fasst {verdaechtig} an - der Versand darf '
                    f'den Speicher nicht kennen, nur den uebergebenen Text'
                )

# Die zweite Tuer: kennt den Speicher nicht, hat genau die eine Vorlage, und
# jeder Versand haengt an aktiv() - der Kopplung, der jemand zugestimmt hat.
tuer2 = ROOT / TUER2
if not tuer2.exists():
    fehler.append(f'{TUER2} fehlt')
else:
    q2 = tuer2.read_text(encoding='utf-8')
    if q2.count(ZIEL2) != 1:
        fehler.append(f'{TUER2}: die Vorlage der Adresse muss genau einmal dastehen')
    for nr, zeile in enumerate(q2.splitlines(), 1):
        nackt = zeile.strip()
        if nackt.startswith(('*', '//', '/*')):
            continue
        for verdaechtig in ('store.js', 'eintraege'):
            if re.search(rf'\b{re.escape(verdaechtig)}\b', zeile):
                fehler.append(f'{TUER2}:{nr}: fasst {verdaechtig} an - das Teilen bekommt den fertigen Text')
    for fn in ('teilenMelden', 'teilenBeenden'):
        m = re.search(rf'export async function {fn}\(.*?\n\}}', q2, re.S)
        if not m or 'const kp = teilenAktiv();' not in m.group(0):
            fehler.append(f'{TUER2}: {fn}() fragt nicht zuerst teilenAktiv() - ohne Zustimmung darf nichts gehen')

# Auch das Blatt: eingebundene Schriften waeren ein Aufruf bei jedem Start.
css = (ROOT / 'css' / 'styles.css').read_text(encoding='utf-8')
for muster, was in [(re.compile(r'https?://'), 'eine Adresse'),
                    (re.compile(r'@import'), 'ein CSS-Import'),
                    (re.compile(r'url\(\s*[\'"]?(?!data:)[a-z]+:'), 'eine externe Quelle')]:
    for nr, zeile in enumerate(css.splitlines(), 1):
        if muster.search(zeile):
            fehler.append(f'css/styles.css:{nr}: {was} - {zeile.strip()[:90]}')

if fehler:
    print('Die App haette einen Weg nach draussen, den sie nicht haben darf:')
    for f in fehler:
        print('  ' + f)
    sys.exit(1)

print(f'{len(DATEIEN) + 1} Dateien geprueft: Ideen nur in {TUER} an genau eine Adresse,')
print(f'Teilen nur in {TUER2} und nur nach Zustimmung. Sonst keine fremde Adresse.')
