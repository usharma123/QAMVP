const KNOWN_CURSOR_STREAM_WARNINGS = [
  'NGHTTP2_FRAME_SIZE_ERROR',
  'ERR_HTTP2_STREAM_ERROR',
  'Stream closed with error code',
];

export function isKnownCursorStreamWarning(error: unknown): boolean {
  const text = stringifyError(error);
  return KNOWN_CURSOR_STREAM_WARNINGS.some((needle) => text.includes(needle));
}

export function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    const cause = (error as Error & { cause?: unknown }).cause;
    return [
      error.name,
      error.message,
      error.stack,
      cause instanceof Error ? `${cause.name} ${cause.message} ${cause.stack ?? ''}` : String(cause ?? ''),
    ]
      .filter(Boolean)
      .join('\n');
  }
  return String(error);
}

export function installTransportWarningHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    if (isKnownCursorStreamWarning(reason)) {
      logSuppressedWarning();
      return;
    }
    console.error(reason);
  });

  process.on('uncaughtException', (error) => {
    if (isKnownCursorStreamWarning(error)) {
      logSuppressedWarning();
      return;
    }
    throw error;
  });
}

function logSuppressedWarning(): void {
  if (process.env.UI_QA_DEBUG_SDK_STREAM === '1') {
    console.warn('[ui-qa] suppressed Cursor SDK HTTP/2 stream warning');
  }
}
