import { WebWorkerMLCEngineHandler, MLCEngine } from "@mlc-ai/web-llm";

// Initialize the engine
const engine = new MLCEngine();
// Initialize the handler to expose the engine to the main thread
const handler = new WebWorkerMLCEngineHandler();
handler.engine = engine;

// Listen to messages from the main thread
self.onmessage = (msg: MessageEvent) => {
  handler.onmessage(msg);
};
