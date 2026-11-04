# KT Lernzeit

App für Nachhilfe und Lernzeit von KT Jugend (Kocatepe Gençlik Ruhrort).

Eine Datei (`index.html`), Vanilla-JS, kein Framework.

## Zwei Bereiche

- **Lehrkräfte:** Schüler anlegen und entfernen (Schulform ist Pflicht), Noten, Zeugnisse, Stundenplan als Raster, Stärken und Schwächen, Lernzeit bzw. Hausaufgaben mit Nacharbeit, Übungsaufgaben für Deutsch, Englisch und Mathe, Einsatzplan (Regelplan und Wochen).
- **Schüler:** Anmeldung mit sechsstelligem Code, nur Übungsaufgaben ihrer Klasse und Gruppe.

Gruppen sind getrennt: Jungs (Di und Mi), Mädchen (Do). Lehrkräfte sehen nur ihre Gruppe, die Leitung sieht alle.

## Speicher

Vorschau-Stand: Alles liegt nur im Browser des jeweiligen Geräts (`localStorage`, Schlüssel `kt-lernzeit-v1`).

Schülerdaten gehören **nicht** in dieses Repo, es ist öffentlich. Für den Abgleich zwischen Geräten ist Supabase (EU-Server) mit eigenem Login pro Lehrkraft vorgesehen.
