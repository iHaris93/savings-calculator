// scripts/generate-pdf.js
// Usage:
//   node scripts/generate-pdf.js "https://example.com/live.html?cameras=50&software=both&billing=yearly&expandBreakdown=1" "./out/estimate.pdf"
// Optional env:
//   PDF_FORMAT=Letter | A4   (default Letter)

import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

function ensurePrintMode(urlStr) {
  const url = new URL(urlStr);
  if (url.searchParams.get("print") !== "1") url.searchParams.set("print", "1");
  return url.toString();
}

async function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
}

async function generatePdf({ url, outPath, format }) {
  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Higher scale helps crisp text
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 2 });

  // Optional: surface page errors
  page.on("console", (msg) => {
    const type = msg.type();
    if (type === "error" || type === "warning") {
      // Keep this lightweight
      // eslint-disable-next-line no-console
      console.log(`[page:${type}]`, msg.text());
    }
  });

  const finalUrl = ensurePrintMode(url);

  await page.goto(finalUrl, { waitUntil: "networkidle0", timeout: 60000 });

  // Wait for ready OR error (fail fast with meaningful message)
  await page.waitForFunction(
    () => window.__PDF_READY__ === true || !!window.__PDF_ERROR__,
    { timeout: 30000 }
  );

  // Wait for fonts (prevents layout shift)
  await page.evaluate(async () => {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  });

  // Bail if your script set an error flag
  const err = await page.evaluate(() => window.__PDF_ERROR__ || null);
  if (err) {
    const detail = await page.evaluate(() => window.__PDF_ERROR_DETAIL__ || "");
    throw new Error(`PDF render error: ${err}${detail ? ` | ${detail}` : ""}`);
  }

  const pdfBuffer = await page.pdf({
    format: format || "Letter",     // "A4" also supported
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
  });

  await ensureDir(outPath);
  await fs.writeFile(outPath, pdfBuffer);

  await browser.close();
}

const inputUrl = process.argv[2];
const outPath = process.argv[3] || "./out/estimate.pdf";
const format = process.env.PDF_FORMAT || "Letter";

if (!inputUrl) {
  // eslint-disable-next-line no-console
  console.error(
    'Missing URL.\nExample:\n  node scripts/generate-pdf.js "https://example.com/live.html?cameras=50&software=both&billing=yearly&expandBreakdown=1" "./out/estimate.pdf"'
  );
  process.exit(1);
}

generatePdf({ url: inputUrl, outPath, format })
  .then(() => {
    // eslint-disable-next-line no-console
    console.log(`PDF generated: ${outPath}`);
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  });
