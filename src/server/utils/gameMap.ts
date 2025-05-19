import { Ship } from "../../types";

export const createGameMap = (ships: Ship[]): number[][] => {
  // Создаем пустую карту 10x10
  const map: number[][] = Array(10)
    .fill(null)
    .map(() => Array(10).fill(0));

  // Размещаем корабли на карте
  ships.forEach((ship) => {
    const { position, direction, length } = ship;
    const { x, y } = position;

    // Проверяем, что корабль помещается в границы поля
    if (direction) {
      // Горизонтальное размещение
      if (x + length <= 10) {
        for (let i = 0; i < length; i++) {
          map[y][x + i] = 1;
        }
      }
    } else {
      // Вертикальное размещение
      if (y + length <= 10) {
        for (let i = 0; i < length; i++) {
          map[y + i][x] = 1;
        }
      }
    }
  });

  return map;
};

export const printGameMap = (map: number[][]): void => {
  console.log("\nИгровая карта:");
  map.forEach((row) => {
    console.log(row.join(" "));
  });
  console.log("\n");
};
