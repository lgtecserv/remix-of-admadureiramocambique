import { useState, useEffect } from 'react';
import { usePWAInstall } from '@/hooks/use-pwa-install';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';

export const InstallPrompt = () => {
  const { canInstall, promptInstall } = usePWAInstall();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user already dismissed the prompt in this session
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
      return;
    }

    // Show prompt after a short delay when available
    if (canInstall) {
      const timer = setTimeout(() => {
        setShow(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setShow(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!canInstall || !show || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50 animate-in slide-in-from-bottom-5 duration-500">
      <Card className="p-4 shadow-lg border-primary/20 bg-card/95 backdrop-blur">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <img 
              src="/icon-96x96.png" 
              alt="AD Madureira" 
              className="w-10 h-10 rounded-lg"
            />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm mb-1">
              Instalar AD Madureira
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Instale o aplicativo para acesso rápido e use offline
            </p>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleInstall}
                size="sm"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Instalar
              </Button>
              <Button 
                onClick={handleDismiss}
                size="sm"
                variant="ghost"
              >
                Agora não
              </Button>
            </div>
          </div>
          
          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-6 w-6"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
