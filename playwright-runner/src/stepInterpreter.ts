import type { Page } from '@playwright/test';
import type { TestStep } from './repository';
import { parseTestData } from './testData';
import { classifyStep } from './stepClassifier';
import {
  approveTrade,
  createTrade,
  invalidLogin,
  login,
  logout,
  navigateByTarget,
  openAdminMenu,
  openLogin,
  openProtectedRouteLoggedOut,
  openTradingMenu,
  populateTrade,
  setTimeInForce,
  submitTrade,
  verifyApprovalFeedback,
  verifyDashboard,
  verifyNavbar,
  verifyLoginError,
  verifyPriceAndTotal,
  verifyProtectedLinksUnavailable,
  verifyQueue,
  verifyRequiredFieldBlock,
  verifyTestIds,
  verifyTradeList
} from './blackBoxActions';

export class BlockedUnmappedStep extends Error {
  constructor(readonly step: TestStep) {
    super(`BLOCKED_UNMAPPED_STEP: ${step.step_number} ${step.step_description}`);
  }
}

export async function executeStep(page: Page, step: TestStep): Promise<string> {
  const data = parseTestData(step.test_data);
  const kind = classifyStep(step);

  switch (kind) {
    case 'openLogin':
      return openLogin(page);
    case 'invalidLogin':
      return invalidLogin(page, data);
    case 'login':
      return login(page, data);
    case 'logout':
      return logout(page);
    case 'openProtectedRouteLoggedOut':
      return openProtectedRouteLoggedOut(page, data.targetRoute);
    case 'navigate':
      return navigateByTarget(page, data.target || 'nav-new-trade');
    case 'openTradingMenu':
      return openTradingMenu(page);
    case 'openAdminMenu':
      return openAdminMenu(page);
    case 'createTrade':
      return createTrade(page, data);
    case 'populateTrade': {
      const populated = await populateTrade(page, data);
      if (data.expectedPrice || data.expectedTotal || data.expectedTickers) {
        const verified = await verifyPriceAndTotal(page, data);
        return `${populated} ${verified}`;
      }
      return populated;
    }
    case 'setTimeInForce':
      return setTimeInForce(page, data);
    case 'verifyPriceAndTotal':
      return verifyPriceAndTotal(page, data);
    case 'submitTrade':
      return submitTrade(page);
    case 'approveTrade':
      return approveTrade(page, data);
    case 'verifyApprovalFeedback':
      return verifyApprovalFeedback(page, data);
    case 'verifyQueue':
      return verifyQueue(page, data);
    case 'verifyDashboard': {
      const stepText = `${step.step_description} ${step.expected_output || ''}`.toLowerCase();
      const dashboardData = {
        ...data,
        tickerAbsent:
          stepText.includes('does not show') || stepText.includes('absent from dashboard') || stepText.includes('without approving')
            ? 'true'
            : data.tickerAbsent
      };
      return verifyDashboard(page, dashboardData);
    }
    case 'verifyTradeList':
      return verifyTradeList(page, data);
    case 'verifyNavbar':
      return verifyNavbar(page, data);
    case 'verifyProtectedLinksUnavailable':
      return verifyProtectedLinksUnavailable(page);
    case 'verifyLoginError':
      return verifyLoginError(page, data);
    case 'verifyRequiredFieldBlock':
      return verifyRequiredFieldBlock(page, data);
    case 'verifyTestIds':
      return verifyTestIds(page, data);
    default:
      throw new BlockedUnmappedStep(step);
  }
}
