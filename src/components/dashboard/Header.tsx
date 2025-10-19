import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

interface HeaderProps {
  userName?: string;
}

const Header = ({ userName }: HeaderProps) => {
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Erro ao sair");
    }
  };

  return (
    <header className="bg-card border-b border-border shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src={logo} alt="AD Madureira" className="h-12 w-12 object-contain" />
          <div>
            <h1 className="text-xl font-bold text-primary">AD Madureira Moçambique</h1>
            <p className="text-sm text-muted-foreground">Sistema de Gestão de Membros</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {userName && (
            <span className="text-sm font-medium text-foreground hidden sm:inline">
              {userName}
            </span>
          )}
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
