package com.poc.utils;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.poc.models.IpcMessage;

import java.io.*;
import java.nio.charset.StandardCharsets;

/**
 * JSON-line IPC over stdin/stdout.
 * All non-protocol output (logging) must go to stderr.
 */
public class StdioProtocol {

    private static final Gson GSON = new GsonBuilder().create();
    private final PrintStream out;
    private final BufferedReader in;

    public StdioProtocol() {
        this.out = System.out;
        this.in = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    }

    /** Send a message to the orchestrator (writes one JSON line to stdout). */
    public void send(IpcMessage message) {
        out.println(GSON.toJson(message));
        out.flush();
    }

    /**
     * Send a HELP_REQUEST and block until the orchestrator responds with a SOLUTION.
     * Returns the solution message.
     */
    public IpcMessage requestHelp(int step, String action, String locator, String error, String currentUrl) throws IOException {
        send(IpcMessage.helpRequest(step, action, locator, error, currentUrl));
        String line = in.readLine();
        if (line == null) {
            throw new IOException("Orchestrator closed stdin — no solution received");
        }
        return GSON.fromJson(line, IpcMessage.class);
    }

    /** Send a step result notification with traceability context. */
    public void sendStepResult(int step, String action, String status, String detail,
                               Integer tcStep, String parentAction, String subStepLabel) {
        send(IpcMessage.stepResult(step, action, status, detail, tcStep, parentAction, subStepLabel));
    }

    /** Send a run-complete summary. */
    public void sendRunComplete(int totalSteps, int passed, int failed) {
        send(IpcMessage.runComplete(totalSteps, passed, failed));
    }

    /** Log a message to stderr (does not pollute the protocol channel). */
    public static void log(String message) {
        System.err.println("[ENGINE] " + message);
    }
}
