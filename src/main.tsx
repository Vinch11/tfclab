import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Hide splash screen when React is ready
const hideSplashScreen = () => {
  const splash = document.getElementById("splash-screen");
  if (splash) {
    splash.style.opacity = "0";
    setTimeout(() => splash.remove(), 500);
  }
};

createRoot(document.getElementById("root")!).render(<App />);

// Hide splash after a short delay to ensure app is rendered
setTimeout(hideSplashScreen, 800);
