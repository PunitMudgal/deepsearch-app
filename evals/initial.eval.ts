import { Levenshtein } from "autoevals";
import { evalite } from "evalite";

evalite("My Eval", {
  data: async () => {
    return [{ input: "Hello", expected: "Hello World!" }];
  },
  task: async (input) => {
    return input + " World!";
  },
  scorers: [Levenshtein],
});
