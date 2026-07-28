# Modellpreise aktualisieren

Die statischen Preisanzeigen liegen in `pricing.json`. Sie sind Richtwerte aus den offiziellen Preislisten und werden nicht zur Laufzeit aus dem Internet geladen.

## Vorgehen

1. Vergleiche alle Modell-IDs aus `registry.ts` mit den Schlüsseln in `pricing.json`.
2. Öffne für jeden Eintrag die hinterlegte `sourceUrl` und verwende ausschließlich die dort veröffentlichte Preisangabe.
3. Aktualisiere die kurzen Anzeigen unter `label.de` und `label.en`. Nenne immer die Abrechnungseinheit, etwa `/Bild`, `/MP` oder `/1M Tokens`.
4. Gib bei tokenbasierten Preisen die Richtung kurz mit `In` und `Out` an. Unterscheide Text- und Bildtokens, wenn die Quelle unterschiedliche Preise nennt.
5. Prüfe die Standardparameter des Modells in `registry.ts` und die tatsächlich vom zugehörigen Provider-Adapter gesendeten Parameter. Maßgeblich ist der effektive Request, nicht der Standard auf der Webseite des Anbieters.
6. Berücksichtige insbesondere `quality`, `resolution`, Bildgröße, Seitenverhältnis, Inferenzschritte sowie Anzahl und Größe der Eingabebilder, sofern sie den Preis beeinflussen.
7. Dokumentiere die verwendeten Parameter oder Berechnungsannahmen kurz unter `basis`. Kennzeichne die relevante Variante auch im sichtbaren Label, zum Beispiel `(low)` oder `(0,5K)`.
8. Nutze eine Spanne oder `ab`, wenn Seitenverhältnis, Auflösung, Eingabebilder oder andere variable Request-Parameter den tatsächlichen Preis verändern. Berechne keinen vermeintlich exakten Pauschalpreis.
9. Aktualisiere `sourceUrl`, wenn der Anbieter die offizielle Preisseite verschoben hat.
10. Setze `checkedAt` bei jedem geprüften Eintrag auf das aktuelle Datum im Format `YYYY-MM-DD`, auch wenn der Preis unverändert ist.
11. Schätze keine fehlenden Preise. Entferne einen nicht mehr belegbaren Eintrag, damit die UI keine veraltete zweite Zeile zeigt.
12. Führe abschließend `npm run typecheck` aus.

## Neue Modelle

Füge zusammen mit jedem neuen statischen Modell einen gleichnamigen Schlüssel in `pricing.json` hinzu. Ist noch kein offizieller Preis veröffentlicht, darf der Eintrag fehlen; die Modellanzeige funktioniert dann ohne Preiszeile.
