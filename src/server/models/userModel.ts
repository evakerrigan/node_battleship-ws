export type User = {
  name: string;
  password: string;
  userId: number;
  wins: number;
};

let lastId = 0;

const users: User[] = [];

export const userModel = {
  addUser: (name: string, password: string): User | null => {
    if (userModel.existUser(name, password)) {
      return userModel.getUser(name, password);
    } else if (userModel.hasUser(name)) {
      console.log("ПАРОЛЬ НЕ ВЕРНЫЙ");
      throw new Error("Password is not correct");
    }

    lastId += 1;

    const user = {
      name: name,
      password: password,
      userId: lastId,
      wins: 0,
    };

    users.push(user);

    return user;
  },

  hasUser: (name: string): boolean => {
    return users.some((user) => user.name === name);
  },

  existUser: (name: string, password: string): boolean => {
    return users.some(
      (user) => user.name === name && user.password === password
    );
  },

  getUser: (name: string, password: string): User | null => {
    return users.find(
      (user) => user.name === name && user.password === password
    );
  },

  addWin: (userId: number): void => {
    const user = users.find((u) => u.userId === userId);
    if (user) {
      user.wins += 1;
    }
  },

  getWinners: (): { name: string; wins: number }[] => {
    return users.map(({ name, wins }) => ({ name, wins }));
  },
};
