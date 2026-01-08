// Local type shims to silence IDE TypeScript errors for Supabase Edge Functions.
// These are not required by Supabase in production; the runtime provides Deno globals.
declare const Deno: {
  serve: (handler: (req: Request) => Response | Promise<Response>) => void;
  env: { get: (name: string) => string | undefined };
};
