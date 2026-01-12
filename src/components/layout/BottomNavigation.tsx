import { Home, MessageSquare, Settings } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";

const items = [
  { title: "Início", url: "/dashboard", icon: Home },
  { title: "Chat", url: "/dashboard/chat", icon: MessageSquare },
  { title: "Config", url: "/dashboard/settings", icon: Settings },
];

export function BottomNavigation() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg md:hidden">
      <div className="flex items-center justify-around h-14">
        {items.map((item) => {
          const isActive = location.pathname === item.url || 
            (item.url !== "/dashboard" && location.pathname.startsWith(item.url));
          
          return (
            <NavLink
              key={item.url}
              to={item.url}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 ${isActive ? "text-primary" : ""}`} />
              <span className="text-xs mt-1 font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
