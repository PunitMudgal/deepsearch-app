import type { EvalCase } from "@/evals/types";
import { evalCase } from "@/evals/utils";

export const regressionData: EvalCase[] = [
  evalCase(
    "reg-1",
    "What is the speed of light in a vacuum?",
    "The speed of light in a vacuum is approximately 299,792,458 meters per second.",
  ),
  evalCase(
    "reg-2",
    "How many planets are in our solar system?",
    "There are eight planets in our solar system.",
  ),
  evalCase(
    "reg-3",
    "What is the boiling point of water at sea level in Celsius?",
    "Water boils at 100 degrees Celsius at sea level.",
  ),
  evalCase(
    "reg-4",
    "Who wrote the novel '1984'?",
    "George Orwell wrote the novel 1984.",
  ),
  evalCase(
    "reg-5",
    "What is the largest ocean on Earth?",
    "The Pacific Ocean is the largest ocean on Earth.",
  ),
];
