import type { UIMessage } from "ai";
import { and, asc, desc, eq } from "drizzle-orm";

import type { OurMessageAnnotation } from "@/lib/agent-annotations";
import { db } from "@/server/db";
import { chats, messages } from "@/server/db/schema";

export type StoredUIMessage = UIMessage & {
  annotations?: OurMessageAnnotation[];
};

export const upsertChat = async (opts: {
  userId: string;
  chatId: string;
  title?: string;
  messages: StoredUIMessage[];
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
        .set({
          updatedAt: new Date(),
          ...(title !== undefined ? { title } : {}),
        })
        .where(eq(chats.id, chatId));

      await tx.delete(messages).where(eq(messages.chatId, chatId));
    } else {
      await tx.insert(chats).values({
        id: chatId,
        userId,
        title: title ?? "New chat",
      });
    }

    if (chatMessages.length > 0) {
      await tx.insert(messages).values(
        chatMessages.map((message, index) => ({
          id: message.id,
          chatId,
          role: message.role,
          parts: message.parts,
          annotations: message.annotations,
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
      (message): StoredUIMessage => ({
        id: message.id,
        role: message.role as UIMessage["role"],
        parts: message.parts,
        annotations: message.annotations ?? undefined,
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
