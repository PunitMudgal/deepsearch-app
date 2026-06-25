"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { AuthButton } from "@/components/auth-button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";

interface Chat {
  id: string;
  title: string;
}

interface ChatSidebarLayoutProps {
  activeChatId?: string;
  chats: Chat[];
  isAuthenticated: boolean;
  userImage?: string | null;
  children: React.ReactNode;
}

export function ChatSidebarLayout({
  activeChatId,
  chats,
  isAuthenticated,
  userImage,
  children,
}: ChatSidebarLayoutProps) {
  return (
    <TooltipProvider>
      <SidebarProvider className="dark min-h-svh">
        <Sidebar>
          <SidebarHeader>
            <SidebarGroup>
              <SidebarGroupLabel>Your Chats</SidebarGroupLabel>
              {isAuthenticated ? (
                <SidebarGroupAction asChild title="New Chat">
                  <Link href="/">
                    <PlusIcon />
                    <span className="sr-only">New Chat</span>
                  </Link>
                </SidebarGroupAction>
              ) : null}
            </SidebarGroup>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupContent>
                {chats.length > 0 ? (
                  <SidebarMenu>
                    {chats.map((chat) => (
                      <SidebarMenuItem key={chat.id}>
                        <SidebarMenuButton
                          asChild
                          isActive={chat.id === activeChatId}
                        >
                          <Link href={`/?id=${chat.id}`}>
                            <span>{chat.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                ) : (
                  <p className="px-2 text-sm text-muted-foreground">
                    {isAuthenticated
                      ? "No chats yet. Start a new conversation!"
                      : "Sign in to start chatting"}
                  </p>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter>
            <AuthButton
              isAuthenticated={isAuthenticated}
              userImage={userImage}
            />
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <SidebarInset className="flex min-h-svh flex-col">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
            <SidebarTrigger />
            <span className="text-lg font-medium">DeepSearch</span>
          </header>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
