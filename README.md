# KT Schule

App für Nachhilfe und Lernzeit von KT Jugend (Kocatepe Gençlik Ruhrort).

Eine Datei (`index.html`), Vanilla-JS, kein Framework.

## Zwei Bereiche

- **Lehrkräfte:** Schüler anlegen und entfernen (Schulform ist Pflicht), Noten, Zeugnisse, Stundenplan als Raster, Stärken und Schwächen, Lernzeit bzw. Hausaufgaben mit Nacharbeit, Übungsaufgaben für Deutsch, Englisch und Mathe, Einsatzplan (Regelplan und Wochen).
- **Schüler:** Anmeldung mit sechsstelligem Code, nur Übungsaufgaben ihrer Klasse und Gruppe.

Gruppen sind getrennt: Jungs (Di und Mi), Mädchen (Do). Lehrkräfte sehen nur ihre Gruppe, die Leitung sieht alle.

## Speicher

Supabase (Projekt KT-Schule). Tabellen und Zugriffsregeln: `supabase/schema.sql`, danach `supabase/02_einladung.sql`.

- Lehrkräfte melden sich mit E-Mail und Passwort an. Das erste Konto wird Leitung, alle weiteren lädt die Leitung unter „Team“ ein.
- Jungs-Lehrer sehen nur Jungs, Mädchen-Lehrerinnen nur Mädchen, die Leitung alle (Regeln in der Datenbank, nicht nur in der App).
- Schüler kommen nur über ihren Code an die Aufgaben ihrer Klasse und Gruppe und können nur Ergebnisse abgeben.
- Der Schlüssel im Code ist der öffentliche anon-Schlüssel. Den service_role-Schlüssel niemals hier eintragen.
- Schülerdaten gehören nie in dieses Repo.
