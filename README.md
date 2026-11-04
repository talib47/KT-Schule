# KT Schule

App für Nachhilfe und Lernzeit von KT Jugend (Kocatepe Gençlik Ruhrort).

Eine Datei (`index.html`), Vanilla-JS, kein Framework.

## Zwei Bereiche

- **Schüler** (Anmeldung mit sechsstelligem Code): Heute (tägliche Übungsrunde: Fehler von neulich, neue Blätter der Lehrkräfte, Förderziele), Üben (schnelle Runde, Fehler wiederholen, nach Fach), Fortschritt. Viele kurze Aufgaben hintereinander; Mathe-Themen erzeugen immer neue Zahlen; falsche Aufgaben kommen in derselben Runde bis zu zweimal wieder.
- **Lehrkräfte** (E-Mail und Passwort): Schüler (Förderziele, Lernstand in der App, Noten und Zeugnisse, Lernzeit bzw. Hausaufgaben, Einschätzung, Stundenplan, Code), Aufgaben (eigene Blätter, automatische Themen), Plan (Termine mit Wechsel, Team).

Gruppen sind getrennt: Jungs-Lehrer sehen nur Jungs, Lehrerinnen nur Mädchen, die Leitung alle.

Gestaltung angelehnt an „Die Reihe“ der Uni-Lern-Apps (ruhige Flächen, Platte „Heute“ in Petrol, Newsreader, Glas-Tableiste, Lernmodus ohne Ablenkung). Außerhalb von github.io läuft die App als Vorschau mit Beispieldaten nur im Gerät.

## Bauen und Updates

Quelltext in `src/` (`app.js`, `base.css`, `extra.css`). Nach jeder Änderung `python3 build.py` ausführen und `index.html` **und** `version.txt` committen. Die App vergleicht beim Start und beim Zurückkehren ihre Version mit `version.txt` und lädt neue Versionen von selbst; auf dem Homebildschirm muss nichts neu installiert werden (nur bei geändertem Namen oder Symbol).

## Speicher

Supabase (Projekt KT-Schule). Tabellen und Zugriffsregeln: `supabase/schema.sql`, danach `02_einladung.sql` und `03_lernstand.sql`.

- Lehrkräfte melden sich mit E-Mail und Passwort an. Das erste Konto wird Leitung, alle weiteren lädt die Leitung unter „Team“ ein.
- Jungs-Lehrer sehen nur Jungs, Mädchen-Lehrerinnen nur Mädchen, die Leitung alle (Regeln in der Datenbank, nicht nur in der App).
- Schüler kommen nur über ihren Code an die Aufgaben ihrer Klasse und Gruppe und können nur Ergebnisse abgeben.
- Der Schlüssel im Code ist der öffentliche anon-Schlüssel. Den service_role-Schlüssel niemals hier eintragen.
- Schülerdaten gehören nie in dieses Repo.
