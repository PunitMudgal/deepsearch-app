import { registerOTel } from "@vercel/otel";
import { LangfuseExporter } from "langfuse-vercel";

export function registerOTelInstrumentation() {
  registerOTel({
    serviceName: "deepsearch-ts",
    traceExporter: new LangfuseExporter({
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      baseUrl:
        process.env.LANGFUSE_BASE_URL,
    }),
  });
}
