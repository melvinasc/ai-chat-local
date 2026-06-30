// model.js — loads and runs a local LLM in the browser via WebLLM (WebGPU).
// Docs: https://github.com/mlc-ai/web-llm

import * as webllm from "https://esm.run/@mlc-ai/web-llm";

let engine = null;

export function isWebGPUAvailable() {
  return "gpu" in navigator;
}

/**
 * Load the chosen model. Reports progress via onProgress(text).
 */
export async function loadModel(modelId, onProgress) {
  if (!isWebGPUAvailable()) {
    throw new Error("WebGPU not available in this browser. Try latest Chrome or Edge on desktop.");
  }

  engine = await webllm.CreateMLCEngine(modelId, {
    initProgressCallback: (report) => {
      onProgress(report.text || "Loading...");
    },
  });

  return engine;
}

/**
 * Send the full message history to the model and stream back tokens.
 * messages: [{role: "user"|"assistant"|"system", content: "..."}]
 * onToken: called with each incremental chunk of text
 * Returns the full final text.
 */
export async function chatStream(messages, onToken) {
  if (!engine) throw new Error("Model not loaded yet.");

  const chunks = await engine.chat.completions.create({
    messages,
    stream: true,
    temperature: 0.7,
  });

  let fullText = "";
  for await (const chunk of chunks) {
    const delta = chunk.choices[0]?.delta?.content || "";
    fullText += delta;
    onToken(delta, fullText);
  }
  return fullText;
}
