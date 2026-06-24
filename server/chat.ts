import type { UIMessage } from "ai";
import { and, asc, desc, eq } from "drizzle-orm";

import { db } from "@/server/db";
import { chats, messages } from "@/server/db/schema";

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title: string;
  messages: UIMessage[];
}) => {
  const { userId, chatId, title, messages: chatMessages } = opts;

  await db.transaction(async (tx) => {
    const [existingChat] = await tx
      .select()
      .from(chats)
      .where(eq(chats.id, chatId))
      .limit(1);

    if (existingChat) {
      if (existingChat.userId !== userId) {
        throw new Error("Chat not found");
      }

      await tx
        .update(chats)
        .set({ title, updatedAt: new Date() })
        .where(eq(chats.id, chatId));

      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title,
      });
    }

    if (chatMessages.length > 0) {
      await tx.insert(messages).values(
        chatMessages.map((message, index) => ({
          id: message.id,
          chatId,
          role: message.role,
          parts: message.parts,
          order: index,
        })),
      );
    }
  });
};

export const getChat = async (opts: { userId: string; chatId: string }) => {
  const [chat] = await db
    .select()
    .from(chats)
    .where(and(eq(chats.id, opts.chatId), eq(chats.userId, opts.userId)))
    .limit(1);

  if (!chat) {
    return null;
  }

  const chatMessages = await db
    .select()
    .from(messages)
    .where(eq(messages.chatId, opts.chatId))
    .orderBy(asc(messages.order));

  return {
    ...chat,
    messages: chatMessages.map(
      (message): UIMessage => ({
        id: message.id,
        role: message.role as UIMessage["role"],
        parts: message.parts,
      }),
    ),
  };
};

export const getChats = async (opts: { userId: string }) => {
  return db
    .select({
      id: chats.id,
      title: chats.title,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .where(eq(chats.userId, opts.userId))
    .orderBy(desc(chats.updatedAt));
};
