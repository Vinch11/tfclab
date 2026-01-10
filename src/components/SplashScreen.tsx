import { useEffect, useState } from "react";
import logo from "@/assets/logo-2fc.png";

interface SplashScreenProps {
  onComplete: () => void;
  minDuration?: number;
}

export function SplashScreen({ onComplete, minDuration = 2000 }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(onComplete, 500); // Wait for fade out animation
    }, minDuration);

    return () => clearTimeout(timer);
  }, [onComplete, minDuration]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted transition-opacity duration-500 ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl animate-pulse delay-700" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-primary/10 to-transparent rounded-full blur-2xl" />
      </div>

      {/* Logo container */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo with animation */}
        <div className="relative">
          <div className="absolute inset-0 animate-ping opacity-20">
            <img
              src={logo}
              alt=""
              className="w-40 h-40 object-contain"
            />
          </div>
          <img
            src={logo}
            alt="Two For Coaching Lab"
            className="w-40 h-40 object-contain animate-[fadeInScale_0.8s_ease-out] drop-shadow-2xl"
          />
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-4 mt-4">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse">
            Chargement...
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground/60">
          Performance Analysis & Coaching Intelligence
        </p>
      </div>
    </div>
  );
}
