import Link from 'next/link'
import { ArrowRight, Phone } from 'lucide-react'

export default function CtaSection() {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl px-8 py-14 lg:px-16 lg:py-20 relative overflow-hidden">
          {/* Background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-white/10 rounded-full blur-3xl" />

          <div className="relative">
            <span className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
              14-day free trial. No credit card.
            </span>

            <h2 className="font-syne font-bold text-3xl sm:text-4xl lg:text-5xl text-white mb-5">
              Ready to automate your clinic?
            </h2>
            <p className="text-emerald-50 text-lg mb-8 max-w-xl mx-auto">
              Join 50+ clinics already using MediVoice AI to handle calls, book appointments,
              and delight patients — 24 hours a day.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/request-demo"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-colors shadow-lg"
              >
                <Phone className="w-4 h-4" />
                Request Free Demo
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center gap-2 px-7 py-4 bg-emerald-400/30 text-white font-semibold rounded-xl hover:bg-emerald-400/40 border border-white/20 transition-colors"
              >
                View Pricing
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <p className="text-emerald-100 text-sm mt-6">
              Setup in 48 hours · No technical skills needed · Dedicated onboarding support
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
