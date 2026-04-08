package com.poc.engine;

import com.poc.models.StepModel;
import com.poc.utils.StdioProtocol;

import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.FileOutputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;

/**
 * Compiles a list of StepModels (parsed from JSON) into an XLSX script file.
 * Enables persistence of LLM-generated tests as replayable Excel scripts.
 */
public class JsonToExcelCompiler {

    /**
     * Compile steps into an XLSX file with standard headers.
     */
    public void compile(List<StepModel> steps, Path outputPath) throws IOException {
        try (Workbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("TestScript");

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

            outputPath.getParent().toFile().mkdirs();
            try (FileOutputStream fos = new FileOutputStream(outputPath.toFile())) {
                workbook.write(fos);
            }
        }
        StdioProtocol.log("Compiled " + steps.size() + " steps to " + outputPath);
    }
}
