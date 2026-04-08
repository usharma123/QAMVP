package com.poc.engine;

import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.poc.models.StepModel;
import com.poc.utils.DriverFactory;
import com.poc.utils.LocatorRepository;
import com.poc.utils.StdioProtocol;

import org.openqa.selenium.WebDriver;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.List;

/**
 * CLI entry point for the execution engine.
 *
 * Usage:
 *   run-json  <path.json>                    — execute a JSON test script
 *   run-xlsx  <path.xlsx>                    — execute an XLSX test script
 *
 * Environment:
 *   LOAD_TIME_FACTOR_MS — optional delay in milliseconds after each step (default 0).
 *   Use in slow environments to account for API/network latency.
 *   compile   <path.json> [output.xlsx]      — compile JSON to XLSX
 *   create-action <json-payload>             — add a sheet to AdvancedActions.xlsx
 *   update-locator <element_name> <new_xpath> — update locators.xlsx
 *
 * // TODO: Migrate stdio IPC to REST API for parallel runners and decoupled deployment.
 */
public class Main {

    private static final Gson GSON = new Gson();

    public static void main(String[] args) {
        if (args.length < 1) {
            StdioProtocol.log("Usage: <command> [args...]");
            System.exit(1);
        }

        String command = args[0];

        try {
            Path repoRoot = resolveRepoRoot();
            Path locatorsPath = repoRoot.resolve("test_data/locators.xlsx").toFile().exists()
                ? repoRoot.resolve("test_data/locators.xlsx")
                : repoRoot.resolve("test_data/locators.csv");
            Path advancedActionsXlsx = repoRoot.resolve("test_data/generated_scripts/AdvancedActions.xlsx");
            Path resultsDir = repoRoot.resolve("test_results");

            switch (command) {
                case "run-json":
                    requireArgs(args, 2, "run-json <path.json> [results-dir]");
                    Path jsonResultsDir = args.length >= 3 ? Paths.get(args[2]) : resultsDir;
                    runJson(Paths.get(args[1]), locatorsPath, advancedActionsXlsx, jsonResultsDir);
                    break;

                case "run-xlsx":
                    requireArgs(args, 2, "run-xlsx <path.xlsx> [results-dir]");
                    Path xlsxResultsDir = args.length >= 3 ? Paths.get(args[2]) : resultsDir;
                    runXlsx(Paths.get(args[1]), locatorsPath, advancedActionsXlsx, xlsxResultsDir);
                    break;

                case "compile":
                    requireArgs(args, 2, "compile <path.json> [output.xlsx]");
                    Path jsonIn = Paths.get(args[1]);
                    Path xlsxOut = args.length >= 3
                        ? Paths.get(args[2])
                        : jsonIn.resolveSibling(jsonIn.getFileName().toString().replace(".json", ".xlsx"));
                    compileJsonToXlsx(jsonIn, xlsxOut);
                    break;

                case "create-action":
                    requireArgs(args, 2, "create-action <json-payload>");
                    createAction(args[1], advancedActionsXlsx);
                    break;

                case "update-locator":
                    requireArgs(args, 3, "update-locator <element_name> <new_xpath>");
                    updateLocator(args[1], args[2], locatorsPath);
                    break;

                default:
                    StdioProtocol.log("Unknown command: " + command);
                    System.exit(1);
            }
        } catch (Exception e) {
            StdioProtocol.log("Fatal error: " + e.getMessage());
            e.printStackTrace(System.err);
            System.exit(1);
        }
    }

    private static void runJson(Path jsonPath, Path locatorsXlsx, Path advXlsx, Path resultsDir) throws Exception {
        LocatorRepository locatorRepo = new LocatorRepository(locatorsXlsx);
        StdioProtocol protocol = new StdioProtocol();
        AdvancedActionResolver advResolver = new AdvancedActionResolver(advXlsx);
        DriverFactory driverFactory = new DriverFactory();
        WebDriver driver = driverFactory.create();

        int loadTimeFactorMs = parseLoadTimeFactorMs();

        try {
            ActionEngine engine = new ActionEngine(driver, locatorRepo, protocol, resultsDir, loadTimeFactorMs);
            ExcelTestRunner excelRunner = new ExcelTestRunner(engine, advResolver, protocol);
            JsonTestRunner jsonRunner = new JsonTestRunner(excelRunner);
            boolean success = jsonRunner.run(jsonPath);
            System.exit(success ? 0 : 1);
        } finally {
            driverFactory.quit();
        }
    }

    private static void runXlsx(Path xlsxPath, Path locatorsXlsx, Path advXlsx, Path resultsDir) throws Exception {
        LocatorRepository locatorRepo = new LocatorRepository(locatorsXlsx);
        StdioProtocol protocol = new StdioProtocol();
        AdvancedActionResolver advResolver = new AdvancedActionResolver(advXlsx);
        DriverFactory driverFactory = new DriverFactory();
        WebDriver driver = driverFactory.create();

        int loadTimeFactorMs = parseLoadTimeFactorMs();

        try {
            ActionEngine engine = new ActionEngine(driver, locatorRepo, protocol, resultsDir, loadTimeFactorMs);
            ExcelTestRunner excelRunner = new ExcelTestRunner(engine, advResolver, protocol);
            boolean success = excelRunner.run(xlsxPath);
            System.exit(success ? 0 : 1);
        } finally {
            driverFactory.quit();
        }
    }

    private static void compileJsonToXlsx(Path jsonIn, Path xlsxOut) throws Exception {
        JsonTestRunner tempRunner = new JsonTestRunner(null);
        List<StepModel> steps = tempRunner.parse(jsonIn);
        new JsonToExcelCompiler().compile(steps, xlsxOut);
        StdioProtocol.log("Compiled " + jsonIn + " -> " + xlsxOut);
    }

    /**
     * Accepts a file path to a JSON file OR inline JSON.
     * JSON format: { "name": "CreateTrade", "steps": [ { "action": "...", "locator": "...", "test_input": "...", "output": "..." } ] }
     */
    private static void createAction(String jsonPathOrPayload, Path advXlsx) throws Exception {
        String jsonPayload;
        Path candidate = Paths.get(jsonPathOrPayload);
        if (candidate.toFile().isFile()) {
            jsonPayload = java.nio.file.Files.readString(candidate, java.nio.charset.StandardCharsets.UTF_8);
        } else {
            jsonPayload = jsonPathOrPayload;
        }
        JsonObject obj = GSON.fromJson(jsonPayload, JsonObject.class);
        String name = obj.get("name").getAsString();
        JsonArray stepsArr = obj.getAsJsonArray("steps");

        List<StepModel> steps = new ArrayList<>();
        for (JsonElement el : stepsArr) {
            JsonObject s = el.getAsJsonObject();
            steps.add(new StepModel(
                getStr(s, "action"),
                getStr(s, "locator"),
                getStr(s, "test_input"),
                getStr(s, "output")
            ));
        }

        new AdvancedActionResolver(advXlsx).createAction(name, steps);
    }

    private static void updateLocator(String elementName, String newXpath, Path locatorsXlsx) throws Exception {
        LocatorRepository repo = new LocatorRepository(locatorsXlsx);
        repo.updateLocator(elementName, newXpath);
        StdioProtocol.log("Updated locator: " + elementName + " -> " + newXpath);
    }

    private static int parseLoadTimeFactorMs() {
        String val = System.getenv("LOAD_TIME_FACTOR_MS");
        if (val == null || val.isBlank()) return 0;
        try {
            int ms = Integer.parseInt(val.trim());
            return Math.max(0, ms);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static Path resolveRepoRoot() {
        Path cwd = Paths.get(System.getProperty("user.dir"));
        if (cwd.getFileName().toString().equals("java-framework")) {
            return cwd.getParent();
        }
        return cwd;
    }

    private static void requireArgs(String[] args, int min, String usage) {
        if (args.length < min) {
            StdioProtocol.log("Usage: " + usage);
            System.exit(1);
        }
    }

    private static String getStr(JsonObject obj, String key) {
        JsonElement el = obj.get(key);
        return el != null && !el.isJsonNull() ? el.getAsString() : "";
    }
}
