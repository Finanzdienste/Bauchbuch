#!/usr/bin/env python3
"""Prueft, dass das oeffentliche Repository allgemein bleibt.

    python3 tools/pruefung/allgemein.py
    python3 tools/pruefung/allgemein.py --commits HEAD
    python3 tools/pruefung/allgemein.py --commits origin/main..HEAD

WARUM

Das Repository ist oeffentlich. Die App ist fuer alle gebaut - fuer alle,
die ein ADHS-Mittel nehmen, fuer alle mit Verspannung, Pressen oder
Knirschen. Was nie hineingehoert, ist ein Satz ueber einen bestimmten
Menschen: wer was nimmt, wer was traegt, was dessen Aerztin meint. Solche
Saetze rutschen leicht in einen Kommentar, einen Test oder einen
Commit-Text, gerade wenn eine Funktion aus einem echten Anlass entsteht.

WAS GEPRUEFT WIRD

Jede Zeile in js/, css/, tests/, tools/, .github/, README.md, index.html,
sw.js, manifest.webmanifest und package.json - mit --commits auch jede
Zeile der Commit-Texte im angegebenen Bereich:

  1. "hat ADHS" - ueberall ein Treffer. Allgemein heisst es "fuer alle mit
     ADHS" oder "wer ein ADHS-Mittel nimmt".
  2. Ein Themenwort (ADHS, die Mittel, Schiene, Knirschen, Verspannung ...)
     UND in derselben Zeile ein Personenmuster: "sie/er/die Nutzerin/die
     Patientin nimmt/traegt/hat/bekommt" oder "ihr/ihre/sein/seine
     Arzt/Aerztin/Zahnarzt/Zahnaerztin".

Beides zusammen, weil jedes fuer sich harmlos ist: "Die Schiene schuetzt die
Zaehne" ist ein Satz ueber Schienen, "sie hat zwei Ausnahmen" einer ueber
eine Regel.

WAS HIER ABSICHTLICH FEHLT: eine Namensliste. Eine Liste mit Namen im
Repository waere selbst das, was sie verhindern soll. Namen prueft der
lokale Haken (tools/haken/pre-commit) gegen eine Liste, die nur auf dem
eigenen Rechner liegt.

Gemeldet werden Datei und Zeile, nie der Text - CI-Protokolle eines
oeffentlichen Repositorys sind selbst oeffentlich.

WELCHE DATEIEN, WELCHE COMMITS

css/, index.html, sw.js und das Manifest stecken in dist/bauchbuch.html, der
Datei, die weitergegeben wird, und haben eigene Kommentare - sie gehoeren
genauso dazu wie js/. dist/ selbst fehlt, weil es nur aus diesen Quellen
erzeugt wird; vorschlaege/ fehlt, weil dort Text aus dem Briefkasten steht,
den der Ablauf schreibt und nicht der Mensch am Code.

In CI laeuft --commits HEAD, also ueber alle Commit-Texte, die HEAD erreicht.
Ein Bereich wie origin/main..HEAD waere dort leer: Jede Fassung geht direkt
auf main, und nach dem Checkout zeigt origin/main auf genau den gepushten
Stand. Die ganze Vorgeschichte ist ohnehin oeffentlich. Die Meldung nennt
deshalb die Zahl der gelesenen Commit-Texte - ein leerer Bereich soll nicht
nach Erfolg klingen.

Diese Datei selbst wird nicht durchsucht: Ihre Muster und ihr Selbsttest
bestehen genau aus den Woertern, nach denen sie sucht. Der Selbsttest baut
seine Saetze deshalb erst zur Laufzeit zusammen.
"""
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
SELBST = pathlib.Path(__file__).resolve()

ORTE = ['js', 'css', 'tests', 'tools', '.github', 'README.md', 'index.html', 'sw.js',
        'manifest.webmanifest', 'package.json']
ENDUNGEN = {'.js', '.mjs', '.py', '.yml', '.yaml', '.md', '.json', '.html', '.css', '.txt', ''}

THEMA = ['adhs', 'methylphenidat', 'medikinet', 'ritalin', 'concerta', 'elvanse',
         'schiene', 'aufbiss', 'knirsch', 'massagepistole', 'verspann']
SUBJEKT = ['sie', 'er', 'die nutzerin', 'die patientin']
VERB = ['nimmt', 'trägt', 'traegt', 'hat', 'bekommt']
BESITZ = ['ihr', 'ihre', 'sein', 'seine']
PRAXIS = ['arzt', 'ärztin', 'aerztin', 'zahnarzt', 'zahnärztin', 'zahnaerztin']


def oder(woerter):
    return '|'.join(re.escape(w).replace(r'\ ', r'\s+') for w in woerter)


HAT_ADHS = re.compile(r'\bhat\s+adhs\b', re.IGNORECASE)
THEMA_RE = re.compile(oder(THEMA), re.IGNORECASE)
PERSON_RE = re.compile(
    rf'\b(?:{oder(SUBJEKT)})\s+(?:{oder(VERB)})\b'
    rf'|\b(?:{oder(BESITZ)})\s+(?:{oder(PRAXIS)})\b',
    re.IGNORECASE)


def befund(zeile):
    """Welche Regel die Zeile trifft - oder None."""
    if HAT_ADHS.search(zeile):
        return 'hat ADHS'
    if THEMA_RE.search(zeile) and PERSON_RE.search(zeile):
        return 'Thema und Person in einer Zeile'
    return None


def selbsttest():
    """Je Regel Saetze, die treffen muessen, und Saetze, die es nicht duerfen."""
    fehler = []
    muss = [' '.join(['jemand', 'hat', 'ADHS'])]
    muss += [f'{s.capitalize()} {v} {t} seit Mai.' for s in SUBJEKT for v in VERB for t in THEMA[1:3]]
    muss += [f'{b.capitalize()} {p} meint, die {THEMA[6].capitalize()} passt.' for b in BESITZ for p in PRAXIS]
    darf_nicht = [
        'Für alle, die ein ADHS-Mittel nehmen oder ADHS mitdenken wollen.',
        'Die Schiene ist vor allem zum Schutz der Zähne gedacht.',
        'Wer die Schiene trägt, hat keinen Vergleich – und das ist so in Ordnung.',
        f'{SUBJEKT[0].capitalize()} {VERB[3]} zwei Ausnahmen, beide stehen oben.',
        'Ob Knirschen damit zusammenhängt, klärt die Zahnarztpraxis.',
        'Ihre Ärztin oder Apotheke beantwortet Fragen zum Mittel.',
    ]
    for s in muss:
        if not befund(s):
            fehler.append(f'trifft nicht, sollte aber: {s}')
    for s in darf_nicht:
        if befund(s):
            fehler.append(f'trifft, sollte aber nicht: {s}')
    return fehler, len(muss) + len(darf_nicht)


def dateien():
    for ort in ORTE:
        pfad = ROOT / ort
        if pfad.is_file():
            yield pfad
            continue
        if not pfad.is_dir():
            continue
        for d in sorted(pfad.rglob('*')):
            if not d.is_file() or d.resolve() == SELBST:
                continue
            if '__pycache__' in d.parts or d.suffix not in ENDUNGEN:
                continue
            yield d


def commit_texte(bereich):
    """(Kennung, Zeilen) je Commit im Bereich."""
    try:
        text = subprocess.run(['git', 'log', '--format=%H%n%B%n\x1e', bereich], cwd=ROOT,
                              capture_output=True, text=True, check=True).stdout
    except (subprocess.CalledProcessError, FileNotFoundError) as e:
        sys.exit(f'Commit-Texte aus {bereich} nicht lesbar: {e}')
    texte = []
    for block in text.split('\x1e'):
        zeilen = block.strip('\n').split('\n')
        if not zeilen or not zeilen[0]:
            continue
        texte.append((zeilen[0][:12], zeilen[1:]))
    return texte


def main(argv):
    fehler, anzahl = selbsttest()
    if fehler:
        print('Allgemein: der Selbsttest schlaegt fehl')
        for f in fehler:
            print('  ' + f)
        return 1
    print(f'Selbsttest: {anzahl} Saetze richtig erkannt.')

    treffer = []
    gezaehlt = 0
    for d in dateien():
        try:
            text = d.read_text(encoding='utf-8')
        except (UnicodeDecodeError, OSError):
            continue
        gezaehlt += 1
        for nr, z in enumerate(text.splitlines(), 1):
            regel = befund(z)
            if regel:
                treffer.append(f'{d.relative_to(ROOT)}:{nr} ({regel})')

    commits = None
    if '--commits' in argv:
        i = argv.index('--commits')
        if i + 1 >= len(argv):
            sys.exit('--commits braucht einen Bereich, etwa HEAD oder origin/main..HEAD')
        bereich = argv[i + 1]
        texte = commit_texte(bereich)
        commits = len(texte)
        for kennung, zeilen in texte:
            for nr, z in enumerate(zeilen, 1):
                regel = befund(z)
                if regel:
                    treffer.append(f'Commit {kennung}, Zeile {nr} ({regel})')

    if treffer:
        print('Allgemein: FEHLER - Zeilen, die nach einem bestimmten Menschen klingen')
        for t in treffer:
            print('  ' + t)
        print('Bitte allgemein fassen ("fuer alle, die ...", "wer ... nimmt").')
        return 1
    if commits:
        print(f'{gezaehlt} Dateien und {commits} '
              + ('Commit-Text' if commits == 1 else 'Commit-Texte') + ' ohne Personenbezug.')
    else:
        print(f'{gezaehlt} Dateien ohne Personenbezug.')
        if commits == 0:
            # Ein leerer Bereich ist kein Fehler (lokal: noch nichts Neues),
            # darf aber nicht so klingen, als waeren Commit-Texte geprueft.
            print(f'Dabei keine Commit-Texte gelesen: Der Bereich {bereich} ist leer.')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
