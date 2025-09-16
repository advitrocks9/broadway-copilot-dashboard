"use client"

import * as React from "react"
import {
  IconDashboard,
  IconInnerShadowTop,
  IconListDetails,
  IconUsers,
} from "@tabler/icons-react"

import { NavMain } from "@/components/global/nav-main"
import { NavUser } from "@/components/global/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type AppUser = { name: string; email: string; avatar: string }

export function AppSidebar({ user, ...props }: React.ComponentProps<typeof Sidebar> & { user: AppUser }) {
  const navMain = [
    { title: "Home", url: "/", icon: IconDashboard },
    { title: "Users", url: "/users", icon: IconUsers },
    { title: "Debug", url: "/debug", icon: IconListDetails },
  ]

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Broadway Copilot</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  )
}
