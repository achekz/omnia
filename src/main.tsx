// Role du fichier: monte l application React dans le DOM.
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById("root")!).render(<App />);
