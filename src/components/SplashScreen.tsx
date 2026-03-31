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
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-muted transition-opacity duration-500 overflow-hidden ${
        isAnimating ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-r from-[hsl(192,80%,50%)]/30 to-[hsl(32,85%,52%)]/20"
            style={{
              width: `${Math.random() * 6 + 3}px`,
              height: `${Math.random() * 6 + 3}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `float ${Math.random() * 10 + 10}s linear infinite`,
              animationDelay: `${Math.random() * 5}s`,
              boxShadow: `0 0 ${Math.random() * 10 + 5}px rgba(0, 180, 216, 0.3)`,
            }}
          />
        ))}
      </div>

      {/* Glowing orbs background */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[hsl(192,80%,50%)]/10 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[hsl(32,85%,52%)]/8 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite_reverse]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-[hsl(192,80%,50%)]/15 to-transparent rounded-full blur-2xl animate-pulse" />

      {/* Logo container with rotating rings */}
      <div className="relative z-10 flex flex-col items-center gap-8">
        <div className="relative">
          {/* Outer rotating ring */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] border-2 border-transparent rounded-full animate-[spin_3s_linear_infinite]"
            style={{ borderTopColor: 'rgba(0, 180, 216, 0.6)', borderRightColor: 'rgba(230, 150, 30, 0.4)' }}
          />
          {/* Inner rotating ring */}
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[360px] h-[360px] border border-transparent rounded-full animate-[spin_2s_linear_infinite_reverse]"
            style={{ borderBottomColor: 'rgba(0, 180, 216, 0.4)', borderLeftColor: 'rgba(230, 150, 30, 0.3)' }}
          />
          {/* Glow behind logo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-radial from-[hsl(192,80%,50%)]/40 to-transparent rounded-full animate-pulse" />
          {/* Logo ping effect */}
          <div className="absolute inset-0 animate-ping opacity-10">
            <img
              src={logo}
              alt=""
              className="w-[300px] h-[300px] object-contain"
            />
          </div>
          <img
            src={logo}
            alt="Two For Coaching Lab"
            className="relative w-[300px] h-[300px] object-contain animate-[fadeInScale_0.8s_ease-out] drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]"
          />
        </div>

        {/* Loading indicator */}
        <div className="flex flex-col items-center gap-5 mt-2">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-gradient-to-r from-primary to-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: "0ms" }} />
            <div className="w-3 h-3 bg-gradient-to-r from-primary to-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: "200ms" }} />
            <div className="w-3 h-3 bg-gradient-to-r from-primary to-cyan-500 rounded-full animate-bounce shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ animationDelay: "400ms" }} />
          </div>
          <p className="text-sm text-muted-foreground animate-pulse tracking-widest uppercase">
            Chargement...
          </p>
        </div>
      </div>

      {/* Bottom branding */}
      <div className="absolute bottom-8 text-center">
        <p className="text-xs text-muted-foreground/50 tracking-wider">
          Performance Analysis & Coaching Intelligence
        </p>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes fadeInScale {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
