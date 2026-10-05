import { test, expect } from '@playwright/test';

test.describe('share-target', () => {
  test('post a multipart request to /share-target and check that /check loads with the text', async ({ page }) => {
    const sharedText = 'Refund of Rs 5000 approved scan to receive';

    await page.goto('/');

    // Post multipart form to /share-target
    await page.evaluate((textToShare) => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/share-target';
      form.enctype = 'multipart/form-data';

      const input = document.createElement('input');
      input.type = 'text';
      input.name = 'text';
      input.value = textToShare;
      form.appendChild(input);

      document.body.appendChild(form);
      form.submit();
    }, sharedText);

    // Assert that it redirected to /check
    await page.waitForURL(/\/check/);

    // Check that the shared text is displayed and loaded into the flow
    await expect(page.locator('body')).toContainText('Refund of Rs 5000 approved');
  });

  test('handles empty shares gracefully', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/share-target';
      form.enctype = 'multipart/form-data';
      document.body.appendChild(form);
      form.submit();
    });

    await page.waitForURL(/\/check/);
    expect(page.url()).toContain('/check');
  });
});
