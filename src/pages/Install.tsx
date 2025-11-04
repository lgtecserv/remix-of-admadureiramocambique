import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, Smartphone, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-secondary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isInstalled ? (
              <CheckCircle className="h-16 w-16 text-primary" />
            ) : (
              <Download className="h-16 w-16 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isInstalled ? "Aplicativo Instalado!" : "Instalar Aplicativo"}
          </CardTitle>
          <CardDescription>
            {isInstalled 
              ? "O aplicativo já está instalado no seu dispositivo."
              : "Instale o aplicativo AD Madureira no seu dispositivo para acesso rápido e offline."}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {isInstalled ? (
            <>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Você pode acessar o aplicativo diretamente da tela inicial do seu dispositivo.
                </p>
              </div>
              <Button onClick={() => navigate("/dashboard")} className="w-full">
                Ir para o Dashboard
              </Button>
            </>
          ) : isInstallable ? (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Acesso Rápido</p>
                    <p className="text-sm text-muted-foreground">
                      Abra diretamente da tela inicial
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="font-medium">Funciona Offline</p>
                    <p className="text-sm text-muted-foreground">
                      Continue usando mesmo sem internet
                    </p>
                  </div>
                </div>
              </div>
              
              <Button onClick={handleInstall} className="w-full" size="lg">
                <Download className="mr-2 h-4 w-4" />
                Instalar Agora
              </Button>
            </>
          ) : (
            <>
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <p className="text-sm font-medium">Como instalar:</p>
                
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p><strong>No Android:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Abra o menu do navegador (⋮)</li>
                    <li>Toque em "Adicionar à tela inicial" ou "Instalar app"</li>
                  </ol>
                  
                  <p className="mt-3"><strong>No iOS (iPhone/iPad):</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Toque no botão de compartilhar (□↑)</li>
                    <li>Role e toque em "Adicionar à Tela de Início"</li>
                  </ol>
                  
                  <p className="mt-3"><strong>No Desktop:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Procure o ícone de instalação na barra de endereço</li>
                    <li>Ou acesse Menu → Instalar aplicativo</li>
                  </ol>
                </div>
              </div>
              
              <Button onClick={() => navigate("/auth")} variant="outline" className="w-full">
                Continuar no Navegador
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
