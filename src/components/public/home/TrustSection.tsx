import { Shield, Globe, Clock, Lock, TrendingUp, Award } from 'lucide-react'

const stats = [
  { value: '50+', label: 'Clinics & Hospitals' },
  { value: '2L+', label: 'Patient Calls Handled' },
  { value: '94%', label: 'Calls Resolved by AI' },
  { value: '< 2s', label: 'Average Response Time' },
]

const badges = [
  { icon: Shield, title: 'HIPAA-Ready Architecture', desc: 'Data privacy by design' },
  { icon: Lock, title: 'Enterprise-Grade Security', desc: 'End-to-end encryption' },
  { icon: Globe, title: 'Multi-Language Support', desc: '10+ Indian languages' },
  { icon: Clock, title: '24 × 7 Availability', desc: 'Never goes offline' },
  { icon: TrendingUp, title: 'Real-Time Analytics', desc: 'Dashboard insights' },
  { icon: Award, title: 'Trusted by Top Clinics', desc: 'Across India' },
]

export default function TrustSection() {
  return (
    <section className="py-16 bg-white border-y border-[#e4ebe7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-14">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="font-syne font-bold text-3xl lg:text-4xl text-emerald-500 mb-1">{s.value}</p>
              <p className="text-sm text-[#7a8d83]">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-10">
          <div className="flex-1 h-px bg-[#e4ebe7]" />
          <p className="text-sm font-medium text-[#7a8d83] whitespace-nowrap">Built for healthcare compliance</p>
          <div className="flex-1 h-px bg-[#e4ebe7]" />
        </div>

        {/* Trust badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {badges.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-[#f6faf8] hover:bg-emerald-50/50 border border-transparent hover:border-emerald-100 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center mb-3 group-hover:bg-emerald-200 transition-colors">
                <Icon className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-xs font-semibold text-[#0f1f17] leading-snug mb-1">{title}</p>
              <p className="text-xs text-[#7a8d83]">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
