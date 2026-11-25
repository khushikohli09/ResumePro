// App entry point: runs first and mounts the React app into <div id="root"> in index.html.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";

// Providers wrap <App/> from the outside in: StrictMode (extra dev warnings),
// BrowserRouter (enables URL routing), AuthProvider (shares login state with every page).
createRoot(document.getElementById("root")).render(
  <StrictMode>
    
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    
  </StrictMode>
);
