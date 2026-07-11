'use client'

import { useEffect, useState } from 'react'
import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'
import AppBtn from '@/components/ui/AppBtn'
import { FormField, AppInput, AppTextarea } from '@/components/ui/FormField'
import type { HeroSlide, WebsiteService } from '@/types/database'
import MediaUpload from '@/components/ui/MediaUpload'
import CustomDomainCard from '@/components/clinic/CustomDomainCard'

function uid() {
  return Math.random().toString(36).slice(2, 10)
}

interface GalleryItem {
  id: string
  media_type: 'image' | 'video'
  url: string
  caption: string | null
  sort_order: number
}

interface ContentState {
  hero_slides: HeroSlide[]
  about_title: string
  about_text: string
  services: WebsiteService[]
  contact_info: {
    phone: string
    email: string
    address: string
    working_hours: string
    map_embed_url: string
  }
  seo_title: string
  seo_description: string
}

const EMPTY_CONTENT: ContentState = {
  hero_slides: [],
  about_title: '',
  about_text: '',
  services: [],
  contact_info: { phone: '', email: '', address: '', working_hours: '', map_embed_url: '' },
  seo_title: '',
  seo_description: '',
}

const EMPTY_SLIDE: Omit<HeroSlide, 'id'> = {
  type: 'image', url: '', title: '', subtitle: '', cta_text: '', cta_link: '',
}

export default function WebsitePage() {
  const [loading, setLoading] = useState(true)
  const [notEnabled, setNotEnabled] = useState(false)
  const [clinicInfo, setClinicInfo] = useState<{ name: string; website_url: string | null; website_slug: string | null } | null>(null)
  const [content, setContent] = useState<ContentState>(EMPTY_CONTENT)
  const [gallery, setGallery] = useState<GalleryItem[]>([])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Gallery add form state
  const [newMedia, setNewMedia] = useState({ url: '', media_type: 'image' as 'image' | 'video', caption: '' })
  const [addingMedia, setAddingMedia] = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/clinic/website').then(r => r.json()),
      fetch('/api/clinic/website/gallery').then(r => r.json()),
    ]).then(([websiteData, galleryData]) => {
      if (websiteData?.error) {
        setNotEnabled(true)
      } else {
        setClinicInfo({
          name: websiteData.clinic_info?.name || '',
          website_url: websiteData.clinic_info?.website_url || null,
          website_slug: websiteData.clinic_info?.website_slug || null,
        })
        const c = websiteData.content
        if (c) {
          setContent({
            hero_slides: (c.hero_slides as HeroSlide[]) || [],
            about_title: c.about_title || '',
            about_text: c.about_text || '',
            services: (c.services as WebsiteService[]) || [],
            contact_info: (c.contact_info as ContentState['contact_info']) || EMPTY_CONTENT.contact_info,
            seo_title: c.seo_title || '',
            seo_description: c.seo_description || '',
          })
        }
      }
      if (Array.isArray(galleryData)) setGallery(galleryData)
      setLoading(false)
    })
  }, [])

  // ── Content save ──
  async function saveContent() {
    setSaving(true)
    setSaved(false)
    setError('')
    const res = await fetch('/api/clinic/website', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    const data = await res.json()
    if (!res.ok) setError(data.error || 'Save failed')
    else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    setSaving(false)
  }

  // ── Hero Slides ──
  function addSlide() {
    setContent(p => ({ ...p, hero_slides: [...p.hero_slides, { ...EMPTY_SLIDE, id: uid() }] }))
  }

  function updateSlide(idx: number, field: keyof HeroSlide, value: string) {
    setContent(p => {
      const slides = [...p.hero_slides]
      slides[idx] = { ...slides[idx], [field]: value }
      return { ...p, hero_slides: slides }
    })
  }

  function removeSlide(idx: number) {
    setContent(p => ({ ...p, hero_slides: p.hero_slides.filter((_, i) => i !== idx) }))
  }

  function moveSlide(idx: number, dir: -1 | 1) {
    setContent(p => {
      const slides = [...p.hero_slides]
      const target = idx + dir
      if (target < 0 || target >= slides.length) return p;
      [slides[idx], slides[target]] = [slides[target], slides[idx]]
      return { ...p, hero_slides: slides }
    })
  }

  // ── Services ──
  function addService() {
    setContent(p => ({ ...p, services: [...p.services, { id: uid(), icon: '🏥', title: '', description: '' }] }))
  }

  function updateService(idx: number, field: keyof WebsiteService, value: string) {
    setContent(p => {
      const svcs = [...p.services]
      svcs[idx] = { ...svcs[idx], [field]: value }
      return { ...p, services: svcs }
    })
  }

  function removeService(idx: number) {
    setContent(p => ({ ...p, services: p.services.filter((_, i) => i !== idx) }))
  }

  // ── Gallery ──
  async function addGalleryItem() {
    if (!newMedia.url.trim()) return
    setAddingMedia(true)
    const res = await fetch('/api/clinic/website/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMedia),
    })
    const item = await res.json()
    if (res.ok) {
      setGallery(g => [...g, item])
      setNewMedia({ url: '', media_type: 'image', caption: '' })
    }
    setAddingMedia(false)
  }

  async function deleteGalleryItem(id: string) {
    await fetch(`/api/clinic/website/gallery/${id}`, { method: 'DELETE' })
    setGallery(g => g.filter(i => i.id !== id))
  }

  if (loading) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="My Website" subtitle="Website content manage karo" />
        <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--txt3)' }}>Loading...</div>
      </div>
    )
  }

  if (notEnabled) {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title="My Website" subtitle="Website content manage karo" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">🌐</div>
            <div className="text-lg font-bold mb-2" style={{ color: 'var(--txt)' }}>Website Not Enabled</div>
            <div className="text-sm" style={{ color: 'var(--txt3)' }}>
              Your clinic's public website has not been enabled yet. Please contact your admin to activate it.
            </div>
          </div>
        </div>
      </div>
    )
  }

  const previewUrl = clinicInfo?.website_url || (clinicInfo?.website_slug ? `/site/${clinicInfo.website_slug}` : null)

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar
        title="My Website"
        subtitle={clinicInfo?.name || 'Website content manage karo'}
        actions={
          <div className="flex gap-2 items-center">
            {previewUrl && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                <AppBtn variant="secondary" type="button">Preview</AppBtn>
              </a>
            )}
            <AppBtn onClick={saveContent} disabled={saving}>
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
            </AppBtn>
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {error && (
          <div className="rounded-lg px-4 py-3 text-sm" style={{ background: 'var(--rose-dim)', color: 'var(--rose)', border: '1px solid rgba(255,78,106,0.2)' }}>
            {error}
          </div>
        )}

        {/* ── Website URL Info ── */}
        {previewUrl && (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: 'var(--acc-dim)', border: '1px solid rgba(46,134,255,0.2)' }}>
            <span className="text-lg">🌐</span>
            <div>
              <div className="text-xs font-semibold mb-0.5" style={{ color: 'var(--acc)' }}>Aapki Website URL</div>
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-medium" style={{ color: 'var(--acc)' }}>
                {clinicInfo?.website_url || `${typeof window !== 'undefined' ? window.location.origin : ''}/site/${clinicInfo?.website_slug}`}
              </a>
            </div>
          </div>
        )}

        {/* ── Custom Domain ── */}
        <CustomDomainCard />

        {/* ── Hero Banner Slider ── */}
        <PageCard title="Hero Banner Slider" actions={
          <AppBtn type="button" onClick={addSlide}>+ Slide Add Karo</AppBtn>
        }>
          <p className="text-xs mb-4" style={{ color: 'var(--txt3)' }}>
            Multiple images ya videos add karo. Yeh website pe slider ke tor par dikhenge.
          </p>

          {content.hero_slides.length === 0 && (
            <div className="rounded-xl py-8 text-center" style={{ border: '2px dashed var(--b2)', color: 'var(--txt3)' }}>
              <div className="text-3xl mb-2">🖼️</div>
              <div className="text-sm">Abhi koi slide nahi. "Slide Add Karo" button dabao.</div>
            </div>
          )}

          <div className="space-y-4">
            {content.hero_slides.map((slide, idx) => (
              <div key={slide.id} className="rounded-xl p-4 space-y-3" style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--acc-dim)', color: 'var(--acc)' }}>
                    Slide {idx + 1}
                  </span>
                  <div className="flex gap-1 ml-auto">
                    <button type="button" onClick={() => moveSlide(idx, -1)} disabled={idx === 0}
                      className="px-2 py-1 rounded text-xs" style={{ background: 'var(--b2)', color: 'var(--txt2)', opacity: idx === 0 ? 0.4 : 1 }}>↑</button>
                    <button type="button" onClick={() => moveSlide(idx, 1)} disabled={idx === content.hero_slides.length - 1}
                      className="px-2 py-1 rounded text-xs" style={{ background: 'var(--b2)', color: 'var(--txt2)', opacity: idx === content.hero_slides.length - 1 ? 0.4 : 1 }}>↓</button>
                    <button type="button" onClick={() => removeSlide(idx)}
                      className="px-2 py-1 rounded text-xs" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>✕ Hatao</button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Type (Image ya Video)">
                    <select value={slide.type} onChange={e => updateSlide(idx, 'type', e.target.value)}
                      className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--txt)' }}>
                      <option value="image">Image</option>
                      <option value="video">Video</option>
                    </select>
                  </FormField>
                  <FormField label="URL (Image/Video link)">
                    <MediaUpload
                      value={slide.url}
                      onChange={url => updateSlide(idx, 'url', url)}
                      accept={slide.type === 'video' ? 'video/*' : 'image/*'}
                      placeholder={slide.type === 'video' ? 'https://...mp4' : 'https://...jpg/png'}
                      previewType={slide.type}
                    />
                  </FormField>
                  <FormField label="Heading (Title)">
                    <AppInput value={slide.title} onChange={e => updateSlide(idx, 'title', e.target.value)}
                      placeholder="Welcome to Our Clinic" />
                  </FormField>
                  <FormField label="Sub-heading">
                    <AppInput value={slide.subtitle} onChange={e => updateSlide(idx, 'subtitle', e.target.value)}
                      placeholder="Quality care for your family" />
                  </FormField>
                  <FormField label="Button Text">
                    <AppInput value={slide.cta_text} onChange={e => updateSlide(idx, 'cta_text', e.target.value)}
                      placeholder="Book Appointment" />
                  </FormField>
                  <FormField label="Button Link">
                    <AppInput value={slide.cta_link} onChange={e => updateSlide(idx, 'cta_link', e.target.value)}
                      placeholder="/book" />
                  </FormField>
                </div>

              </div>
            ))}
          </div>
        </PageCard>

        {/* ── Gallery ── */}
        <PageCard title="Gallery">
          <p className="text-xs mb-4" style={{ color: 'var(--txt3)' }}>
            Clinic ki photos aur videos add karo jo website per gallery mein dikhengi.
          </p>

          {/* Add new item */}
          <div className="rounded-xl p-4 mb-4 space-y-3" style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}>
            <div className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>Naya Media Add Karo</div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Type">
                <select value={newMedia.media_type} onChange={e => setNewMedia(p => ({ ...p, media_type: e.target.value as 'image' | 'video' }))}
                  className="w-full rounded-lg px-3 py-2 text-sm" style={{ background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--txt)' }}>
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </FormField>
              <FormField label="URL">
                <MediaUpload
                  value={newMedia.url}
                  onChange={url => setNewMedia(p => ({ ...p, url }))}
                  accept={newMedia.media_type === 'video' ? 'video/*' : 'image/*'}
                  placeholder="https://example.com/photo.jpg"
                  previewType={newMedia.media_type}
                />
              </FormField>
              <FormField label="Caption (optional)">
                <AppInput value={newMedia.caption} onChange={e => setNewMedia(p => ({ ...p, caption: e.target.value }))}
                  placeholder="Clinic reception area" />
              </FormField>
            </div>
            <AppBtn type="button" onClick={addGalleryItem} disabled={addingMedia || !newMedia.url.trim()}>
              {addingMedia ? 'Adding...' : '+ Gallery Mein Add Karo'}
            </AppBtn>
          </div>

          {/* Gallery grid */}
          {gallery.length === 0 ? (
            <div className="rounded-xl py-8 text-center" style={{ border: '2px dashed var(--b2)', color: 'var(--txt3)' }}>
              <div className="text-3xl mb-2">🖼️</div>
              <div className="text-sm">Abhi gallery khali hai.</div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {gallery.map(item => (
                <div key={item.id} className="relative rounded-xl overflow-hidden group" style={{ border: '1px solid var(--b1)', aspectRatio: '4/3' }}>
                  {item.media_type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--s2)' }}>
                      <span className="text-3xl">🎬</span>
                    </div>
                  ) : (
                    <img src={item.url} alt={item.caption || ''} className="w-full h-full object-cover" />
                  )}
                  {item.caption && (
                    <div className="absolute bottom-0 left-0 right-0 px-2 py-1 text-xs truncate" style={{ background: 'rgba(0,0,0,0.6)', color: '#fff' }}>
                      {item.caption}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => deleteGalleryItem(item.id)}
                    className="absolute top-2 right-2 rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ background: 'var(--rose)', color: '#fff' }}
                  >
                    ✕
                  </button>
                  <div className="absolute top-2 left-2 text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                    {item.media_type === 'video' ? '🎬' : '🖼️'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PageCard>

        {/* ── About Section ── */}
        <PageCard title="About Section">
          <div className="space-y-3">
            <FormField label="Section Title">
              <AppInput value={content.about_title} onChange={e => setContent(p => ({ ...p, about_title: e.target.value }))}
                placeholder="About Our Clinic" />
            </FormField>
            <FormField label="About Text">
              <AppTextarea value={content.about_text} onChange={e => setContent(p => ({ ...p, about_text: e.target.value }))}
                placeholder="Clinic ke baare mein batao — specialties, mission, history..." rows={5} />
            </FormField>
          </div>
        </PageCard>

        {/* ── Services ── */}
        <PageCard title="Services / Specialties" actions={
          <AppBtn type="button" onClick={addService}>+ Service Add Karo</AppBtn>
        }>
          <div className="space-y-3">
            {content.services.length === 0 && (
              <div className="rounded-xl py-6 text-center text-sm" style={{ border: '2px dashed var(--b2)', color: 'var(--txt3)' }}>
                Koi service nahi. Add karo.
              </div>
            )}
            {content.services.map((svc, idx) => (
              <div key={svc.id} className="grid grid-cols-4 gap-3 rounded-xl p-3 items-center" style={{ background: 'var(--s2)', border: '1px solid var(--b1)' }}>
                <FormField label="Icon (Emoji)">
                  <AppInput value={svc.icon} onChange={e => updateService(idx, 'icon', e.target.value)} placeholder="🏥" />
                </FormField>
                <FormField label="Service Name">
                  <AppInput value={svc.title} onChange={e => updateService(idx, 'title', e.target.value)} placeholder="General Medicine" />
                </FormField>
                <div className="col-span-2">
                  <FormField label="Description">
                    <div className="flex gap-2">
                      <AppInput value={svc.description} onChange={e => updateService(idx, 'description', e.target.value)} placeholder="Short description..." />
                      <button type="button" onClick={() => removeService(idx)}
                        className="px-3 py-2 rounded-lg text-sm flex-shrink-0" style={{ background: 'var(--rose-dim)', color: 'var(--rose)' }}>
                        ✕
                      </button>
                    </div>
                  </FormField>
                </div>
              </div>
            ))}
          </div>
        </PageCard>

        {/* ── Contact Info ── */}
        <PageCard title="Contact Information">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Phone">
              <AppInput value={content.contact_info.phone} onChange={e => setContent(p => ({ ...p, contact_info: { ...p.contact_info, phone: e.target.value } }))}
                placeholder="+92 300 0000000" />
            </FormField>
            <FormField label="Email">
              <AppInput value={content.contact_info.email} onChange={e => setContent(p => ({ ...p, contact_info: { ...p.contact_info, email: e.target.value } }))}
                placeholder="clinic@example.com" />
            </FormField>
            <div className="col-span-2">
              <FormField label="Address">
                <AppInput value={content.contact_info.address} onChange={e => setContent(p => ({ ...p, contact_info: { ...p.contact_info, address: e.target.value } }))}
                  placeholder="Street, City, Country" />
              </FormField>
            </div>
            <FormField label="Working Hours">
              <AppInput value={content.contact_info.working_hours} onChange={e => setContent(p => ({ ...p, contact_info: { ...p.contact_info, working_hours: e.target.value } }))}
                placeholder="Mon–Sat: 9 AM – 6 PM" />
            </FormField>
            <FormField label="Google Maps Embed URL" hint="Google Maps embed link (optional)">
              <AppInput value={content.contact_info.map_embed_url} onChange={e => setContent(p => ({ ...p, contact_info: { ...p.contact_info, map_embed_url: e.target.value } }))}
                placeholder="https://maps.google.com/..." />
            </FormField>
          </div>
        </PageCard>

        {/* ── SEO ── */}
        <PageCard title="SEO Settings">
          <div className="space-y-3">
            <FormField label="Page Title" hint="Browser tab aur Google mein dikhta hai">
              <AppInput value={content.seo_title} onChange={e => setContent(p => ({ ...p, seo_title: e.target.value }))}
                placeholder="City Care Clinic - Karachi" />
            </FormField>
            <FormField label="Meta Description" hint="Google search mein description (max 160 characters)">
              <AppTextarea value={content.seo_description} onChange={e => setContent(p => ({ ...p, seo_description: e.target.value }))}
                placeholder="Best clinic in Karachi offering general medicine, pediatrics..." rows={3} />
              <div className="text-xs mt-1" style={{ color: content.seo_description.length > 160 ? 'var(--rose)' : 'var(--txt3)' }}>
                {content.seo_description.length}/160 characters
              </div>
            </FormField>
          </div>
        </PageCard>

        {/* Bottom save */}
        <div className="flex justify-end pb-4">
          <AppBtn onClick={saveContent} disabled={saving}>
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save All Changes'}
          </AppBtn>
        </div>
      </div>
    </div>
  )
}
