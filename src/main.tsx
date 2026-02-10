import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "bootstrap/dist/css/bootstrap.min.css";
import "./styles/style.css";

createRoot(document.getElementById("root")!).render(<App />);
