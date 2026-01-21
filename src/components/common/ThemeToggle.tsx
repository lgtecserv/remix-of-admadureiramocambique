import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferência do banco de dados ao montar
  useEffect(() => {
    setMounted(true);
    
    const loadThemePreference = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("theme_preference")
            .eq("id", user.id)
            .single();
          
          if (profile?.theme_preference) {
            setTheme(profile.theme_preference);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar preferência de tema:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThemePreference();
  }, [setTheme]);

  // Salvar preferência no banco quando mudar
  const handleToggleTheme = async () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ theme_preference: newTheme })
          .eq("id", user.id);
      }
    } catch (error) {
      console.error("Erro ao salvar preferência de tema:", error);
    }
  };

  if (!mounted || isLoading) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9">
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={handleToggleTheme}
      aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
    >
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all duration-300 dark:-rotate-90 dark:scale-0 text-foreground" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all duration-300 dark:rotate-0 dark:scale-100 text-foreground" />
    </Button>
  );
}
