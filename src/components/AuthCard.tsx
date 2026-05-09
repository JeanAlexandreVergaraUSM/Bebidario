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

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          throw loginError;
        }

        onReady();
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      setMessage(
        'Cuenta creada. Revisa tu correo si tienes confirmación activada en Supabase.',
      );
      onReady();
    } catch (err) {
      const nextMessage = err instanceof Error ? err.message : 'No se pudo continuar.';
      setError(nextMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-copy">
          <p className="eyebrow">Bebidario</p>
<h1>Tu colección de bebidas, batidos y preparaciones frías</h1>
<p>
  Guarda tus recetas en la nube, súbelas con imagen y revísalas desde el
  celular o el computador.
</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-switch">
            <button
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
              type="button"
            >
              Entrar
            </button>
            <button
              className={mode === 'register' ? 'is-active' : ''}
              onClick={() => setMode('register')}
              type="button"
            >
              Crear cuenta
            </button>
          </div>

          <label>
            Correo
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label>
            Contraseña
            <input
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              minLength={6}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
          </label>

          {message ? <p className="form-feedback ok">{message}</p> : null}
          {error ? <p className="form-feedback error">{error}</p> : null}

          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>
      </section>
    </main>
  );
}