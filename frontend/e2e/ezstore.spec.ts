import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test('should display summary cards with correct icons', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toHaveText('系統總覽');

    const cards = page.locator('.bg-white.rounded-lg.shadow');
    await expect(cards).toHaveCount(4);

    const expectedIcons = ['客', '品', '報', '單'];
    for (let i = 0; i < 4; i++) {
      const iconBlock = cards.nth(i).locator('.rounded-lg.flex.items-center');
      await expect(iconBlock).toHaveText(expectedIcons[i]);
    }

    const expectedLabels = ['客戶數', '產品數', '報價單數', '訂單數'];
    for (let i = 0; i < 4; i++) {
      await expect(cards.nth(i).locator('.text-gray-500')).toHaveText(expectedLabels[i]);
      const value = cards.nth(i).locator('.text-3xl');
      await expect(value).toHaveCount(1);
      const text = await value.textContent();
      expect(Number(text)).toBeGreaterThan(0);
    }
  });
});

test.describe('Customer Management', () => {
  test('should display fictional company names', async ({ page }) => {
    await page.goto('/customers');
    await expect(page.locator('h2')).toHaveText('客戶管理');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);

    const pageText = await page.locator('tbody').textContent();
    const fictionalNames = ['史塔克工業', '膠囊公司', '韋恩企業', '怪獸電力公司', '神盾局科技'];
    const found = fictionalNames.some((name) => pageText?.includes(name));
    expect(found).toBe(true);
  });
});

test.describe('Product Management', () => {
  test('should display product list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.locator('h2')).toHaveText('產品管理');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Quotation Management', () => {
  test('should display list and view detail', async ({ page }) => {
    await page.goto('/quotations');
    await expect(page.locator('h2')).toHaveText('報價單管理');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Click first "查看" button
    const viewButton = rows.first().getByText('查看');
    await viewButton.click();

    // Verify detail page
    await expect(page.locator('h2')).toContainText('報價單 QT-');

    // Should have customer info section
    await expect(page.getByText('客戶', { exact: true })).toBeVisible();
    await expect(page.getByText('報價因子')).toBeVisible();

    // Should have items table
    await expect(page.getByText('報價產品明細')).toBeVisible();
    const itemHeaders = ['產品名稱', '牌價', '單價', '數量', '復價'];
    for (const header of itemHeaders) {
      await expect(page.getByText(header, { exact: false }).first()).toBeVisible();
    }

    // Should have totals
    await expect(page.getByText('總價').first()).toBeVisible();
    await expect(page.getByText('獲利金額')).toBeVisible();
    await expect(page.getByText('獲利率')).toBeVisible();
  });
});

test.describe('Order Management', () => {
  test('should only have view button, no edit or delete', async ({ page }) => {
    await page.goto('/orders');
    await expect(page.locator('h2')).toHaveText('訂單管理');

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Should have "查看" button
    await expect(rows.first().getByText('查看')).toBeVisible();

    // Should NOT have "編輯" or "刪除" buttons
    await expect(rows.first().getByText('編輯')).toHaveCount(0);
    await expect(rows.first().getByText('刪除')).toHaveCount(0);

    // "新增訂單" button should still exist
    await expect(page.getByText('新增訂單')).toBeVisible();
  });

  test('should display read-only detail page', async ({ page }) => {
    await page.goto('/orders');
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();

    // Click first "查看" button
    await rows.first().getByText('查看').click();

    // Verify detail page
    await expect(page.locator('h2')).toContainText('訂單 ORD-');

    // Should have order info
    await expect(page.getByText('客戶').first()).toBeVisible();
    await expect(page.getByText('訂單明細')).toBeVisible();
    await expect(page.getByText('總價').first()).toBeVisible();

    // Should only have "返回列表" button, no edit/delete
    await expect(page.getByText('返回列表')).toBeVisible();
    await expect(page.getByRole('button', { name: '編輯' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: '刪除' })).toHaveCount(0);

    // Click "返回列表" and verify navigation
    await page.getByText('返回列表').click();
    await expect(page).toHaveURL(/\/orders$/);
  });
});

test.describe('API Health Check', () => {
  test('should return ok', async ({ request }) => {
    const apiUrl = process.env.API_URL || 'http://localhost:8080';
    const response = await request.get(`${apiUrl}/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('ok');
  });
});
