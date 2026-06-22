import NextAuth, { getServerSession } from "next-auth";
import { cache } from "react";

import { authConfig } from "./config";

const handler = NextAuth(authConfig);

const auth = cache(() => getServerSession(authConfig));

export const handlers = { GET: handler, POST: handler };

export { auth, handler };
