# LLM Thinking: macro_plan

```
**My Macro Selection Process**

Okay, here's how I'm thinking about this. The goal is to build an ordered list of macros that accurately reflect the steps outlined in the test description. I'm going to go through each step, one by one, and determine the most appropriate macro from the registry, keeping in mind that I need to avoid listing primitive steps.

First, I need to log in as the maker. The test data explicitly provides the username and password as "admin" and "admin" respectively. Looking at the registry, `LoginAsMaker` immediately jumps out. It's a perfect fit, so that's what I'll use for step one.

Next, I need to create a buy trade for 100 AAPL. The test data provides all the necessary parameters: sector, ticker, quantity, account type, and time in force. The registry has `CreateBuyTrade` and it takes those exact parameters, so that seems like the obvious choice.

Then, I need to create a sell trade for 100 AAPL, with the same parameters as the buy order. Again, the registry has a `CreateSellTrade` macro, also taking the correct parameters, so that goes in the list.

Now I need to verify approval queue pending trades. This is where it gets a little tricky. I need to verify that there are two pending trades but I don't see anything in the registry that directly addresses this, and the instruction is not to include primitives. Therefore, I will not include a macro for this step.

Next, I need to log out. The registry has a `Logout` macro, so it's a straightforward selection.

Then, I need to log in as checker, and the test data provides the checker's credentials. The registry has `LoginAsChecker`, which is the correct macro.

The next step is to approve both pending trades. The registry has `ApproveTrade`, which will click the approve button on the *first* pending trade. To approve *both* trades, I would need to invoke this macro twice, and that's exactly what I'll do.

Next, I have to navigate to a trade list. There isn't a dedicated macro for that in the registry. It's likely a primitive navigation or click, so it's not relevant to this list.

Finally, I need to verify both trades are matched on a trade list. Again, no macro specifically handles this, and it would likely involve primitive assertions, so I won't list anything for this step either.

I also considered `CreateAndMatchTrade`, but that macro approves trades as soon as they are created, under the *maker* user, which contradicts the test's instruction to explicitly approve trades under the checker user. I need to create a buy, then create a sell, then approve them separately as the checker user.

So, here's my list of macros:

*   `LoginAsMaker`
*   `CreateBuyTrade`
*   `CreateSellTrade`
*   `Logout`
*   `LoginAsChecker`
*   `ApproveTrade` (This needs to be called twice)

The note should explain why these macros are chosen.
```
