import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { Download, Smartphone, CheckCircle2 } from "lucide-react";
import logo from "@/assets/logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      <Header showBackButton />
      
      <main className="container py-8 max-w-2xl">
        <div className="text-center mb-8">
          <img src={logo} alt="I-Bookin Logo" className="h-24 w-24 mx-auto mb-4 rounded-2xl" />
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Install I-Bookin</h1>
          <p className="text-muted-foreground">
            Get the full app experience on your device
          </p>
        </div>

        {isInstalled ? (
          <Card className="border-green-500/50 bg-green-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-6 w-6" />
                App Already Installed
              </CardTitle>
              <CardDescription>
                I-Bookin is already installed on your device. You can access it from your home screen.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Install as App
                </CardTitle>
                <CardDescription>
                  Install I-Bookin on your device for quick access and offline functionality
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {deferredPrompt ? (
                  <Button onClick={handleInstallClick} size="lg" className="w-full">
                    <Download className="mr-2 h-5 w-5" />
                    Install Now
                  </Button>
                ) : (
                  <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                    <p className="font-semibold mb-2">Manual Installation:</p>
                    <ul className="space-y-2 list-disc list-inside">
                      <li><strong>iPhone/iPad:</strong> Tap the Share button, then "Add to Home Screen"</li>
                      <li><strong>Android:</strong> Tap the menu (⋮) and select "Install app" or "Add to Home screen"</li>
                      <li><strong>Desktop:</strong> Click the install icon in your browser's address bar</li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Benefits
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Quick Access</p>
                      <p className="text-sm text-muted-foreground">Launch directly from your home screen</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Offline Support</p>
                      <p className="text-sm text-muted-foreground">Access key features even without internet</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Native Feel</p>
                      <p className="text-sm text-muted-foreground">Full-screen experience like a native app</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Fast Loading</p>
                      <p className="text-sm text-muted-foreground">Instant startup and smooth performance</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
};

export default Install;
