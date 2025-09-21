import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { EncryptionProvider } from "./EncryptionContext";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <EncryptionProvider>
      <App />
    </EncryptionProvider>
  </StrictMode>
);
