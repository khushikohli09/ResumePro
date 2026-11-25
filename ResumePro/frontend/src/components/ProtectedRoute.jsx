// Wrapper for pages that require login; redirects visitors who are not logged in to /login.
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Loader from "./Loader";

// `children` is the page being protected.
export default function ProtectedRoute({ children }) {
  // `loading` is true while the app is still checking whether a saved session exists.
  const { user, loading } = useAuth();

  // Still checking the session: show a loader instead of flashing the login page.
  if (loading) return <Loader label="Checking session" />;
  // Not logged in: redirect to login (`replace` avoids leaving this page in the back-button history).
  if (!user) return <Navigate to="/login" replace />;
  // Logged in: render the protected page.
  return children;
}
