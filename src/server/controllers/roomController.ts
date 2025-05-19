import { WebSocket } from "ws";
import { roomModel, RoomUser } from "../models/roomModel";

let lastGameId = 0;

const broadcastRooms = (wss: WebSocket.Server) => {
  const rooms = roomModel.getRooms();
  const response = {
    type: "update_room",
    data: rooms.map((room) => ({
      roomId: room.roomId,
      roomUsers: room.roomUsers.map((user) => ({
        name: user.name,
        index: user.index,
      })),
    })),
    id: 0,
  };

  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(response));
    }
  });
};

const createRoom = () => {
  
  return room;
};

const addUserToRoom = (
  ws: WebSocket,
  roomId: number,
  user: RoomUser,
  wss: WebSocket.Server
) => {
  const room = roomModel.addUserToRoom(roomId, user);

  if (room && room.roomUsers.length === 2) {
    // Отправляем create_game обоим игрокам
    room.roomUsers.forEach((player, index) => {
      const response = {
        type: "create_game",
        data: {
          idGame: ++lastGameId,
          idPlayer: index + 1,
        },
        id: 0,
      };
      player.ws.send(JSON.stringify(response));
    });

    // Удаляем комнату из списка доступных
    roomModel.removeRoom(roomId);
    broadcastRooms(wss);
  }

  return room;
};

export const roomController = {
  createRoom,
  addUserToRoom,
  broadcastRooms,
};
