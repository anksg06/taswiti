import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

const rootEl = document.documentElement;
let stored;
try {
  stored = JSON.parse(localStorage.getItem("voting-theme") || "{}");
} catch {
  stored = {};
}
rootEl.classList.toggle("dark", !!stored.dark);
rootEl.setAttribute("data-accent", stored.accent || "indigo");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);