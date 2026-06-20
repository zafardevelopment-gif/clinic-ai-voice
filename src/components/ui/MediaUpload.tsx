'use client'

import { useRef, useState } from 'react'

interface MediaUploadProps {
  value: string
  onChange: (url: string) => void
  accept?: string
  placeholder?: string
  uploadEndpoint?: string
  previewType?: 'image' | 'video' | 'auto'
}

export default function MediaUpload({
  value,
  onChange,
  accept = 'image/*,video/*',
  placeholder = 'https://example.com/image.jpg',
  uploadEndpoint = '/api/clinic/website/upload',
  previewType = 'auto',
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const isVideo = previewType === 'video' || (previewType === 'auto' && /\.(mp4|webm|ogg|mov)$/i.test(value))

  async function uploadFile(file: File) {
    setUploading(true)
    setError('')
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(uploadEndpoint, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Upload failed')
    } else {
      onChange(data.url)
    }
    setUploading(false)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) uploadFile(file)
    e.target.value = ''
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadFile(file)
  }

  return (
    <div className="space-y-2">
      {/* Input row: URL box + Browse button */}
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-lg px-3 py-2 text-sm"
          style={{ background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--txt)', outline: 'none' }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex-shrink-0 h-9 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          style={{
            background: uploading ? 'var(--b2)' : 'var(--acc-dim)',
            color: uploading ? 'var(--txt3)' : 'var(--acc)',
            border: '1px solid var(--b2)',
            cursor: uploading ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {uploading ? (
            <>
              <span className="animate-spin">↻</span> Uploading...
            </>
          ) : (
            <>📁 Browse</>
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Drag & drop zone — shown when no value */}
      {!value && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="rounded-xl py-6 text-center cursor-pointer transition-all"
          style={{
            border: `2px dashed ${dragOver ? 'var(--acc)' : 'var(--b2)'}`,
            background: dragOver ? 'var(--acc-dim)' : 'transparent',
            color: 'var(--txt3)',
          }}
        >
          <div className="text-2xl mb-1">📤</div>
          <div className="text-xs">Drag & drop karo ya click karke file choose karo</div>
          <div className="text-[11px] mt-1" style={{ color: 'var(--txt3)', opacity: 0.6 }}>Images: JPG, PNG, WebP, GIF · Videos: MP4, WebM (max 20MB)</div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>
          {error}
        </div>
      )}

      {/* Preview */}
      {value && !uploading && (
        <div className="relative rounded-xl overflow-hidden" style={{ border: '1px solid var(--b1)' }}>
          {isVideo ? (
            <video src={value} controls className="w-full rounded-xl" style={{ maxHeight: 180, background: '#000' }} />
          ) : (
            <img
              src={value}
              alt="preview"
              className="w-full object-cover rounded-xl"
              style={{ maxHeight: 180 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
