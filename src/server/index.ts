import { WebSocket } from "ws";
import http from "http";
import { userController } from "./controllers/userController";
import { MessageType, MessageUnion, Ship } from "../types";
import { roomController } from "./controllers/roomController";
import {
  checkWinnerMap,
  createGameMap,
  printGameMap,
  generateRandomAttack,
} from "./utils/gameMap";

// Добавляем Map для хранения соответствия между WebSocket и пользователями
const wsToUser = new Map<WebSocket, { name: string; index: number }>();

let singlePlayerGames = new Map<
  string,
  {
    id: string;
    playerIndex: number;
    computerIndex: number;
    playerMap: number[][];
    computerMap: number[][];
    computerShips: Ship[];
    currentTurn: number;
  }
>();

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

            // Проверяем, является ли это одиночной игрой
            const singleGame = singlePlayerGames.get(gameId.toString());
            if (singleGame) {
              // Обновляем карту игрока
              singleGame.playerMap = createGameMap(ships);

              // Отправляем сообщение о начале игры
              ws.send(
                JSON.stringify({
                  type: "start_game",
                  data: JSON.stringify({
                    ships: ships,
                    currentPlayerIndex: currentUser.index,
                  }),
                  id: 0,
                })
              );

              // Отправляем информацию о первом ходе
              ws.send(
                JSON.stringify({
                  type: "turn",
                  data: JSON.stringify({
                    currentPlayer: singleGame.currentTurn,
                  }),
                  id: 0,
                })
              );
              break;
            }

            // Существующая логика для мультиплеера
            const room = roomController.getRoomById(gameId);
            if (!room) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    error: true,
                    errorText: "Комната не найдена",
                  },
                  id: 0,
                })
              );
              break;
            }

            const user = room.roomUsers.find(
              (u) => u.index === currentUser.index
            );
            if (!user) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  data: {
                    error: true,
                    errorText: "Пользователь не найден в комнате",
                  },
                  id: 0,
                })
              );
              break;
            }

            // Инициализируем необходимые структуры данных
            if (!room.ships) {
              room.ships = {};
            }
            if (!room.gameMaps) {
              room.gameMaps = {};
            }
            if (!room.shipsState) {
              room.shipsState = {};
            }

            // Сохраняем корабли и создаем карту
            room.ships[currentUser.index] = ships;
            room.shipsState[currentUser.index] = [];
            room.gameMaps[currentUser.index] = createGameMap(ships);

            // Если оба игрока разместили корабли, начинаем игру
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

            // Проверяем, является ли это одиночной игрой
            const singleGame = singlePlayerGames.get(gameId.toString());
            if (singleGame) {
              if (indexPlayer === singleGame.currentTurn) {
                // Ход игрока
                let status: "miss" | "killed" | "shot" = "miss";

                if (singleGame.computerMap[y][x] === 1) {
                  singleGame.computerMap[y][x] = 2;
                  status = "shot";

                  if (checkWinnerMap(singleGame.computerMap)) {
                    // Игрок победил
                    userController.addWin(currentUser.index);

                    ws.send(
                      JSON.stringify({
                        type: "finish",
                        data: JSON.stringify({
                          winPlayer: currentUser.index,
                        }),
                        id: 0,
                      })
                    );

                    const winners = userController.getWinners();
                    ws.send(
                      JSON.stringify({
                        type: "update_winners",
                        data: JSON.stringify(winners),
                        id: 0,
                      })
                    );

                    singlePlayerGames.delete(gameId.toString());
                    break;
                  }
                }

                // Отправляем результат хода игрока
                ws.send(
                  JSON.stringify({
                    type: "attack",
                    data: JSON.stringify({
                      position: { x, y },
                      currentPlayer: currentUser.index,
                      status: status,
                    }),
                  })
                );

                // Если игрок промахнулся, ход переходит к компьютеру
                if (status === "miss") {
                  singleGame.currentTurn = singleGame.computerIndex;
                  // Запускаем ход компьютера через 1 секунду
                  setTimeout(() => {
                    makeComputerMove(ws, gameId.toString(), singleGame);
                  }, 1000);
                } else {
                  singleGame.currentTurn = currentUser.index;
                  ws.send(
                    JSON.stringify({
                      type: "turn",
                      data: JSON.stringify({
                        currentPlayer: singleGame.currentTurn,
                      }),
                      id: 0,
                    })
                  );
                }
              }
              break;
            }

            // Существующая логика для мультиплеера
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

            // Создаем уникальный ID для игры
            const gameId = Date.now().toString();

            // Создаем компьютерного противника
            const computerShips = generateComputerShips();
            const playerMap = createGameMap([]); // Пустая карта для игрока
            const computerMap = createGameMap(computerShips);

            // Сохраняем состояние игры
            const gameState = {
              id: gameId,
              playerIndex: currentUser.index,
              computerIndex: -1, // Отрицательный индекс для компьютера
              playerMap,
              computerMap,
              computerShips,
              currentTurn: currentUser.index, // Игрок ходит первым
            };

            // Сохраняем состояние игры в Map
            if (!singlePlayerGames) {
              singlePlayerGames = new Map();
            }
            singlePlayerGames.set(gameId, gameState);

            // Отправляем ответ клиенту
            const response = {
              id: 0,
              type: "create_game",
              data: {
                idGame: gameId,
                idPlayer: currentUser.index,
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

// Функция для генерации случайных кораблей компьютера
const generateComputerShips = (): Ship[] => {
  const ships: Ship[] = [];
  const shipLengths = [4, 3, 3, 2, 2, 2, 1, 1, 1, 1];

  for (const length of shipLengths) {
    let placed = false;
    while (!placed) {
      const x = Math.floor(Math.random() * 10);
      const y = Math.floor(Math.random() * 10);
      const direction = Math.random() > 0.5;

      // Проверяем, можно ли разместить корабль
      let canPlace = true;
      for (let i = 0; i < length; i++) {
        const checkX = direction ? x : x + i;
        const checkY = direction ? y + i : y;

        if (checkX >= 10 || checkY >= 10) {
          canPlace = false;
          break;
        }

        // Проверяем соседние клетки
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = checkX + dx;
            const ny = checkY + dy;

            if (nx >= 0 && nx < 10 && ny >= 0 && ny < 10) {
              // Проверяем, нет ли рядом другого корабля
              if (
                ships.some((ship) => {
                  for (let j = 0; j < ship.length; j++) {
                    const shipX = ship.direction
                      ? ship.position.x
                      : ship.position.x + j;
                    const shipY = ship.direction
                      ? ship.position.y + j
                      : ship.position.y;
                    if (shipX === nx && shipY === ny) {
                      return true;
                    }
                  }
                  return false;
                })
              ) {
                canPlace = false;
                break;
              }
            }
          }
          if (!canPlace) break;
        }
        if (!canPlace) break;
      }

      if (canPlace) {
        ships.push({
          position: { x, y },
          direction,
          length,
          type: "small",
        });
        placed = true;
      }
    }
  }

  return ships;
};

// Добавляем функцию для хода компьютера
const makeComputerMove = (
  ws: WebSocket,
  gameId: string,
  singleGame: {
    id: string;
    playerIndex: number;
    computerIndex: number;
    playerMap: number[][];
    computerMap: number[][];
    computerShips: Ship[];
    currentTurn: number;
  }
) => {
  const { x, y } = generateRandomAttack(singleGame.playerMap);
  let status: "miss" | "killed" | "shot" = "miss";

  if (singleGame.playerMap[y][x] === 1) {
    singleGame.playerMap[y][x] = 2;
    status = "shot";

    if (checkWinnerMap(singleGame.playerMap)) {
      ws.send(
        JSON.stringify({
          type: "finish",
          data: JSON.stringify({
            winPlayer: singleGame.computerIndex,
          }),
          id: 0,
        })
      );

      singlePlayerGames.delete(gameId);
      return;
    }
  }

  // Отправляем результат хода компьютера
  ws.send(
    JSON.stringify({
      type: "attack",
      data: JSON.stringify({
        position: { x, y },
        currentPlayer: singleGame.computerIndex,
        status: status,
      }),
    })
  );

  // Если компьютер попал, он ходит снова через 1 секунду
  if (status === "shot") {
    singleGame.currentTurn = singleGame.computerIndex;
    setTimeout(() => {
      makeComputerMove(ws, gameId, singleGame);
    }, 1000);
  } else {
    singleGame.currentTurn = singleGame.playerIndex;
    ws.send(
      JSON.stringify({
        type: "turn",
        data: JSON.stringify({
          currentPlayer: singleGame.currentTurn,
        }),
        id: 0,
      })
    );
  }
};
