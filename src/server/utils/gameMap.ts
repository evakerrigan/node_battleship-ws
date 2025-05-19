import { Ship } from "../../types";

export const createGameMap = (ships: Ship[]): number[][] => {
  // Создаем пустую карту 10x10, заполненную нулями
  const map: number[][] = Array.from({ length: 10 }, () => Array(10).fill(0));

  // Размещаем корабли на карте
  ships.forEach((ship) => {
    const { x, y } = ship.position;
    const { length, direction } = ship;

    // Размещаем корабль в зависимости от направления
    for (let i = 0; i < length; i++) {
      if (direction) {
        // Горизонтальное направление (direction = true)
        map[y + i][x] = 1;
      } else {
        // Вертикальное направление (direction = false)
        map[y][x + i] = 1;
      }
    }
  });

  return map;
};

export const printGameMap = (map: number[][]): void => {
  console.log("\nИгровая карта:");
  // Добавляем нумерацию столбцов для удобства
  console.log("  0 1 2 3 4 5 6 7 8 9");
  map.forEach((row, y) => {
    // Выводим номер строки и содержимое строки
    console.log(`${y} ${row.join(" ")}`);
  });
  console.log("\n");
};
