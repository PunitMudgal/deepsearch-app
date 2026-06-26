"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { siDiscord, siGithub } from "simple-icons/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  PanelLeftClose,
  PanelLeft,
  Search,
  Sparkles,
  ChevronsUpDown,
  Home,
  Bell,
  Settings,
  FileText,
  Gift,
  Inbox,
  MessageSquareMore,
  Plus,
  BrainCircuit,
  MessageSquare,
  LogOut,
  User,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface Chat {
  id: string;
  title: string;
}

interface ChatSidebarLayoutProps {
  activeChatId?: string;
  chats: Chat[];
  isAuthenticated: boolean;
  userImage?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  children: React.ReactNode;
}

function SidebarHeaderContent({ isAuthenticated }: { isAuthenticated: boolean }) {
  const { toggleSidebar, state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <div className={cn(
      "flex items-center justify-between px-3 py-4 transition-all duration-200",
      isCollapsed ? "justify-center" : ""
    )}>
      {!isCollapsed && (
        <div className="flex items-center gap-2.5 select-none animate-in fade-in duration-200">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20">
            <BrainCircuit className="h-4.5 w-4.5" />
          </div>
          <span className="text-base font-bold text-white tracking-tight">DeepSearch</span>
        </div>
      )}
      {isCollapsed && (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/20 mb-2 cursor-pointer" onClick={toggleSidebar}>
          <BrainCircuit className="h-4.5 w-4.5 animate-pulse" />
        </div>
      )}
      {!isCollapsed && (
        <button
          onClick={toggleSidebar}
          className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 rounded-xl border border-zinc-800/40 transition-all"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function ChatSidebarLayout({
  activeChatId,
  chats,
  isAuthenticated,
  userImage,
  userName,
  userEmail,
  children,
}: ChatSidebarLayoutProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredChats = chats.filter((chat) =>
    chat.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TooltipProvider>
      <SidebarProvider className="dark h-svh overflow-hidden bg-zinc-950">
        <Sidebar collapsible="icon" className="border-r border-zinc-900/60 [&_[data-sidebar=sidebar]]:bg-[#0e0e11] text-zinc-300">
          <SidebarHeader className="p-0">
            <SidebarHeaderContent isAuthenticated={isAuthenticated} />
          </SidebarHeader>

          <SidebarContent className="px-3 gap-0 no-scrollbar">
            {/* Search Box */}
            <SidebarSearch
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />

            {/* Main Navigation Group */}
            <div className="mt-4 flex flex-col gap-1">
              <SidebarItem
                href="/"
                icon={<Home className="h-4 w-4" />}
                label="Home"
                isActive={!activeChatId}
              />
              {/* <SidebarItem
                href="#"
                icon={<Bell className="h-4 w-4" />}
                label="Notifications"
                badge={3}
              /> */}
              <SidebarItem
                href="#"
                icon={<Settings className="h-4 w-4" />}
                label="Settings"
              />
            </div>

            {/* Chats List Group */}
            <div className="mt-6">
              <div className="flex items-center justify-between px-3 py-1.5 text-[11px] font-bold text-zinc-500 tracking-wider uppercase select-none">
                <span>Chats</span>
                {isAuthenticated && (
                  <Link
                    href="/"
                    className="text-zinc-500 hover:text-zinc-300 transition-colors p-0.5 hover:bg-zinc-800/30 rounded-md"
                    title="New Chat"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Link>
                )}
              </div>
              <div className="mt-1 flex flex-col gap-1  overflow-y-auto no-scrollbar">
                {filteredChats.length > 0 ? (
                  filteredChats.map((chat) => {
                    const isActive = chat.id === activeChatId;
                    return (
                      <SidebarItem
                        key={chat.id}
                        href={`/?id=${chat.id}`}
                        icon={<MessageSquare className="h-4 w-4" />}
                        label={chat.title}
                        isActive={isActive}
                      />
                    );
                  })
                ) : (
                  <p className="px-3 py-2 text-xs text-zinc-500">
                    {isAuthenticated
                      ? searchQuery
                        ? "No matches found"
                        : "No chats yet."
                      : "Sign in to chat"}
                  </p>
                )}
              </div>
            </div>

          </SidebarContent>

          {/* Sidebar Footer */}
          <SidebarFooter className="p-3 gap-3">

            {/* User Profile dropdown wrapper */}
            <div ref={profileRef} className="relative w-full">
              {/* Profile Dropdown Menu */}
              {isProfileOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-[#141417] border border-zinc-800/80 rounded-2xl p-1.5 shadow-2xl shadow-black/85 flex flex-col gap-1 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {isAuthenticated ? (
                    <>
                      <div className="px-3 py-2 border-b border-zinc-900 mb-1 select-none">
                        <p className="text-xs font-semibold text-zinc-200 truncate">{userName || "User"}</p>
                        <p className="text-[10px] text-zinc-500 truncate">{userEmail}</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          void signOut();
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign out</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="px-3 py-2 border-b border-zinc-900 mb-1 select-none">
                        <p className="text-xs font-semibold text-zinc-200">Sign in to sync chats</p>
                      </div>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          void signIn("github");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/40 rounded-xl transition-all"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d={siGithub.path} />
                        </svg>
                        <span>GitHub</span>
                      </button>
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          void signIn("discord");
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white hover:bg-zinc-800/40 rounded-xl transition-all"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d={siDiscord.path} />
                        </svg>
                        <span>Discord</span>
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Profile Card Button */}
              <ProfileCardButton
                isAuthenticated={isAuthenticated}
                userImage={userImage}
                userName={userName}
                userEmail={userEmail}
                onClick={() => setIsProfileOpen(!isProfileOpen)}
              />
            </div>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset className="flex h-svh flex-col bg-[#0b0b0d] overflow-hidden">
          <MobileHeader />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}

/* Sub-components */

function MobileHeader() {
  const { toggleSidebar } = useSidebar();
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-zinc-900 bg-[#0e0e11] px-4 md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="h-8 w-8 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 rounded-xl border border-zinc-800/40 transition-all"
      >
        <PanelLeft className="h-4 w-4 text-zinc-400" />
      </Button>
      <span className="text-base font-bold text-white tracking-tight">DeepSearch</span>
    </header>
  );
}

function SidebarSearch({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 mx-auto items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 rounded-xl border border-zinc-800/40 transition-all mt-2"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">Search</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <div className="relative mx-1 mt-2 animate-in fade-in duration-200">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 pointer-events-none" />
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="w-full bg-[#121214]/60 text-zinc-200 placeholder-zinc-500 text-xs pl-9 pr-12 py-2.5 rounded-xl border border-zinc-850 focus:outline-none focus:border-zinc-800 focus:ring-1 focus:ring-zinc-800/30 transition-all"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none select-none">
        <kbd className="bg-[#18181b] text-zinc-500 border border-zinc-800 text-[9px] px-1 py-0.5 rounded font-sans">⌘</kbd>
        <kbd className="bg-[#18181b] text-zinc-500 border border-zinc-800 text-[9px] px-1.5 py-0.5 rounded font-sans">F</kbd>
      </div>
    </div>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  isActive = false,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  badge?: number;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const content = (
    <Link
      href={href}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 h-10 rounded-xl transition-all duration-200 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/20 group/item select-none",
        isActive && "bg-zinc-900/40 text-white border border-zinc-850/80 bg-[linear-gradient(90deg,transparent_50%,rgba(139,92,246,0.06)_100%)] hover:bg-zinc-900/50"
      )}
    >
      <div className={cn("text-zinc-500 group-hover/item:text-zinc-300 transition-colors shrink-0", isActive && "text-violet-400 group-hover/item:text-violet-300")}>
        {icon}
      </div>
      {!isCollapsed && (
        <span className="truncate flex-1 animate-in fade-in duration-200">{label}</span>
      )}
      {!isCollapsed && badge !== undefined && (
        <span className="bg-violet-600/10 text-violet-400 border border-violet-500/15 text-[10px] px-1.5 py-0.5 rounded-full select-none">
          {badge}
        </span>
      )}
      {isActive && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 w-[3px] h-4.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.85)]" />
      )}
    </Link>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}


function ProfileCardButton({
  isAuthenticated,
  userImage,
  userName,
  userEmail,
  onClick,
}: {
  isAuthenticated: boolean;
  userImage?: string | null;
  userName?: string | null;
  userEmail?: string | null;
  onClick: () => void;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  const trigger = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between p-2 rounded-2xl bg-zinc-900/20 border border-zinc-850/60 hover:bg-zinc-800/15 hover:border-zinc-800 transition-all duration-200 cursor-pointer select-none",
        isCollapsed ? "justify-center p-1.5" : ""
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        {userImage ? (
          <Image
            src={userImage}
            alt="User avatar"
            width={28}
            height={28}
            className="rounded-xl ring-1 ring-zinc-800"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-zinc-800/40 border border-zinc-800 text-zinc-400">
            <User className="h-3.5 w-3.5" />
          </div>
        )}

        {!isCollapsed && (
          <div className="text-left min-w-0 animate-in fade-in duration-200">
            <p className="text-xs font-semibold text-zinc-200 truncate leading-tight">
              {isAuthenticated ? userName || "User" : "Guest"}
            </p>
            <p className="text-[10px] text-zinc-500 truncate mt-0.5 leading-none">
              {isAuthenticated ? userEmail : "Click to sign in"}
            </p>
          </div>
        )}
      </div>
      {!isCollapsed && <ChevronsUpDown className="h-3.5 w-3.5 text-zinc-500 shrink-0 ml-1" />}
    </button>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">
          {isAuthenticated ? userName || "User" : "Sign In"}
        </TooltipContent>
      </Tooltip>
    );
  }

  return trigger;
}
