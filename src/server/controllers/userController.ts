import { ResponseMessage, ResponseMessageType } from "../../types";
import { userModel } from "../models/userModel";

function regUser(name: string, password: string) {
  const answer: ResponseMessage<ResponseMessageType.REG> = {
    type: ResponseMessageType.REG,
    data: {
      name: name,
      index: 0,
      error: false,
      errorText: "",
    },
    id: 0,
  };

  try {
    const user = userModel.addUser(name, password);
    answer.data.index = user.userId;
    answer.data.name = user.name;
  } catch (error) {
    answer.data.error = true;
    answer.data.errorText = error.message;
  }

  console.log("answer", answer);

  return answer;
}

export const userController = {
  regUser,
};
