import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(process.cwd());
const source = join(root, ".pages-src");
const output = join(root, "pages-dist");

rmSync(source, { recursive: true, force: true });
rmSync(output, { recursive: true, force: true });
mkdirSync(source, { recursive: true });

const copyText = (from, to, transform = (value) => value) => {
  const target = join(source, to);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, transform(readFileSync(join(root, from), "utf8")), "utf8");
};

copyText("app/page.tsx", "page.tsx");
copyText("app/RandomMotion.tsx", "RandomMotion.tsx");
copyText("app/projects.ts", "projects.ts", (value) =>
  value.replaceAll("/portfolio/", "./portfolio/").replaceAll("/projects/", "./projects/")
);
copyText("app/globals.css", "globals.css", (value) =>
  value.replace(/^\s*@import\s+[\"']tailwindcss[\"'];?\s*/m, "")
);

writeFileSync(join(source, "main.tsx"), `
import React from "react";
import { createRoot } from "react-dom/client";
import Home from "./page";
import "./globals.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Home /></React.StrictMode>
);
`, "utf8");

writeFileSync(join(source, "index.html"), `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#050606" />
    <meta name="description" content="张昊然 AIGC 视觉设计作品集" />
    <link rel="icon" href="./favicon.svg" />
    <title>张昊然｜AIGC 视觉设计作品集</title>
  </head>
  <body><div id="root"></div><script type="module" src="/main.tsx"></script></body>
</html>
`, "utf8");

writeFileSync(join(source, "vite.config.mjs"), `
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

const projectRoot = resolve(process.cwd());
export default defineConfig({
  root: resolve(projectRoot, ".pages-src"),
  base: "./",
  publicDir: resolve(projectRoot, "public"),
  plugins: [react()],
  build: {
    outDir: resolve(projectRoot, "pages-dist"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
`, "utf8");

const viteBin = process.platform === "win32"
  ? join(root, "node_modules", ".bin", "vite.cmd")
  : join(root, "node_modules", ".bin", "vite");

if (!existsSync(viteBin)) {
  throw new Error("Vite is not installed. Run npm ci before building GitHub Pages.");
}

const result = spawnSync(viteBin, ["build", "--config", join(source, "vite.config.mjs")], {
  cwd: root,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (result.status !== 0) process.exit(result.status ?? 1);
writeFileSync(join(output, ".nojekyll"), "", "utf8");

