import { httpServer } from "./src/http_server/index.js";
import dotenv from "dotenv";
import { createServer } from "./src/server";

dotenv.config();

const HTTP_PORT = process.env.HTTP_PORT || 8181;
console.log(`Start static http server on the ${HTTP_PORT} port!`);
httpServer.listen(HTTP_PORT);

const WS_PORT = process.env.WS_PORT || 3000;
console.log(`Start WebSocket server on the ${WS_PORT} port!`);
const { wss } = createServer(Number(WS_PORT));

function shutdown() {
  wss.close(() => {
    console.log("WebSocket server closed");

    httpServer.close(() => {
      console.log("HTTP server closed");

      process.exit(0);
    });
  });
}

process.on("SIGINT", () => {
  console.log("Received SIGINT signal");

  shutdown();
});
