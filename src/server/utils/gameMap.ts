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

// export const checkShipStatus = (
//   map: number[][],
//   hitX: number,
//   hitY: number
// ): "shot" | "killed" => {
//   // Находим все клетки корабля, к которому принадлежит попавшая клетка
//   const shipCells = new Set<string>();
//   const visited = new Set<string>();

//   // BFS для поиска всех клеток корабля
//   const queue = [`${hitX},${hitY}`];
//   visited.add(`${hitX},${hitY}`);
//   shipCells.add(`${hitX},${hitY}`);

//   const directions = [
//     [-1, 0],
//     [1, 0],
//     [0, -1],
//     [0, 1], // вверх, вниз, влево, вправо
//   ];

//   while (queue.length > 0) {
//     const current = queue.shift()!;
//     const [x, y] = current.split(",").map(Number);

//     // Проверяем все соседние клетки
//     for (const [dx, dy] of directions) {
//       const newX = x + dx;
//       const newY = y + dy;
//       const key = `${newX},${newY}`;

//       // Проверяем границы карты
//       if (
//         newX >= 0 &&
//         newX < 10 &&
//         newY >= 0 &&
//         newY < 10 &&
//         !visited.has(key)
//       ) {
//         visited.add(key);

//         // Если найдена клетка корабля (значение 2 - попадание)
//         if (map[newX][newY] === 2) {
//           shipCells.add(key);
//           queue.push(key);
//         }
//       }
//     }
//   }

//   // Проверяем все клетки корабля - есть ли рядом неповрежденные части (значение 1)
//   for (const cellKey of shipCells) {
//     const [x, y] = cellKey.split(",").map(Number);

//     // Проверяем все соседние клетки для каждой клетки корабля
//     for (const [dx, dy] of directions) {
//       const newX = x + dx;
//       const newY = y + dy;

//       // Проверяем границы карты
//       if (newX >= 0 && newX < 10 && newY >= 0 && newY < 10) {
//         // Если найдена неповрежденная часть корабля (значение 1)
//         if (map[newX][newY] === 1) {
//           return "shot"; // Корабль еще не полностью уничтожен
//         }
//       }
//     }
//   }

//   return "killed"; // Корабль полностью уничтожен
// };

export const printGameMap = (map: number[][], indexPlayer: number): void => {
  console.log("\nИгровая карта игрока: ", indexPlayer);
  // Добавляем нумерацию столбцов для удобства
  console.log("  0 1 2 3 4 5 6 7 8 9");
  map.forEach((row, y) => {
    // Выводим номер строки и содержимое строки
    console.log(`${y} ${row.join(" ")}`);
  });
  console.log("\n");
};

export const checkWinnerMap = (map: number[][]) => {
  const countTwo = map.reduce(
    (acc, row) => acc + row.filter((cell) => cell === 2).length,
    0
  );
  return countTwo >= 20;
};

export const generateRandomAttack = (
  map: number[][]
): { x: number; y: number } => {
  const availableCells: { x: number; y: number }[] = [];

  // Собираем все доступные для атаки клетки (те, которые еще не были атакованы)
  for (let y = 0; y < map.length; y++) {
    for (let x = 0; x < map[y].length; x++) {
      if (map[y][x] !== 2) {
        // 2 означает, что клетка уже была атакована
        availableCells.push({ x, y });
      }
    }
  }

  // Если есть доступные клетки, выбираем случайную
  if (availableCells.length > 0) {
    const randomIndex = Math.floor(Math.random() * availableCells.length);
    return availableCells[randomIndex];
  }

  // Если все клетки уже атакованы (не должно происходить в нормальной игре)
  return { x: 0, y: 0 };
};
