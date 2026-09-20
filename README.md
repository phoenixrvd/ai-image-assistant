# AI Image Assistant

[Deutsch](README.de.md)

AI Image Assistant is a mobile-first PWA for AI-powered image generation. It combines a streamlined prompt workflow with locally managed sessions, reference images, and configurable AI providers.

## Features

- Generate images from prompts and refine them through further variations
- Set image count, aspect ratio, and session-specific style rules
- Upload reference images or use generated images as references
- Compare and download results or use them as source images for further editing
- Manage sessions, prompt history, and results locally
- Configure OpenAI-compatible APIs, fal.ai, and OpenRouter

## Usage

Configure providers with their API URL and API key in the options. You can then start a session, enter a prompt, and select an available image model. Generated results and their prompts remain traceable within the session.

## Data and Privacy

The app has no backend of its own. Settings, API keys, sessions, and images are stored exclusively in the browser using IndexedDB. Generation requests are sent directly from the browser to the configured external AI provider and are subject to that provider's privacy policy.

Stored content and management features remain available offline. Image generation and automatic session naming require an internet connection.

## Development

```bash
npm install
npm run dev
```

## Documentation

- Product requirements: `doc/requirements/`
- Architecture decisions: `doc/adr/`
- Development guidelines: `doc/guidelines/`

![Logo](public/pwa-192x192.png)
