interface FormFieldProps {
  label: string
  children: React.ReactNode
  required?: boolean
  hint?: string
}

export function FormField({ label, children, required, hint }: FormFieldProps) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-[0.6px] mb-1.5" style={{ color: 'var(--txt2)' }}>
        {label} {required && <span style={{ color: 'var(--rose)' }}>*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] mt-1" style={{ color: 'var(--txt3)' }}>{hint}</p>}
    </div>
  )
}

const inputBase = {
  width: '100%',
  background: 'var(--s1)',
  border: '1px solid var(--b2)',
  borderRadius: 8,
  padding: '10px 14px',
  color: 'var(--txt)',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}

function focusStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--acc)'
  e.target.style.boxShadow = '0 0 0 3px var(--acc-dim)'
}
function blurStyle(e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
  e.target.style.borderColor = 'var(--b2)'
  e.target.style.boxShadow = 'none'
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>
export function AppInput({ style, ...props }: InputProps) {
  return <input style={{ ...inputBase, ...style }} onFocus={focusStyle} onBlur={blurStyle} {...props} />
}

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement>
export function AppSelect({ children, style, ...props }: SelectProps) {
  return (
    <select style={{ ...inputBase, appearance: 'none', cursor: 'pointer', ...style }} onFocus={focusStyle} onBlur={blurStyle} {...props}>
      {children}
    </select>
  )
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>
export function AppTextarea({ style, ...props }: TextareaProps) {
  return <textarea style={{ ...inputBase, resize: 'vertical', minHeight: 90, ...style }} onFocus={focusStyle} onBlur={blurStyle} {...props} />
}
