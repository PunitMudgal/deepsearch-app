import type { TelemetrySettings } from "ai";

export function createLangfuseTelemetry(opts: {
  langfuseTraceId: string | undefined;
  functionId: string;
}): TelemetrySettings {
  if (!opts.langfuseTraceId) {
    return {
      isEnabled: false,
    };
  }

  return {
    isEnabled: true,
    functionId: opts.functionId,
    metadata: {
      langfuseTraceId: opts.langfuseTraceId,
    },
  };
}
