import fs from "node:fs";

const repos = [
  "8dazo/captor",
  "8dazo/baelys-app",
  "8dazo/phoneclaw",
  "8dazo/elix-db",
  "8dazo/drowser",
];

const labels = {
  "8dazo/captor": "Captar",
  "8dazo/baelys-app": "Baelys",
  "8dazo/phoneclaw": "PhoneClaw",
  "8dazo/elix-db": "elix-db",
  "8dazo/drowser": "Drowser",
};

const token = process.env.GITHUB_TOKEN;
const headers = {
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

async function getStars(repo) {
  const response = await fetch(`https://api.github.com/repos/${repo}`, { headers });
  if (!response.ok) throw new Error(`${repo}: GitHub API ${response.status}`);
  const json = await response.json();
  return json.stargazers_count ?? 0;
}

const today = new Date().toISOString().slice(0, 10);
const stars = {};
for (const repo of repos) stars[repo] = await getStars(repo);

fs.mkdirSync("data", { recursive: true });
const dataPath = "data/star-history.json";
let data = { repos, points: [] };
if (fs.existsSync(dataPath)) {
  try {
    data = JSON.parse(fs.readFileSync(dataPath, "utf8"));
  } catch {
    data = { repos, points: [] };
  }
}
data.repos = repos;
const current = { date: today, stars };
const existing = data.points.findIndex((p) => p.date === today);
if (existing >= 0) data.points[existing] = current;
else data.points.push(current);
data.points = data.points.sort((a, b) => a.date.localeCompare(b.date)).slice(-365);
fs.writeFileSync(dataPath, JSON.stringify(data, null, 2) + "\n");

const width = 1200;
const height = 390;
const left = 72;
const right = 40;
const top = 74;
const bottom = 78;
const plotW = width - left - right;
const plotH = height - top - bottom;
const maxStars = Math.max(1, ...data.points.flatMap((p) => repos.map((r) => p.stars?.[r] ?? 0)));
const palette = ["#C77E0A", "#7A8F63", "#92715B", "#6E7F91", "#9B7A8F"];

const x = (i) => (data.points.length <= 1 ? left + plotW / 2 : left + (i / (data.points.length - 1)) * plotW);
const y = (v) => top + plotH - (v / maxStars) * plotH;
const esc = (s) => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const grid = [0, 0.25, 0.5, 0.75, 1]
  .map((p) => {
    const value = Math.round(maxStars * p);
    const yy = y(value);
    return `<line x1="${left}" x2="${width - right}" y1="${yy}" y2="${yy}" stroke="#16140E" stroke-opacity=".08"/><text x="${left - 14}" y="${yy + 5}" text-anchor="end" class="axis">${value}</text>`;
  })
  .join("");

const series = repos
  .map((repo, repoIndex) => {
    const points = data.points.map((p, i) => `${x(i)},${y(p.stars?.[repo] ?? 0)}`).join(" ");
    const latest = data.points.at(-1)?.stars?.[repo] ?? 0;
    const lastX = x(data.points.length - 1);
    const lastY = y(latest);
    return `<polyline points="${points}" fill="none" stroke="${palette[repoIndex]}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${lastX}" cy="${lastY}" r="5" fill="${palette[repoIndex]}"/><text x="${lastX + 9}" y="${lastY - 8}" class="value" fill="${palette[repoIndex]}">${latest}</text>`;
  })
  .join("");

const legend = repos
  .map((repo, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const lx = 72 + col * 310;
    const ly = 338 + row * 24;
    const latest = data.points.at(-1)?.stars?.[repo] ?? 0;
    return `<circle cx="${lx}" cy="${ly - 4}" r="5" fill="${palette[i]}"/><text x="${lx + 13}" y="${ly}" class="legend">${esc(labels[repo])} · ${latest} ★</text>`;
  })
  .join("");

const firstDate = data.points.at(0)?.date ?? today;
const lastDate = data.points.at(-1)?.date ?? today;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="390" viewBox="0 0 1200 390" role="img" aria-labelledby="title desc">
<title id="title">Selected project star history</title>
<desc id="desc">Self-hosted daily star history for Devansh Mahant's selected GitHub projects.</desc>
<style>
text{font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.mono{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.axis{font-size:12px;fill:#8B8577}.legend{font-size:14px;fill:#57534A}.value{font-size:12px;font-weight:700}.title{font-size:22px;font-weight:700;fill:#16140E}.sub{font-size:13px;fill:#8B8577}.date{font-size:12px;fill:#8B8577}
</style>
<rect width="1200" height="390" rx="18" fill="#FFFCF0"/>
<text x="72" y="36" class="title">stars · selected projects</text>
<text x="72" y="58" class="sub mono">SELF-HOSTED DAILY SNAPSHOT · NO EXTERNAL STAR-HISTORY API</text>
${grid}
<line x1="${left}" x2="${width - right}" y1="${top + plotH}" y2="${top + plotH}" stroke="#16140E" stroke-opacity=".18"/>
${series}
<text x="${left}" y="${top + plotH + 25}" class="date">${firstDate}</text>
<text x="${width - right}" y="${top + plotH + 25}" text-anchor="end" class="date">${lastDate}</text>
${legend}
</svg>`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/star-history.svg", svg);
console.log(`Recorded stars for ${repos.length} repos on ${today}.`);
