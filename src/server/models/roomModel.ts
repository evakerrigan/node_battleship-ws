import { WebSocket } from "ws";

export type RoomUser = {
  name: string;
  index: number;
  ws: WebSocket;
};

export type Room = {
  roomId: number;
  roomUsers: RoomUser[];
};

let lastRoomId = 0;
const rooms: Room[] = [];

export const roomModel = {
  createRoom: (user: RoomUser): Room => {
    const room: Room = {
      roomId: ++lastRoomId,
      roomUsers: [user],
    };
    rooms.push(room);
    return room;
  },

  addUserToRoom: (roomId: number, user: RoomUser): Room | null => {
    const room = rooms.find((r) => r.roomId === roomId);
    if (!room || room.roomUsers.length >= 2) return null;

    room.roomUsers.push(user);
    return room;
  },

  getRooms: (): Room[] => {
    return rooms.filter((room) => room.roomUsers.length === 1);
  },

  removeRoom: (roomId: number): void => {
    const index = rooms.findIndex((room) => room.roomId === roomId);
    if (index !== -1) {
      rooms.splice(index, 1);
    }
  },

  getRoomById: (roomId: number): Room | undefined => {
    return rooms.find((room) => room.roomId === roomId);
  },
};
