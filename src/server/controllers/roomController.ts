import { WebSocket, WebSocketServer } from "ws";
import { roomModel, RoomUser } from "../models/roomModel";

let lastGameId = 0;

const broadcastRooms = (wss: WebSocketServer) => {
  console.log("broadcastRooms");
  const rooms = roomModel.getRooms();
  console.log({ rooms });
  const response = {
    type: "update_room",
    data: JSON.stringify(
      rooms.map((room) => ({
        roomId: room.roomId,
        roomUsers: room.roomUsers.map((user) => ({
          name: user.name,
          index: user.index,
        })),
      }))
    ),
    id: 0,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
};

const broadcastCreateGame = (wss: WebSocketServer, user: RoomUser) => {
  console.log("broadcastRooms");
  const roomWhereUser = roomModel
    .getRooms()
    .find((room) => room.roomUsers.some((user) => user.index === user.index));

  if (!roomWhereUser) {
    return;
  }

  const response = {
    type: "create_game",
    data: JSON.stringify({
      idGame: roomWhereUser.roomId,
      idPlayer: user.index,
    }),
    id: 0,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
};

const createRoom = (user: RoomUser) => {
  roomModel.createRoom(user);
};

const addUserToRoom = (roomId: number | string, user: RoomUser) => {
  roomModel.addUserToRoom(roomId, user);
};

const getRoomById = (roomId: number | string) => {
  return roomModel.getRoomById(roomId);
};

export const roomController = {
  createRoom,
  addUserToRoom,
  broadcastRooms,
  broadcastCreateGame,
  getRoomById,
};
