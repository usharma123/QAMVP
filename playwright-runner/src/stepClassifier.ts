import type { TestStep } from './repository';
import { parseTestData } from './testData';

export type StepKind =
  | 'openLogin'
  | 'invalidLogin'
  | 'login'
  | 'logout'
  | 'openProtectedRouteLoggedOut'
  | 'navigate'
  | 'openTradingMenu'
  | 'openAdminMenu'
  | 'createTrade'
  | 'populateTrade'
  | 'setTimeInForce'
  | 'verifyPriceAndTotal'
  | 'submitTrade'
  | 'approveTrade'
  | 'verifyApprovalFeedback'
  | 'verifyQueue'
  | 'verifyDashboard'
  | 'verifyTradeList'
  | 'verifyNavbar'
  | 'verifyProtectedLinksUnavailable'
  | 'verifyLoginError'
  | 'verifyRequiredFieldBlock'
  | 'unmapped';

export function classifyStep(step: TestStep): StepKind {
  const text = step.step_description.toLowerCase();
  const expected = (step.expected_output || '').toLowerCase();
  const data = parseTestData(step.test_data);

  if (text.includes('open login page')) return 'openLogin';
  if (text.includes('invalid credentials')) return 'invalidLogin';
  if (text.includes('login as')) return 'login';
  if (text.includes('logout')) return 'logout';

  if ((text.includes('open /') || text.includes('directly')) && data.targetRoute) {
    return 'openProtectedRouteLoggedOut';
  }

  if (data.target) return 'navigate';
  if (text.includes('navigate to new trade')) return 'navigate';
  if (text.includes('open trading dropdown') || text.includes('open trading menu')) return 'openTradingMenu';
  if (text.includes('open admin dropdown')) return 'openAdminMenu';

  if (text.includes('create ') && hasTradeData(data)) return 'createTrade';
  if (text.includes('change time in force')) return 'setTimeInForce';
  if ((text.includes('select ') || text.includes('populate ') || text.includes('change quantity') || text.includes('change ticker')) && hasTradeData(data)) {
    return 'populateTrade';
  }
  if (text.includes('wait for') && (text.includes('price') || text.includes('total'))) return 'verifyPriceAndTotal';
  if (text.includes('submit')) return 'submitTrade';

  if (text.includes('approve')) return 'approveTrade';
  if (
    text.includes('trade list') ||
    text.includes('matched with') ||
    text.includes('populated row') ||
    text.includes('summary after unmatched approval') ||
    data.expectedMatched !== undefined ||
    data.expectedTotal !== undefined ||
    data.expectedLabels !== undefined
  ) {
    return 'verifyTradeList';
  }

  if (text.includes('approval feedback') || text.includes('toast')) return 'verifyApprovalFeedback';
  if (text.includes('approval queue') || text.includes('queue') || data.expectedPending !== undefined) return 'verifyQueue';

  if (text.includes('dashboard') || expected.includes('dashboard')) return 'verifyDashboard';

  if (text.includes('navbar') || text.includes('role label') || data.expectedUser) return 'verifyNavbar';
  if (text.includes('login error')) return 'verifyLoginError';
  if (text.includes('trading menu is unavailable')) return 'verifyProtectedLinksUnavailable';
  if (text.includes('required fields') || text.includes('leave ') || text.includes('quantity 0')) {
    return 'verifyRequiredFieldBlock';
  }

  return 'unmapped';
}

function hasTradeData(data: Record<string, string>): boolean {
  return Boolean(data.side || data.sector || data.ticker || data.accountType || data.quantity || data.timeInForce);
}
