import { test, expect } from '@playwright/test';

// e2e smoke: search → open movie → chat send → rate → vote

test('search suggests, open movie, send chat, vote, rate', async ({ page }) => {
  await page.goto('/');

  // suggestions
  const input = page.getByPlaceholder('Найти фильм или сериал...');
  await input.fill('тест');
  await page.waitForTimeout(400); // debounce
  const suggestBox = page.getByTestId('suggestions');
  if (await suggestBox.count()) {
    await suggestBox.getByRole('link').first().click();
  } else {
    // fallback: click first card once results appear
    await page.getByRole('link').first().click();
  }

  await expect(page).toHaveURL(/\/movie\//);
  await expect(page.getByText('Описание')).toBeVisible();

  // chat: send message
  const chatInput = page.getByPlaceholder('Введите текст');
  await chatInput.fill('e2e: привет 👋');
  await page.getByRole('button', { name: 'Отправить' }).first().click();
  await expect(page.getByText('e2e: привет')).toBeVisible();

  // vote up
  await page.getByRole('button', { name: 'upvote' }).first().click();

  // rate 8
  await page.getByRole('button', { name: '8 из 10' }).click();
});
