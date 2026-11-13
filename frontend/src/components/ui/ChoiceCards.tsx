import type { ReactNode } from 'react'
import { Check, type LucideIcon } from 'lucide-react'

export interface Choice {
  value: string
  label: string
  description?: string
  icon?: LucideIcon
  /** Custom leading visual (overrides `icon`). */
  visual?: ReactNode
}

interface ChoiceCardsProps {
  name: string
  legend: string
  /** Visually hide the legend when a heading already labels the group. */
  hideLegend?: boolean
  choices: Choice[]
  value: string
  onChange: (value: string) => void
  layout?: 'grid' | 'list'
  error?: string | null
}

/** Native radio inputs styled as large, touch-friendly cards (keyboard: arrow keys). */
export default function ChoiceCards({ name, legend, hideLegend, choices, value, onChange, layout = 'grid', error }: ChoiceCardsProps) {
  const errorId = `${name}-error`
  return (
    <fieldset aria-describedby={error ? errorId : undefined}>
      <legend className={hideLegend ? 'visually-hidden' : 'form-label'}>{legend}</legend>
      {error && (
        <div id={errorId} className="text-danger small mb-2" role="alert">
          {error}
        </div>
      )}
      <div className={`ag-choice-grid${layout === 'list' ? ' ag-choice-list' : ''}`}>
        {choices.map((c) => {
          const Icon = c.icon
          return (
            <label key={c.value} className="ag-choice">
              <input type="radio" name={name} value={c.value} checked={value === c.value} onChange={() => onChange(c.value)} />
              {c.visual ?? (Icon && (
                <span className="ag-choice-icon" aria-hidden="true">
                  <Icon size={18} />
                </span>
              ))}
              <span className="ag-min-w-0">
                <span className="ag-choice-label d-block">{c.label}</span>
                {c.description && <span className="ag-choice-desc d-block">{c.description}</span>}
              </span>
              <Check size={18} className="ag-choice-check flex-shrink-0" aria-hidden="true" />
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
