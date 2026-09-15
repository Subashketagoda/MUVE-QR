import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({ request })

  // API routes manage their own authentication and responses
  if (pathname.startsWith('/api')) {
    return response
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const isSupabaseConfigured =
    !!supabaseUrl &&
    !supabaseUrl.includes('your-project-id') &&
    !supabaseUrl.includes('placeholder')

  // Demo mode fallback: if Supabase credentials are not connected, permit seamless client navigation
  if (!isSupabaseConfigured) {
    return response
  }

  // Supabase is configured — perform strict server-side auth checking
  let user = null
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
            response = NextResponse.next({ request })
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch (e) {}

  const sessionCookie = request.cookies.get('muve_session')?.value
  let sessionUser = user
  if (!sessionUser && sessionCookie) {
    try {
      sessionUser = JSON.parse(decodeURIComponent(sessionCookie))
    } catch (e) {}
  }

  const hasSession = !!sessionUser

  const publicRoutes = ['/login', '/scan', '/download', '/app']
  const isPublic = publicRoutes.some((r) => pathname.startsWith(r)) || pathname === '/'

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (hasSession && pathname === '/login') {
    const targetUrl = sessionUser?.role === 'admin' ? '/admin/dashboard' : '/app/home'
    return NextResponse.redirect(new URL(targetUrl, request.url))
  }

  return response
}

export async function proxy(request: NextRequest) {
  return middleware(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
