package com.poc.utils;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

/**
 * Loads element locators from locators.xlsx (one sheet per page) or locators.csv.
 * XLSX: Each sheet name is the page. Columns: element_name, xpath.
 * CSV: element_name,xpath,page
 */
public class LocatorRepository {

    private final Path path;
    private final Map<String, String> locators = new LinkedHashMap<>();
    private final Map<String, String> pages = new LinkedHashMap<>();

    public LocatorRepository(Path path) throws IOException {
        this.path = path;
        load();
    }

    private void load() throws IOException {
        locators.clear();
        pages.clear();
        if (path.getFileName().toString().toLowerCase().endsWith(".csv")) {
            loadCsv();
        } else {
            loadXlsx();
        }
    }

    private void loadCsv() throws IOException {
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        for (int i = 1; i < lines.size(); i++) {
            String line = lines.get(i).trim();
            if (line.isEmpty()) continue;
            String[] parts = line.split(",", 3);
            if (parts.length >= 2) {
                String name = parts[0].trim();
                String xpath = parts[1].trim();
                locators.put(name, xpath);
                if (parts.length >= 3) pages.put(name, parts[2].trim());
            }
        }
    }

    private void loadXlsx() throws IOException {
        try (InputStream is = Files.newInputStream(path);
             Workbook wb = new XSSFWorkbook(is)) {

            for (int s = 0; s < wb.getNumberOfSheets(); s++) {
                Sheet sheet = wb.getSheetAt(s);
                String pageName = sheet.getSheetName();

                int nameCol = 0;
                int xpathCol = 1;

                Row header = sheet.getRow(0);
                if (header != null) {
                    for (int c = 0; c < header.getLastCellNum(); c++) {
                        String val = cellStr(header.getCell(c)).toLowerCase();
                        if ("element_name".equals(val)) nameCol = c;
                        else if ("xpath".equals(val)) xpathCol = c;
                    }
                }

                for (int r = 1; r <= sheet.getLastRowNum(); r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) continue;
                    String name = cellStr(row.getCell(nameCol));
                    String xpath = cellStr(row.getCell(xpathCol));
                    if (name.isEmpty()) continue;
                    locators.put(name, xpath);
                    pages.put(name, pageName);
                }
            }
        }
    }

    /**
     * If ref starts with '$', look up the remainder in the locator map.
     * Otherwise return ref as-is (raw xpath).
     */
    public String resolve(String ref) {
        if (ref == null || ref.isEmpty()) return ref;
        if (ref.startsWith("$")) {
            String key = ref.substring(1);
            String xpath = locators.get(key);
            if (xpath == null) {
                throw new IllegalArgumentException("Locator not found: " + key);
            }
            return xpath;
        }
        return ref;
    }

    public boolean hasLocator(String elementName) {
        return locators.containsKey(elementName);
    }

    /**
     * Update a locator in-memory and persist back to disk.
     */
    public void updateLocator(String elementName, String newXpath) throws IOException {
        locators.put(elementName, newXpath);
        if (path.getFileName().toString().toLowerCase().endsWith(".csv")) {
            persistCsv();
        } else {
            persistXlsx();
        }
    }

    private void persistCsv() throws IOException {
        List<String> lines = new ArrayList<>();
        lines.add("element_name,xpath,page");
        for (Map.Entry<String, String> entry : locators.entrySet()) {
            String page = pages.getOrDefault(entry.getKey(), "");
            lines.add(entry.getKey() + "," + entry.getValue() + "," + page);
        }
        Files.write(path, lines, StandardCharsets.UTF_8);
    }

    private void persistXlsx() throws IOException {
        try (Workbook wb = new XSSFWorkbook()) {
            Map<String, List<String[]>> grouped = new LinkedHashMap<>();
            for (Map.Entry<String, String> entry : locators.entrySet()) {
                String page = pages.getOrDefault(entry.getKey(), "unknown");
                grouped.computeIfAbsent(page, k -> new ArrayList<>())
                       .add(new String[]{entry.getKey(), entry.getValue()});
            }
            for (Map.Entry<String, List<String[]>> entry : grouped.entrySet()) {
                Sheet sheet = wb.createSheet(entry.getKey());
                Row header = sheet.createRow(0);
                header.createCell(0).setCellValue("element_name");
                header.createCell(1).setCellValue("xpath");
                int r = 1;
                for (String[] pair : entry.getValue()) {
                    Row row = sheet.createRow(r++);
                    row.createCell(0).setCellValue(pair[0]);
                    row.createCell(1).setCellValue(pair[1]);
                }
            }
            try (OutputStream os = Files.newOutputStream(path)) {
                wb.write(os);
            }
        }
    }

    private static String cellStr(Cell cell) {
        if (cell == null) return "";
        CellType ct = cell.getCellType();
        if (ct == CellType.STRING) return cell.getStringCellValue().trim();
        if (ct == CellType.NUMERIC) return String.valueOf((long) cell.getNumericCellValue());
        if (ct == CellType.BOOLEAN) return String.valueOf(cell.getBooleanCellValue());
        if (ct == CellType.FORMULA) {
            try { return cell.getStringCellValue().trim(); } catch (Exception e) { return ""; }
        }
        return "";
    }
}
