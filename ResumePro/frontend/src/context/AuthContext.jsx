// Authentication state shared across the whole app via React Context.
// Any component can call useAuth() to get the current user and login/register/logout.
// The token and user are kept in localStorage so a page refresh doesn't log you out.
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../api/axios";

// The context object itself; null means "no provider above" (checked in useAuth).
const AuthContext = createContext(null);

// Provider component: wraps the app (see main.jsx) and holds the auth state.
export function AuthProvider({ children }) {
  // Start with the user saved in localStorage (if any) so the UI doesn't flash logged-out.
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("resumeai-user");
    return stored ? JSON.parse(stored) : null;
  });
  // loading stays true until we have checked whether the saved token is still valid.
  const [loading, setLoading] = useState(true);

  // On first load only ([] dependency): verify the saved token with the backend.
  useEffect(() => {
    const token = localStorage.getItem("resumeai-token");
    // No token means nobody is logged in, so there is nothing to check.
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get("/auth/me")
      .then(({ data }) => {
        setUser(data.user);
        localStorage.setItem("resumeai-user", JSON.stringify(data.user));
      })
      // Token rejected or request failed: wipe the saved login.
      .catch(() => {
        localStorage.removeItem("resumeai-token");
        localStorage.removeItem("resumeai-user");
        setUser(null);
      })
      // Whatever happened, the check is finished.
      .finally(() => setLoading(false));
  }, []);

  // Log in: send credentials, store the token + user, and update state. Errors propagate to the caller.
  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("resumeai-token", data.token);
    localStorage.setItem("resumeai-user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // Register a new account; the backend logs us in right away by returning a token.
  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    localStorage.setItem("resumeai-token", data.token);
    localStorage.setItem("resumeai-user", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  }, []);

  // Log out: just forget the token and user locally (no server call needed).
  const logout = useCallback(() => {
    localStorage.removeItem("resumeai-token");
    localStorage.removeItem("resumeai-user");
    setUser(null);
  }, []);

  // Everything components can read or call via useAuth().
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook for components to read the auth context; throws a clear error if used outside AuthProvider.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
