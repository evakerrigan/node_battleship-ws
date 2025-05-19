import { WebSocket } from "ws";
import http from "http";
import { userController } from "./controllers/userController";
import { MessageType, MessageUnion, Ship } from "../types";
import { roomController } from "./controllers/roomController";
import { shipsModel } from "./models/shipsModel";
import {
  checkWinnerMap,
  createGameMap,
  printGameMap,
  generateRandomAttack,
} from "./utils/gameMap";

// Добавляем Map для хранения соответствия между WebSocket и пользователями
const wsToUser = new Map<WebSocket, { name: string; index: number }>();

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
              // Сохраняем соответствие между WebSocket и пользователем
              wsToUser.set(ws, currentUser);
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

            const winners = userController.getWinners();
            wss.clients.forEach((client) => {
              client.send(
                JSON.stringify({
                  type: "update_winners",
                  data: JSON.stringify(winners),
                  id: 0,
                })
              );
            });

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

            wss.clients.forEach((client) => {
              const user = wsToUser.get(client);
              if (client.readyState === WebSocket.OPEN && user) {
                client.send(
                  JSON.stringify({
                    type: "create_game",
                    data: JSON.stringify({
                      idGame: indexRoom,
                      idPlayer: user.index,
                    }),
                    id: 0,
                  })
                );
              }
            });

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
            const room = roomController.getRoomById(gameId);
            const user = room?.roomUsers.find(
              (u) => u.index === currentUser.index
            );

            if (user) {
              if (!room.ships) {
                room.ships = {};
              }
              if (!room.gameMaps) {
                room.gameMaps = {};
              }
              room.ships[currentUser.index] = ships;
              room.shipsState[currentUser.index] = [];

              room.gameMaps[currentUser.index] = createGameMap(ships);
            }

            if (room.ships && Object.keys(room.ships).length === 2) {
              Object.entries(room.ships).forEach(
                ([playerIndex, playerShips]) => {
                  wss.clients.forEach((client) => {
                    const user = wsToUser.get(client);
                    if (
                      client.readyState === WebSocket.OPEN &&
                      user &&
                      user.index === Number(playerIndex)
                    ) {
                      client.send(
                        JSON.stringify({
                          type: "start_game",
                          data: JSON.stringify({
                            ships: playerShips,
                            currentPlayerIndex: Number(playerIndex),
                          }),
                          id: 0,
                        })
                      );
                      client.send(
                        JSON.stringify({
                          type: "turn",
                          data: JSON.stringify({
                            currentPlayer: room.turnUserId,
                          }),
                          id: 0,
                        })
                      );
                    }
                  });
                }
              );
            }
            break;
          case MessageType.ATTACK: {
            const { gameId, indexPlayer, x, y } = message.data;
            const room = roomController.getRoomById(gameId);
            const anotherUser = room.roomUsers.find(
              (user) => user.index !== indexPlayer
            );

            console.log("room.turnUserId", room.turnUserId);
            console.log("indexPlayer", indexPlayer);

            if (indexPlayer === room.turnUserId) {
              const mapGame = room.gameMaps[anotherUser.index];
              let status: "miss" | "killed" | "shot" = "miss";
              let shootDisabled = false;

              if (mapGame[y][x] === 1) {
                mapGame[y][x] = 2;
                status = "shot";
                console.log("КАРТА ПОСЛЕ АТАКИ: ");
                printGameMap(mapGame, indexPlayer);
                if (checkWinnerMap(mapGame)) {
                  console.log("WINNER");
                  // Добавляем победу пользователю
                  userController.addWin(currentUser.index);

                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "finish",
                        data: JSON.stringify({
                          winPlayer: currentUser.index,
                        }),
                        id: 0,
                      })
                    );
                  });

                  // Обновляем статистику победителей
                  const winners = userController.getWinners();
                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "update_winners",
                        data: JSON.stringify(winners),
                        id: 0,
                      })
                    );
                  });
                }
              } else if (mapGame[y][x] === 2) {
                shootDisabled = true;
              }

              ws.send(
                JSON.stringify({
                  type: "attack",
                  data: JSON.stringify({
                    position: {
                      x,
                      y,
                    },
                    currentPlayer: currentUser.index,
                    status: status,
                  }),
                })
              );
              if (room) {
                if (anotherUser) {
                  room.turnUserId =
                    status === "miss" ? anotherUser.index : currentUser.index;

                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "turn",
                        data: JSON.stringify({
                          currentPlayer: room.turnUserId,
                        }),
                        id: 0,
                      })
                    );
                  });
                }
              }
            }

            break;
          }

          case MessageType.RANDOM_ATTACK: {
            const { gameId, indexPlayer } = message.data;
            const room = roomController.getRoomById(gameId);
            const anotherUser = room.roomUsers.find(
              (user) => user.index !== indexPlayer
            );

            if (indexPlayer === room.turnUserId) {
              const mapGame = room.gameMaps[anotherUser.index];
              const { x, y } = generateRandomAttack(mapGame);
              let status: "miss" | "killed" | "shot" = "miss";
              let shootDisabled = false;

              if (mapGame[y][x] === 1) {
                mapGame[y][x] = 2;
                status = "shot";
                console.log("КАРТА ПОСЛЕ СЛУЧАЙНОЙ АТАКИ: ");
                printGameMap(mapGame, indexPlayer);
                if (checkWinnerMap(mapGame)) {
                  console.log("WINNER");
                  userController.addWin(currentUser.index);

                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "finish",
                        data: JSON.stringify({
                          winPlayer: currentUser.index,
                        }),
                        id: 0,
                      })
                    );
                  });

                  const winners = userController.getWinners();
                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "update_winners",
                        data: JSON.stringify(winners),
                        id: 0,
                      })
                    );
                  });
                }
              } else if (mapGame[y][x] === 2) {
                shootDisabled = true;
              }

              ws.send(
                JSON.stringify({
                  type: "attack",
                  data: JSON.stringify({
                    position: {
                      x,
                      y,
                    },
                    currentPlayer: currentUser.index,
                    status: status,
                  }),
                })
              );

              if (room) {
                if (anotherUser) {
                  room.turnUserId =
                    status === "miss" ? anotherUser.index : currentUser.index;

                  wss.clients.forEach((client) => {
                    client.send(
                      JSON.stringify({
                        type: "turn",
                        data: JSON.stringify({
                          currentPlayer: room.turnUserId,
                        }),
                        id: 0,
                      })
                    );
                  });
                }
              }
            }
            break;
          }

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
      // Удаляем пользователя из Map при отключении
      wsToUser.delete(ws);
    });
  });

  return { server, wss };
};
