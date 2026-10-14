import { copyFile, createHash, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const dist = path.join(root, "dist");
const pwa = path.join(root, "pwa");
const iconsOut = path.join(dist, "icons");

await mkdir(iconsOut, { recursive: true });
await copyFile(path.join(pwa, "manifest.webmanifest"), path.join(dist, "manifest.webmanifest"));
await copyFile(path.join(pwa, "icons", "zajel-icon.svg"), path.join(iconsOut, "zajel-icon.svg"));
await copyFile(path.join(pwa, "icons", "zajel-192.png"), path.join(iconsOut, "zajel-192.png"));

const indexPath = path.join(dist, "index.html");
let html = await readFile(indexPath, "utf8");
html = html.replace(/<meta\s+name=["']viewport["'][^>]*>/i,
  '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />');
html = html.replace(/<title>.*?<\/title>/i, "<title>زاجل</title>");

const marker = "<!-- ZAJEL PWA HEAD -->";
if (!html.includes(marker)) {
  const tags = [
    marker,
    '<link rel="manifest" href="/manifest.webmanifest" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="/icons/zajel-192.png" />',
    '<link rel="apple-touch-icon" href="/icons/zajel-192.png" />',
    '<meta name="theme-color" content="#E5501C" />',
    '<meta name="mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-capable" content="yes" />',
    '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
    '<meta name="apple-mobile-web-app-title" content="زاجل" />'
  ].join("\n");
  html = html.replace(/<head([^>]*)>/i, "<head$1>\n" + tags);
}

const swPath = path.join(pwa, "sw.js");
const sourceSw = await readFile(swPath, "utf8");
const buildId = createHash("sha256").update(html).digest("hex").slice(0, 16);
const builtSw = sourceSw.replaceAll("__BUILD_VERSION__", buildId);
await writeFile(path.join(dist, "sw.js"), builtSw, "utf8");

const registrationId = 'id="zajel-pwa-register"';
if (!html.includes(registrationId)) {
  const registerScript = `<script id="zajel-pwa-register">
(function () {
  if (!("serviceWorker" in navigator)) return;
  var hadController = Boolean(navigator.serviceWorker.controller);
  var reloadStarted = false;
  if (hadController) {
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      if (reloadStarted) return;
      reloadStarted = true;
      window.location.reload();
    });
  }
  window.addEventListener("load", async function () {
    try {
      var registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none"
      });
      var checkForUpdate = function () {
        if (document.visibilityState === "visible") {
          registration.update().catch(function () {});
        }
      };
      checkForUpdate();
      window.addEventListener("focus", checkForUpdate);
      document.addEventListener("visibilitychange", checkForUpdate);
      window.setInterval(checkForUpdate, 5 * 60 * 1000);
    } catch (_) {}
  });
})();
</script>`;
  html = html.replace(/<\/body>/i, registerScript + "\n</body>");
  await writeFile(indexPath, html, "utf8");
}
console.log("PWA build prepared; service worker revision: " + buildId);
