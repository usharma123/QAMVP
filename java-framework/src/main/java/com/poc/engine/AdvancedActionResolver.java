package com.poc.engine;

import com.poc.models.StepModel;
import com.poc.utils.StdioProtocol;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Reads AdvancedActions.xlsx — a multi-sheet workbook where each sheet is a named
 * reusable action (e.g. "Login", "CreateTrade") with parameterized steps.
 *
 * Parameter placeholders use {{paramName}} syntax.
 * When invoked, the caller passes bindings like "username=admin,password=admin".
 */
public class AdvancedActionResolver {

    private static final Pattern PARAM_PATTERN = Pattern.compile("\\{\\{(\\w+)}}");

    private final Path advancedActionsPath;

    public AdvancedActionResolver(Path advancedActionsPath) {
        this.advancedActionsPath = advancedActionsPath;
    }

    /**
     * Resolve a named advanced action into a list of concrete steps.
     *
     * @param actionName  the sheet name in AdvancedActions.xlsx
     * @param paramBindings  comma-separated key=value pairs (e.g. "username=admin,password=admin")
     * @return expanded list of StepModel with all {{param}} placeholders replaced
     */
    public List<StepModel> resolve(String actionName, String paramBindings) throws IOException {
        Map<String, String> params = parseBindings(paramBindings);

        try (FileInputStream fis = new FileInputStream(advancedActionsPath.toFile());
             Workbook workbook = new XSSFWorkbook(fis)) {

            Sheet sheet = workbook.getSheet(actionName);
            if (sheet == null) {
                throw new IllegalArgumentException("Advanced action sheet not found: " + actionName);
            }

            List<StepModel> steps = new ArrayList<>();
            boolean headerSkipped = false;

            for (Row row : sheet) {
                if (!headerSkipped) {
                    headerSkipped = true;
                    continue;
                }
                String action = getCellString(row, 0);
                if (action == null || action.isEmpty()) continue;

                String locator = substituteParams(getCellString(row, 1), params);
                String testInput = substituteParams(getCellString(row, 2), params);
                String output = getCellString(row, 3);

                steps.add(new StepModel(action, locator, testInput, output));
            }

            StdioProtocol.log("Resolved advanced action '" + actionName + "' -> " + steps.size() + " steps");
            return steps;
        }
    }

    /**
     * Append a new advanced action sheet to the workbook.
     * If the file doesn't exist, create it.
     */
    public void createAction(String actionName, List<StepModel> steps) throws IOException {
        Workbook workbook;
        if (advancedActionsPath.toFile().exists()) {
            try (FileInputStream fis = new FileInputStream(advancedActionsPath.toFile())) {
                workbook = new XSSFWorkbook(fis);
            }
        } else {
            workbook = new XSSFWorkbook();
        }

        Sheet existing = workbook.getSheet(actionName);
        if (existing != null) {
            int idx = workbook.getSheetIndex(existing);
            workbook.removeSheetAt(idx);
        }

        Sheet sheet = workbook.createSheet(actionName);
        Row header = sheet.createRow(0);
        header.createCell(0).setCellValue("action");
        header.createCell(1).setCellValue("locator");
        header.createCell(2).setCellValue("test_input");
        header.createCell(3).setCellValue("output");

        for (int i = 0; i < steps.size(); i++) {
            StepModel s = steps.get(i);
            Row row = sheet.createRow(i + 1);
            row.createCell(0).setCellValue(s.getAction());
            row.createCell(1).setCellValue(s.getLocator() != null ? s.getLocator() : "");
            row.createCell(2).setCellValue(s.getTestInput() != null ? s.getTestInput() : "");
            row.createCell(3).setCellValue(s.getOutput() != null ? s.getOutput() : "");
        }

        advancedActionsPath.getParent().toFile().mkdirs();
        try (FileOutputStream fos = new FileOutputStream(advancedActionsPath.toFile())) {
            workbook.write(fos);
        }
        workbook.close();
        StdioProtocol.log("Created/updated advanced action: " + actionName);
    }

    /** Parse "key1=val1,key2=val2" into a map. */
    static Map<String, String> parseBindings(String bindings) {
        Map<String, String> map = new LinkedHashMap<>();
        if (bindings == null || bindings.isEmpty()) return map;
        for (String pair : bindings.split(",")) {
            String[] kv = pair.split("=", 2);
            if (kv.length == 2) {
                map.put(kv[0].trim(), kv[1].trim());
            }
        }
        return map;
    }

    /** Replace all {{paramName}} with values from the map. */
    static String substituteParams(String text, Map<String, String> params) {
        if (text == null) return null;
        Matcher m = PARAM_PATTERN.matcher(text);
        StringBuilder sb = new StringBuilder();
        while (m.find()) {
            String key = m.group(1);
            String val = params.getOrDefault(key, m.group(0));
            m.appendReplacement(sb, Matcher.quoteReplacement(val));
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String getCellString(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell).trim();
    }
}
