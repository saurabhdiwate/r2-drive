'use client'

import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface PromptDialogProps {
  open: boolean
  title: string
  label: string
  initialValue?: string
  placeholder?: string
  submitLabel?: string
  loading?: boolean
  onSubmit: (value: string) => void
  onCancel: () => void
}

export function PromptDialog({
  open,
  title,
  label,
  initialValue = '',
  placeholder,
  submitLabel = 'Save',
  loading,
  onSubmit,
  onCancel
}: PromptDialogProps) {
  const [value, setValue] = useState(initialValue)
  const [error, setError] = useState('')

  // Reset state when the dialog opens with a new value.
  const [lastOpenValue, setLastOpenValue] = useState(initialValue)
  if (open && lastOpenValue !== initialValue) {
    setLastOpenValue(initialValue)
    setValue(initialValue)
    setError('')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) {
      setError('Name must not be empty')
      return
    }
    if (trimmed.includes('/') || trimmed.includes('\\')) {
      setError('Name must not contain / or \\')
      return
    }
    if (trimmed === '.' || trimmed === '..') {
      setError('Invalid name')
      return
    }
    onSubmit(trimmed)
  }

  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      <form onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
        <Input
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          placeholder={placeholder}
          autoFocus
        />
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
