# AI Chat (Local, Free)

A free, no-signup, no-server AI chatbot that runs entirely in your browser. No API keys, no backend, no costs — the language model downloads once and runs locally on your device using WebGPU.

Built as a learning project exploring local LLM inference and simple tool-use patterns (weather, search, calculator) alongside a small on-device model.

## Features

- **Runs fully client-side** — powered by [WebLLM](https://github.com/mlc-ai/web-llm), no server, no API key, no signup.
- **Choice of small models** — Llama 3.2 3B, Phi-3.5-mini, or Qwen2.5 1.5B, all quantized for browser use.
- **Live data tools** — common queries are intercepted and answered with real data instead of model guesses:
  - `weather in Sydney` → live conditions via [Open-Meteo](https://open-meteo.com/) (free, no key)
  - `calculate 24*7` → exact arithmetic, evaluated safely (not sent to the model)
  - `search for capital of Japan` → quick summary via [DuckDuckGo's Instant Answer API](https://duckduckgo.com/api)
- **Streaming responses** — tokens appear as they're generated, like a typical chat app.

## Why a local model instead of an API?

Local in-browser models are genuinely free and private (nothing leaves your device), but they're meaningfully weaker than hosted models like ChatGPT or Claude — smaller, no live internet access on their own, and less reliable at reasoning or factual recall. This project bridges some of that gap with hardcoded free-API tools for weather, search, and math, but it's best thought of as a lightweight demo/learning chatbot, not a replacement for a full hosted AI assistant.

## Requirements

- A browser with **WebGPU** support — the latest **Chrome** or **Edge** on desktop/laptop works best.
- A reasonably modern GPU. Older devices or unsupported browsers (Safari, most mobile browsers) won't be able to load the model.
- An internet connection for the **first load** (downloading the model, ~1–2.4GB depending on choice) and for the weather/search/tool calls. The chat itself, once the model is loaded, runs offline.

## Usage

1. Open `index.html` (or visit the GitHub Pages link below).
2. Pick a model from the dropdown.
3. Click **Load Model** and wait for the download/cache step (one-time per model, per browser).
4. Start chatting. Try:
   - `weather in Tokyo`
   - `calculate 156/12`
   - `search for who invented the telephone`

## Project structure

```
ai-chat-local/
├── index.html        # UI markup
├── css/
│   └── style.css     # Styling
├── js/
│   ├── main.js        # UI logic, chat rendering, tool routing
│   ├── model.js       # WebLLM loading + streaming inference
│   └── tools.js       # Weather / search / calculator tool logic
└── .nojekyll          # Tells GitHub Pages to skip Jekyll processing
```

## Limitations

- Small local models are noticeably weaker than hosted LLMs at reasoning, coding, and general knowledge accuracy.
- The weather/search/calculator tools use simple pattern matching, not the model's own judgment — phrasing that doesn't match the expected pattern falls through to the model itself.
- Search results are short instant-answer summaries only, not full ranked search results.
- First-time model load can be slow depending on connection speed and device performance.

## License

MIT — see [LICENSE](./LICENSE).
