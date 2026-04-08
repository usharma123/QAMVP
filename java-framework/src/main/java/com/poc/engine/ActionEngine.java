package com.poc.engine;

import com.poc.models.IpcMessage;
import com.poc.models.StepModel;
import com.poc.utils.LocatorRepository;
import com.poc.utils.StdioProtocol;

import org.openqa.selenium.*;
import org.openqa.selenium.io.FileHandler;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import java.io.File;
import java.nio.file.Path;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Executes individual test steps against a Selenium WebDriver.
 * Resolves locators via LocatorRepository, substitutes ${var} references,
 * and communicates with the orchestrator via StdioProtocol on failure.
 */
public class ActionEngine {

    private static final Set<String> BUILT_IN_ACTIONS = Set.of(
        "OPEN_URL", "CLICK", "TYPE", "SELECT",
        "READ_TEXT", "READ_ATTRIBUTE",
        "WAIT_VISIBLE", "WAIT_HIDDEN",
        "SCREENSHOT", "ASSERT_TEXT", "ASSERT_VISIBLE",
        "ASSERT_VARIABLE", "ASSERT_CONTAINS"
    );

    private static final Pattern VAR_PATTERN = Pattern.compile("\\$\\{(\\w+)}");
    private static final int MAX_HEAL_RETRIES = 2;

    private final WebDriver driver;
    private final LocatorRepository locatorRepo;
    private final StdioProtocol protocol;
    private final Path resultsDir;
    private final int loadTimeFactorMs;
    private final Map<String, String> variables = new LinkedHashMap<>();
    private final Map<Integer, Integer> healAttempts = new HashMap<>();

    public ActionEngine(WebDriver driver, LocatorRepository locatorRepo,
                        StdioProtocol protocol, Path resultsDir) {
        this(driver, locatorRepo, protocol, resultsDir, 0);
    }

    public ActionEngine(WebDriver driver, LocatorRepository locatorRepo,
                        StdioProtocol protocol, Path resultsDir, int loadTimeFactorMs) {
        this.driver = driver;
        this.locatorRepo = locatorRepo;
        this.protocol = protocol;
        this.resultsDir = resultsDir;
        this.loadTimeFactorMs = Math.max(0, loadTimeFactorMs);
    }

    public Map<String, String> getVariables() { return variables; }

    public static boolean isBuiltIn(String action) {
        return BUILT_IN_ACTIONS.contains(action.toUpperCase());
    }

    /**
     * Execute a single step. Returns true if the step passed.
     */
    public boolean execute(StepModel step, int stepIndex) {
        healAttempts.remove(stepIndex);
        return executeInternal(step, stepIndex);
    }

    private boolean executeInternal(StepModel step, int stepIndex) {
        String action = step.getAction().toUpperCase();
        String resolvedLocator = resolveLocator(step.getLocator());
        String input = substituteVars(step.getTestInput());
        String outputVar = step.getOutput();

        try {
            String result = dispatch(action, resolvedLocator, input);
            if (outputVar != null && !outputVar.isEmpty() && result != null) {
                variables.put(outputVar, result);
            }
            emitResult(stepIndex, step, "PASS", "");
            sleepLoadTimeFactor();
            return true;
        } catch (AssertionError ae) {
            StdioProtocol.log("Step " + stepIndex + " assertion failed: " + ae.getMessage());
            emitResult(stepIndex, step, "FAIL", ae.getMessage());
            return false;
        } catch (Exception e) {
            StdioProtocol.log("Step " + stepIndex + " failed: " + e.getMessage());
            return handleFailure(step, stepIndex, e);
        }
    }

    private void emitResult(int stepIndex, StepModel step, String status, String detail) {
        protocol.sendStepResult(stepIndex, step.getAction(), status, detail,
            step.getTcStep(), step.getParentAction(), step.getSubStepLabel());
    }

    private void sleepLoadTimeFactor() {
        if (loadTimeFactorMs > 0) {
            try {
                Thread.sleep(loadTimeFactorMs);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new RuntimeException("Load time factor sleep interrupted", e);
            }
        }
    }

    private String dispatch(String action, String xpath, String input) throws Exception {
        switch (action) {
            case "OPEN_URL":
                driver.get(input);
                return null;

            case "CLICK":
                findElement(xpath).click();
                return null;

            case "TYPE":
                WebElement typeEl = findElement(xpath);
                typeEl.clear();
                typeEl.sendKeys(input);
                return null;

            case "SELECT":
                new Select(findElement(xpath)).selectByVisibleText(input);
                return null;

            case "READ_TEXT":
                return findElement(xpath).getText();

            case "READ_ATTRIBUTE":
                return findElement(xpath).getAttribute(input);

            case "WAIT_VISIBLE": {
                int timeout = input != null && !input.isEmpty() ? Integer.parseInt(input) : 10;
                new WebDriverWait(driver, Duration.ofSeconds(timeout))
                    .until(ExpectedConditions.visibilityOfElementLocated(By.xpath(xpath)));
                return null;
            }

            case "WAIT_HIDDEN": {
                int timeout = input != null && !input.isEmpty() ? Integer.parseInt(input) : 10;
                new WebDriverWait(driver, Duration.ofSeconds(timeout))
                    .until(ExpectedConditions.invisibilityOfElementLocated(By.xpath(xpath)));
                return null;
            }

            case "SCREENSHOT": {
                File src = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
                String name = input != null && !input.isEmpty() ? input : "screenshot_" + System.currentTimeMillis();
                File dest = resultsDir.resolve(name + ".png").toFile();
                dest.getParentFile().mkdirs();
                FileHandler.copy(src, dest);
                StdioProtocol.log("Screenshot saved: " + dest.getAbsolutePath());
                return dest.getAbsolutePath();
            }

            case "ASSERT_TEXT": {
                String actual = findElement(xpath).getText();
                if (!actual.equals(input)) {
                    throw new AssertionError("Expected text '" + input + "' but got '" + actual + "'");
                }
                return null;
            }

            case "ASSERT_VISIBLE": {
                if (!findElement(xpath).isDisplayed()) {
                    throw new AssertionError("Element not visible: " + xpath);
                }
                return null;
            }

            case "ASSERT_VARIABLE": {
                int eq = input.indexOf('=');
                if (eq < 0) throw new IllegalArgumentException("ASSERT_VARIABLE requires 'varName=expected value'");
                String varName = input.substring(0, eq).trim();
                String expected = input.substring(eq + 1);
                String actual = variables.getOrDefault(varName, null);
                if (actual == null) {
                    throw new AssertionError("Variable '${" + varName + "}' not set");
                }
                if (!actual.equals(expected)) {
                    throw new AssertionError("Variable '${" + varName + "}': expected '" + expected + "' but got '" + actual + "'");
                }
                return null;
            }

            case "ASSERT_CONTAINS": {
                int eq = input.indexOf('=');
                if (eq < 0) throw new IllegalArgumentException("ASSERT_CONTAINS requires 'varName=expected substring'");
                String varName = input.substring(0, eq).trim();
                String expected = input.substring(eq + 1);
                String actual = variables.getOrDefault(varName, null);
                if (actual == null) {
                    throw new AssertionError("Variable '${" + varName + "}' not set");
                }
                if (!actual.contains(expected)) {
                    throw new AssertionError("Variable '${" + varName + "}': expected to contain '" + expected + "' but got '" + actual + "'");
                }
                return null;
            }

            default:
                throw new UnsupportedOperationException("Unknown action: " + action);
        }
    }

    private WebElement findElement(String xpath) {
        return new WebDriverWait(driver, Duration.ofSeconds(5))
            .until(ExpectedConditions.presenceOfElementLocated(By.xpath(xpath)));
    }

    private String resolveLocator(String ref) {
        if (ref == null || ref.isEmpty()) return ref;
        return locatorRepo.resolve(ref);
    }

    /** Replace all ${varName} tokens in the input string with variable values. */
    public String substituteVars(String input) {
        if (input == null) return null;
        Matcher m = VAR_PATTERN.matcher(input);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String varName = m.group(1);
            String val = variables.getOrDefault(varName, m.group(0));
            m.appendReplacement(sb, Matcher.quoteReplacement(val));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    /**
     * On step failure, ask the orchestrator for help via IPC.
     * Apply the suggested solution and retry up to MAX_HEAL_RETRIES times.
     */
    private boolean handleFailure(StepModel step, int stepIndex, Exception e) {
        int attempts = healAttempts.getOrDefault(stepIndex, 0);
        if (attempts >= MAX_HEAL_RETRIES) {
            StdioProtocol.log("Step " + stepIndex + " exhausted " + MAX_HEAL_RETRIES + " heal attempts — marking FAIL");
            emitResult(stepIndex, step, "FAIL",
                "Healing exhausted after " + MAX_HEAL_RETRIES + " retries. Last error: " + e.getMessage());
            return false;
        }
        healAttempts.put(stepIndex, attempts + 1);

        try {
            String currentUrl = "";
            try { currentUrl = driver.getCurrentUrl(); } catch (Exception ignored) {}

            IpcMessage solution = protocol.requestHelp(
                stepIndex, step.getAction(), step.getLocator(),
                e.getClass().getSimpleName() + ": " + e.getMessage(),
                currentUrl
            );

            if (solution == null || solution.getType() == null) {
                emitResult(stepIndex, step, "FAIL", e.getMessage());
                return false;
            }

            String solutionAction = solution.getAction();
            Map<String, String> params = solution.getParams() != null ? solution.getParams() : Map.of();

            switch (solutionAction != null ? solutionAction.toUpperCase() : "") {
                case "WAIT_VISIBLE":
                case "WAIT_HIDDEN": {
                    String loc = params.getOrDefault("locator", step.getLocator());
                    String resolvedLoc = resolveLocator(loc);
                    int timeout = Integer.parseInt(params.getOrDefault("timeout", "10"));
                    if ("WAIT_VISIBLE".equalsIgnoreCase(solutionAction)) {
                        new WebDriverWait(driver, Duration.ofSeconds(timeout))
                            .until(ExpectedConditions.visibilityOfElementLocated(By.xpath(resolvedLoc)));
                    } else {
                        new WebDriverWait(driver, Duration.ofSeconds(timeout))
                            .until(ExpectedConditions.invisibilityOfElementLocated(By.xpath(resolvedLoc)));
                    }
                    return executeInternal(step, stepIndex);
                }

                case "UPDATE_LOCATOR": {
                    String element = params.get("element");
                    String newXpath = params.get("newXpath");
                    if (element != null && newXpath != null) {
                        locatorRepo.updateLocator(element, newXpath);
                        StdioProtocol.log("Locator updated: " + element + " -> " + newXpath);
                    }
                    return executeInternal(step, stepIndex);
                }

                case "SKIP":
                    emitResult(stepIndex, step, "SKIPPED", "Skipped by orchestrator");
                    return true;

                default:
                    emitResult(stepIndex, step, "FAIL", "Unknown solution: " + solutionAction);
                    return false;
            }
        } catch (Exception ex) {
            StdioProtocol.log("Error during help/retry for step " + stepIndex + ": " + ex.getMessage());
            emitResult(stepIndex, step, "FAIL", e.getMessage());
            return false;
        }
    }
}
