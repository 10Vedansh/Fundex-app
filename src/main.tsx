import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import '@fontsource/playfair-display/700.css';
import '@fontsource/sacramento/400.css';

createRoot(document.getElementById("root")!).render(<App />);
