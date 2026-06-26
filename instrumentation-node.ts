import { LangfuseExporter } from "langfuse-vercel";
import { registerOTel } from "@vercel/otel";
import { env } from "@/env";

export function registerOTelInstrumentation() {
  registerOTel({
    serviceName: "langfuse-vercel-ai-nextjs-example",
    traceExporter: new LangfuseExporter({
      environment: env.NODE_ENV,
      secretKey: env.LANGFUSE_SECRET_KEY,
      publicKey: env.LANGFUSE_PUBLIC_KEY,
      baseUrl: env.LANGFUSE_BASE_URL,
    }),
  });
}
