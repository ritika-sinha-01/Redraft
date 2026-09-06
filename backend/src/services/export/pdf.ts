import fs from "fs";
import puppeteer, { type Browser } from "puppeteer-core";

const LAUNCH_ARGS = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];

const CANDIDATE_PATHS = [
  process.env.CHROME_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((p): p is string => Boolean(p));

async function launchBrowser(): Promise<Browser> {
  try {
    return await puppeteer.launch({ headless: true, channel: "chrome", args: LAUNCH_ARGS });
  } catch {
    const executablePath = CANDIDATE_PATHS.find((p) => fs.existsSync(p));
    if (!executablePath) {
      throw new Error(
        "Chrome or Edge was not found. Install Google Chrome to export PDFs, or set CHROME_PATH."
      );
    }
    return await puppeteer.launch({ headless: true, executablePath, args: LAUNCH_ARGS });
  }
}

export async function renderPdf(html: string): Promise<Buffer> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load", timeout: 30000 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0.35in", right: "0.35in", bottom: "0.35in", left: "0.35in" },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
