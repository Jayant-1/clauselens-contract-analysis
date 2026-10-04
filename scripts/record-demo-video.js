/* eslint-disable @typescript-eslint/no-require-imports */
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function recordDemo() {
  const outputDir = path.resolve(__dirname, '../public/demo');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  console.log('[Demo Recorder] Launching Chromium with video recording...');
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: outputDir,
      size: { width: 1440, height: 900 }
    }
  });

  const page = await context.newPage();
  const baseUrl = process.env.DEMO_URL || 'http://localhost:3000';

  console.log(`[Demo Recorder] Navigating to ${baseUrl}...`);
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Show loaded agreements library
  console.log('[Demo Recorder] Inspecting agreements library...');
  await page.waitForSelector('text=Agreements', { timeout: 10000 });
  await page.waitForTimeout(2000);

  // 2. Select single agreement: saas_agreement_v1.docx
  console.log('[Demo Recorder] Selecting saas_agreement_v1.docx...');
  const clearBtn = page.locator('button:has-text("Clear")');
  if (await clearBtn.isVisible()) {
    await clearBtn.click();
    await page.waitForTimeout(1000);
  }

  const v1SelectBtn = page.locator('div:has-text("saas_agreement_v1.docx") button:has-text("Select")').first();
  if (await v1SelectBtn.isVisible()) {
    await v1SelectBtn.click();
    await page.waitForTimeout(1500);
  }

  // 3. Ask Single Document Question: What is the liability cap?
  console.log('[Demo Recorder] Asking single document liability query...');
  const inputSelector = 'textarea[placeholder*="Ask about liability caps"]';
  await page.waitForSelector(inputSelector);
  await page.fill(inputSelector, 'What is the liability cap? Quote the exact contractual wording.');
  await page.waitForTimeout(1200);
  await page.click('button:has-text("Ask")');

  // Wait for agent steps & response to stream
  console.log('[Demo Recorder] Waiting for agent research steps and streaming tokens...');
  await page.waitForTimeout(5000);

  // 4. Click Citation "Inspect" to highlight in DocumentViewer
  console.log('[Demo Recorder] Clicking citation inspect to pulse highlight...');
  const inspectBtn = page.locator('button:has-text("Inspect")').first();
  if (await inspectBtn.isVisible()) {
    await inspectBtn.click();
    await page.waitForTimeout(3500);
  }

  // 5. Select both contracts for Multi-Document Inquiry
  console.log('[Demo Recorder] Selecting both contracts for comparative inquiry...');
  const allBtn = page.locator('button:has-text("All")');
  if (await allBtn.isVisible()) {
    await allBtn.click();
    await page.waitForTimeout(1500);
  }

  // 6. Ask Multi-Document Comparison Question
  console.log('[Demo Recorder] Asking multi-document liability comparison...');
  await page.fill(inputSelector, 'Compare the liability cap in the two contracts. State the old and new amount, with a quote from each document.');
  await page.waitForTimeout(1200);
  await page.click('button:has-text("Ask")');
  await page.waitForTimeout(6000);

  // 7. Open Contract Comparison View
  console.log('[Demo Recorder] Opening side-by-side contract comparison modal...');
  const compareBtn = page.locator('button:has-text("Compare")').first();
  if (await compareBtn.isVisible()) {
    await compareBtn.click();
    await page.waitForTimeout(4000);

    // Filter by high significance
    const highFilterBtn = page.locator('button:has-text("High")').first();
    if (await highFilterBtn.isVisible()) {
      await highFilterBtn.click();
      await page.waitForTimeout(2500);
    }

    // Close comparison modal by clicking close button
    const closeComparisonBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeComparisonBtn.isVisible()) {
      await closeComparisonBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 8. Open Risk Audit Modal
  console.log('[Demo Recorder] Opening Risk Audit matrix...');
  const riskBtn = page.locator('button:has-text("Risk Audit")').first();
  if (await riskBtn.isVisible()) {
    await riskBtn.click();
    await page.waitForTimeout(3500);

    const closeRiskBtn = page.locator('div.fixed.inset-0 button:has(svg.lucide-x)').first();
    if (await closeRiskBtn.isVisible()) {
      await closeRiskBtn.click();
      await page.waitForTimeout(1500);
    }
  }

  // 9. Negative Constraint / Safe Fallback Test
  console.log('[Demo Recorder] Testing out-of-scope negative constraint...');
  await page.fill(inputSelector, 'What is the penalty for late delivery of physical hardware?');
  await page.waitForTimeout(1200);
  await page.click('button:has-text("Ask")');
  await page.waitForTimeout(4000);

  console.log('[Demo Recorder] Walkthrough complete, saving video...');
  await page.close();
  await context.close();
  await browser.close();

  // Find the recorded video and rename it to a canonical name
  const files = fs.readdirSync(outputDir).filter(f => f.endsWith('.webm'));
  if (files.length > 0) {
    const latestFile = files.sort((a, b) => fs.statSync(path.join(outputDir, b)).mtimeMs - fs.statSync(path.join(outputDir, a)).mtimeMs)[0];
    const canonicalPath = path.join(outputDir, 'clauselens-demo-walkthrough.webm');
    fs.copyFileSync(path.join(outputDir, latestFile), canonicalPath);
    console.log(`[Demo Recorder] Video saved to ${canonicalPath}`);
  }
}

recordDemo().catch(err => {
  console.error('[Demo Recorder] Error:', err);
  process.exit(1);
});
