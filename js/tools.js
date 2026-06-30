// tools.js — free, keyless API calls for things the local model can't do
// reliably (no internet access, no math engine), so we intercept these queries
// before they reach the model.

// Matches things like "weather in Sydney", "what's the weather in Tokyo"
const WEATHER_PATTERN = /weather\s+(?:in|for|at)\s+([a-zA-Z\s]+)/i;

// Matches "calculate 12*7", "what is 45 / 3", "12+8=?", "2^10"
const CALC_PATTERN = /^(?:calculate|calc|what'?s|what is)?\s*([\d\s().+\-*/^%]+)\s*=?\s*\??$/i;

// Matches "search for ...", "look up ...", "google ..."
const SEARCH_PATTERN = /^(?:search(?: for)?|look up|google)\s+(.+)/i;

/**
 * Detect whether a message should be routed to a tool instead of the model.
 * Checked in order: weather, search, calculator. Returns null if none match.
 */
export function detectTool(message) {
  const weatherMatch = message.match(WEATHER_PATTERN);
  if (weatherMatch) {
    return { tool: "weather", arg: weatherMatch[1].trim() };
  }

  const searchMatch = message.match(SEARCH_PATTERN);
  if (searchMatch) {
    return { tool: "search", arg: searchMatch[1].trim() };
  }

  const calcMatch = message.match(CALC_PATTERN);
  // require at least one digit and one operator so plain numbers/words don't trigger it
  if (calcMatch && /[+\-*/^%]/.test(calcMatch[1]) && /\d/.test(calcMatch[1])) {
    return { tool: "calculator", arg: calcMatch[1].trim() };
  }

  return null;
}

/**
 * Safely evaluate a basic arithmetic expression without using eval().
 * Supports + - * / % ^ and parentheses.
 */
export function calculate(expression) {
  const sanitized = expression.replace(/\^/g, "**");

  if (!/^[\d\s().+\-*/%]+$/.test(sanitized.replace(/\*\*/g, ""))) {
    throw new Error("Expression contains unsupported characters.");
  }

  // Function constructor avoids access to outer scope, safer than eval()
  // for a fully sanitized, character-restricted numeric expression.
  const result = Function(`"use strict"; return (${sanitized});`)();

  if (typeof result !== "number" || !isFinite(result)) {
    throw new Error("Couldn't compute a valid result.");
  }

  return result;
}

/**
 * Basic free web search using DuckDuckGo's Instant Answer API (no key required).
 * Only returns a quick summary/abstract — not full search results — since most
 * free search APIs require a key. Good for quick facts, not deep research.
 */
export async function webSearch(query) {
  const res = await fetch(
    `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
  );
  const data = await res.json();

  if (data.AbstractText) {
    return `${data.AbstractText}${data.AbstractURL ? `\n\nSource: ${data.AbstractURL}` : ""}`;
  }

  if (data.RelatedTopics && data.RelatedTopics.length > 0) {
    const top = data.RelatedTopics.find((t) => t.Text) || data.RelatedTopics[0];
    if (top && top.Text) {
      return `${top.Text}${top.FirstURL ? `\n\nSource: ${top.FirstURL}` : ""}`;
    }
  }

  return `No quick summary found for "${query}". This tool only returns short instant-answer summaries, not full search results.`;
}

/**
 * Geocode a city name then fetch current weather, using Open-Meteo
 * (free, no API key required).
 */
export async function getWeather(cityName) {
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1`
  );
  const geoData = await geoRes.json();

  if (!geoData.results || geoData.results.length === 0) {
    return `I couldn't find a location called "${cityName}".`;
  }

  const { latitude, longitude, name, country } = geoData.results[0];

  const weatherRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
  );
  const weatherData = await weatherRes.json();
  const c = weatherData.current;

  const description = weatherCodeToText(c.weather_code);

  return `Current weather in ${name}, ${country}: ${c.temperature_2m}°C, ${description}, humidity ${c.relative_humidity_2m}%, wind ${c.wind_speed_10m} km/h.`;
}

function weatherCodeToText(code) {
  const map = {
    0: "clear sky",
    1: "mainly clear",
    2: "partly cloudy",
    3: "overcast",
    45: "fog",
    48: "freezing fog",
    51: "light drizzle",
    53: "moderate drizzle",
    55: "dense drizzle",
    61: "light rain",
    63: "moderate rain",
    65: "heavy rain",
    71: "light snow",
    73: "moderate snow",
    75: "heavy snow",
    80: "light rain showers",
    81: "moderate rain showers",
    82: "violent rain showers",
    95: "thunderstorm",
  };
  return map[code] || "unknown conditions";
}
