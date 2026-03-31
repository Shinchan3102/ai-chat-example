import { tool } from "ai";
import { z } from "zod";

// ── 1. Weather ──────────────────────────────────────────────────────────────
const weatherTool = tool({
  description: "Get the current weather for a given location",
  inputSchema: z.object({
    location: z.string().describe("City name, e.g. 'San Francisco'"),
    units: z
      .enum(["celsius", "fahrenheit"])
      .describe("Temperature unit system"),
  }),
  strict: true,
  execute: async ({ location, units }) => {
    const conditions = ["sunny", "cloudy", "rainy", "snowy", "windy"] as const;
    const tempC = Math.floor(Math.random() * 30) + 5;
    return {
      location,
      temperature: units === "fahrenheit" ? Math.round(tempC * 1.8 + 32) : tempC,
      units,
      condition: conditions[Math.floor(Math.random() * conditions.length)],
      humidity: Math.floor(Math.random() * 60) + 30,
      windSpeedKmh: Math.floor(Math.random() * 40),
    };
  },
});

// ── 2. Calculate ────────────────────────────────────────────────────────────
const calculateTool = tool({
  description: "Evaluate a mathematical expression and return the result",
  inputSchema: z.object({
    expression: z
      .string()
      .describe("A math expression like '2 + 2' or '100 * 0.15'"),
    precision: z
      .number()
      .describe("Number of decimal places in the result (0-10)"),
  }),
  strict: true,
  execute: async ({ expression, precision }) => {
    try {
      const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
      const raw = new Function(`"use strict"; return (${sanitized})`)();
      return {
        expression,
        result: Number(Number(raw).toFixed(precision)),
      };
    } catch {
      return { expression, result: "Error: could not evaluate expression" };
    }
  },
});

// ── 3. Web Search ───────────────────────────────────────────────────────────
const webSearchTool = tool({
  description:
    "Search the web for information on a topic and return summarized results",
  inputSchema: z.object({
    query: z.string().describe("The search query"),
    maxResults: z
      .number()
      .describe("Maximum number of results to return (1-10)"),
    language: z
      .enum(["en", "es", "fr", "de", "ja", "zh"])
      .describe("Language for search results"),
  }),
  strict: true,
  execute: async ({ query, maxResults, language }) => {
    const domains = [
      "wikipedia.org",
      "stackoverflow.com",
      "github.com",
      "medium.com",
      "dev.to",
    ];
    return {
      query,
      language,
      results: Array.from({ length: Math.min(maxResults, 5) }, (_, i) => ({
        title: `Result ${i + 1} for "${query}"`,
        url: `https://${domains[i % domains.length]}/search?q=${encodeURIComponent(query)}`,
        snippet: `This is a simulated search result snippet #${i + 1} about "${query}" in ${language}.`,
      })),
    };
  },
});

// ── 4. Code Executor ────────────────────────────────────────────────────────
const codeExecutorTool = tool({
  description:
    "Execute a snippet of JavaScript/TypeScript code in a sandboxed environment and return stdout, stderr, and the final expression value",
  inputSchema: z.object({
    code: z.string().describe("The JavaScript/TypeScript code to execute"),
    language: z
      .enum(["javascript", "typescript"])
      .describe("Language of the code snippet"),
    timeout: z
      .number()
      .describe("Max execution time in milliseconds (100-5000)"),
  }),
  strict: true,
  execute: async ({ code, language, timeout }) => {
    const start = Date.now();
    try {
      const fn = new Function(`"use strict"; ${code}`);
      const result = fn();
      return {
        language,
        stdout: String(result ?? "undefined"),
        stderr: null,
        executionMs: Math.min(Date.now() - start, timeout),
        timedOut: false,
      };
    } catch (err) {
      return {
        language,
        stdout: null,
        stderr: String(err),
        executionMs: Math.min(Date.now() - start, timeout),
        timedOut: false,
      };
    }
  },
});

// ── 5. Text Analyzer ────────────────────────────────────────────────────────
const textAnalyzerTool = tool({
  description:
    "Analyze text to extract statistics: word count, sentence count, readability score, keyword frequency, and sentiment estimate",
  inputSchema: z.object({
    text: z.string().describe("The text to analyze"),
    analyses: z
      .array(
        z.enum([
          "word_count",
          "sentence_count",
          "readability",
          "keywords",
          "sentiment",
        ])
      )
      .describe("Which analyses to perform"),
  }),
  strict: true,
  execute: async ({ text, analyses }) => {
    const words = text.split(/\s+/).filter(Boolean);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const result: Record<string, unknown> = {};

    for (const a of analyses) {
      switch (a) {
        case "word_count":
          result.wordCount = words.length;
          break;
        case "sentence_count":
          result.sentenceCount = sentences.length;
          break;
        case "readability":
          result.avgWordsPerSentence =
            sentences.length > 0
              ? Math.round(words.length / sentences.length)
              : 0;
          result.readabilityGrade =
            words.length / Math.max(sentences.length, 1) < 15
              ? "easy"
              : "complex";
          break;
        case "keywords": {
          const freq: Record<string, number> = {};
          for (const w of words) {
            const lower = w.toLowerCase().replace(/[^a-z]/g, "");
            if (lower.length > 3) freq[lower] = (freq[lower] ?? 0) + 1;
          }
          result.topKeywords = Object.entries(freq)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([word, count]) => ({ word, count }));
          break;
        }
        case "sentiment": {
          const positive = [
            "good",
            "great",
            "love",
            "happy",
            "excellent",
            "awesome",
            "wonderful",
          ];
          const negative = [
            "bad",
            "terrible",
            "hate",
            "sad",
            "awful",
            "horrible",
            "worst",
          ];
          const lower = text.toLowerCase();
          const pos = positive.filter((w) => lower.includes(w)).length;
          const neg = negative.filter((w) => lower.includes(w)).length;
          result.sentiment =
            pos > neg ? "positive" : neg > pos ? "negative" : "neutral";
          result.sentimentScore = pos - neg;
          break;
        }
      }
    }
    return result;
  },
});

// ── 6. Unit Converter ───────────────────────────────────────────────────────
const unitConverterTool = tool({
  description:
    "Convert a value between units of measurement across length, weight, temperature, and data-size categories",
  inputSchema: z.object({
    value: z.number().describe("The numeric value to convert"),
    fromUnit: z
      .string()
      .describe("Source unit, e.g. 'km', 'lb', 'celsius', 'GB'"),
    toUnit: z
      .string()
      .describe("Target unit, e.g. 'miles', 'kg', 'fahrenheit', 'MB'"),
    category: z
      .enum(["length", "weight", "temperature", "data_size"])
      .describe("The measurement category"),
  }),
  strict: true,
  execute: async ({ value, fromUnit, toUnit, category }) => {
    const conversions: Record<string, Record<string, (v: number) => number>> = {
      length: {
        "km→miles": (v) => v * 0.621371,
        "miles→km": (v) => v * 1.60934,
        "m→ft": (v) => v * 3.28084,
        "ft→m": (v) => v * 0.3048,
        "cm→in": (v) => v * 0.393701,
        "in→cm": (v) => v * 2.54,
      },
      weight: {
        "kg→lb": (v) => v * 2.20462,
        "lb→kg": (v) => v * 0.453592,
        "g→oz": (v) => v * 0.035274,
        "oz→g": (v) => v * 28.3495,
      },
      temperature: {
        "celsius→fahrenheit": (v) => v * 1.8 + 32,
        "fahrenheit→celsius": (v) => (v - 32) / 1.8,
        "celsius→kelvin": (v) => v + 273.15,
        "kelvin→celsius": (v) => v - 273.15,
      },
      data_size: {
        "GB→MB": (v) => v * 1024,
        "MB→GB": (v) => v / 1024,
        "MB→KB": (v) => v * 1024,
        "KB→MB": (v) => v / 1024,
        "TB→GB": (v) => v * 1024,
        "GB→TB": (v) => v / 1024,
      },
    };
    const key = `${fromUnit}→${toUnit}`;
    const fn = conversions[category]?.[key];
    if (!fn) {
      return { error: `Unsupported conversion: ${key} in ${category}` };
    }
    return {
      original: { value, unit: fromUnit },
      converted: { value: Number(fn(value).toFixed(6)), unit: toUnit },
      category,
    };
  },
});

// ── 7. JSON Transformer ─────────────────────────────────────────────────────
const jsonTransformerTool = tool({
  description:
    "Parse, validate, and transform JSON data — flatten nested objects, pick/omit keys, or convert between formats",
  inputSchema: z.object({
    input: z.string().describe("Raw JSON string to transform"),
    operations: z
      .array(
        z.object({
          type: z
            .enum(["pick", "omit", "flatten", "sort_keys", "stringify"])
            .describe("The transformation operation"),
          keys: z
            .array(z.string())
            .describe(
              "Keys to pick or omit (ignored for flatten/sort_keys/stringify)"
            ),
        })
      )
      .describe("Ordered list of transformations to apply sequentially"),
  }),
  strict: true,
  execute: async ({ input, operations }) => {
    try {
      let data = JSON.parse(input);

      for (const op of operations) {
        if (typeof data !== "object" || data === null) break;

        switch (op.type) {
          case "pick": {
            const picked: Record<string, unknown> = {};
            for (const k of op.keys) if (k in data) picked[k] = data[k];
            data = picked;
            break;
          }
          case "omit": {
            const copy = { ...data };
            for (const k of op.keys) delete copy[k];
            data = copy;
            break;
          }
          case "flatten": {
            const flat: Record<string, unknown> = {};
            const walk = (obj: Record<string, unknown>, prefix: string) => {
              for (const [k, v] of Object.entries(obj)) {
                const path = prefix ? `${prefix}.${k}` : k;
                if (v && typeof v === "object" && !Array.isArray(v)) {
                  walk(v as Record<string, unknown>, path);
                } else {
                  flat[path] = v;
                }
              }
            };
            walk(data, "");
            data = flat;
            break;
          }
          case "sort_keys":
            data = Object.fromEntries(
              Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
            );
            break;
          case "stringify":
            return { result: JSON.stringify(data, null, 2) };
        }
      }
      return { result: data };
    } catch (err) {
      return { error: `Invalid JSON: ${String(err)}` };
    }
  },
});

// ── 8. Date/Time Utility ────────────────────────────────────────────────────
const dateTimeTool = tool({
  description:
    "Perform date/time operations: get current time in a timezone, calculate differences between dates, or add/subtract durations",
  inputSchema: z.object({
    operation: z
      .enum(["now", "difference", "add", "subtract", "format"])
      .describe("The date/time operation to perform"),
    date: z
      .string()
      .describe(
        "ISO 8601 date string (e.g. '2025-06-15T10:30:00Z'). Use 'now' for current time."
      ),
    timezone: z
      .string()
      .describe("IANA timezone identifier, e.g. 'America/New_York'"),
    secondDate: z
      .string()
      .describe(
        "Second ISO 8601 date for 'difference' operation, empty string otherwise"
      ),
    duration: z.object({
      days: z.number().describe("Number of days to add/subtract"),
      hours: z.number().describe("Number of hours to add/subtract"),
      minutes: z.number().describe("Number of minutes to add/subtract"),
    }).describe("Duration for add/subtract operations"),
  }),
  strict: true,
  execute: async ({ operation, date, timezone, secondDate, duration }) => {
    const d = date === "now" ? new Date() : new Date(date);

    switch (operation) {
      case "now":
        return {
          utc: new Date().toISOString(),
          local: new Date().toLocaleString("en-US", { timeZone: timezone }),
          timezone,
        };
      case "difference": {
        const d2 = new Date(secondDate);
        const diffMs = Math.abs(d2.getTime() - d.getTime());
        return {
          days: Math.floor(diffMs / 86400000),
          hours: Math.floor((diffMs % 86400000) / 3600000),
          minutes: Math.floor((diffMs % 3600000) / 60000),
          totalMinutes: Math.floor(diffMs / 60000),
        };
      }
      case "add":
      case "subtract": {
        const sign = operation === "add" ? 1 : -1;
        const ms =
          sign *
          (duration.days * 86400000 +
            duration.hours * 3600000 +
            duration.minutes * 60000);
        const result = new Date(d.getTime() + ms);
        return {
          original: d.toISOString(),
          result: result.toISOString(),
          local: result.toLocaleString("en-US", { timeZone: timezone }),
        };
      }
      case "format":
        return {
          iso: d.toISOString(),
          local: d.toLocaleString("en-US", { timeZone: timezone }),
          date: d.toLocaleDateString("en-US", { timeZone: timezone }),
          time: d.toLocaleTimeString("en-US", { timeZone: timezone }),
        };
    }
  },
});

// ── 9. Hash Generator ───────────────────────────────────────────────────────
const hashGeneratorTool = tool({
  description:
    "Generate a cryptographic hash of the provided data using the specified algorithm",
  inputSchema: z.object({
    data: z.string().describe("The string data to hash"),
    algorithm: z
      .enum(["SHA-1", "SHA-256", "SHA-384", "SHA-512"])
      .describe("Hash algorithm to use"),
    encoding: z
      .enum(["hex", "base64"])
      .describe("Output encoding format"),
  }),
  strict: true,
  execute: async ({ data, algorithm, encoding }) => {
    const encoder = new TextEncoder();
    const buffer = await crypto.subtle.digest(algorithm, encoder.encode(data));
    const bytes = new Uint8Array(buffer);

    let output: string;
    if (encoding === "hex") {
      output = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
    } else {
      output = Buffer.from(bytes).toString("base64");
    }

    return { algorithm, encoding, hash: output, inputLength: data.length };
  },
});

// ── 10. UUID Generator ──────────────────────────────────────────────────────
const uuidGeneratorTool = tool({
  description:
    "Generate one or more UUIDs with a specified version and optional namespace",
  inputSchema: z.object({
    count: z.number().describe("Number of UUIDs to generate (1-50)"),
    version: z
      .enum(["v4", "v7"])
      .describe("UUID version: v4 (random) or v7 (time-ordered)"),
    prefix: z
      .string()
      .describe("Optional prefix to prepend to each UUID, empty string for none"),
  }),
  strict: true,
  execute: async ({ count, version, prefix }) => {
    const uuids: string[] = [];
    const n = Math.min(Math.max(count, 1), 50);
    for (let i = 0; i < n; i++) {
      let id: string;
      if (version === "v7") {
        // simple v7-like: timestamp prefix + random
        const ts = Date.now().toString(16).padStart(12, "0");
        const rand = crypto.randomUUID().slice(13);
        id = `${ts.slice(0, 8)}-${ts.slice(8)}-7${rand.slice(5)}`;
      } else {
        id = crypto.randomUUID();
      }
      uuids.push(prefix ? `${prefix}${id}` : id);
    }
    return { version, count: uuids.length, uuids };
  },
});

// ── 11. Regex Tester ────────────────────────────────────────────────────────
const regexTesterTool = tool({
  description:
    "Test a regular expression against input text and return all matches with capture groups, indices, and match details",
  inputSchema: z.object({
    pattern: z.string().describe("The regular expression pattern (without delimiters)"),
    flags: z
      .string()
      .describe("Regex flags, e.g. 'gi' for global case-insensitive"),
    testString: z.string().describe("The text to test the regex against"),
    maxMatches: z
      .number()
      .describe("Maximum number of matches to return (1-100)"),
  }),
  strict: true,
  execute: async ({ pattern, flags, testString, maxMatches }) => {
    try {
      const re = new RegExp(pattern, flags);
      const matches: Array<{
        match: string;
        index: number;
        groups: Record<string, string> | null;
        captures: string[];
      }> = [];

      if (flags.includes("g")) {
        let m: RegExpExecArray | null;
        while (
          (m = re.exec(testString)) !== null &&
          matches.length < maxMatches
        ) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.groups ?? null,
            captures: m.slice(1),
          });
        }
      } else {
        const m = re.exec(testString);
        if (m) {
          matches.push({
            match: m[0],
            index: m.index,
            groups: m.groups ?? null,
            captures: m.slice(1),
          });
        }
      }

      return {
        pattern,
        flags,
        matchCount: matches.length,
        matches,
      };
    } catch (err) {
      return { error: `Invalid regex: ${String(err)}` };
    }
  },
});

// ── 12. HTTP Request ────────────────────────────────────────────────────────
const httpRequestTool = tool({
  description:
    "Make an HTTP request to a URL and return the response status, headers, and body",
  inputSchema: z.object({
    url: z.string().describe("The full URL to request"),
    method: z
      .enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"])
      .describe("HTTP method"),
    headers: z
      .array(
        z.object({
          key: z.string().describe("Header name"),
          value: z.string().describe("Header value"),
        })
      )
      .describe("Request headers as key-value pairs"),
    body: z
      .string()
      .describe("Request body (for POST/PUT/PATCH), empty string for none"),
    timeoutMs: z
      .number()
      .describe("Request timeout in milliseconds (100-30000)"),
  }),
  strict: true,
  execute: async ({ url, method, headers, body, timeoutMs }) => {
    try {
      const controller = new AbortController();
      const timer = setTimeout(
        () => controller.abort(),
        Math.min(timeoutMs, 30000)
      );

      const headerObj: Record<string, string> = {};
      for (const h of headers) headerObj[h.key] = h.value;

      const res = await fetch(url, {
        method,
        headers: headerObj,
        body: ["POST", "PUT", "PATCH"].includes(method) && body ? body : undefined,
        signal: controller.signal,
      });
      clearTimeout(timer);

      const text = await res.text();
      return {
        status: res.status,
        statusText: res.statusText,
        headers: Object.fromEntries(res.headers.entries()),
        body: text.slice(0, 4000),
        truncated: text.length > 4000,
      };
    } catch (err) {
      return { error: `Request failed: ${String(err)}` };
    }
  },
});

// ── 13. Data Aggregator ─────────────────────────────────────────────────────
const dataAggregatorTool = tool({
  description:
    "Compute aggregate statistics (sum, mean, median, min, max, stddev, percentiles) over a numeric dataset",
  inputSchema: z.object({
    values: z.array(z.number()).describe("Array of numeric values to aggregate"),
    operations: z
      .array(
        z.enum(["sum", "mean", "median", "min", "max", "stddev", "p95", "p99"])
      )
      .describe("Which aggregate operations to compute"),
    label: z
      .string()
      .describe("A human-readable label for this dataset"),
  }),
  strict: true,
  execute: async ({ values, operations, label }) => {
    if (values.length === 0) return { label, error: "Empty dataset" };

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / values.length;

    const percentile = (p: number) => {
      const idx = (p / 100) * (sorted.length - 1);
      const lo = Math.floor(idx);
      const hi = Math.ceil(idx);
      return lo === hi
        ? sorted[lo]
        : sorted[lo] * (hi - idx) + sorted[hi] * (idx - lo);
    };

    const result: Record<string, number> = {};
    for (const op of operations) {
      switch (op) {
        case "sum":
          result.sum = sum;
          break;
        case "mean":
          result.mean = Number(mean.toFixed(4));
          break;
        case "median":
          result.median = percentile(50);
          break;
        case "min":
          result.min = sorted[0];
          break;
        case "max":
          result.max = sorted[sorted.length - 1];
          break;
        case "stddev": {
          const variance =
            values.reduce((acc, v) => acc + (v - mean) ** 2, 0) / values.length;
          result.stddev = Number(Math.sqrt(variance).toFixed(4));
          break;
        }
        case "p95":
          result.p95 = Number(percentile(95).toFixed(4));
          break;
        case "p99":
          result.p99 = Number(percentile(99).toFixed(4));
          break;
      }
    }
    return { label, count: values.length, ...result };
  },
});
// ── Export ───────────────────────────────────────────────────────────────────
export const tools = {
  weather: weatherTool,
  calculate: calculateTool,
  webSearch: webSearchTool,
  codeExecutor: codeExecutorTool,
  textAnalyzer: textAnalyzerTool,
  unitConverter: unitConverterTool,
  jsonTransformer: jsonTransformerTool,
  dateTime: dateTimeTool,
  hashGenerator: hashGeneratorTool,
  uuidGenerator: uuidGeneratorTool,
  regexTester: regexTesterTool,
  httpRequest: httpRequestTool,
  dataAggregator: dataAggregatorTool,
  // cronParser: cronParserTool,
};
