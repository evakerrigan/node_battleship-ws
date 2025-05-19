import { Ship } from "../../types";
import { shipsModel } from "../models/shipsModel";

function addShips(ships: Ship[]) {
  shipsModel.addShips(ships);
}

export const shipsController = {
  addShips,
};
``;
