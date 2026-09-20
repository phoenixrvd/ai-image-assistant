# AI Image Assistant

[English](README.md)

AI Image Assistant ist eine mobile-first PWA für die KI-gestützte Bildgenerierung. Sie verbindet einen reduzierten Prompt-Workflow mit lokal verwalteten Sitzungen, Referenzbildern und konfigurierbaren KI-Providern.

## Funktionen

- Bilder aus Prompts erzeugen und durch weitere Varianten verfeinern
- Bildanzahl, Seitenverhältnis sowie sitzungsspezifische Stilregeln festlegen
- Referenzbilder hochladen oder erzeugte Bilder als Referenz verwenden
- Ergebnisse vergleichen, herunterladen oder als Ausgangsbild für die weitere Bearbeitung verwenden
- Sitzungen, Prompt-Verläufe und Ergebnisse lokal verwalten
- OpenAI-kompatible APIs, fal.ai und OpenRouter konfigurieren

## Nutzung

In den Optionen werden die gewünschten Provider mit API-URL und API-Key eingerichtet. Danach kann eine Sitzung gestartet, ein Prompt eingegeben und ein verfügbares Bildmodell ausgewählt werden. Die erzeugten Ergebnisse bleiben gemeinsam mit den verwendeten Prompts in der Sitzung nachvollziehbar.

## Daten und Datenschutz

Die App besitzt kein eigenes Backend. Einstellungen, API-Keys, Sitzungen und Bilder werden ausschließlich lokal im Browser über IndexedDB gespeichert. Generierungsanfragen gehen direkt vom Browser an den konfigurierten externen KI-Provider und unterliegen dessen Datenschutzbestimmungen.

Gespeicherte Inhalte und Verwaltungsfunktionen bleiben offline verfügbar. Für Generierung und automatische Sitzungsnamen ist eine Internetverbindung erforderlich.

## Entwicklung

```bash
npm install
npm run dev
```

## Dokumentation

- Produktanforderungen: `doc/requirements/`
- Architekturentscheidungen: `doc/adr/`
- Entwicklungsrichtlinien: `doc/guidelines/`

![Logo](public/pwa-192x192.png)
