# LLM Thinking: generation

```
**Generating a Test Script for TC-002**

Okay, here's the situation. The user is asking me to generate a test script for test case "TC-002", and the command used is `tun tc TC-002`. I immediately notice something is off - there's no natural language description of what this test case *actually* entails. Without that, I'm stuck. I can't conjure up valid test steps out of thin air!

The frustrating part is the instructions I have. I'm told to "Return ONLY valid JSON matching this schema" and "Do not include any extra text outside of the JSON string." That means I can't just come out and say "Hey, you forgot the description!" I have to work within the constraints.

So, here's my plan. If there are no describable steps, the `steps` array will be empty. I'll set the `testCaseId` to "TC-002", as requested, and since there's no way to infer a `requirementId`, that will remain empty. Essentially, I'll assume the user *meant* to provide a description and just forgot. I'll return the most "honest" JSON I can, given the circumstances.
```
