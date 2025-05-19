interface RegData {
  name: string;
  password: string;
}

interface RegResponse {
  name: string;
  index: number | string;
  error: boolean;
  errorText: string;
}

interface AuthData {
  login: string;
  password: string;
}

interface Winner {
  name: string;
  wins: number;
}

interface UpdateWinnersData {
  winners: Winner[];
}

type CreateRoomData = string;

interface AddUserToRoomData {
  indexRoom: number | string;
}

interface CreateGameData {
  idGame: number | string;
  idPlayer: number | string;
}

interface Room {
  roomId: number | string;
  roomUsers: [name: string, index: number | string];
}

type UpdateRoomData = Room[];

interface Ship {
  position: [x: number, y: number];
  direction: boolean;
  length: number;
  type: "small" | "medium" | "large" | "huge";
}

interface AddShipsData {
  gameId: number | string;
  ships: Ship[];
  indexPlayer: number | string;
}

interface StartGameData {
  ships: Ship[];
  currentPlayerIndex: number | string;
}

interface AttackData {
  gameId: number | string;
  x: number;
  y: number;
  indexPlayer: number | string;
}

interface AttackResponse {
  position: [x: number, y: number];
  currentPlayer: number | string;
  status: "miss" | "killed" | "shot";
}

interface RandomAttackData {
  gameId: number | string;
  indexPlayer: number | string;
}

interface TurnData {
  currentPlayer: number | string;
}

interface FinishData {
  winPlayer: number | string;
}

interface SinglePlayData {}

export enum MessageType {
  REG = "reg",
  AUTH = "auth",
  UPDATE_WINNERS = "update_winners",
  CREATE_ROOM = "create_room",
  ADD_USER_TO_ROOM = "add_user_to_room",
  CREATE_GAME = "create_game",
  UPDATE_ROOM = "update_room",
  ADD_SHIPS = "add_ships",
  START_GAME = "start_game",
  ATTACK = "attack",
  RANDOM_ATTACK = "random_attack",
  TURN = "turn",
  FINISH = "finish",
  SINGLE_PLAY = "single_play",
}

interface MessageDataMap {
  [MessageType.REG]: RegData;
  [MessageType.AUTH]: AuthData;
  [MessageType.UPDATE_WINNERS]: UpdateWinnersData;
  [MessageType.CREATE_ROOM]: CreateRoomData;
  [MessageType.ADD_USER_TO_ROOM]: AddUserToRoomData;
  [MessageType.CREATE_GAME]: CreateGameData;
  [MessageType.UPDATE_ROOM]: UpdateRoomData;
  [MessageType.ADD_SHIPS]: AddShipsData;
  [MessageType.START_GAME]: StartGameData;
  [MessageType.ATTACK]: AttackData;
  [MessageType.RANDOM_ATTACK]: RandomAttackData;
  [MessageType.TURN]: TurnData;
  [MessageType.FINISH]: FinishData;
  [MessageType.SINGLE_PLAY]: SinglePlayData;
}

export enum ResponseMessageType {
  REG = "reg",
  ATTACK = "attack",
}

interface ResponseMessageDataMap {
  [ResponseMessageType.REG]: RegResponse;
  [ResponseMessageType.ATTACK]: AttackResponse;
}

interface Message<T extends MessageType> {
  type: T;
  data: MessageDataMap[T];
  id: number;
}

export interface ResponseMessage<T extends ResponseMessageType> {
  type: T;
  data: ResponseMessageDataMap[T];
  id: number;
}

export type MessageUnion = {
  [K in MessageType]: Message<K>;
}[MessageType];
