import { WebSocket } from "ws";
import http from "http";
import { userController } from "./controllers/userController";

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

      try {
        const data = JSON.parse(messageData);
        console.log("Обработка запроса:", data);

        switch (data.type) {
          case "reg":
            const { name, password } = data.data;
            const response = userController.regUser(name, password);
            ws.send(JSON.stringify(response));
            break;
          case "auth":
            break;
          case "create_room":
            break;
          case "add_user_to_room":
            break;
          case "create_game":
            break;
          case "update_room":
            break;
          case "add_ships":
            break;
          case "start_game":
            break;
          case "attack":
            break;
          case "random_attack":
            break;
          case "turn":
            break;
          case "finish":
            break;
          case "update_winners":
            break;
          default:
            console.log("Неизвестный тип запроса:", data.type);
            break;
        }
      } catch (error) {
        console.error("Ошибка обработки сообщения:", error);
        ws.send(
          JSON.stringify({
            type: "error",
            data: {
              error: true,
              errorText: "Ошибка обработки запроса",
            },
            id: 0,
          })
        );
      }
    });
  });

  return { server, wss };
};
