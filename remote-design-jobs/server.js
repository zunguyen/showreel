// Remote Design Jobs — tiny aggregator server (no dependencies, Node 18+)
// Reads sources.json (editable by hand), fetches each source, normalizes,
// filters to design roles, classifies region eligibility, serves a UI.

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = process.env.PORT || 4321;
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, "public");
const SOURCES_FILE = path.join(ROOT, "sources.json");
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

let cache = { at: 0, payload: null };

// ---------- helpers ----------

function readConfig() {
  return JSON.parse(fs.readFileSync(SOURCES_FILE, "utf8"));
}

function getPath(obj, dotted) {
  if (!dotted) return undefined;
  return dotted.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function stripHtml(s) {
  return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function decodeEntities(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

const APAC_WORDS = [
  "apac", "asia", "asia-pacific", "asia pacific", "oceania",
  "australia", "new zealand", "singapore", "japan", "korea", "taiwan",
  "hong kong", "philippines", "indonesia", "malaysia", "thailand",
  "india", "china", "cambodia", "laos", "myanmar",
];
const WORLDWIDE_WORDS = [
  "worldwide", "anywhere", "global", "international", "any location",
  "no restriction", "🌏", "🌍", "🌎", "remote - all", "all regions",
];

function classifyRegion(locationText) {
  const t = String(locationText || "").toLowerCase();
  if (!t.trim()) return "unspecified";
  if (/viet\s?nam/.test(t)) return "vietnam";
  if (WORLDWIDE_WORDS.some((w) => t.includes(w))) return "worldwide";
  if (APAC_WORDS.some((w) => t.includes(w))) return "apac";
  return "other";
}

function matchesRole(title, keywords) {
  const t = String(title || "").toLowerCase();
  // whole-word match so "ui" doesn't hit "required" or "SwiftUI"
  return keywords.some((k) => {
    const esc = k.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(^|[^a-z])${esc}([^a-z]|$)`).test(t);
  });
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (remote-design-jobs personal aggregator)",
      Accept: "application/json, application/rss+xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// ---------- source parsers ----------

function parseJsonSource(source, body) {
  let data = JSON.parse(body);
  const root = source.map.root ? getPath(data, source.map.root) : data;
  if (!Array.isArray(root)) throw new Error("root is not an array");
  const jobs = [];
  for (const item of root) {
    if (item == null || typeof item !== "object") continue;
    const title = getPath(item, source.map.title);
    const url = getPath(item, source.map.url);
    if (!title || !url) continue; // skips e.g. Remote OK's legal-notice first row
    let tags = getPath(item, source.map.tags);
    if (typeof tags === "string") tags = tags.split(",").map((s) => s.trim());
    jobs.push({
      title: stripHtml(title),
      company: stripHtml(getPath(item, source.map.company) || ""),
      location: stripHtml(getPath(item, source.map.location) || ""),
      url: String(url),
      date: getPath(item, source.map.date) || null,
      tags: Array.isArray(tags) ? tags.slice(0, 6) : [],
      salary: stripHtml(getPath(item, source.map.salary) || ""),
      source: source.name,
    });
  }
  return jobs;
}

function rssField(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? decodeEntities(m[1]).trim() : "";
}

function parseRssSource(source, body) {
  const jobs = [];
  const items = body.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of items) {
    let title = rssField(block, "title");
    const link = rssField(block, "link");
    if (!title || !link) continue;
    // We Work Remotely style: "Company: Job Title"
    let company = "";
    const colon = title.indexOf(": ");
    if (colon > 0 && colon < 60) {
      company = title.slice(0, colon);
      title = title.slice(colon + 2);
    }
    const region = rssField(block, "region") || rssField(block, "category");
    jobs.push({
      title: stripHtml(title),
      company,
      location: stripHtml(region),
      url: link,
      date: rssField(block, "pubDate") || null,
      tags: [],
      salary: "",
      source: source.name,
    });
  }
  return jobs;
}

// ---------- aggregation ----------

async function collectJobs() {
  const config = readConfig();
  const keywords = config.roleKeywords || ["designer", "ux", "ui"];
  const enabled = (config.sources || []).filter((s) => s.enabled !== false);

  const results = await Promise.allSettled(
    enabled.map(async (source) => {
      const body = await fetchText(source.url);
      return source.type === "rss"
        ? parseRssSource(source, body)
        : parseJsonSource(source, body);
    })
  );

  const jobs = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") jobs.push(...r.value);
    else errors.push({ source: enabled[i].name, error: String(r.reason.message || r.reason) });
  });

  const seen = new Set();
  const filtered = [];
  for (const job of jobs) {
    if (!matchesRole(job.title, keywords)) continue;
    const key = job.url.replace(/[?#].*$/, "").replace(/\/+$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    job.region = classifyRegion(job.location);
    job.date = job.date ? new Date(job.date).toISOString() : null;
    if (job.date === "Invalid Date") job.date = null;
    filtered.push(job);
  }
  filtered.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return {
    fetchedAt: new Date().toISOString(),
    sources: enabled.map((s) => s.name),
    errors,
    total: filtered.length,
    jobs: filtered,
  };
}

// ---------- http server ----------

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/api/jobs") {
    const force = url.searchParams.has("refresh");
    try {
      if (force || !cache.payload || Date.now() - cache.at > CACHE_TTL_MS) {
        cache = { at: Date.now(), payload: await collectJobs() };
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(cache.payload));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  if (url.pathname === "/api/sources") {
    try {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(readConfig()));
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err.message || err) }));
    }
    return;
  }

  // static files
  let file = url.pathname === "/" ? "/index.html" : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
  const full = path.join(PUBLIC_DIR, file);
  if (!full.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end(); return; }
  fs.readFile(full, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(full)] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Remote Design Jobs running at http://localhost:${PORT}`);
});
