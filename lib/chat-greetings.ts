type GreetingSubtitle = {
  before: string;
  highlight: string;
  after: string;
};

type GreetingTemplate = {
  title: (name: string, timeGreeting: string) => string;
  subtitle: GreetingSubtitle;
};

export type ResolvedGreeting = {
  title: string;
  subtitle: GreetingSubtitle;
};

const TIME_GREETINGS = ["Good morning", "Good afternoon", "Good evening"] as const;

const GREETING_TEMPLATES: GreetingTemplate[] = [
  {
    title: (name, time) => `${time}, ${name}`,
    subtitle: { before: "What's on your ", highlight: "mind", after: " today?" },
  },
  {
    title: (name) => `Hello, ${name}`,
    subtitle: {
      before: "What can I ",
      highlight: "help you",
      after: " with today?",
    },
  },
  {
    title: (name) => `Hey ${name}`,
    subtitle: {
      before: "What should we ",
      highlight: "research",
      after: " today?",
    },
  },
  {
    title: (name) => `Welcome back, ${name}`,
    subtitle: {
      before: "What's on the ",
      highlight: "agenda",
      after: " for you?",
    },
  },
  {
    title: (name) => `Hi ${name}`,
    subtitle: {
      before: "Ready to ",
      highlight: "deep search",
      after: " something new?",
    },
  },
];

const greetingCache = new Map<string, ResolvedGreeting>();

function getTimeGreetingIndex(): number {
  const hour = new Date().getHours();
  if (hour < 12) {
    return 0;
  }
  if (hour < 17) {
    return 1;
  }
  return 2;
}

/** Fast index from UUID — uses first 8 hex chars, no string loop. */
function getGreetingIndex(chatId: string): number {
  const hex = chatId.replace(/-/g, "").slice(0, 8);
  return (Number.parseInt(hex, 16) || 0) % GREETING_TEMPLATES.length;
}

export function getGreeting(chatId: string, userName: string): ResolvedGreeting {
  const timeIndex = getTimeGreetingIndex();
  const displayName = userName || "Guest";
  const cacheKey = `${chatId}:${displayName}:${timeIndex}`;

  const cached = greetingCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const template = GREETING_TEMPLATES[getGreetingIndex(chatId)];
  const timeGreeting = TIME_GREETINGS[timeIndex];
  const resolved: ResolvedGreeting = {
    title: template.title(displayName, timeGreeting),
    subtitle: template.subtitle,
  };

  greetingCache.set(cacheKey, resolved);
  return resolved;
}
