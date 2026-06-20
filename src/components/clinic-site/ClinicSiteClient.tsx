'use client'

import { useState, useEffect, useRef } from 'react'
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
  const accent = '#10b981'

  const heroSlides: HeroSlide[] = websiteContent?.hero_slides || []
  const services: WebsiteService[] = websiteContent?.services || []
  const contactInfo = websiteContent?.contact_info || {}

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const displayPhone = contactInfo.phone || clinic.phone
  const displayEmail = contactInfo.email || clinic.email
  const displayAddress = contactInfo.address || [clinic.address, clinic.city, clinic.country].filter(Boolean).join(', ')

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
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {services.length > 0 && (
            <button onClick={() => scrollTo('services')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>Services</button>
          )}
          <button onClick={() => scrollTo('doctors')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>Our Doctors</button>
          {(websiteContent?.about_title || websiteContent?.about_text) && (
            <button onClick={() => scrollTo('about')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>About</button>
          )}
          {gallery.length > 0 && (
            <button onClick={() => scrollTo('gallery')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>Gallery</button>
          )}
          <button onClick={() => scrollTo('contact')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54' }}>Contact</button>
          <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600 }}>
            Book Appointment
          </button>
        </div>
      </nav>

      {/* ── HERO SLIDER ── */}
      {heroSlides.length > 0 ? (
        <HeroSlider slides={heroSlides} accent={accent} onBook={() => scrollTo('doctors')} />
      ) : (
        <section style={{ padding: '80px 5% 60px', background: `linear-gradient(135deg, ${accent}12 0%, #ffffff 60%)`, textAlign: 'center' }}>
          <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', color: '#0f1f17' }}>{clinic.name}</h1>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginTop: 24 }}>
            <button onClick={() => scrollTo('doctors')} style={{ background: accent, color: '#fff', border: 'none', cursor: 'pointer', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700 }}>
              Book an Appointment
            </button>
            {displayPhone && (
              <a href={`tel:${displayPhone}`} style={{ display: 'inline-block', background: '#fff', color: '#0f1f17', border: '1.5px solid #e4ebe7', padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600, textDecoration: 'none' }}>
                📞 {displayPhone}
              </a>
            )}
          </div>
          {doctors.length > 0 && (
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
              <Stat value={doctors.length} label="Doctors" />
              {doctors.filter(d => d.years_of_experience).length > 0 && (
                <Stat value={Math.max(...doctors.map(d => d.years_of_experience || 0)) + '+'} label="Years Experience" />
              )}
              <Stat value="24/7" label="Appointment Booking" />
            </div>
          )}
        </section>
      )}

      {/* ── SERVICES ── */}
      {services.length > 0 && (
        <section id="services" style={{ padding: '72px 5%', background: '#fff' }}>
          <SectionHeader accent={accent} tag="What We Offer" title="Our Services" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginTop: 40 }}>
            {services.map(svc => (
              <div key={svc.id} style={{ background: '#f8fafb', borderRadius: 14, padding: '24px 20px', border: '1px solid #e4ebe7', textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>{svc.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: '#0f1f17' }}>{svc.title}</div>
                {svc.description && <div style={{ fontSize: 13, color: '#4b5d54', lineHeight: 1.6 }}>{svc.description}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── DOCTORS ── */}
      <section id="doctors" style={{ padding: '72px 5%', background: services.length > 0 ? '#f8fafb' : '#fff' }}>
        <SectionHeader accent={accent} tag="Our Team" title="Meet Our Doctors" />
        {doctors.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#7a8d83', marginTop: 32 }}>Doctor information coming soon.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24, marginTop: 40 }}>
            {doctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} accent={accent} onBook={() => setBookingDoctor(doc)} />
            ))}
          </div>
        )}
      </section>

      {/* ── ABOUT ── */}
      {(websiteContent?.about_title || websiteContent?.about_text) && (
        <section id="about" style={{ padding: '72px 5%', background: '#fff' }}>
          <SectionHeader accent={accent} tag="About Us" title={websiteContent.about_title || `About ${clinic.name}`} />
          {websiteContent.about_text && (
            <p style={{ color: '#4b5d54', fontSize: 16, lineHeight: 1.8, maxWidth: 760, margin: '24px auto 0', whiteSpace: 'pre-line' }}>
              {websiteContent.about_text}
            </p>
          )}
        </section>
      )}

      {/* ── GALLERY ── */}
      {gallery.length > 0 && (
        <section id="gallery" style={{ padding: '72px 5%', background: '#f8fafb' }}>
          <SectionHeader accent={accent} tag="Gallery" title="Our Clinic" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16, marginTop: 40 }}>
            {gallery.map(item => (
              <div key={item.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid #e4ebe7', aspectRatio: '4/3', position: 'relative', background: '#e4ebe7' }}>
                {item.media_type === 'video' ? (
                  <video src={item.url} controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={item.url} alt={item.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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

      {/* ── CONTACT ── */}
      <section id="contact" style={{ padding: '72px 5%', background: '#fff' }}>
        <SectionHeader accent={accent} tag="Contact" title="Visit Us" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginTop: 40, maxWidth: 900, margin: '40px auto 0' }}>
          <div style={{ background: '#f8fafb', borderRadius: 16, padding: 32, border: '1px solid #e4ebe7' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 18 }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {displayAddress && <ContactRow icon="📍" text={displayAddress} />}
              {displayPhone && <ContactRow icon="📞" text={displayPhone} href={`tel:${displayPhone}`} />}
              {displayEmail && <ContactRow icon="✉️" text={displayEmail} href={`mailto:${displayEmail}`} />}
              {contactInfo.working_hours && <ContactRow icon="🕐" text={contactInfo.working_hours} />}
            </div>
          </div>

          {contactInfo.map_embed_url && (
            <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e4ebe7', minHeight: 220 }}>
              <iframe src={contactInfo.map_embed_url} width="100%" height="100%" style={{ border: 0, minHeight: 220 }} allowFullScreen loading="lazy" />
            </div>
          )}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ padding: '32px 5%', borderTop: '1px solid #e4ebe7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, background: '#fff' }}>
        <span style={{ color: '#7a8d83', fontSize: 13 }}>© {new Date().getFullYear()} {clinic.name}. All rights reserved.</span>
        <span style={{ color: '#c3cdc7', fontSize: 12 }}>Powered by ClinicAI</span>
      </footer>

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
