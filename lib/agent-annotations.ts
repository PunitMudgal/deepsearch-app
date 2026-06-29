import type { Action } from "@/server/get-next-action";

export type OurMessageAnnotation = {
  type: "NEW_ACTION";
  action: Action;
};

export type WriteMessageAnnotation = (
  annotation: OurMessageAnnotation,
) => void;

export function isNewActionAnnotation(
  data: unknown,
): data is OurMessageAnnotation {
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

export function getNewActionAnnotations(
  parts: Array<{ type: string; data?: unknown }>,
): OurMessageAnnotation[] {
  return parts
    .filter((part) => part.type === "data-newAction")
    .map((part) => part.data)
    .filter(isNewActionAnnotation);
}
