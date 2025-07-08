
"use client";

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, CreditCard, Calculator, LogOut, Moon, Sun, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { auth } from "@/lib/firebase";
import { Button } from "../ui/button";
import { useTheme } from "@/context/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const links = [
  { href: "/", label: "Dasbor", icon: LayoutDashboard },
  { href: "/transactions", label: "Transaksi", icon: Receipt },
  { href: "/cards", label: "Kartu", icon: CreditCard },
  { href: "/installment-helper", label: "Simulasi Cicilan", icon: Calculator },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { setTheme } = useTheme();
  const { toggleSidebar } = useSidebar();

  const handleLogout = async () => {
    await auth.signOut();
  };
  
  const getInitials = (email: string | null | undefined) => {
    if (!email) return '..';
    const parts = email.split('@')[0].split(/[._-]/);
    return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground")}>
                <CreditCard className="h-5 w-5"/>
            </div>
            <span className="text-lg font-semibold group-data-[collapsible=icon]:hidden">KreditTrack</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {links.map((link) => (
            <SidebarMenuItem key={link.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === link.href}
                tooltip={{ children: link.label }}
              >
                <Link href={link.href}>
                  <link.icon />
                  <span>{link.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleSidebar} tooltip={{ children: "Sembunyikan/Tampilkan Navigasi" }}>
                <PanelLeftClose />
                <span>Sembunyikan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>

        <Separator className="my-1" />

        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-9 w-9">
            <AvatarImage src="" alt="User Avatar" />
            <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col overflow-hidden flex-grow group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium truncate">{user?.displayName || 'Pengguna'}</span>
            <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
          </div>

          <div className="flex items-center flex-shrink-0">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Ganti tema</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                    Terang
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                    Gelap
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                    Sistem
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={handleLogout} aria-label="Keluar">
                <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
