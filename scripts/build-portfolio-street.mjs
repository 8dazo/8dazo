import fs from "node:fs";
import path from "node:path";

const portfolioRoot = path.resolve("portfolio-src");
const streetSource = fs.readFileSync(
  path.join(portfolioRoot, "components/scene/street-svg.ts"),
  "utf8"
);
const sceneCss = fs.readFileSync(path.join(portfolioRoot, "app/scene.css"), "utf8");
const dataSource = fs.readFileSync(path.join(portfolioRoot, "lib/data.ts"), "utf8");

const svgMatch = streetSource.match(/export const streetSvg\s*=\s*`([\s\S]*?)`;?/);
if (!svgMatch) throw new Error("Could not extract streetSvg from portfolio source");

const projects = [];
const projectPattern = /index:\s*"([^"]+)"[\s\S]*?name:\s*"([^"]+)"[\s\S]*?tagline:\s*"([^"]+)"/g;
for (const match of dataSource.matchAll(projectPattern)) {
  projects.push({ index: match[1], name: match[2], tagline: match[3] });
}
if (!projects.length) throw new Error("Could not extract projects from portfolio data");

const esc = (value) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

const total = projects.length * 4;
const projectCss = projects
  .map((_, i) => {
    const start = (i / projects.length) * 100;
    const visibleEnd = ((i + 0.88) / projects.length) * 100;
    const end = ((i + 1) / projects.length) * 100;
    return `
.project-${i + 1}{animation:project-${i + 1} ${total}s infinite}
@keyframes project-${i + 1}{
  0%,${Math.max(0, start - 0.35).toFixed(2)}%{opacity:0;transform:translateY(8px)}
  ${start.toFixed(2)}%,${visibleEnd.toFixed(2)}%{opacity:1;transform:translateY(0)}
  ${end.toFixed(2)}%,100%{opacity:0;transform:translateY(-8px)}
}`;
  })
  .join("\n");

const projectMarkup = projects
  .map(
    (project, i) => `
  <g class="readout project-${i + 1}" opacity="0">
    <text x="70" y="-25" class="read-index">${esc(project.index)}</text>
    <text x="135" y="-25" class="read-name">${esc(project.name)}</text>
    <text x="${290 + Math.min(project.name.length * 17, 210)}" y="-25" class="read-tagline">${esc(project.tagline)}</text>
  </g>`
  )
  .join("");

const readoutCss = `
svg.sv-street{background:#FFFCF0;overflow:hidden}
.readout{pointer-events:none}
.read-index{fill:#C77E0A;font:600 22px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:4px}
.read-name{fill:#16140E;font:650 34px Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.read-tagline{fill:#8B8577;font:400 27px Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.read-hint{fill:#8B8577;font:500 17px ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;letter-spacing:3px}
.far{animation:sv-readme-far 142.5s linear infinite!important}
.mid{animation:sv-readme-mid 41.8181818s linear infinite!important}
.near{animation:sv-readme-near 17.2222222s linear infinite!important}
@keyframes sv-readme-far{from{transform:translateX(0)}to{transform:translateX(-5700px)}}
@keyframes sv-readme-mid{from{transform:translateX(0)}to{transform:translateX(-4600px)}}
@keyframes sv-readme-near{from{transform:translateX(0)}to{transform:translateX(-3100px)}}
${projectCss}
@media (prefers-reduced-motion:reduce){.far,.mid,.near,.readout,.walker *{animation-play-state:paused!important}}
`;

let svg = svgMatch[1];
svg = svg.replace(
  /<svg\s+([^>]*)>/,
  '<svg xmlns="http://www.w3.org/2000/svg" class="sv-street sv-street-view" role="img" aria-labelledby="title desc" $1>'
);
svg = svg.replace(/viewBox="[^"]+"/, 'viewBox="0 -58 2320 209"');
svg = svg.replace(
  /<g class="walker"([^>]*)>/,
  (_full, attrs) => {
    const clean = attrs.replace(/\s+transform="[^"]*"/, "");
    return `<g class="walker"${clean} transform="translate(300 136) scale(1.9)">`;
  }
);

const title = `
<title id="title">Devansh Mahant — selected projects</title>
<desc id="desc">The actual animated walking street scene from devansh.aurat.ai, adapted to run inside a GitHub README.</desc>`;

svg = svg.replace(/<svg([^>]*)>/, `<svg$1>${title}`);
svg = svg.replace(
  "</defs>",
  `<style><![CDATA[\n${sceneCss}\n${readoutCss}\n]]></style></defs>${projectMarkup}\n<text x="1760" y="-25" class="read-hint">WALKING THROUGH THE WORK →</text>`
);

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/portfolio-street.svg", svg);
console.log(`Generated assets/portfolio-street.svg from ${projects.length} portfolio projects.`);
