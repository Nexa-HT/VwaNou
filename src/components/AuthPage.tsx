import { useState } from "react";
import type { FormEvent } from "react";
import { api, type AuthSession } from "../services/api";

type AuthMode = "signin" | "signup";

interface AuthPageProps {
  onAuthenticated: (session: AuthSession) => void;
}

function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitLabel = mode === "signin" ? "Log In" : "Create Account";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      if (mode === "signin") {
        const session = await api.signIn({
          email,
          password,
        });
        onAuthenticated(session);
      } else {
        const session = await api.signUp({
          name,
          email,
          password,
        });
        onAuthenticated(session);
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Unable to continue right now.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="auth-eyebrow">VwaNou AI</p>
        <h1 id="auth-title">Community safety access</h1>
        <p className="auth-subtitle">Sign in to track alerts or create an account to start reporting incidents.</p>

        <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signin"}
            className={mode === "signin" ? "active" : ""}
            onClick={() => setMode("signin")}
          >
            Log In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "signup"}
            className={mode === "signup" ? "active" : ""}
            onClick={() => setMode("signup")}
          >
            Sign Up
          </button>
        </div>

        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          {mode === "signup" && (
            <label>
              Full name
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                minLength={2}
                required
                placeholder="Ex: Jifferson Delly"
              />
            </label>
          )}

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="name@example.com"
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="auth-submit" disabled={isSubmitting}>
            {isSubmitting ? "Please wait..." : submitLabel}
          </button>
        </form>
      </section>
    </main>
  );
}

export default AuthPage;
