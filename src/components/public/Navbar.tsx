'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X, ChevronDown } from 'lucide-react'

const navLinks = [
  { label: 'Features', href: '/features' },
  { label: 'Solutions', href: '/solutions' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'FAQ', href: '/faq' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-[#e4ebe7]'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm group-hover:bg-emerald-600 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true" fill="none">
                <rect x="9" y="2" width="6" height="11" rx="3" fill="white"/>
                <path d="M5 11a7 7 0 0 0 14 0" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="12" y1="18" x2="12" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                <line x1="8" y1="22" x2="16" y2="22" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="font-syne font-bold text-[#0f1f17] text-lg tracking-tight">
              Medi<span className="text-emerald-500">Voice</span> AI
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-[#4b5d54] hover:text-[#0f1f17] hover:bg-[#f1f5f3]'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTAs */}
          <div className="hidden lg:flex items-center gap-2">
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-[#4b5d54] hover:text-[#0f1f17] transition-colors"
            >
              Login
            </Link>
            <Link
              href="/request-demo"
              className="px-4 py-2 text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 rounded-lg transition-colors shadow-sm"
            >
              Request Demo
            </Link>
          </div>

          {/* Mobile burger */}
          <button
            onClick={() => setOpen(!open)}
            className="lg:hidden p-2 rounded-lg text-[#4b5d54] hover:bg-[#f1f5f3] transition-colors"
            aria-label="Toggle menu"
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden bg-white border-t border-[#e4ebe7] shadow-lg">
          <div className="px-4 py-4 space-y-1">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? 'text-emerald-600 bg-emerald-50'
                    : 'text-[#4b5d54] hover:text-[#0f1f17] hover:bg-[#f1f5f3]'
                }`}
              >
                {l.label}
              </Link>
            ))}
            <div className="pt-3 border-t border-[#e4ebe7] mt-3 space-y-2">
              <Link
                href="/login"
                className="block px-4 py-2.5 rounded-lg text-sm font-medium text-[#4b5d54] hover:bg-[#f1f5f3] transition-colors"
              >
                Login
              </Link>
              <Link
                href="/request-demo"
                className="block px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 text-center transition-colors"
              >
                Request Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
