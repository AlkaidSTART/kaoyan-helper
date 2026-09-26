import type { ErrorCode } from "./errors";
import type { RequestContext } from "./request-context";

export interface RequestLogRecord {
  requestId: string;
  route: string;
  method: string;
  status: number;
  durationMs: number;
  userId: string | null;
  errorCode: ErrorCode | null;
  timestamp: string;
}

export type LogSink = (line: string) => void;

export interface CreateRequestLogRecordOptions {
  status: number;
  durationMs: number;
  errorCode?: ErrorCode | null;
  timestamp: string;
}

export function createRequestLogRecord(
  context: RequestContext,
  options: CreateRequestLogRecordOptions,
): RequestLogRecord {
  return {
    requestId: context.requestId,
    route: context.route,
    method: context.method,
    status: options.status,
    durationMs: options.durationMs,
    userId: context.userId ?? null,
    errorCode: options.errorCode ?? null,
    timestamp: options.timestamp,
  };
}

export function serializeRequestLog(record: RequestLogRecord): string {
  const safeRecord: RequestLogRecord = {
    requestId: record.requestId,
    route: record.route,
    method: record.method,
    status: record.status,
    durationMs: record.durationMs,
    userId: record.userId,
    errorCode: record.errorCode,
    timestamp: record.timestamp,
  };

  return `${JSON.stringify(safeRecord)}\n`;
}

export function logRequest(record: RequestLogRecord, sink: LogSink = writeToStdout): void {
  sink(serializeRequestLog(record));
}

function writeToStdout(line: string): void {
  process.stdout.write(line);
}
