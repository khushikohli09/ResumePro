// 404 page: shown when the URL does not match any route.
import { Link } from "react-router-dom";

// Simple message plus a link back to the home page.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <p className="font-mono text-6xl font-semibold text-(--color-accent)">404</p>
      <p className="mt-3 text-(--color-muted)">This page doesn't exist.</p>
      <Link to="/" className="mt-6 inline-block text-(--color-accent) font-medium">
        Back to home
      </Link>
    </div>
  );
}
