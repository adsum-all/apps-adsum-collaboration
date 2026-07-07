import { type InputHTMLAttributes, useId, useState } from "react";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

/**
 * Champ de saisie de mot de passe avec bouton "afficher / masquer".
 * Reprend le style des inputs existants du front (aucun style externe requis).
 * Le bouton est de type "button" pour ne jamais soumettre le formulaire.
 */
export function PasswordInput(props: PasswordInputProps): JSX.Element {
  const [visible, setVisible] = useState(false);
  const reactId = useId();
  const inputId = props.id ?? reactId;
  const label = visible ? "Masquer le mot de passe" : "Afficher le mot de passe";

  return (
    <span className="password-field">
      <input {...props} id={inputId} type={visible ? "text" : "password"} className="password-field-input" />
      <button
        type="button"
        className="password-toggle"
        onClick={() => setVisible((v) => !v)}
        aria-label={label}
        aria-pressed={visible}
        title={label}
      >
        {visible ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
