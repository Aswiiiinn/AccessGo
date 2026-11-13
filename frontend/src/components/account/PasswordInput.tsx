import { useId, useState, type InputHTMLAttributes } from 'react'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'value'> {
  label: string
  value: string
  onChange: (value: string) => void
  errors?: string[]
  helpId?: string
}

/** Labelled password field with a show/hide toggle and inline validation messages. */
export default function PasswordInput({ label, value, onChange, errors, helpId, id, ...rest }: PasswordInputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const [visible, setVisible] = useState(false)
  const hasError = !!errors && errors.length > 0
  const describedBy = [hasError ? errorId : null, helpId].filter(Boolean).join(' ') || undefined

  return (
    <div className="mb-3">
      <label htmlFor={inputId} className="form-label">{label}</label>
      <div className="input-group has-validation">
        <input
          {...rest}
          id={inputId}
          type={visible ? 'text' : 'password'}
          className={`form-control${hasError ? ' is-invalid' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          autoCapitalize="none"
          spellCheck={false}
        />
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
        {hasError && (
          <div id={errorId} className="invalid-feedback">
            {errors!.map((msg) => <div key={msg}>{msg}</div>)}
          </div>
        )}
      </div>
    </div>
  )
}
