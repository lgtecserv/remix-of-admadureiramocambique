import { Home, Users, BarChart3, Settings, LogOut, UserCog, Shield, FileText, MessageSquare, Package, DollarSign, UserPlus, ClipboardList, Images, Calendar } from "lucide-react";
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
  department?: string;
  userEmail?: string;
}

const superAdminItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Administração", url: "/super-admin", icon: Shield },
  { title: "Líderes", url: "/dashboard/leaders", icon: UserCog },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Congregados", url: "/dashboard/congregados", icon: UserPlus },
  { title: "Tesouraria", url: "/dashboard/tesouraria", icon: DollarSign },
  { title: "Patrimônio", url: "/dashboard/patrimonio", icon: Images },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const secretaryItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Líderes", url: "/dashboard/leaders", icon: UserCog },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Congregados", url: "/dashboard/congregados", icon: UserPlus },
  { title: "Reuniões de Obreiros", url: "/dashboard/reunioes-obreiros", icon: Calendar },
  { title: "Tesouraria", url: "/dashboard/tesouraria", icon: DollarSign },
  { title: "Patrimônio", url: "/dashboard/patrimonio", icon: Images },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const pastorItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Líderes", url: "/dashboard/leaders", icon: UserCog },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Congregados", url: "/dashboard/congregados", icon: Users },
  { title: "Chat", url: "/dashboard/chat", icon: Users },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const leaderItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Membros", url: "/dashboard/members", icon: Users },
  { title: "Congregados", url: "/dashboard/congregados", icon: UserPlus },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Relatórios", url: "/dashboard/reports", icon: FileText },
  { title: "Estatísticas", url: "/dashboard/statistics", icon: BarChart3 },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const patrimonioItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Galeria", url: "/dashboard/patrimonio", icon: Images },
  { title: "Materiais", url: "/dashboard/patrimonio/materiais", icon: Package },
  { title: "Solicitações", url: "/dashboard/patrimonio/solicitacoes", icon: ClipboardList },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

const tesourariaItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Tesouraria", url: "/dashboard/tesouraria", icon: DollarSign },
  { title: "Relatórios", url: "/dashboard/tesouraria/relatorios", icon: FileText },
  { title: "Solicitações", url: "/dashboard/tesouraria/solicitacoes", icon: ClipboardList },
  { title: "Inventário", url: "/dashboard/tesouraria/inventario", icon: Package },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Configurações", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar({ role = "leader", department, userEmail }: AppSidebarProps) {
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const handleNavClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };
  
  const getMenuItems = () => {
    if (role === "super_admin" || role === "super-admin") return superAdminItems;
    if (role === "secretary") return secretaryItems;
    if (role === "pastor") return pastorItems;
    if (role === "leader") {
      if (department === "patrimonio") return patrimonioItems;
      if (department === "tesouraria") return tesourariaItems;
      return leaderItems;
    }
    return leaderItems;
  };
  
  const items = getMenuItems();
  const isSuperAdmin = role === "super_admin" || role === "super-admin" || role === "secretary";

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
                      onClick={handleNavClick}
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
