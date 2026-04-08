package com.poc.engine;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.poc.models.StepModel;
import com.poc.utils.StdioProtocol;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Loads JSON test scripts ({@code steps} array) and delegates execution to {@link ExcelTestRunner}.
 * Also exposes {@link #parse(Path)} for JSON → XLSX compilation without a runner.
 */
public class JsonTestRunner {

    private final ExcelTestRunner excelRunner;

    public JsonTestRunner(ExcelTestRunner excelRunner) {
        this.excelRunner = excelRunner;
    }

    /**
     * Parse and execute a JSON script. Expects {@code { "steps": [ { "action", "locator", "test_input", "output", "tcStep?" } ] }}.
     */
    public boolean run(Path jsonPath) throws Exception {
        List<StepModel> steps = parse(jsonPath);
        StdioProtocol.log("Parsed " + steps.size() + " steps from " + jsonPath.getFileName());
        return excelRunner.runSteps(steps);
    }

    public List<StepModel> parse(Path jsonPath) throws Exception {
        String text = Files.readString(jsonPath, StandardCharsets.UTF_8);
        JsonObject root = JsonParser.parseString(text).getAsJsonObject();
        JsonArray arr = root.getAsJsonArray("steps");
        List<StepModel> list = new ArrayList<>();
        for (JsonElement el : arr) {
            JsonObject o = el.getAsJsonObject();
            StepModel s = new StepModel(
                getStr(o, "action"),
                getStr(o, "locator"),
                getStr(o, "test_input"),
                getStr(o, "output")
            );
            if (o.has("tcStep") && !o.get("tcStep").isJsonNull()) {
                s.setTcStep(o.get("tcStep").getAsInt());
            }
            list.add(s);
        }
        return list;
    }

    private static String getStr(JsonObject o, String key) {
        JsonElement e = o.get(key);
        return e != null && !e.isJsonNull() ? e.getAsString() : "";
    }
}
