# Quiet AI — Offline Qwen Chat

A mobile-first, installable PWA source project for private, local-first chat and study help.

## What it does

- Runs a small quantized **Qwen2.5 0.5B Instruct** model in the browser using Transformers.js and WebAssembly CPU inference.
- Does not send chat prompts to an inference API. Inference runs on the user's device.
- First launch downloads model weights from Hugging Face; the browser caches model files for later use.
- Markdown rendering, including tables, code blocks, lists, and headings.
- Extracts text from PDFs and common text/code files.
- For image attachments, attempts OCR; the included text model does **not** perform visual reasoning over image pixels.
- Stores conversation history locally in browser storage and exports history as JSON.
- PWA shell can be installed from a compatible browser.

## Important limits (please read)

This is not the Ollama application embedded in a web page. **Ollama is a separate runtime** and cannot be silently installed or bundled into a normal web app. This project instead runs a compatible Qwen model directly in the browser.

A general-purpose, high-IQ AI cannot be guaranteed by an app or by extra prompting. Qwen2.5 0.5B is deliberately small to reduce download and RAM requirements, but it is much less capable than larger models and may be slow on some phones. Larger models require substantially more RAM/storage and can overheat or crash low-memory devices.

The model must be downloaded at least once while online. Offline operation after that depends on browser cache/storage being retained, browser support, and device memory. If the browser clears site data, the model may need to be downloaded again. The app itself does not include hundreds of MB of model weights in this ZIP.

PDF text extraction does not read scanned pages as text. Image attachments are OCR-only in this build. DOCX is not parsed directly; export it as PDF/TXT first. This build does not parse arbitrary binary files, and it does not contain internet search.

The Google Fonts import is cosmetic and may fail offline; the system font fallback still works.

## Run locally

Install Node.js 20 or newer, then:

```bash
npm install
npm run dev
```

Open the local address printed by Vite. The model download happens the first time you send a prompt or press **Load model** in Settings.

For a production build:

```bash
npm run build
npm run preview
```

The generated `dist/` folder is static and can be hosted on any static host. A static host only serves the app shell and model files; it does not process your prompts. On a phone, use a browser that supports WebAssembly and enough storage/RAM. HTTPS is required for reliable PWA installation and service workers.

## Suggested testing

1. Run the app while online.
2. Open Settings → Load model and wait for the download to finish.
3. Send a test prompt and confirm a response.
4. Refresh once while online so the PWA shell is cached.
5. Test offline. If model loading fails, the browser did not retain every model asset or the runtime's cache is unavailable.
6. Test PDF/text attachment extraction using a small sample file.

## Privacy

Chats are saved in `localStorage` on this browser. They are not encrypted, and anyone with access to this browser profile may be able to read them. Do not use it for highly sensitive material on a shared device. Model downloads contact the model hosting provider; prompts are not sent as inference requests.
