import type { EvalCase } from "@/evals/types";
import { evalCase } from "@/evals/utils";

export const ciData: EvalCase[] = [
  evalCase(
    "ci-1",
    "What is the capital of France?",
    "Paris is the capital of France.",
  ),
  evalCase(
    "ci-2",
    "What year was the first version of React released?",
    "React was first released in 2013.",
  ),
  evalCase(
    "ci-3",
    "What does HTML stand for?",
    "HTML stands for HyperText Markup Language.",
  ),
  evalCase(
    "ci-4",
    "Who created the Python programming language?",
    "Python was created by Guido van Rossum.",
  ),
  evalCase(
    "ci-5",
    "What is the chemical symbol for gold?",
    "The chemical symbol for gold is Au.",
  ),
];
