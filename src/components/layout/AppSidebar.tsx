import { Home, Users, BarChart3, Settings, LogOut, UserCog, Shield } from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface AppSidebarProps {
  role?: string;
  userEmail?: string;
}

const pastorItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Líderes", url: "/dashboard/leaders", icon: UserCog },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Visitantes", url: "/dashboard/visitors", icon: Users },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const leaderItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Visitantes", url: "/dashboard/visitors", icon: Users },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({ role = "leader", userEmail }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const items = role === "pastor" ? pastorItems : leaderItems;
  const isSuperAdmin = userEmail === "lgtecserv@gmail.com";

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    }
  };

  return (
    <Sidebar className={collapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarContent className="bg-card border-r border-border">
        <div className={`flex items-center gap-3 p-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          <img src={logo} alt="AD Madureira" className="h-10 w-10 object-contain" />
          {!collapsed && (
            <div>
              <h2 className="text-sm font-bold text-primary">AD Madureira</h2>
              <p className="text-xs text-muted-foreground">Moçambique</p>
            </div>
          )}
        </div>

        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50 text-foreground"
                        }`
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel>Administração</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild tooltip="Super Admin">
                    <NavLink
                      to="/super-admin"
                      className={({ isActive }) =>
                        `flex items-center gap-3 ${
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/50 text-foreground"
                        }`
                      }
                    >
                      <Shield className="h-5 w-5" />
                      {!collapsed && <span>Super Admin</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <div className="mt-auto border-t border-border p-4">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full p-2 rounded-md hover:bg-destructive/10 text-destructive transition-colors ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
