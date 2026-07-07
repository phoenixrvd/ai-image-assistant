# AI Image Assistant

AI Image Assistant ist eine lokale, mobil-first gedachte PWA für KI-Bildgenerierung. Die App konzentriert sich auf Prompts, Bildvarianten, Referenzen und das Verwalten erzeugter Ergebnisse.

## Besonderheiten

- arbeitet lokal im Browser auf dem Gerät
- keine serverseitige Datenspeicherung durch die App
- lokale Persistenz über IndexedDB
- Unterstützung für Grok-Image
- Unterstützung für OpenAI-kompatible Bildmodelle
- frontend-only Architektur ohne eigenes Backend

## Datenschutz und Offline-Konzept

Projektdaten, Einstellungen, Modellkonfigurationen, API-Keys und Ergebnisse werden lokal im Browser gespeichert. Die App betreibt keine eigene serverseitige Datenbank und speichert keine Nutzerdaten auf einem eigenen Server.

Gespeicherte Inhalte und Verwaltungsfunktionen bleiben offline nutzbar. Eine Internetverbindung wird nur benötigt, wenn ein externer KI-Provider aktiv zur Bildgenerierung aufgerufen wird.

## Entwicklung

```bash
npm install
npm run dev
```

## Dokumentation

Details zu Anforderungen, Architekturentscheidungen und Entwicklungsrichtlinien liegen unter `doc/`.

![Logo](public/pwa-192x192.png)
