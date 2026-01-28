import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSecurityLogFilter } from "./lib/security-logger";

// Initialize security filter to prevent sensitive data logging
initSecurityLogFilter();

createRoot(document.getElementById("root")!).render(<App />);
