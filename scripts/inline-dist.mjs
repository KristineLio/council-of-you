import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dist = "dist";
const assetsDir = join(dist, "assets");
let html = readFileSync(join(dist, "index.html"), "utf8");

for (const file of readdirSync(assetsDir)) {
  const abs = join(assetsDir, file);
  if (file.endsWith(".css")) {
    const css = readFileSync(abs, "utf8");
    html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/assets\/[^"]+"[^>]*>/, () => `<style>${css}</style>`);
  }
  if (file.endsWith(".js")) {
    const js = readFileSync(abs, "utf8").replace(/<\/script/gi, "<\\/script");
    html = html.replace(/<script type="module"[^>]*src="\.\/assets\/[^"]+"[^>]*><\/script>/, () => `<script type="module">${js}</script>`);
  }
}

html = html.replace(/^<!-- aha-build-id:.*\n/, "");
html = `<!-- aha-build-id: bmuvqdutjhpb705e9 -->\n${html}`;
writeFileSync(join(dist, "index.html"), html);
