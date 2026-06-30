// main.js — wires up the chat UI, model loading, and tool routing.

import { loadModel, chatStream, isWebGPUAvailable } from "./model.js";
import { detectTool, getWeather, calculate, webSearch } from "./tools.js";

const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const sendBtn = document.getElementById("sendBtn");
const loadBtn = document.getElementById("loadBtn");
const modelSelect = document.getElementById("modelSelect");
const statusEl = document.getElementById("status");

let history = [
  { role: "system", content: "You are a helpful, concise assistant running locally in the user's browser." }
];
let modelLoaded = false;

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `msg ${sender}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return div;
}

function addSystemNote(text) {
  const div = document.createElement("div");
  div.className = "msg system-note";
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// --- Model loading ---
loadBtn.addEventListener("click", async () => {
  if (!isWebGPUAvailable()) {
    addSystemNote("WebGPU isn't available in this browser. Try the latest Chrome or Edge on a desktop/laptop.");
    return;
  }

  loadBtn.disabled = true;
  modelSelect.disabled = true;
  statusEl.textContent = "Loading model...";

  try {
    await loadModel(modelSelect.value, (progressText) => {
      statusEl.textContent = progressText;
    });
    modelLoaded = true;
    statusEl.textContent = "Model ready";
    userInput.disabled = false;
    sendBtn.disabled = false;
    addSystemNote("Model loaded. You can start chatting.");
  } catch (err) {
    statusEl.textContent = "Failed to load";
    addSystemNote(`Error loading model: ${err.message}`);
    loadBtn.disabled = false;
    modelSelect.disabled = false;
  }
});

// --- Sending messages ---
async function handleSend() {
  const text = userInput.value.trim();
  if (!text || !modelLoaded) return;

  addMessage(text, "user");
  userInput.value = "";
  sendBtn.disabled = true;
  userInput.disabled = true;

  // Check if this is something better answered by a live data/tool call
  const toolMatch = detectTool(text);

  if (toolMatch) {
    const loadingLabel = {
      weather: "Checking weather...",
      search: "Searching...",
      calculator: "Calculating...",
    }[toolMatch.tool];

    const botDiv = addMessage(loadingLabel, "bot");

    try {
      let result;
      if (toolMatch.tool === "weather") {
        result = await getWeather(toolMatch.arg);
      } else if (toolMatch.tool === "search") {
        result = await webSearch(toolMatch.arg);
      } else if (toolMatch.tool === "calculator") {
        result = `${toolMatch.arg} = ${calculate(toolMatch.arg)}`;
      }
      botDiv.textContent = result;
      history.push({ role: "user", content: text });
      history.push({ role: "assistant", content: result });
    } catch (err) {
      botDiv.textContent = `Couldn't complete that: ${err.message}`;
    }
  } else {
    history.push({ role: "user", content: text });
    const botDiv = addMessage("...", "bot");

    try {
      await chatStream(history, (delta, fullText) => {
        botDiv.textContent = fullText;
        chatWindow.scrollTop = chatWindow.scrollHeight;
      });
      history.push({ role: "assistant", content: botDiv.textContent });
    } catch (err) {
      botDiv.textContent = `Error: ${err.message}`;
    }
  }

  sendBtn.disabled = false;
  userInput.disabled = false;
  userInput.focus();
}

sendBtn.addEventListener("click", handleSend);
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleSend();
});

// Warn early if WebGPU isn't supported
if (!isWebGPUAvailable()) {
  addSystemNote("Heads up: this browser doesn't support WebGPU, so the local model won't load. Try the latest Chrome or Edge on desktop.");
}
