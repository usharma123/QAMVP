"""
Action relevance — derive which advanced actions are relevant for a given step.

Step text is matched against keywords; only actions with matching keywords
are shown to the LLM. When no match is found, all actions are shown (fallback).

Macro bias: keywords favor *including* advanced actions in the filtered set so
the model sees macros before choosing primitives (composition_rules.md reinforces
preferring those macros when they cover the intent).
"""

# Keywords that indicate an action is relevant for a given step.
# Step text is lowercased; action is included if any keyword appears.
ACTION_KEYWORDS: dict[str, list[str]] = {
    "Login": ["login", "sign in", "log in"],
    "LoginAsMaker": ["login", "maker", "admin", "sign in"],
    "LoginAsChecker": ["login", "checker", "approver", "sign in"],
    "Logout": ["logout", "sign out", "log out"],
    "CreateTrade": ["create", "trade", "submit", "place order"],
    "CreateBuyTrade": ["buy", "purchase", "create trade", "buy trade"],
    "CreateSellTrade": ["sell", "create trade", "sell trade"],
    "CreateAndMatchTrade": [
        "match",
        "matching",
        "matched",
        "buy and sell",
        "create and match",
        "pair trades",
        "maker checker",
        "approve both",
    ],
    "ApproveTrade": ["approve", "approval", "queue", "approve trade"],
    "VerifyDashboardCount": ["dashboard", "count", "verify", "check count"],
}


def is_registered_action_name(name: str) -> bool:
    """True if `name` is a known advanced action in the keyword registry."""
    return name in ACTION_KEYWORDS


def get_relevant_actions_for_text(text: str) -> set[str] | None:
    """Return actions relevant to the given step/description, or None for all."""
    lower = text.lower().strip()
    if not lower:
        return None
    relevant = set()
    for action, keywords in ACTION_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            relevant.add(action)
    return relevant if relevant else None  # None = show all when no match
