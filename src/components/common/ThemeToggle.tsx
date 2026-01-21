import { Moon, Sun, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type ThemePreference = "light" | "dark" | "auto";

// Horários para tema automático (6h-18h = dia)
const DAY_START_HOUR = 6;
const DAY_END_HOUR = 18;

function getAutoTheme(): "light" | "dark" {
  const hour = new Date().getHours();
  return hour >= DAY_START_HOUR && hour < DAY_END_HOUR ? "light" : "dark";
}

export function ThemeToggle() {
  const { setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preference, setPreference] = useState<ThemePreference>("light");

  // Aplicar tema baseado na preferência
  const applyTheme = useCallback((pref: ThemePreference) => {
    if (pref === "auto") {
      setTheme(getAutoTheme());
    } else {
      setTheme(pref);
    }
  }, [setTheme]);

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
            const pref = profile.theme_preference as ThemePreference;
            setPreference(pref);
            applyTheme(pref);
          }
        }
      } catch (error) {
        console.error("Erro ao carregar preferência de tema:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadThemePreference();
  }, [applyTheme]);

  // Atualizar tema automático a cada minuto quando em modo auto
  useEffect(() => {
    if (preference !== "auto") return;

    const interval = setInterval(() => {
      setTheme(getAutoTheme());
    }, 60000); // Verificar a cada minuto

    return () => clearInterval(interval);
  }, [preference, setTheme]);

  // Salvar preferência no banco quando mudar
  const handleSelectTheme = async (newPreference: ThemePreference) => {
    setPreference(newPreference);
    applyTheme(newPreference);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({ theme_preference: newPreference })
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

  const getIcon = () => {
    switch (preference) {
      case "light":
        return <Sun className="h-4 w-4 text-foreground" />;
      case "dark":
        return <Moon className="h-4 w-4 text-foreground" />;
      case "auto":
        return <SunMoon className="h-4 w-4 text-foreground" />;
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Selecionar tema"
        >
          {getIcon()}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem
          onClick={() => handleSelectTheme("light")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Sun className="h-4 w-4" />
          <span>Claro</span>
          {preference === "light" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelectTheme("dark")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <Moon className="h-4 w-4" />
          <span>Escuro</span>
          {preference === "dark" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSelectTheme("auto")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <SunMoon className="h-4 w-4" />
          <span>Automático</span>
          {preference === "auto" && (
            <span className="ml-auto text-primary">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
