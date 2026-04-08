package com.poc.models;

import java.util.Map;

public class IpcMessage {

    private String type;
    private Integer step;
    private String action;
    private String locator;
    private String error;
    private String status;
    private String detail;
    private Integer totalSteps;
    private Integer passed;
    private Integer failed;
    private Map<String, String> params;
    private String currentUrl;

    // Traceability fields
    private Integer tcStep;
    private String parentAction;
    private String subStepLabel;

    public IpcMessage() {}

    public static IpcMessage stepResult(int step, String action, String status, String detail,
                                         Integer tcStep, String parentAction, String subStepLabel) {
        IpcMessage msg = new IpcMessage();
        msg.type = "STEP_RESULT";
        msg.step = step;
        msg.action = action;
        msg.status = status;
        msg.detail = detail;
        msg.tcStep = tcStep;
        msg.parentAction = parentAction;
        msg.subStepLabel = subStepLabel;
        return msg;
    }

    public static IpcMessage helpRequest(int step, String action, String locator, String error, String currentUrl) {
        IpcMessage msg = new IpcMessage();
        msg.type = "HELP_REQUEST";
        msg.step = step;
        msg.action = action;
        msg.locator = locator;
        msg.error = error;
        msg.currentUrl = currentUrl;
        return msg;
    }

    public static IpcMessage runComplete(int totalSteps, int passed, int failed) {
        IpcMessage msg = new IpcMessage();
        msg.type = "RUN_COMPLETE";
        msg.totalSteps = totalSteps;
        msg.passed = passed;
        msg.failed = failed;
        return msg;
    }

    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    public Integer getStep() { return step; }
    public void setStep(Integer step) { this.step = step; }

    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }

    public String getLocator() { return locator; }
    public void setLocator(String locator) { this.locator = locator; }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getDetail() { return detail; }
    public void setDetail(String detail) { this.detail = detail; }

    public Integer getTotalSteps() { return totalSteps; }
    public void setTotalSteps(Integer totalSteps) { this.totalSteps = totalSteps; }

    public Integer getPassed() { return passed; }
    public void setPassed(Integer passed) { this.passed = passed; }

    public Integer getFailed() { return failed; }
    public void setFailed(Integer failed) { this.failed = failed; }

    public Map<String, String> getParams() { return params; }
    public void setParams(Map<String, String> params) { this.params = params; }

    public String getCurrentUrl() { return currentUrl; }
    public void setCurrentUrl(String currentUrl) { this.currentUrl = currentUrl; }

    public Integer getTcStep() { return tcStep; }
    public void setTcStep(Integer tcStep) { this.tcStep = tcStep; }

    public String getParentAction() { return parentAction; }
    public void setParentAction(String parentAction) { this.parentAction = parentAction; }

    public String getSubStepLabel() { return subStepLabel; }
    public void setSubStepLabel(String subStepLabel) { this.subStepLabel = subStepLabel; }
}
