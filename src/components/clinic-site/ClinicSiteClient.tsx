'use client'

import { useState } from 'react'
import BookingModal from './BookingModal'

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

interface Clinic {
  id: string
  name: string
  slug: string
  tagline: string | null
  theme_color: string | null
  logo_url: string | null
  website_about: string | null
  website_hours: Record<string, string> | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  country: string | null
  social_facebook: string | null
  social_instagram: string | null
  social_whatsapp: string | null
}

interface Props {
  clinic: Clinic
  doctors: Doctor[]
}

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

export default function ClinicSiteClient({ clinic, doctors }: Props) {
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null)
  const accent = clinic.theme_color || '#10b981'

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div style={{ fontFamily: "'Figtree', sans-serif", background: '#f8fafb', minHeight: '100vh', color: '#1a2a22' }}>

      {/* ─── NAV ─── */}
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
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: accent, display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16,
            }}>
              {clinic.name.charAt(0)}
            </div>
          )}
          <span style={{ fontWeight: 700, fontSize: 18, color: '#0f1f17' }}>{clinic.name}</span>
        </div>

        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {['doctors', 'about', 'contact'].map(s => (
            <button key={s} onClick={() => scrollTo(s)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500, color: '#4b5d54', textTransform: 'capitalize' }}>
              {s === 'doctors' ? 'Our Doctors' : s === 'about' ? 'About' : 'Contact'}
            </button>
          ))}
          <button onClick={() => scrollTo('doctors')}
            style={{
              background: accent, color: '#fff', border: 'none', cursor: 'pointer',
              padding: '8px 20px', borderRadius: 8, fontSize: 14, fontWeight: 600,
            }}>
            Book Appointment
          </button>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section style={{
        padding: '80px 5% 60px',
        background: `linear-gradient(135deg, ${accent}12 0%, #ffffff 60%)`,
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block', padding: '6px 16px', borderRadius: 100,
          background: `${accent}18`, color: accent, fontSize: 13, fontWeight: 600, marginBottom: 20,
        }}>
          Now accepting appointments online
        </div>
        <h1 style={{ fontSize: 48, fontWeight: 800, lineHeight: 1.15, margin: '0 0 16px', color: '#0f1f17' }}>
          {clinic.name}
        </h1>
        {clinic.tagline && (
          <p style={{ fontSize: 20, color: '#4b5d54', maxWidth: 560, margin: '0 auto 32px' }}>
            {clinic.tagline}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => scrollTo('doctors')}
            style={{
              background: accent, color: '#fff', border: 'none', cursor: 'pointer',
              padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700,
            }}>
            Book an Appointment
          </button>
          {clinic.phone && (
            <a href={`tel:${clinic.phone}`}
              style={{
                display: 'inline-block',
                background: '#fff', color: '#0f1f17', border: '1.5px solid #e4ebe7',
                padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 600,
                textDecoration: 'none',
              }}>
              📞 {clinic.phone}
            </a>
          )}
        </div>

        {/* Quick stats */}
        {doctors.length > 0 && (
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48, flexWrap: 'wrap' }}>
            <Stat value={doctors.length} label="Doctors" />
            {doctors.filter(d => d.years_of_experience).length > 0 && (
              <Stat
                value={Math.max(...doctors.map(d => d.years_of_experience || 0)) + '+'}
                label="Years Experience"
              />
            )}
            <Stat value="24/7" label="Appointment Booking" />
          </div>
        )}
      </section>

      {/* ─── DOCTORS ─── */}
      <section id="doctors" style={{ padding: '72px 5%' }}>
        <SectionHeader accent={accent} tag="Our Team" title="Meet Our Doctors" />
        {doctors.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#7a8d83', marginTop: 32 }}>
            Doctor information coming soon.
          </p>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24, marginTop: 40,
          }}>
            {doctors.map(doc => (
              <DoctorCard key={doc.id} doctor={doc} accent={accent} onBook={() => setBookingDoctor(doc)} />
            ))}
          </div>
        )}
      </section>

      {/* ─── ABOUT ─── */}
      {clinic.website_about && (
        <section id="about" style={{ padding: '72px 5%', background: '#fff' }}>
          <SectionHeader accent={accent} tag="About Us" title={`About ${clinic.name}`} />
          <p style={{
            color: '#4b5d54', fontSize: 16, lineHeight: 1.8,
            maxWidth: 760, margin: '24px auto 0',
          }}>
            {clinic.website_about}
          </p>
        </section>
      )}

      {/* ─── HOURS + CONTACT ─── */}
      <section id="contact" style={{ padding: '72px 5%', background: clinic.website_about ? '#f8fafb' : '#fff' }}>
        <SectionHeader accent={accent} tag="Contact" title="Visit Us" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 32, marginTop: 40, maxWidth: 900, margin: '40px auto 0' }}>

          {/* Contact info */}
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e4ebe7' }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 18 }}>Contact Information</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {clinic.address && <ContactRow icon="📍" text={[clinic.address, clinic.city, clinic.country].filter(Boolean).join(', ')} />}
              {clinic.phone && <ContactRow icon="📞" text={clinic.phone} href={`tel:${clinic.phone}`} />}
              {clinic.email && <ContactRow icon="✉️" text={clinic.email} href={`mailto:${clinic.email}`} />}
              {clinic.social_whatsapp && (
                <ContactRow icon="💬" text="WhatsApp" href={`https://wa.me/${clinic.social_whatsapp.replace(/\D/g, '')}`} />
              )}
            </div>
            {/* Social */}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              {clinic.social_facebook && (
                <SocialBtn href={clinic.social_facebook} label="Facebook" accent={accent} />
              )}
              {clinic.social_instagram && (
                <SocialBtn href={clinic.social_instagram} label="Instagram" accent={accent} />
              )}
            </div>
          </div>

          {/* Hours */}
          {clinic.website_hours && Object.keys(clinic.website_hours).length > 0 && (
            <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e4ebe7' }}>
              <h3 style={{ fontWeight: 700, marginBottom: 20, fontSize: 18 }}>Working Hours</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {DAY_ORDER.filter(d => clinic.website_hours![d]).map(day => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                    <span style={{ color: '#4b5d54', fontWeight: 500 }}>{day}</span>
                    <span style={{ color: '#0f1f17', fontWeight: 600 }}>{clinic.website_hours![day]}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{
        padding: '32px 5%', borderTop: '1px solid #e4ebe7',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 12, background: '#fff',
      }}>
        <span style={{ color: '#7a8d83', fontSize: 13 }}>
          © {new Date().getFullYear()} {clinic.name}. All rights reserved.
        </span>
        <span style={{ color: '#c3cdc7', fontSize: 12 }}>
          Powered by MediVoice AI
        </span>
      </footer>

      {/* ─── BOOKING MODAL ─── */}
      {bookingDoctor && (
        <BookingModal
          doctor={bookingDoctor}
          clinicSlug={clinic.slug}
          onClose={() => setBookingDoctor(null)}
          accent={accent}
        />
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────

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
      <div style={{
        display: 'inline-block', padding: '5px 14px', borderRadius: 100,
        background: `${accent}15`, color: accent, fontSize: 12, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12,
      }}>
        {tag}
      </div>
      <h2 style={{ fontSize: 36, fontWeight: 800, margin: 0, color: '#0f1f17' }}>{title}</h2>
    </div>
  )
}

function DoctorCard({ doctor, accent, onBook }: { doctor: Doctor; accent: string; onBook: () => void }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, overflow: 'hidden',
      border: '1px solid #e4ebe7',
      transition: 'box-shadow 0.2s',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Avatar */}
      <div style={{ height: 180, background: `${accent}12`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {doctor.avatar_url ? (
          <img src={doctor.avatar_url} alt={doctor.full_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{
            width: 80, height: 80, borderRadius: '50%',
            background: accent, display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: 32, fontWeight: 700,
          }}>
            {doctor.full_name.split(' ').map(w => w[0]).slice(0, 2).join('')}
          </div>
        )}
      </div>

      <div style={{ padding: '20px 20px 0' }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{doctor.full_name}</h3>
        <p style={{ margin: '0 0 6px', color: accent, fontSize: 14, fontWeight: 600 }}>
          {doctor.specialization || 'General Physician'}
        </p>
        {doctor.departments && (
          <p style={{ margin: '0 0 6px', color: '#7a8d83', fontSize: 13 }}>
            {doctor.departments.name}
          </p>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {doctor.years_of_experience && (
            <Tag>{doctor.years_of_experience} yrs exp</Tag>
          )}
          {doctor.consultation_fee && (
            <Tag>Rs {doctor.consultation_fee}</Tag>
          )}
          {doctor.slot_duration_minutes && (
            <Tag>{doctor.slot_duration_minutes}min slots</Tag>
          )}
        </div>

        {doctor.qualifications && (
          <p style={{ fontSize: 12, color: '#7a8d83', margin: '0 0 8px' }}>{doctor.qualifications}</p>
        )}

        {doctor.bio && (
          <p style={{ fontSize: 13, color: '#4b5d54', lineHeight: 1.6, margin: '0 0 8px' }}>
            {doctor.bio.length > 120 ? doctor.bio.slice(0, 120) + '…' : doctor.bio}
          </p>
        )}

        {doctor.languages_spoken && doctor.languages_spoken.length > 0 && (
          <p style={{ fontSize: 12, color: '#7a8d83', margin: '0 0 8px' }}>
            🗣 {doctor.languages_spoken.join(', ')}
          </p>
        )}
      </div>

      <div style={{ padding: '16px 20px 20px', marginTop: 'auto' }}>
        <button onClick={onBook}
          style={{
            width: '100%', background: accent, color: '#fff',
            border: 'none', cursor: 'pointer', borderRadius: 8,
            padding: '11px 0', fontSize: 14, fontWeight: 700,
          }}>
          Book Appointment
        </button>
      </div>
    </div>
  )
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      background: '#f1f5f3', borderRadius: 6,
      padding: '3px 8px', fontSize: 12, color: '#4b5d54', fontWeight: 500,
    }}>
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

function SocialBtn({ href, label, accent }: { href: string; label: string; accent: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{
        padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
        background: `${accent}12`, color: accent, textDecoration: 'none',
        border: `1px solid ${accent}30`,
      }}>
      {label}
    </a>
  )
}
