import { Ship } from "../../types";

export type RoomUser = {
  name: string;
  index: number;
};

export type Room = {
  roomId: number;
  roomUsers: RoomUser[];
  ships?: {
    [key: string]: Ship[];
  };
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

  addUserToRoom: (roomId: number | string, user: RoomUser): Room | null => {
    const room = rooms.find((r) => r.roomId === roomId);
    if (!room || room.roomUsers.length >= 2) return null;

    rooms.forEach((room) => {
      if (room.roomId === roomId) {
        room.roomUsers.push(user);
      }
    });

    console.log("addUserToRoom", { rooms });
  },

  getRooms: (): Room[] => {
    return rooms;
  },

  removeRoom: (roomId: number): void => {
    const index = rooms.findIndex((room) => room.roomId === roomId);
    if (index !== -1) {
      rooms.splice(index, 1);
    }
  },

  getRoomById: (roomId: number | string): Room | undefined => {
    return rooms.find((room) => room.roomId === roomId);
  },
};
