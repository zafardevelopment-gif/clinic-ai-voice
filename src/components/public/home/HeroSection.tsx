'use client'

import Link from 'next/link'
import { ArrowRight, Play, Phone, Calendar, MessageSquare, CheckCircle2, Star } from 'lucide-react'

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#f6faf8] via-white to-emerald-50/40 pt-24 pb-20 lg:pt-32 lg:pb-28">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-400/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-teal-400/5 rounded-full blur-3xl -translate-x-1/4 translate-y-1/4" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="max-w-xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Now live in 10+ Indian languages</span>
            </div>

            <h1 className="font-syne font-bold text-4xl sm:text-5xl lg:text-5xl xl:text-6xl leading-[1.1] text-[#0f1f17] mb-6">
              Never Miss a{' '}
              <span className="text-emerald-500 relative">
                Patient Call
                <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 8C50 3 150 1 298 8" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
                </svg>
              </span>{' '}
              Again.
            </h1>

            <p className="text-lg text-[#4b5d54] leading-relaxed mb-8">
              MediVoice AI is your clinic&apos;s 24/7 AI receptionist. It books appointments, answers patient questions,
              sends reminders, and handles calls — in Hindi, English, and regional languages.
            </p>

            {/* Trust signals */}
            <div className="flex flex-wrap gap-4 mb-8">
              {['HIPAA-Ready Architecture', 'No Setup Fees', '< 48hr Onboarding'].map((t) => (
                <div key={t} className="flex items-center gap-1.5 text-sm text-[#4b5d54]">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span>{t}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-0.5"
              >
                Book a Free Demo
                <ArrowRight className="w-4 h-4" />
              </Link>
              <button className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-white border border-[#e4ebe7] hover:border-emerald-200 hover:bg-emerald-50/50 text-[#0f1f17] font-semibold rounded-xl transition-all">
                <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                  <Play className="w-3 h-3 text-white fill-white ml-0.5" />
                </div>
                Watch 2-min Demo
              </button>
            </div>

            {/* Social proof */}
            <div className="flex items-center gap-4 pt-4 border-t border-[#e4ebe7]">
              <div className="flex -space-x-2">
                {['D', 'A', 'P', 'R'].map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-xs text-white font-semibold"
                    style={{ backgroundColor: ['#10b981', '#0ea5a4', '#059669', '#34d399'][i] }}
                  >
                    {c}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center gap-0.5">
                  {Array(5).fill(0).map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-[#7a8d83] mt-0.5">Trusted by 50+ clinics across India</p>
              </div>
            </div>
          </div>

          {/* Right: Dashboard mockup */}
          <div className="relative lg:flex justify-center lg:justify-end">
            <div className="relative w-full max-w-lg">
              {/* Main card */}
              <div className="bg-white rounded-2xl shadow-2xl border border-[#e4ebe7] p-6 relative z-10">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs text-[#7a8d83] uppercase tracking-wider font-medium">Live Dashboard</p>
                    <h3 className="font-syne font-semibold text-[#0f1f17]">MediVoice AI — Sunrise Clinic</h3>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    3 Live Calls
                  </span>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {[
                    { label: 'Calls Today', value: '47', color: 'text-emerald-600', bg: 'bg-emerald-50' },
                    { label: 'Booked', value: '31', color: 'text-teal-600', bg: 'bg-teal-50' },
                    { label: 'Handled by AI', value: '94%', color: 'text-violet-600', bg: 'bg-violet-50' },
                  ].map((s) => (
                    <div key={s.label} className={`${s.bg} rounded-xl p-3`}>
                      <p className={`font-syne font-bold text-xl ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-[#7a8d83] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Call feed */}
                <div className="space-y-2.5">
                  {[
                    { name: 'Priya Sharma', action: 'Appointment Booked', time: '2 min ago', icon: Calendar, color: 'text-emerald-600 bg-emerald-50' },
                    { name: 'Rahul Verma', action: 'Query Answered', time: '5 min ago', icon: MessageSquare, color: 'text-blue-600 bg-blue-50' },
                    { name: 'Anita Patel', action: 'Reminder Sent', time: '8 min ago', icon: Phone, color: 'text-amber-600 bg-amber-50' },
                  ].map((item) => (
                    <div key={item.name} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-[#f6faf8] transition-colors">
                      <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0f1f17] truncate">{item.name}</p>
                        <p className="text-xs text-[#7a8d83]">{item.action}</p>
                      </div>
                      <span className="text-xs text-[#7a8d83] flex-shrink-0">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating call card */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-[#e4ebe7] px-3.5 py-2.5 z-20 hidden sm:block">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center animate-livePulse">
                    <Phone className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#0f1f17]">AI Answering…</p>
                    <p className="text-xs text-[#7a8d83]">+91 98234 ****</p>
                  </div>
                </div>
              </div>

              {/* Floating saved card */}
              <div className="absolute -bottom-4 -left-4 bg-emerald-500 rounded-xl shadow-lg px-3.5 py-2.5 z-20 hidden sm:block">
                <p className="text-xs font-semibold text-white">₹2.4L saved in staff costs</p>
                <p className="text-xs text-emerald-100">per month, avg. clinic</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
