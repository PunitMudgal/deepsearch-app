export function isNewChatCreated(
  data: unknown,
): data is {
  type: "NEW_CHAT_CREATED";
  chatId: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "NEW_CHAT_CREATED" &&
    "chatId" in data &&
    typeof data.chatId === "string"
  );
}

export function isChatTitleUpdated(
  data: unknown,
): data is {
  type: "CHAT_TITLE_UPDATED";
  chatId: string;
  title: string;
} {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "CHAT_TITLE_UPDATED" &&
    "chatId" in data &&
    typeof data.chatId === "string" &&
    "title" in data &&
    typeof data.title === "string"
  );
}
