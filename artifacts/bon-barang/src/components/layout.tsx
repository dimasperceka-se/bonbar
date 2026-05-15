import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { LayoutDashboard, FileText, PlusCircle, CheckSquare, Package, Settings, LogOut, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(
    (localStorage.getItem("bon_barang_theme") as "light" | "dark") || "light"
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("bon_barang_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  if (!user) return <>{children}</>;

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background">
        <Sidebar className="border-r border-border">
          <SidebarHeader className="p-4 border-b border-border/50">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Package className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight">BON BARANG</h1>
                <p className="text-xs text-muted-foreground">Lapas Kelas IIA</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/" || location === "/dashboard"}>
                      <Link href="/">
                        <LayoutDashboard className="h-4 w-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/requests/new"}>
                      <Link href="/requests/new">
                        <PlusCircle className="h-4 w-4" />
                        <span>Buat Permintaan</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/requests"}>
                      <Link href="/requests">
                        <FileText className="h-4 w-4" />
                        <span>Permintaan Saya</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {(user.role === "admin" || user.role === "kalapas") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/approvals"}>
                        <Link href="/approvals">
                          <CheckSquare className="h-4 w-4" />
                          <span>Persetujuan</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}

                  {(user.role === "admin" || user.role === "kalapas") && (
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={location === "/items"}>
                        <Link href="/items">
                          <Package className="h-4 w-4" />
                          <span>Master Barang</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarFooter className="border-t border-border/50 p-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <p className="font-medium">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-8 w-8">
                  {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
              </div>
              <Button variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={logout}>
                <LogOut className="h-4 w-4 mr-2" />
                Keluar
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="h-14 border-b border-border flex items-center px-4 md:hidden bg-card">
            <SidebarTrigger />
            <h1 className="font-bold text-sm ml-2">BON BARANG</h1>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
