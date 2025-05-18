import { userModel } from "../models/userModel";

const regUser = (name: string, password: string) => {
  const answer = {
    type: "reg",
    data: {
      name: "",
      index: 0,
      error: false,
      errorText: "",
    },
    id: 0,
  };

  try {
    const user = userModel.addUser(name, password);

    answer.data.index = user.userId;
  } catch (error) {
    answer.data.error = true;
    answer.data.errorText = error.message;
  }

  return answer;
};

export const userController = {
  regUser,
};
