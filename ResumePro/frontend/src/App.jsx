// App shell: the layout shared by every page (navbar, toast popups) and the route table.
// Pages marked with <ProtectedRoute> redirect to login when the user is signed out.
import { Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Analyzer from "./pages/Analyzer";
import Builder from "./pages/Builder";
import ResumeDetail from "./pages/ResumeDetail";
import NotFound from "./pages/NotFound";
import Tools from "./pages/Tools";
import Grammar from "./pages/tools/Grammar";
import Authenticity from "./pages/tools/Authenticity";
import LinkedIn from "./pages/tools/LinkedIn";
import Jobs from "./pages/tools/Jobs";
import Roadmap from "./pages/tools/Roadmap";
import Portfolio from "./pages/tools/Portfolio";

// Root component. It renders the navbar, toast container and the page matching the URL.
export default function App() {
  // useLocation gives the current URL; its pathname is used as a key below.
  const location = useLocation();
  return (
    // Colours come from the CSS tokens defined in src/index.css (e.g. --color-bg).
    <div className="min-h-screen bg-(--color-bg) text-(--color-ink) font-body">
      <Navbar />
      {/* Toast popups (react-hot-toast), styled with the same colour tokens. */}
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            color: "var(--color-ink)",
            border: "1px solid var(--color-line)",
            fontSize: "13px",
          },
        }}
      />
      {/* key={pathname} makes React remount this block on each navigation, which */}
      {/* replays the .page-enter fade-in animation. */}
      <main key={location.pathname} className="page-enter">
        <Routes>
          {/* Public pages: anyone can open these. */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Private pages: wrapped in ProtectedRoute so only logged-in users see them. */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analyze"
            element={
              <ProtectedRoute>
                <Analyzer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/builder"
            element={
              <ProtectedRoute>
                <Builder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/builder/:id"
            element={
              <ProtectedRoute>
                <Builder />
              </ProtectedRoute>
            }
          />
          <Route
            path="/resume/:id"
            element={
              <ProtectedRoute>
                <ResumeDetail />
              </ProtectedRoute>
            }
          />
          <Route path="/tools" element={<ProtectedRoute><Tools /></ProtectedRoute>} />
          <Route path="/tools/grammar" element={<ProtectedRoute><Grammar /></ProtectedRoute>} />
          <Route path="/tools/authenticity" element={<ProtectedRoute><Authenticity /></ProtectedRoute>} />
          <Route path="/tools/linkedin" element={<ProtectedRoute><LinkedIn /></ProtectedRoute>} />
          <Route path="/tools/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/tools/roadmap" element={<ProtectedRoute><Roadmap /></ProtectedRoute>} />
          <Route path="/tools/portfolio" element={<ProtectedRoute><Portfolio /></ProtectedRoute>} />
          {/* Catch-all: any unknown URL shows the 404 page. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  );
}
