import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL; const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, { cookies: { getAll: () => request.cookies.getAll(), setAll: (items) => { items.forEach(({name,value}) => request.cookies.set(name,value)); response=NextResponse.next({request}); items.forEach(({name,value,options})=>response.cookies.set(name,value,options)); } } });
  const { data, error } = await supabase.auth.getClaims();
  const authenticated = !error && Boolean(data?.claims?.sub);
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  if (!authenticated && !isLogin) { const target=request.nextUrl.clone(); target.pathname="/login"; target.searchParams.set("returnTo",request.nextUrl.pathname); return NextResponse.redirect(target); }
  if (authenticated && isLogin) { const target=request.nextUrl.clone(); target.pathname="/"; target.search=""; return NextResponse.redirect(target); }
  return response;
}

export const config = { matcher: ["/((?!api/map/cadastral|_next/static|_next/image|favicon.svg).*)"] };
