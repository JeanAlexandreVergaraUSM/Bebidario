import { useMemo } from 'react';
import { Recipe, Ingredient } from '../types';

interface SettingsPageProps {
  recipes: Recipe[];
  ingredients: Ingredient[];
  fontSize: 'sm' | 'md' | 'lg';
  onChangeFont: (font: 'sm' | 'md' | 'lg') => void;
  onExport: () => void;
}

export function SettingsPage({
  recipes,
  ingredients,
  fontSize,
  onChangeFont,
  onExport,
}: SettingsPageProps) {
  const stats = useMemo(
    () => [
      { label: 'Bebidas', value: recipes.length },
      { label: 'Favoritas', value: recipes.filter((recipe) => recipe.favorite).length },
      { label: 'Ingredientes', value: ingredients.length },
    ],
    [ingredients.length, recipes],
  );

  return (
    <section className="page-stack">
      <section className="stats-grid">
        {stats.map((stat) => (
          <article className="editor-card" key={stat.label}>
            <p className="eyebrow">{stat.label}</p>
            <h2>{stat.value}</h2>
          </article>
        ))}
      </section>

      <section className="editor-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Lectura</p>
            <h2>Tamaño de texto</h2>
          </div>
        </div>

        <div className="button-row wrap">
          {(['sm', 'md', 'lg'] as const).map((option) => (
            <button
              aria-pressed={fontSize === option}
              className={`ghost-button ${fontSize === option ? 'selected' : ''}`}
              key={option}
              onClick={() => onChangeFont(option)}
              type="button"
            >
              {option === 'sm' ? 'Pequeño' : option === 'md' ? 'Normal' : 'Grande'}
            </button>
          ))}
        </div>
      </section>

      <section className="editor-card">
        <div className="section-heading compact">
          <div>
            <p className="eyebrow">Respaldo</p>
            <h2>Exportar tus datos</h2>
          </div>
        </div>

        <p className="muted">
          Descarga un JSON con recetas e ingredientes por si quieres tener una copia extra.
        </p>

        <button className="primary-button" onClick={onExport} type="button">
          Exportar JSON
        </button>
      </section>
    </section>
  );
}
