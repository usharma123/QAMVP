# LLM Thinking: macro_plan

```
**Macro Selection for Trade Test**

Okay, let's break this test case down and identify the best macros from the registry to automate it. My primary goal here is to select the most appropriate macros to cover each step, and to ensure they align with the specified test flow, while avoiding any unnecessary complexity.

First, I need to log in as the maker; the `LoginAsMaker` macro is exactly what's required. Then, I need to create a buy trade, and for that, `CreateBuyTrade` is perfect, as it has all the parameters I need, and the same goes for the subsequent sell trade - I'll use `CreateSellTrade`. After that, it's time to log out, and so, the `Logout` macro it is.

Next, I need to log in as the checker. `LoginAsChecker` is the correct macro for that. The key here is to realize I need to *approve* both pending trades. The `ApproveTrade` macro approves only *one* trade at a time, so I'll need to call it twice. The test description specifically separates the create and approval steps across different user sessions, so the `CreateAndMatchTrade` macro is out of the question since it creates, approves, and matches within the same session. This is an important distinction and reason to select the `CreateBuyTrade`, `CreateSellTrade` and `ApproveTrade` combination.

The test description specifies "Verify approval queue has 2 pending trades" and "Navigate to trade list", and "Verify both trades are matched". There aren't specific macros for those assertions and navigation steps, and the prompt asks specifically for macro names, so I won't list any for those steps. These will have to be handled by primitive assertion and navigation steps *after* the macros have executed.

So, here's my ordered list of macros:

1.  `LoginAsMaker`
2.  `CreateBuyTrade`
3.  `CreateSellTrade`
4.  `Logout`
5.  `LoginAsChecker`
6.  `ApproveTrade` (for the first pending trade)
7.  `ApproveTrade` (for the second pending trade)
```
