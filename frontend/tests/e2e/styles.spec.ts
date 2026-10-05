import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('styles regression tests', () => {
  test('styles, font-family, background, and responsive nav behave correctly', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const testResultsDir = path.resolve('test-results');
    if (!fs.existsSync(testResultsDir)) {
      fs.mkdirSync(testResultsDir, { recursive: true });
    }

    // --- Desktop 1440px Viewport ---
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Assert no CSP or Refused errors
    for (const err of consoleErrors) {
      expect(err).not.toContain('Content Security Policy');
      expect(err).not.toContain('Refused to');
    }

    // Assert Font Family
    const fontFamily = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
    expect(fontFamily).toContain('Plus Jakarta Sans');

    // Assert Body Background Color
    const bgColor = await page.evaluate(() => window.getComputedStyle(document.body).backgroundColor);
    const validBgColors = ['rgb(13, 13, 13)', 'rgb(18, 18, 18)'];
    expect(validBgColors).toContain(bgColor);

    // Desktop Nav vs Hamburger
    // Desktop Nav is in div with class "hidden md:flex"
    const desktopNav = page.locator('header .md\\:flex, header .hidden.md\\:flex').first();
    const hamburgerBtn = page.locator('header button[aria-label*="Navigation Menu"]').first();

    await expect(desktopNav).toBeVisible();
    await expect(hamburgerBtn).not.toBeVisible();

    // Assert PillButton border radius
    const pillBtn = page.locator('button:has-text("Analyze a Payment"), button:has-text("Verify QR")').first();
    const borderRadius = await pillBtn.evaluate((el) => {
      const style = window.getComputedStyle(el);
      const br = style.borderRadius;
      const num = parseFloat(br) || 0;
      return { str: br, num };
    });
    expect(
      borderRadius.num >= 20 ||
      borderRadius.str.includes('9999') ||
      borderRadius.str.includes('infinity') ||
      borderRadius.num >= 24
    ).toBe(true);

    // Save screenshots for 1440px
    await page.screenshot({ path: path.join(testResultsDir, 'landing-1440.png') });
    await page.goto('/check');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(testResultsDir, 'check-1440.png') });

    // --- Mobile 390px Viewport ---
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const mobileDesktopNav = page.locator('header .hidden.md\\:flex').first();
    const mobileHamburgerBtn = page.locator('header button[aria-label*="Navigation Menu"]').first();

    await expect(mobileDesktopNav).not.toBeVisible();
    await expect(mobileHamburgerBtn).toBeVisible();

    // Save screenshots for 390px
    await page.screenshot({ path: path.join(testResultsDir, 'landing-390.png') });
    await page.goto('/check');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(testResultsDir, 'check-390.png') });
  });
});
