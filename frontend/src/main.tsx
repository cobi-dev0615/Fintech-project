import { createRoot } from "react-dom/client";
import './i18n';
import App from "./App.tsx";
import "./index.css";

// Remove initial loader once React is ready
const removeInitialLoader = () => {
  const loader = document.getElementById("initial-loader");
  if (loader) {
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.3s";
    setTimeout(() => loader.remove(), 300);
  }
};

// Render app
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Remove loader after render
setTimeout(removeInitialLoader, 50);
