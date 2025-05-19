import { Ship } from "../../types";

let ships: Ship[] = [];

export const shipsModel = {
  addShips: (shipsData: Ship[]) => {
    ships = shipsData;

    console.log("addShips", JSON.stringify(ships));

    return ships;
  },
};