import { FormEvent, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthCardProps {
  onReady: () => void;
}

export function AuthCard({ onReady }: AuthCardProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function changeMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setMessage(null);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (loginError) throw loginError;

        onReady();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (signUpError) throw signUpError;

      setMessage('Cuenta creada. Revisa tu correo si la confirmación está activada.');
      onReady();
    } catch (authError) {
      const nextMessage = authError instanceof Error
        ? authError.message
        : 'No se pudo continuar. Intenta nuevamente.';
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-copy">
          <p className="eyebrow">Bebidario</p>
          <h1 id="auth-title">Tu colección de bebidas, batidos y preparaciones frías</h1>
          <p>
            Guarda tus recetas, organiza tus ingredientes y prepara cartas para tus eventos desde un solo lugar.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-switch" role="group" aria-label="Elegir entre entrar o crear cuenta">
            <button
              aria-pressed={mode === 'login'}
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => changeMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              aria-pressed={mode === 'register'}
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => changeMode('register')}
              type="button"
            >
              Crear cuenta
            </button>
          </div>

          <label htmlFor="auth-email">
            Correo
            <input
              id="auth-email"
              autoComplete="email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label htmlFor="auth-password">
            Contraseña
            <input
              id="auth-password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            {mode === 'register' ? (
              <span className="field-help">Usa al menos 6 caracteres.</span>
            ) : null}
          </label>

          {message ? <p className="form-feedback ok" role="status" aria-live="polite">{message}</p> : null}
          {error ? <p className="form-feedback error" role="alert">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar a Bebidario' : 'Crear mi cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}
