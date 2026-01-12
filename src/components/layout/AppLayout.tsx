import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BottomNavigation } from "./BottomNavigation";
import NotificationBell from "@/components/notifications/NotificationBell";
import { UserAvatar } from "@/components/common/UserAvatar";
import { User } from "@supabase/supabase-js";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useGlobalMessageNotifications } from "@/hooks/useGlobalMessageNotifications";

interface AppLayoutProps {
  children: React.ReactNode;
  userName?: string;
  role?: string;
  department?: string;
  userEmail?: string;
  user?: User;
}

const AppLayout = ({ children, userName, role, department, userEmail, user }: AppLayoutProps) => {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Ativar listener global de som para mensagens
  useGlobalMessageNotifications(user?.id);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();
      if (data) setAvatarUrl(data.avatar_url);
    };
    loadAvatar();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-muted/20 to-secondary/10">
        <AppSidebar role={role} department={department} userEmail={userEmail} />
        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border">
            <div className="flex items-center gap-4 px-6 py-4">
              <SidebarTrigger />
              <div className="flex-1" />
              {user && <NotificationBell userId={user.id} />}
              {userName && (
                <div className="flex items-center gap-2">
                  <UserAvatar
                    avatarUrl={avatarUrl}
                    fullName={userName}
                    size="sm"
                  />
                  <span className="text-sm font-medium text-foreground hidden sm:inline">
                    {userName}
                  </span>
                </div>
              )}
            </div>
          </header>
          <main className="flex-1 p-4 sm:p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <BottomNavigation />
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
