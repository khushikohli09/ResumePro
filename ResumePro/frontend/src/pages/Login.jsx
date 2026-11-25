// Login page: a form that signs the user in and sends them to the dashboard.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

// The login page component.
export default function Login() {
  // `login` comes from the auth context; it calls the backend and stores the session.
  const { login } = useAuth();
  // `navigate` lets us redirect after a successful login.
  const navigate = useNavigate();
  // Form values, kept in state so React controls what is shown in the inputs.
  const [form, setForm] = useState({ email: "", password: "" });
  // True while the request is running; used to disable the button and avoid double submits.
  const [submitting, setSubmitting] = useState(false);

  // Runs when the form is submitted.
  const onSubmit = async (e) => {
    // Stop the browser's default full-page form submit.
    e.preventDefault();
    setSubmitting(true);
    try {
      // API call (through the auth context): checks the email and password with the backend.
      await login(form.email, form.password);
      toast.success("Welcome back");
      navigate("/dashboard");
    } catch (err) {
      // On failure, show the server's error message if there is one, otherwise a generic one.
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      // Always re-enable the button, whether login worked or not.
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">Welcome back</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Log in</h1>

      {/* Form: each input is "controlled" - its value comes from state and onChange copies what the user types back into state. */}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2.5 text-sm outline-none focus:border-(--color-accent)"
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2.5 text-sm outline-none focus:border-(--color-accent)"
            placeholder="••••••••"
          />
        </div>
        {/* Submit button, disabled while the request is in flight. */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-(--color-accent-ink) hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {submitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      {/* Link for people who still need an account. */}
      <p className="mt-6 text-center text-sm text-(--color-muted)">
        Don't have an account?{" "}
        <Link to="/register" className="text-(--color-accent) font-medium">
          Create one
        </Link>
      </p>
    </div>
  );
}
