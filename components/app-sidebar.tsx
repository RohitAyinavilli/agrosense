
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Activity, BarChart3, Bell, Images, Leaf } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navigation = [
  { title: "Overview", href: "/", icon: Activity },
  { title: "Sensor data", href: "/data", icon: BarChart3 },
  { title: "Images", href: "/images", icon: Images },
  { title: "Notifications", href: "/notifications", icon: Bell },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar variant="sidebar" collapsible="offcanvas">
      <SidebarHeader className="border-b px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-emerald-700 p-2 text-white">
            <Leaf size={21} />
          </div>
          <div>
            <p className="font-bold tracking-tight">AgroSense</p>
            <p className="text-xs text-muted-foreground">
              Hydroponic monitoring
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => {
                const Icon = item.icon
                const active = pathname === item.href

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={active}
                      tooltip={item.title}
                    >
                      <Icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Leaf size={14} className="text-emerald-700" />
          Research environment
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
