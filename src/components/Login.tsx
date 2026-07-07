import { useState } from "react";

import { ApiError, type Session, login } from "../api.js";
import { PasswordInput } from "./PasswordInput.js";

interface LoginProps {
  onAuth: (session: Session) => void;
}

const ALLOWED = new Set(["super_admin", "admin", "gestionnaire"]);

export function Login({ onAuth }: LoginProps): JSX.Element {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await login(email, password);
      if (!ALLOWED.has(session.role)) {
        setError("Espace réservé aux membres du comité.");
        return;
      }
      onAuth(session);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur réseau");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form onSubmit={submit} className="auth-card">
        <div className="brand brand-lg">
          <span className="brand-logo" aria-hidden="true">
            A
          </span>
          <span className="brand-text">
            ADSUM
            <span className="brand-sub">Collaboration</span>
          </span>
        </div>
        <label>
          <span>Courriel</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          <span>Mot de passe</span>
          <PasswordInput
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <p className="auth-error">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Connexion..." : "Se connecter"}
        </button>
        <p className="muted small center">Accès restreint, nominatif et supervisé.</p>
      </form>
    </div>
  );
}
