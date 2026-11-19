
import type { Metadata } from "next"
import "./globals.css"

import { AppSidebar } from "@/components/app-sidebar"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export const metadata: Metadata = {
  title: "AgroSense",
  description: "Hydroponic monitoring dashboard",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `try { if (localStorage.getItem("agrosense-theme") === "dark") document.documentElement.classList.add("dark") } catch {}`,
          }}
        />
        <SidebarProvider>
          <AppSidebar />

          <SidebarInset className="min-w-0 bg-background">
            <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background px-5">
              <SidebarTrigger />
              <span className="text-sm font-semibold">
                AgroSense
              </span>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </header>

            {children}
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}
