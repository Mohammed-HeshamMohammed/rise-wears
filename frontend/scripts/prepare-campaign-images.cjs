const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

// Read a JSON array of [generated source path, path relative to public/images].
// Existing files are protected so future campaigns can be prepared as siblings.
async function main() {
  const inputs = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
  const root = path.resolve(__dirname, "../public/images");
  for (const [source, relative] of inputs) {
    const dest = path.resolve(root, relative);
    if (!dest.startsWith(root + path.sep)) throw new Error("Asset must stay inside public/images");
    if (fs.existsSync(dest)) throw new Error(`Asset already exists: ${dest}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const info = await sharp(source).resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 86 }).toFile(dest);
    console.log(`${relative}: ${info.width}x${info.height}, ${Math.round(info.size / 1024)} KB`);
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
