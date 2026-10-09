import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Proteção de rotas
  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/cadastro") ||
    request.nextUrl.pathname.startsWith("/esqueci-senha");
  
  // Catálogo (/listagem, /lojas, /perfil) é público; anunciar e gerir loja exigem login.
  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/minha-loja") ||
    request.nextUrl.pathname.startsWith("/admin");

  if (!user && isProtectedRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // /admin exige usuarios.is_admin (as RPCs de moderação também checam no banco)
  if (user && request.nextUrl.pathname.startsWith("/admin")) {
    const { data: perfil } = await supabase
      .from("usuarios")
      .select("is_admin")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!perfil?.is_admin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
