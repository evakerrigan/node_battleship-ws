import { WebSocket, WebSocketServer } from "ws";
import http from "http";
import { userController } from "./controllers/userController";
import { MessageType, MessageUnion, Ship } from "../types";
import { roomController } from "./controllers/roomController";
import { shipsModel } from "./models/shipsModel";
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

            roomController.broadcastRooms(wss);

            break;
          }

          case MessageType.CREATE_ROOM:
            if (!currentUser) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    error: true,
                    errorText: "Пользователь не авторизован",
                  },
                  id: 0,
                })
              );
              break;
            }
            roomController.createRoom(currentUser);

            roomController.broadcastRooms(wss);

            break;

          case MessageType.ADD_USER_TO_ROOM:
            if (!currentUser) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    error: true,
                    errorText: "Пользователь не авторизован",
                  },
                  id: 0,
                })
              );
              break;
            }

            const { indexRoom } = message.data;
            roomController.addUserToRoom(indexRoom, currentUser);

            roomController.broadcastRooms(wss);

            roomController.broadcastCreateGame(wss, currentUser);
            break;

          case MessageType.ADD_SHIPS:
            if (!currentUser) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    error: true,
                    errorText: "Пользователь не авторизован",
                  },
                  id: 0,
                })
              );
              break;
            }

            const { gameId, ships } = message.data;

            console.log("currentUser.index", currentUser.index);

            const room = roomController.getRoomById(gameId);

            const user = room?.roomUsers.find(
              (u) => u.index === currentUser.index
            );

            console.log("user", user.index);

            if (user) {
              if (!room.ships) {
                room.ships = {};
              }
              room.ships[currentUser.index] = ships;
            }

            console.log("length", Object.keys(room.ships).length);
            console.log("room.ships", room.ships);

            if (room.ships && Object.keys(room.ships).length === 2) {
              Object.entries(room.ships).forEach(
                ([playerIndex, playerShips]) => {
                  wss.clients.forEach((client) => {
                    if (client.readyState === WebSocket.OPEN) {
                      client.send(
                        JSON.stringify({
                          type: "start_game",
                          data: {
                            ships: JSON.stringify(playerShips),
                            currentPlayerIndex: Number(playerIndex),
                          },
                          id: 0,
                        })
                      );
                    }
                  });
                }
              );
            }

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
