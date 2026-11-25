// Registration page: a form that creates an account and then sends the user to the dashboard.
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../context/AuthContext";

// The registration page component.
export default function Register() {
  // `register` comes from the auth context; it creates the account via the backend and logs the user in.
  const { register } = useAuth();
  // `navigate` lets us redirect after a successful sign-up.
  const navigate = useNavigate();
  // Form values, kept in state so React controls what is shown in the inputs.
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  // True while the request is running; used to disable the button and avoid double submits.
  const [submitting, setSubmitting] = useState(false);

  // Runs when the form is submitted.
  const onSubmit = async (e) => {
    // Stop the browser's default full-page form submit.
    e.preventDefault();
    setSubmitting(true);
    try {
      // API call (through the auth context): creates the account.
      await register(form.name, form.email, form.password);
      toast.success("Account created");
      navigate("/dashboard");
    } catch (err) {
      // On failure, show the server's error message if there is one, otherwise a generic one.
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      // Always re-enable the button, whether sign-up worked or not.
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-6 py-20">
      <p className="font-mono text-xs uppercase tracking-widest text-(--color-accent)">Get started</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Create your account</h1>

      {/* Form: each input is "controlled" - its value comes from state and onChange copies what the user types back into state. */}
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">Name</label>
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2.5 text-sm outline-none focus:border-(--color-accent)"
            placeholder="Jordan Lee"
          />
        </div>
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
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full rounded-xl border border-(--color-line) bg-(--color-surface) px-4 py-2.5 text-sm outline-none focus:border-(--color-accent)"
            placeholder="At least 6 characters"
          />
        </div>
        {/* Submit button, disabled while the request is in flight. */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-(--color-accent-ink) hover:opacity-90 disabled:opacity-60 transition-opacity"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      {/* Link for people who already have an account. */}
      <p className="mt-6 text-center text-sm text-(--color-muted)">
        Already have an account?{" "}
        <Link to="/login" className="text-(--color-accent) font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}
