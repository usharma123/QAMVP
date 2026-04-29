import { expect, type Page } from '@playwright/test';
import type { TestData } from './testData';

export async function resetBrowserState(page: Page): Promise<void> {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.getByTestId('login-page')).toBeVisible();
}

export async function openLogin(page: Page): Promise<string> {
  await page.goto('/login');
  await expect(page.getByTestId('auth-username-field')).toBeVisible();
  await expect(page.getByTestId('login-password')).toBeVisible();
  await expect(page.getByTestId('auth-sign-in-btn')).toBeVisible();
  return 'Login controls are visible.';
}

export async function login(page: Page, data: TestData): Promise<string> {
  await page.goto('/login');
  await page.getByTestId('auth-username-field').fill(data.username || 'admin');
  await page.getByTestId('login-password').fill(data.password || 'admin');
  await page.getByTestId('auth-sign-in-btn').click();
  await expect(page.getByTestId('navbar')).toBeVisible();
  if (data.username) {
    await expect(page.getByTestId('navbar-user')).toContainText(data.username);
  }
  return `Logged in as ${data.username || 'admin'}.`;
}

export async function invalidLogin(page: Page, data: TestData): Promise<string> {
  await page.goto('/login');
  await page.getByTestId('auth-username-field').fill(data.username || 'admin');
  await page.getByTestId('login-password').fill(data.password || 'wrong-password');
  await page.getByTestId('auth-sign-in-btn').click();
  await expect(page.getByTestId('login-page')).toBeVisible();
  return 'Invalid login remained on login page.';
}

export async function logout(page: Page): Promise<string> {
  await page.getByTestId('navbar-logout').click();
  await expect(page.getByTestId('login-page')).toBeVisible();
  return 'Logged out and login page is visible.';
}

export async function navigateByTarget(page: Page, target?: string): Promise<string> {
  if (!target) {
    throw new Error('Navigation target missing from test data.');
  }
  if (target.startsWith('/')) {
    await page.goto(target);
    return `Opened route ${target}.`;
  }

  const tradingTargets = new Set(['nav-dashboard', 'nav-new-trade', 'nav-trade-list', 'nav-queue']);
  const adminTargets = new Set(['nav-user-list']);
  if (tradingTargets.has(target)) {
    await clickMenuTarget(page, 'trading-menu-trigger', target);
  } else if (adminTargets.has(target)) {
    await clickMenuTarget(page, 'nav-admin-trigger', target);
  } else {
    throw new Error(`Unsupported navigation target: ${target}`);
  }

  await waitForPageTarget(page, target);
  return `Navigated with ${target}.`;
}

export async function openTradingMenu(page: Page): Promise<string> {
  await page.getByTestId('trading-menu-trigger').click();
  for (const target of ['nav-dashboard', 'nav-new-trade', 'nav-trade-list', 'nav-queue']) {
    await expect(page.getByTestId(target)).toBeVisible();
  }
  return 'Trading menu links are visible.';
}

export async function openAdminMenu(page: Page): Promise<string> {
  await page.getByTestId('nav-admin-trigger').click();
  await expect(page.getByTestId('nav-user-list')).toBeVisible();
  return 'Admin menu users link is visible.';
}

export async function createTrade(page: Page, data: TestData): Promise<string> {
  await ensureTradePage(page);
  await populateTrade(page, data);
  await submitTrade(page);
  return `Submitted ${data.side || ''} ${data.ticker || ''} trade.`;
}

export async function populateTrade(page: Page, data: TestData): Promise<string> {
  await ensureTradePage(page);
  if (data.side) await selectByLabelOrValue(page.getByTestId('trade-side'), data.side);
  if (data.sector) await selectByLabelOrValue(page.locator('#marketSector'), data.sector);
  if (data.ticker) await selectByLabelOrValue(page.locator('#ticker'), data.ticker);
  if (data.accountType) await selectByLabelOrValue(page.locator('#accountType'), data.accountType);
  if (data.quantity) await page.locator('#quantity').fill(data.quantity);
  if (data.timeInForce) await selectByLabelOrValue(page.locator('#timeInForce'), data.timeInForce);
  if (data.expirationDate) await page.locator('#expirationDate').fill(data.expirationDate);
  return 'Trade form fields populated from test data.';
}

export async function setTimeInForce(page: Page, data: TestData): Promise<string> {
  await ensureTradePage(page);
  await selectByLabelOrValue(page.locator('#timeInForce'), data.timeInForce || 'GTC');
  await expect(page.locator('#expirationDate')).toBeVisible();
  return `Time in force set to ${data.timeInForce || 'GTC'}.`;
}

export async function verifyPriceAndTotal(page: Page, data: TestData): Promise<string> {
  if (data.expectedTickers) {
    const optionText = await page.locator('#ticker option').allInnerTexts();
    for (const ticker of data.expectedTickers.split('|').map((part) => part.trim()).filter(Boolean)) {
      expect(optionText.join('|')).toContain(ticker);
    }
  }
  if (data.expectedPrice) {
    await expectNumericInputValue(page, '#currentPrice', data.expectedPrice);
  }
  if (data.expectedTotal) {
    await expectNumericInputValue(page, '#totalValue', data.expectedTotal);
  }
  return `Price/total verified: ${data.expectedPrice || 'present'} / ${data.expectedTotal || 'present'}.`;
}

export async function submitTrade(page: Page): Promise<string> {
  await page.locator('button[type="submit"]').click();
  await expect(page.locator('body')).toContainText(/Order|submitted|pending|TX-/i);
  return 'Submit action completed and confirmation text was observed.';
}

export async function approveTrade(page: Page, data: TestData): Promise<string> {
  await navigateByTarget(page, 'nav-queue');
  const row = page
    .getByTestId('queue-row')
    .filter({ hasText: data.ticker || '' })
    .filter({ hasText: data.side || '' })
    .first();
  await expect(row).toBeVisible();
  await row.getByTestId('queue-action-approve').click();
  await expect(page.locator('body')).toContainText(/approved|Pending:/i);
  return `Approved ${data.side || ''} ${data.ticker || ''} row.`;
}

export async function verifyApprovalFeedback(page: Page, data: TestData): Promise<string> {
  const expected = data.expectedToast || 'approved';
  await expect(page.locator('body')).toContainText(expected);
  return `Observed approval feedback: ${expected}.`;
}

export async function verifyQueue(page: Page, data: TestData): Promise<string> {
  await navigateByTarget(page, 'nav-queue');
  if (data.expectedPending !== undefined) {
    await expect(page.getByTestId('queue-pending-count')).toContainText(`Pending: ${data.expectedPending}`);
  }
  if (data.ticker) await expect(page.locator('body')).toContainText(data.ticker);
  if (data.side) await expect(page.locator('body')).toContainText(data.side);
  if (data.quantity) await expect(page.locator('body')).toContainText(data.quantity);
  if (data.expectedMessage) await expect(page.locator('body')).toContainText(data.expectedMessage);
  if (data.expectedColumns) await verifyColumns(page, data.expectedColumns);
  return 'Approval Queue state verified.';
}

export async function verifyDashboard(page: Page, data: TestData): Promise<string> {
  await navigateByTarget(page, 'nav-dashboard');
  await expect(page.getByTestId('dashboard-page')).toBeVisible();
  if (data.expectedCount !== undefined) {
    await expect(page.getByTestId('dashboard-total-trades-label')).toContainText(`Total Trades: ${data.expectedCount}`);
  }
  if (data.expectedLabel) {
    await expect(page.locator('body')).toContainText(data.expectedLabel);
  }
  if (data.expectedColumns) await verifyColumns(page, data.expectedColumns);
  if (data.tickerAbsent === 'true' && data.ticker) {
    await expect(page.locator('body')).not.toContainText(data.ticker);
  } else if (data.ticker && data.expectedCount !== '0') {
    await expect(page.locator('body')).toContainText(data.ticker);
  }
  return 'Dashboard state verified.';
}

export async function verifyTradeList(page: Page, data: TestData): Promise<string> {
  await navigateByTarget(page, 'nav-trade-list');
  await expect(page.getByTestId('trade-list-page')).toBeVisible();
  if (data.ticker) await expect(page.locator('body')).toContainText(data.ticker);
  if (data.expectedStatus) await expect(page.locator('body')).toContainText(data.expectedStatus);
  if (data.expectedTotal !== undefined) await expect(page.getByTestId('trade-list-total')).toContainText(data.expectedTotal);
  if (data.expectedMatched !== undefined) {
    await expect(page.getByTestId('trade-list-matched-count')).toContainText(data.expectedMatched);
  }
  if (data.expectedPending !== undefined) {
    await expect(page.getByTestId('trade-list-pending-count')).toContainText(data.expectedPending);
  }
  if (data.expectedColumns) await verifyColumns(page, data.expectedColumns);
  if (data.expectedLabels) await verifyColumns(page, data.expectedLabels);
  return 'Trade List state verified.';
}

export async function verifyNavbar(page: Page, data: TestData): Promise<string> {
  await expect(page.getByTestId('navbar')).toBeVisible();
  if (data.expectedUser) await expect(page.getByTestId('navbar-user')).toContainText(data.expectedUser);
  return 'Navbar state verified.';
}

export async function verifyProtectedLinksUnavailable(page: Page): Promise<string> {
  await expect(page.getByTestId('navbar')).toHaveCount(0);
  return 'Authenticated navbar is unavailable.';
}

export async function verifyLoginError(page: Page, data: TestData): Promise<string> {
  await expect(page.getByTestId('login-error')).toContainText(data.expectedError || 'Invalid username or password');
  return 'Login error message verified.';
}

export async function openProtectedRouteLoggedOut(page: Page, targetRoute: string): Promise<string> {
  await page.goto(targetRoute, { waitUntil: 'domcontentloaded', timeout: 10_000 });
  await expect(page.getByTestId('login-page')).toBeVisible();
  await expect(page.getByTestId('navbar')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/New Trade|Total Trades:/);
  return `Opened ${targetRoute} while logged out and verified protected content is unavailable.`;
}

export async function verifyRequiredFieldBlock(page: Page, data: TestData): Promise<string> {
  await ensureTradePage(page);
  if (data.sector) await selectByLabelOrValue(page.locator('#marketSector'), data.sector);
  if (data.quantity !== undefined) await page.locator('#quantity').fill(data.quantity);
  const submit = page.locator('button[type="submit"]');
  const disabled = await submit.isDisabled();
  if (!disabled) {
    await submit.click();
    await expect(page.locator('body')).not.toContainText(/TX-\d+|submitted|pending approval/i);
  }
  return disabled ? 'Submit is disabled.' : 'Submission did not create a trade.';
}

async function ensureTradePage(page: Page): Promise<void> {
  if (!page.url().includes('/trade')) {
    await navigateByTarget(page, 'nav-new-trade');
  }
  await expect(page.locator('form')).toBeVisible();
}

async function waitForPageTarget(page: Page, target: string): Promise<void> {
  const targetToTestId: Record<string, string> = {
    'nav-dashboard': 'dashboard-page',
    'nav-new-trade': 'trade-form',
    'nav-trade-list': 'trade-list-page',
    'nav-queue': 'queue-page',
    'nav-user-list': 'user-list-page'
  };
  const testId = targetToTestId[target];
  if (target === 'nav-new-trade') {
    await expect(page.locator('form')).toBeVisible();
    return;
  }
  if (testId) {
    await expect(page.getByTestId(testId)).toBeVisible();
  }
}

async function clickMenuTarget(page: Page, triggerTestId: string, targetTestId: string): Promise<void> {
  const target = page.getByTestId(targetTestId);
  if ((await target.count()) > 0 && (await target.first().isVisible().catch(() => false))) {
    await target.first().click();
    return;
  }
  await page.getByTestId(triggerTestId).click();
  await expect(target).toBeVisible();
  await target.click();
}

async function selectByLabelOrValue(locator: ReturnType<Page['locator']>, value: string): Promise<void> {
  await locator.selectOption({ label: value }).catch(async () => {
    await locator.selectOption(value);
  });
}

async function verifyColumns(page: Page, raw: string): Promise<void> {
  for (const column of raw.split('|').map((part) => part.trim()).filter(Boolean)) {
    await expect(page.locator('body')).toContainText(column);
  }
}

async function expectNumericInputValue(page: Page, selector: string, expected: string): Promise<void> {
  await expect
    .poll(async () => Number(await page.locator(selector).inputValue()), {
      message: `${selector} should equal ${expected} numerically`
    })
    .toBeCloseTo(Number(expected), 2);
}
