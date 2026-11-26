# Hinweise für Claude

Antworte auf Deutsch, kurz und direkt.

## Modell, Aufwand und neuer Chat
Was gerade läuft, zeigt `get_session` (`model`, `effort_level`, `context_usage`).
- **Nur melden, wenn etwas zu ändern ist** (Tobi, 26.11.2026: „Dass Opus okay
  ist brauch ich nicht zu wissen, ich brauch nur zu wissen wenn was geändert
  werden muss“): Kein Schlusssatz mehr wie „passt – nichts umstellen“. Sollte
  etwas umgestellt werden (Modell, Aufwand, neuer Chat), am Ende ein Satz mit
  Grund und dem genauen Befehl.
- **Neuer Chat** (Tobi, 26.11.2026: „in allen Chats bescheid geben wenn ein
  neuer Chat nötig ist“): von selbst in einem Satz sagen, sobald einer nötig
  ist – wenn `get_session` mehr als etwa 80 % von `context_usage.max_tokens`
  belegt zeigt, wenn du merkst, dass du mit veraltetem oder widersprüchlichem
  Stand arbeitest, oder bei einem anderen Projekt. Ein neues Thema im selben
  Projekt und ein schon zusammengefasster Verlauf allein sind kein Grund
  (Tobi, 26.11.2026: „dass hier Infos zusammengefasst wurden ist schlechter
  als bei nem neuen chat komplett von 0 zu beginnen?“ – nein). Vorher alles Offene in die Dateien schreiben und einen kurzen
  Starttext zum Einfügen mitgeben.
- Mehr (vorschlagen, auf Antwort warten): `/model fable` mit `/effort high`,
  wenn eine Ursache nach dem ersten Durchgang unklar bleibt oder ein Fehler
  nach einer Korrektur wiederkommt. Fable kostet kein Nutzungsguthaben (Tobi, 26.11.2026; Guthaben kostet nur
  die Claude-API).
