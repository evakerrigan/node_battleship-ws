import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import { userController } from "./controllers/userController";
import { MessageType, MessageUnion } from "../types";
// import { roomController } from "./controllers/roomController";

export const createServer = (port: number) => {
  const server = http.createServer(
    (req: http.IncomingMessage, res: http.ServerResponse) => {
      res.end("Hello World");
    }
  );

  const wss = new WebSocket.Server({ server });

  server.listen(port);

  wss.on("connection", (ws) => {
    let currentUser: { name: string; index: number } | null = null;

    ws.on("message", (message) => {
      const messageData = Buffer.isBuffer(message)
        ? message.toString()
        : message instanceof ArrayBuffer
        ? Buffer.from(message).toString()
        : message.toString();
      console.log("Получено сообщение:", messageData);

      try {
        const data = JSON.parse(messageData);
        data.data = data.data ? JSON.parse(data.data) : {};

        const message = data as MessageUnion;

        switch (message.type) {
          case MessageType.REG: {
            const { name, password } = message.data;

            const response = userController.regUser(name, password);

            if (!response.data.error) {
              currentUser = {
                name: response.data.name!,
                index: Number(response.data.index!),
              };
            }
            const responseData = {
              ...response,
              data: JSON.stringify(response.data),
            };
            ws.send(JSON.stringify(responseData));
            break;
          }

          case "create_room":
          // if (!currentUser) {
          //   ws.send(
          //     JSON.stringify({
          //       type: "error",
          //       data: {
          //         error: true,
          //         errorText: "Пользователь не авторизован",
          //       },
          //       id: 0,
          //     })
          //   );
          //   break;
          // }
          // roomController.createRoom(ws, { ...currentUser, ws }, wss);
          // break;

          case "add_user_to_room":
          // if (!currentUser) {
          //   ws.send(
          //     JSON.stringify({
          //       type: "error",
          //       data: {
          //         error: true,
          //         errorText: "Пользователь не авторизован",
          //       },
          //       id: 0,
          //     })
          //   );
          //   break;
          // }
          // const { indexRoom } = data.data;
          // roomController.addUserToRoom(
          //   ws,
          //   indexRoom,
          //   { ...currentUser, ws },
          //   wss
          // );
          // break;

          case "auth":
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
          case "single_play": {
            const response = {
              id: 0,
              type: "create_game",
              data: {
                idGame: "123e4567-e89b-12d3-a456-426614174000",
                idPlayer: 1,
              },
            };

            const responseData = {
              ...response,
              data: JSON.stringify(response.data),
            };
            ws.send(JSON.stringify(responseData));
            break;
          }

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

    ws.on("close", () => {
      // Здесь можно добавить логику очистки при отключении пользователя
    });
  });

  return { server, wss };
};
