export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerOTelInstrumentation } = await import("./instrumentation-node");
    registerOTelInstrumentation();
  }
}
