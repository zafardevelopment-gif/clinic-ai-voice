'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BookingModal from './BookingModal'
import type { HeroSlide, WebsiteService } from '@/types/database'

interface Doctor {
  id: string
  full_name: string
  specialization: string | null
  bio: string | null
  avatar_url: string | null
  years_of_experience: number | null
  qualifications: string | null
  consultation_fee: number | null
  languages_spoken: string[] | null
  slot_duration_minutes: number
  booking_min_hours: number
  booking_max_days: number
  departments?: { name: string } | null
}

interface ClinicInfo {
  id: string
  name: string
  website_slug: string | null
  logo_url: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string | null
}

interface WebsiteContent {
  hero_slides: HeroSlide[]
  about_title: string | null
  about_text: string | null
  services: WebsiteService[]
  contact_info: {
    phone?: string
    email?: string
    address?: string
    working_hours?: string
    map_embed_url?: string
  }
  seo_title: string | null
  seo_description: string | null
}

interface GalleryItem {
  id: string
  media_type: 'image' | 'video'
  url: string
  caption: string | null
  sort_order: number
}

interface Props {
  clinic: ClinicInfo
  websiteContent: WebsiteContent | null
  gallery: GalleryItem[]
  doctors: Doctor[]
}

export default function ClinicSiteClient({ clinic, websiteContent, gallery, doctors }: Props) {
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)
  const [lightbox, setLightbox] = useState<GalleryItem | null>(null)
  const [doctorQuery, setDoctorQuery] = useState('')
  const [specialtyFilter, setSpecialtyFilter] = useState('all')
  const accent = '#10b981'

  const specialties = Array.from(new Set(doctors.map(d => d.specialization).filter((s): s is string => !!s)))
  const filteredDoctors = doctors.filter(d => {
    if (specialtyFilter !== 'all' && d.specialization !== specialtyFilter) return false
    if (!doctorQuery.trim()) return true
    const q = doctorQuery.trim().toLowerCase()
    return d.full_name.toLowerCase().includes(q) || (d.specialization || '').toLowerCase().includes(q)
  })

  const heroSlides: HeroSlide[] = websiteContent?.hero_slides || []
  const services: WebsiteService[] = websiteContent?.services || []
  const contactInfo = websiteContent?.contact_info || {}

  const closeLightbox = useCallback(() => setLightbox(null), [])

  // Close lightbox on ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') closeLightbox() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeLightbox])

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayPhone = contactInfo.phone || clinic.phone
  const displayEmail = contactInfo.email || clinic.email
  const displayAddress = contactInfo.address || [clinic.address, clinic.city, clinic.country].filter(Boolean).join(', ')
  const hasAbout = !!(websiteContent?.about_title || websiteContent?.about_text)
  const maxExp = doctors.filter(d => d.years_of_experience).length > 0
    ? Math.max(...doctors.map(d => d.years_of_experience || 0))
    : null

  return (
    <div style={{ fontFamily: "'Figtree', sans-serif", background: '#f8fafb', minHeight: '100vh', color: '#1a2a22' }}>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #e8efea',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 5%', height: 64,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {clinic.logo_url ? (
            <img src={clinic.logo_url} alt={clinic.name} style={{ height: 36, width: 'auto', objectFit: 'contain' }} />
          ) : (
            <div style={{ width: 36, height: 36, borderRadius: 10, background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16 }}>
              {clinic.name.charAt(0)}
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0f1f17' }}>{clinic.name}</span>
        </div>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          {hasAbout && <NavBtn label="About" onClick={() => scrollTo('about')} />}
          {services.length > 0 && <NavBtn label="Services" onClick={() => scrollTo('services')} />}
          <NavBtn label="Our Doctors" onClick={() => scrollTo('doctors')} />
          {gallery.length > 0 && <NavBtn label="Gallery" onClick={() => scrollTo('gallery')} />}
          <NavBtn label="Contact" onClick={() => scrollTo('contact')} />
          <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Book Appointment
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      {heroSlides.length > 0 ? (
        <HeroSlider slides={heroSlides} accent={accent} onBook={() => scrollTo('doctors')} />
      ) : (
        <section style={{ padding: '90px 5% 70px', background: `linear-gradient(135deg, ${accent}10 0%, #ffffff 60%)`, textAlign: 'center' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: 100, background: `${accent}18`, color: accent, fontSize: 13, fontWeight: 600, marginBottom: 20 }}>
            Now accepting appointments online
          </div>
          <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, margin: '0 0 16px', color: '#0f1f17' }}>{clinic.name}</h1>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 28 }}>
            <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700 }}>
              Book an Appointment
            </button>
            {displayPhone && (
              <a href={`tel:${displayPhone}`} style={{ display: 'inline-block', background: '#fff', color: '#0f1f17', border: '1.5px solid #e4ebe7', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                📞 {displayPhone}
              </a>
            )}
          </div>
        </section>
      )}

      {/* ── STATS BAR ── */}
      <div style={{ background: accent, padding: '28px 5%' }}>
        <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 900, margin: '0 auto' }}>
          {doctors.length > 0 && <StatBar value={doctors.length} label="Expert Doctors" />}
          {maxExp && <StatBar value={`${maxExp}+`} label="Years Experience" />}
          <StatBar value="24/7" label="Online Booking" />
          <StatBar value="100%" label="Patient Satisfaction" />
        </div>
      </div>

      {/* ── ABOUT ── */}
      {hasAbout && (
        <section id="about" style={{ padding: '80px 5%', background: '#fff' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', maxWidth: 1100, margin: '0 auto' }}>
            <div>
              <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>
                About Us
              </div>
              <h2 style={{ fontSize: 38, fontWeight: 800, margin: '0 0 20px', color: '#0f1f17', lineHeight: 1.2 }}>
                {websiteContent?.about_title || `About ${clinic.name}`}
              </h2>
              {websiteContent?.about_text && (
                <p style={{ color: '#4b5d54', fontSize: 16, lineHeight: 1.85, margin: 0, whiteSpace: 'pre-line' }}>
                  {websiteContent.about_text}
                </p>
              )}
              <button onClick={() => scrollTo('doctors')} style={{ marginTop: 28, background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '13px 28px', borderRadius: 9, fontSize: 15, fontWeight: 700 }}>
                Meet Our Doctors →
              </button>
            </div>
            {/* Visual side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                { icon: '🏥', title: 'Modern Facility', desc: 'State-of-the-art equipment and clean environment' },
                { icon: '👨‍⚕️', title: 'Expert Doctors', desc: 'Qualified and experienced medical professionals' },
                { icon: '⏰', title: 'Flexible Hours', desc: 'Convenient appointment slots for your schedule' },
                { icon: '💊', title: 'Quality Care', desc: 'Comprehensive treatment with personal attention' },
              ].map(item => (
                <div key={item.title} style={{ background: '#f8fafb', borderRadius: 14, padding: '20px 16px', border: '1px solid #e4ebe7' }}>
                  <div style={{ fontSize: 28, marginBottom: 10 }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 6, color: '#0f1f17' }}>{item.title}</div>
                  <div style={{ fontSize: 12, color: '#7a8d83', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section id="services" style={{ padding: '80px 5%', background: '#f8fafb' }}>
          <SectionHeader accent={accent} tag="What We Offer" title="Our Services" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 20, marginTop: 44 }}>
            {services.map(svc => (
              <div key={svc.id} style={{ background: '#fff', borderRadius: 16, padding: '28px 20px', border: '1px solid #e4ebe7', textAlign: 'center', transition: 'box-shadow 0.2s' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>{svc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#0f1f17' }}>{svc.title}</div>
                {svc.description && <div style={{ fontSize: 13, color: '#4b5d54', lineHeight: 1.65 }}>{svc.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DOCTORS ── */}
      <section id="doctors" style={{ padding: '80px 5%', background: '#fff' }}>
        <SectionHeader accent={accent} tag="Our Team" title="Meet Our Doctors" />
        {doctors.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#7a8d83', marginTop: 32 }}>Doctor information coming soon.</p>
        ) : (
          <>
            {(doctors.length > 5 || specialties.length > 1) && (
              <div style={{ maxWidth: 1100, margin: '36px auto 0', display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '100%', maxWidth: 420 }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9aada3' }}>🔍</span>
                  <input
                    value={doctorQuery}
                    onChange={e => setDoctorQuery(e.target.value)}
                    placeholder="Search doctor by name or specialty…"
                    style={{ width: '100%', padding: '11px 16px 11px 38px', borderRadius: 10, border: '1px solid #e4ebe7', fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                </div>
                {specialties.length > 1 && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                    <FilterChip label="All" active={specialtyFilter === 'all'} accent={accent} onClick={() => setSpecialtyFilter('all')} />
                    {specialties.map(s => (
                      <FilterChip key={s} label={s} active={specialtyFilter === s} accent={accent} onClick={() => setSpecialtyFilter(s)} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {filteredDoctors.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#7a8d83', marginTop: 32 }}>No doctors match your search.</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 320px))', gap: 24, marginTop: 44, maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', justifyContent: 'center' }}>
                {filteredDoctors.map(doc => (
                  <DoctorCard key={doc.id} doctor={doc} accent={accent} onBook={() => setBookingDoctor(doc)} />
                ))}
              </div>
            )}
          </>
        )}
      </section>

      {/* ── WHY CHOOSE US ── */}
      <section style={{ padding: '80px 5%', background: `linear-gradient(135deg, ${accent} 0%, #059669 100%)` }}>
        <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Why Choose {clinic.name}?</h2>
          <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 16, marginBottom: 48 }}>
            We are committed to providing the highest quality healthcare with compassion and expertise.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
            {[
              { icon: '🎯', title: 'Accurate Diagnosis', desc: 'Advanced diagnostic tools for precise results' },
              { icon: '🤝', title: 'Patient First', desc: 'Every decision is made with your wellbeing in mind' },
              { icon: '📱', title: 'Easy Booking', desc: 'Book appointments online anytime, anywhere' },
              { icon: '🔒', title: 'Privacy Assured', desc: 'Your health records are safe and confidential' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: '24px 18px', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.2)' }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{item.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      {gallery.length > 0 && (
        <section id="gallery" style={{ padding: '80px 5%', background: '#f8fafb' }}>
          <SectionHeader accent={accent} tag="Gallery" title="Our Clinic" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 280px))', gap: 16, marginTop: 44, maxWidth: 1100, marginLeft: 'auto', marginRight: 'auto', justifyContent: 'center' }}>
            {gallery.map(item => (
              <div
                key={item.id}
                onClick={() => item.media_type === 'image' && setLightbox(item)}
                style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e4ebe7', aspectRatio: '4/3', position: 'relative', background: '#e4ebe7', cursor: item.media_type === 'image' ? 'zoom-in' : 'default' }}
              >
                {item.media_type === 'video' ? (
                  <video src={item.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <img src={item.url} alt={item.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s' }}
                      onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                      onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }}
                      onMouseOver={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.25)')}
                      onMouseOut={e => (e.currentTarget.style.background = 'rgba(0,0,0,0)')}
                    >
                      <span style={{ color: '#fff', fontSize: 28, opacity: 0, transition: 'opacity 0.2s' }}
                        onMouseOver={e => (e.currentTarget.style.opacity = '1')}
                        onMouseOut={e => (e.currentTarget.style.opacity = '0')}
                      >🔍</span>
                    </div>
                  </>
                )}
                {item.caption && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '8px 12px', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 12 }}>
                    {item.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BANNER ── */}
      <section style={{ padding: '72px 5%', background: '#0f1f17', textAlign: 'center' }}>
        <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', margin: '0 0 12px' }}>Ready to Book Your Appointment?</h2>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 16, marginBottom: 32 }}>
          Our team is here to provide the best care for you and your family.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '15px 36px', borderRadius: 10, fontSize: 16, fontWeight: 700 }}>
            Book Appointment Now
          </button>
          {displayPhone && (
            <a href={`tel:${displayPhone}`} style={{ display: 'inline-block', background: 'transparent', color: '#fff', border: '2px solid rgba(255,255,255,0.3)', padding: '15px 36px', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
              📞 Call Us
            </a>
          )}
        </div>
      </section>

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: '80px 5%', background: '#fff' }}>
        <SectionHeader accent={accent} tag="Contact" title="Visit Us" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginTop: 44, maxWidth: 1000, margin: '44px auto 0' }}>
          <div style={{ background: '#f8fafb', borderRadius: 16, padding: 36, border: '1px solid #e4ebe7' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 24, fontSize: 20, color: '#0f1f17' }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {displayAddress && <ContactRow icon="📍" text={displayAddress} />}
              {displayPhone && <ContactRow icon="📞" text={displayPhone} href={`tel:${displayPhone}`} />}
              {displayEmail && <ContactRow icon="✉️" text={displayEmail} href={`mailto:${displayEmail}`} />}
              {contactInfo.working_hours && <ContactRow icon="🕐" text={contactInfo.working_hours} />}
            </div>
          </div>

          {contactInfo.map_embed_url ? (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e4ebe7', minHeight: 260 }}>
              <iframe src={contactInfo.map_embed_url} width="100%" height="100%" style={{ border: 0, minHeight: 260 }} allowFullScreen loading="lazy" />
            </div>
          ) : (
            <div style={{ background: '#f8fafb', borderRadius: 16, padding: 36, border: '1px solid #e4ebe7', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 20, color: '#0f1f17' }}>Book an Appointment</h3>
              <p style={{ color: '#4b5d54', fontSize: 14, margin: 0 }}>Choose a doctor and pick a time that works for you. Online booking available 24/7.</p>
              <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '13px 24px', borderRadius: 9, fontSize: 15, fontWeight: 700, alignSelf: 'flex-start' }}>
                View Doctors →
              </button>
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 5%', borderTop: '1px solid #e4ebe7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#0f1f17' }}>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12 }}>Powered by ClinicAI</span>
      </footer>

      {/* ── LIGHTBOX ── */}
      {lightbox && (
        <div
          onClick={closeLightbox}
          style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <button
            onClick={closeLightbox}
            style={{ position: 'absolute', top: 20, right: 24, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✕
          </button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', position: 'relative' }}>
            <img
              src={lightbox.url}
              alt={lightbox.caption || ''}
              style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain', display: 'block' }}
            />
            {lightbox.caption && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 12 }}>
                {lightbox.caption}
              </div>
            )}
          </div>
          {/* Navigate between images */}
          {gallery.filter(g => g.media_type === 'image').length > 1 && (() => {
            const images = gallery.filter(g => g.media_type === 'image')
            const idx = images.findIndex(g => g.id === lightbox.id)
            return (
              <>
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(images[(idx - 1 + images.length) % images.length]) }}
                  style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >‹</button>
                <button
                  onClick={e => { e.stopPropagation(); setLightbox(images[(idx + 1) % images.length]) }}
                  style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: 48, height: 48, borderRadius: '50%', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >›</button>
              </>
            )
          })()}
        </div>
      )}

      {/* ── BOOKING MODAL ── */}
      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          clinicSlug={clinic.website_slug || ''}
          onClose={() => setBookingDoctor(null)}
          accent={accent}
        />
      )}
    </div>
  )
}

// ── Helper nav/stat components ───────────────────────────────────

function NavBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>
      {label}
    </button>
  )
}

function StatBar({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '0 36px', borderRight: '1px solid rgba(255,255,255,0.2)', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.78)', marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Hero Slider Component ────────────────────────────────────────

function HeroSlider({ slides, accent, onBook }: { slides: HeroSlide[]; accent: string; onBook: () => void }) {
  const [current, setCurrent] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (slides.length <= 1) return
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [slides.length])

  function go(idx: number) {
    setCurrent(idx)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setCurrent(c => (c + 1) % slides.length), 5000)
  }

  const slide = slides[current]

  return (
    <section style={{ position: 'relative', width: '100%', height: '520px', overflow: 'hidden', background: '#0f1f17' }}>
      {/* Slides */}
      {slides.map((s, i) => (
        <div key={s.id} style={{
          position: 'absolute', inset: 0,
          opacity: i === current ? 1 : 0,
          transition: 'opacity 0.7s ease',
          zIndex: i === current ? 1 : 0,
        }}>
          {s.type === 'video' ? (
            <video src={s.url} autoPlay muted loop playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <img src={s.url} alt={s.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          )}
          {/* Overlay */}
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.55) 100%)' }} />
        </div>
      ))}

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 10, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 5%' }}>
        {slide.title && (
          <h1 style={{ fontSize: 52, fontWeight: 800, color: '#fff', margin: '0 0 12px', textShadow: '0 2px 12px rgba(0,0,0,0.3)', lineHeight: 1.15 }}>
            {slide.title}
          </h1>
        )}
        {slide.subtitle && (
          <p style={{ fontSize: 20, color: 'rgba(255,255,255,0.88)', maxWidth: 580, margin: '0 0 32px', lineHeight: 1.6 }}>
            {slide.subtitle}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
          {slide.cta_text && (
            <a href={slide.cta_link || '#'} onClick={!slide.cta_link || slide.cta_link === '#' || slide.cta_link === '/book' ? (e) => { e.preventDefault(); onBook() } : undefined}
              style={{ background: accent, color: '#fff', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
              {slide.cta_text}
            </a>
          )}
        </div>
      </div>

      {/* Dots */}
      {slides.length > 1 && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 8, zIndex: 10 }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => go(i)}
              style={{
                width: i === current ? 28 : 10, height: 10, borderRadius: 5,
                background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
                border: 'none', cursor: 'pointer', padding: 0,
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>
      )}

      {/* Arrows */}
      {slides.length > 1 && (
        <>
          <button onClick={() => go((current - 1 + slides.length) % slides.length)}
            style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ‹
          </button>
          <button onClick={() => go((current + 1) % slides.length)}
            style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', zIndex: 10, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', color: '#fff', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ›
          </button>
        </>
      )}
    </section>
  )
}

// ── Sub-components ───────────────────────────────────────────────

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#0f1f17' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#7a8d83', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

function FilterChip({ label, active, accent, onClick }: { label: string; active: boolean; accent: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '7px 16px', borderRadius: 100, fontSize: 13, fontWeight: 600, cursor: 'pointer',
        background: active ? accent : '#f1f5f3',
        color: active ? '#fff' : '#4b5d54',
        border: `1px solid ${active ? accent : '#e4ebe7'}`,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  )
}

function SectionHeader({ accent, tag, title }: { accent: string; tag: string; title: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'inline-block', padding: '5px 14px', borderRadius: 100, background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
        {tag}
      </div>
      <h2 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: '#0f1f17' }}>{title}</h2>
    </div>
  )
}

function DoctorCard({ doctor, accent, onBook }: { doctor: Doctor; accent: string; onBook: () => void }) {
  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #e4ebe7', display: 'flex', flexDirection: 'column' }}>
      <div style={{ height: 180, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {doctor.avatar_url ? (
          <img src={doctor.avatar_url} alt={doctor.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 700 }}>
            {doctor.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>
      <div style={{ padding: '20px 20px 0' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{doctor.full_name}</h3>
        <p style={{ margin: '0 0 6px', color: accent, fontSize: 14, fontWeight: 600 }}>{doctor.specialization || 'General Physician'}</p>
        {doctor.departments && <p style={{ margin: '0 0 6px', color: '#7a8d83', fontSize: 13 }}>{doctor.departments.name}</p>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {doctor.years_of_experience && <Tag>{doctor.years_of_experience} yrs exp</Tag>}
          {doctor.consultation_fee && <Tag>Rs {doctor.consultation_fee}</Tag>}
          {doctor.slot_duration_minutes && <Tag>{doctor.slot_duration_minutes}min slots</Tag>}
        </div>
        {doctor.qualifications && <p style={{ fontSize: 12, color: '#7a8d83', margin: '0 0 8px' }}>{doctor.qualifications}</p>}
        {doctor.bio && <p style={{ fontSize: 13, color: '#4b5d54', lineHeight: 1.6, margin: '0 0 8px' }}>{doctor.bio.length > 120 ? doctor.bio.slice(0, 120) + '…' : doctor.bio}</p>}
        {doctor.languages_spoken && doctor.languages_spoken.length > 0 && (
          <p style={{ fontSize: 12, color: '#7a8d83', margin: '0 0 8px' }}>🗣 {doctor.languages_spoken.join(', ')}</p>
        )}
      </div>
      <div style={{ padding: '16px 20px 20px', marginTop: 'auto' }}>
        <button onClick={onBook} style={{ width: '100%', background: accent, color: '#fff', border: 'none', cursor: 'pointer', borderRadius: 8, padding: '11px 0', fontSize: 14, fontWeight: 700 }}>
          Book Appointment
        </button>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ background: '#f1f5f3', borderRadius: 6, padding: '3px 8px', fontSize: 12, color: '#4b5d54', fontWeight: 500 }}>
      {children}
    </span>
  )
}

function ContactRow({ icon, text, href }: { icon: string; text: string; href?: string }) {
  const inner = (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 14, color: href ? '#10b981' : '#4b5d54', lineHeight: 1.5 }}>{text}</span>
    </div>
  )
  return href ? <a href={href} style={{ textDecoration: 'none' }}>{inner}</a> : inner
}
