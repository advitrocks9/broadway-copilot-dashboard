import { NextResponse } from "next/server"
import { auth } from "@/lib/auth-edge"

export default auth((req) => {
  const pathname = req.nextUrl.pathname
  const isAuthed = !!req.auth

  if (!isAuthed && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isAuthed && pathname === "/login") {
    return NextResponse.redirect(new URL("/", req.url))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/", "/login", "/((?!api|_next/static|_next/image|favicon.ico|api).*)"],
}