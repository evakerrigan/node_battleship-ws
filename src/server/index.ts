import { WebSocket } from "ws";
import http from "http";

export const createServer = (port: number) => {
  const server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.end("Hello World");
    }
  );

  const wss = new WebSocket.Server({ server });

  server.listen(port);

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      // Если сообщение приходит как буфер, преобразуем его в строку
      const messageData = Buffer.isBuffer(message)
        ? message.toString()
        : message instanceof ArrayBuffer
        ? Buffer.from(message).toString()
        : message.toString();
      console.log("Получено сообщение:", messageData);

      const data = JSON.parse(messageData);
      console.log(data);

      switch (data.type) {
        case "reg":
          console.log(data.type, data.data);
          break;
        case "auth":
          break;
        case "get_users":
          break;
        case "get_messages":
          break;
        default:
          break;
      }
    });
  });

  return { server, wss };
};

// export const { server, wss } = createServer(
//   Number(process.env.WS_PORT) || 3000
// );
