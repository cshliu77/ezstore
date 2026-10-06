import { test, expect } from '@playwright/test';

test.describe('Agent Chat UI', () => {
  test('should render chat page with welcome message', async ({ page }) => {
    await page.goto('/agent');
    await expect(page.locator('h2')).toHaveText('智能助理');

    // Should show the welcome message
    await expect(page.getByText('EZStore 報價單管理助手')).toBeVisible();
    await expect(page.getByText('查詢、複製、修改報價單')).toBeVisible();

    // Should have input field and send button
    await expect(page.getByPlaceholder('輸入您的指令...')).toBeVisible();
    await expect(page.getByRole('button', { name: '送出' })).toBeVisible();
  });

  test('should have agent link in sidebar navigation', async ({ page }) => {
    await page.goto('/');
    const sidebar = page.locator('aside');
    await expect(sidebar.getByText('智能助理')).toBeVisible();

    // Click and verify navigation
    await sidebar.getByText('智能助理').click();
    await expect(page).toHaveURL(/\/agent$/);
    await expect(page.locator('h2')).toHaveText('智能助理');
  });

  test('should show user message in chat after typing and sending', async ({ page }) => {
    await page.goto('/agent');

    const input = page.getByPlaceholder('輸入您的指令...');
    await input.fill('我要查詢報價單');

    // Send button should be enabled
    const sendButton = page.getByRole('button', { name: '送出' });
    await expect(sendButton).toBeEnabled();

    await sendButton.click();

    // User message should appear
    await expect(page.getByText('我要查詢報價單')).toBeVisible();

    // Input should be cleared
    await expect(input).toHaveValue('');
  });
});
