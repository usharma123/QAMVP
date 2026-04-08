package com.poc.engine;

import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.poc.models.StepModel;
import com.poc.utils.StdioProtocol;

import org.apache.poi.ss.usermodel.DataFormatter;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.StringJoiner;

/**
 * Loads XLSX test scripts and executes steps via {@link ActionEngine}.
 * Expands advanced actions from {@link AdvancedActionResolver} and handles {@code CALL} rows
 * (nested actions with JSON parameter payloads in {@code test_input}).
 */
public class ExcelTestRunner {

    private final ActionEngine engine;
    private final AdvancedActionResolver advResolver;
    private final StdioProtocol protocol;

    public ExcelTestRunner(ActionEngine engine, AdvancedActionResolver advResolver, StdioProtocol protocol) {
        this.engine = engine;
        this.advResolver = advResolver;
        this.protocol = protocol;
    }

    /**
     * Run a workbook: first sheet named {@code TestScript}, otherwise the first sheet.
     */
    public boolean run(Path xlsxPath) throws Exception {
        List<StepModel> steps = loadXlsx(xlsxPath);
        StdioProtocol.log("Parsed " + steps.size() + " steps from " + xlsxPath.getFileName());
        return runSteps(steps);
    }

    /**
     * Flatten macros/CALL rows, then execute in order.
     * Propagates tcStep from each top-level step to all its expanded children.
     */
    public boolean runSteps(List<StepModel> topLevel) throws Exception {
        List<StepModel> flat = new ArrayList<>();
        for (StepModel s : topLevel) {
            String input = s.getTestInput() != null ? s.getTestInput() : "";
            Map<String, String> macroParams = looksLikeJson(input)
                ? parseJsonBindings(input)
                : AdvancedActionResolver.parseBindings(input);

            List<StepModel> expanded = expand(s, macroParams);

            Integer tcStep = s.getTcStep();
            if (tcStep != null) {
                for (StepModel sub : expanded) {
                    if (sub.getTcStep() == null) {
                        sub.setTcStep(tcStep);
                    }
                }
            }

            flat.addAll(expanded);
        }

        int passed = 0;
        int failed = 0;
        int idx = 0;
        for (StepModel step : flat) {
            boolean ok = engine.execute(step, idx++);
            if (ok) {
                passed++;
            } else {
                failed++;
                StdioProtocol.log("Step " + (idx - 1) + " failed — aborting remaining steps");
                break;
            }
        }

        protocol.sendRunComplete(flat.size(), passed, failed);
        return failed == 0;
    }

    private List<StepModel> loadXlsx(Path path) throws IOException {
        try (FileInputStream fis = new FileInputStream(path.toFile());
             Workbook wb = new XSSFWorkbook(fis)) {
            Sheet sheet = wb.getSheet("TestScript");
            if (sheet == null) {
                sheet = wb.getSheetAt(0);
            }
            DataFormatter fmt = new DataFormatter();
            List<StepModel> steps = new ArrayList<>();
            boolean header = true;
            for (Row row : sheet) {
                if (header) {
                    header = false;
                    continue;
                }
                String action = fmt.formatCellValue(row.getCell(0)).trim();
                if (action.isEmpty()) {
                    continue;
                }
                String locator = fmt.formatCellValue(row.getCell(1)).trim();
                String testInput = fmt.formatCellValue(row.getCell(2)).trim();
                String output = fmt.formatCellValue(row.getCell(3)).trim();
                steps.add(new StepModel(action, locator, testInput, output));
            }
            return steps;
        }
    }

    /**
     * Recursively expand CALL rows and named advanced actions into built-in steps.
     * Sets {@code parentAction} and {@code subStepLabel} on expanded children for IPC traceability.
     *
     * @param inheritedParams bindings from the parent macro invocation (for {@code {{param}}} in CALL JSON payloads).
     */
    private List<StepModel> expand(StepModel step, Map<String, String> inheritedParams) throws IOException {
        String rawAction = step.getAction();
        if (rawAction == null) {
            rawAction = "";
        }
        String action = rawAction.trim();

        if ("CALL".equalsIgnoreCase(action)) {
            String sheet = sheetNameFromLocator(step.getLocator());
            String json = AdvancedActionResolver.substituteParams(
                step.getTestInput() != null ? step.getTestInput() : "",
                inheritedParams
            );
            Map<String, String> callBindings = parseJsonBindings(json);
            String comma = toCommaBindings(callBindings);
            List<StepModel> resolved = advResolver.resolve(sheet, comma);
            StdioProtocol.log("Expanding advanced action '" + sheet + "' into " + resolved.size() + " sub-steps");
            List<StepModel> flat = new ArrayList<>();
            for (int i = 0; i < resolved.size(); i++) {
                StepModel sub = resolved.get(i);
                stampTraceability(sub, sheet, i + 1);
                flat.addAll(expand(sub, callBindings));
            }
            return flat;
        }

        if (ActionEngine.isBuiltIn(action)) {
            return List.of(step);
        }

        String comma = step.getTestInput() != null ? step.getTestInput() : "";
        Map<String, String> macroParams = looksLikeJson(comma)
            ? parseJsonBindings(comma)
            : AdvancedActionResolver.parseBindings(comma);
        String commaForResolve = looksLikeJson(comma) ? toCommaBindings(macroParams) : comma;
        List<StepModel> resolved = advResolver.resolve(action, commaForResolve);
        StdioProtocol.log("Expanding advanced action '" + action + "' into " + resolved.size() + " sub-steps");
        List<StepModel> flat = new ArrayList<>();
        for (int i = 0; i < resolved.size(); i++) {
            StepModel sub = resolved.get(i);
            stampTraceability(sub, action, i + 1);
            flat.addAll(expand(sub, macroParams));
        }
        return flat;
    }

    /**
     * Set traceability fields on a sub-step unless they were already set by deeper expansion.
     */
    private static void stampTraceability(StepModel sub, String parentName, int oneBasedIndex) {
        if (sub.getParentAction() == null) {
            sub.setParentAction(parentName);
        }
        if (sub.getSubStepLabel() == null) {
            sub.setSubStepLabel(parentName + "/" + oneBasedIndex);
        }
    }

    private static boolean looksLikeJson(String s) {
        return s != null && s.trim().startsWith("{");
    }

    private static String sheetNameFromLocator(String locator) {
        if (locator == null || locator.isEmpty()) {
            return "";
        }
        String s = locator.trim();
        if (s.startsWith("action_")) {
            return s.substring("action_".length());
        }
        return s;
    }

    private static Map<String, String> parseJsonBindings(String json) {
        Map<String, String> map = new LinkedHashMap<>();
        if (json == null || json.isBlank()) {
            return map;
        }
        String trimmed = json.trim();
        if (!trimmed.startsWith("{")) {
            return map;
        }
        JsonObject obj = JsonParser.parseString(trimmed).getAsJsonObject();
        for (String key : obj.keySet()) {
            JsonElement el = obj.get(key);
            if (el != null && !el.isJsonNull()) {
                map.put(key, el.getAsString());
            }
        }
        return map;
    }

    private static String toCommaBindings(Map<String, String> m) {
        StringJoiner j = new StringJoiner(",");
        for (Map.Entry<String, String> e : m.entrySet()) {
            j.add(e.getKey() + "=" + e.getValue());
        }
        return j.toString();
    }
}
