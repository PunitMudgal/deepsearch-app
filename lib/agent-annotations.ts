import type { Action } from "@/server/get-next-action";

export type PlanAnnotation = {
  type: "NEW_PLAN";
  title: string;
  plan: string;
  queries: string[];
};

export type ActionAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};

export type OurMessageAnnotation = PlanAnnotation | ActionAnnotation;

export type WriteMessageAnnotation = (
  annotation: OurMessageAnnotation,
) => void;

export function isPlanAnnotation(data: unknown): data is PlanAnnotation {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_PLAN" &&
    "plan" in data &&
    typeof data.plan === "string" &&
    "queries" in data &&
    Array.isArray(data.queries) &&
    "title" in data &&
    typeof data.title === "string"
  );
}

export function isActionAnnotation(data: unknown): data is ActionAnnotation {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_ACTION" &&
    "action" in data &&
    typeof data.action === "object" &&
    data.action !== null
  );
}

export function isOurMessageAnnotation(
  data: unknown,
): data is OurMessageAnnotation {
  return isPlanAnnotation(data) || isActionAnnotation(data);
}

/** @deprecated Use isActionAnnotation instead. */
export function isNewActionAnnotation(
  data: unknown,
): data is ActionAnnotation {
  return isActionAnnotation(data);
}

export function getMessageAnnotations(
  parts: Array<{ type: string; data?: unknown }>,
): OurMessageAnnotation[] {
  return parts
    .filter((part) => part.type === "data-newAction")
    .map((part) => part.data)
    .filter(isOurMessageAnnotation);
}

/** @deprecated Use getMessageAnnotations instead. */
export function getNewActionAnnotations(
  parts: Array<{ type: string; data?: unknown }>,
): OurMessageAnnotation[] {
  return getMessageAnnotations(parts);
}
