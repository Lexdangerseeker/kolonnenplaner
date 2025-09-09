import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Alles was NICHT betroffen sein soll (API, Next-Assets, Favicon, Robots, Sitemap)
const EXCLUDED = [
  /^\/api\//,
  /^\/_next\//,
  /^\/favicon\.ico$/,
  /^\/robots\.txt$/,
  /^\/sitemap\.xml$/
];

export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;

  // API & Assets unberührt lassen (dadurch kein 405 mehr durch Middleware)
  if (EXCLUDED.some(rx => rx.test(p))) {
    return NextResponse.next();
  }

  // OPTIONAL: einfacher Basic-Auth-Schutz für Seiten, wenn ENV vorhanden ist
  const user = process.env.BASIC_AUTH_USER;
  const pass = process.env.BASIC_AUTH_PASS;
  if (user && pass) {
     const auth = req.headers.get("authorization");
     if (!auth?.startsWith("Basic ")) {
       return new NextResponse("Auth required", { status: 401, headers: { "WWW-Authenticate": "Basic realm=\"Secure\"" }});
     }
     const creds = Buffer.from(auth.split(" ")[1] ?? "", "base64").toString("utf8");
     const [u, p0] = creds.split(":");
     if (u !== user || p0 !== pass) {
       return new NextResponse("Unauthorized", { status: 401, headers: { "WWW-Authenticate": "Basic realm=\"Secure\"" }});
     }
  }

  return NextResponse.next();
}

// Matcher: greift auf alles, AUSSER den ausgeschlossenen Pfaden
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
