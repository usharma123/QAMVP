package com.poc.models;

public class StepModel {

    private String action;
    private String locator;
    private String testInput;
    private String output;

    // Traceability — set by ExcelTestRunner before execution, not by parsers
    private Integer tcStep;
    private String parentAction;
    private String subStepLabel;

    public StepModel() {}

    public StepModel(String action, String locator, String testInput, String output) {
        this.action = action;
        this.locator = locator;
        this.testInput = testInput;
        this.output = output;
    }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getLocator() { return locator; }
    public void setLocator(String locator) { this.locator = locator; }

    public String getTestInput() { return testInput; }
    public void setTestInput(String testInput) { this.testInput = testInput; }

    public String getOutput() { return output; }
    public void setOutput(String output) { this.output = output; }

    public Integer getTcStep() { return tcStep; }
    public void setTcStep(Integer tcStep) { this.tcStep = tcStep; }

    public String getParentAction() { return parentAction; }
    public void setParentAction(String parentAction) { this.parentAction = parentAction; }

    public String getSubStepLabel() { return subStepLabel; }
    public void setSubStepLabel(String subStepLabel) { this.subStepLabel = subStepLabel; }

    @Override
    public String toString() {
        return "StepModel{action='" + action + "', locator='" + locator +
               "', testInput='" + testInput + "', output='" + output + "'}";
    }
}
