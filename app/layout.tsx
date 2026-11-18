
import type { Metadata } from "next"
import "./globals.css"

import { AppSidebar } from "@/components/app-sidebar"
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
    <html lang="en">
      <body>
        <SidebarProvider>
          <AppSidebar />

          <SidebarInset className="min-w-0 bg-[#f5f7f5]">
            <header className="flex h-16 items-center gap-3 border-b bg-white px-5">
              <SidebarTrigger />
              <span className="text-sm font-semibold">
                AgroSense
              </span>
            </header>

            {children}
          </SidebarInset>
        </SidebarProvider>
      </body>
    </html>
  )
}
