import { Phone, Cpu, CalendarCheck, LayoutDashboard, ArrowDown } from 'lucide-react'

const steps = [
  {
    step: '01',
    icon: Phone,
    title: 'Patient Calls Clinic',
    desc: 'A patient dials your clinic number at any time — day, night, weekend, or holiday.',
    color: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  },
  {
    step: '02',
    icon: Cpu,
    title: 'MediVoice AI Answers',
    desc: 'AI picks up instantly, greets in the patient\'s language, and understands their intent.',
    color: 'text-teal-600 bg-teal-50 border-teal-200',
  },
  {
    step: '03',
    icon: CalendarCheck,
    title: 'Books / Answers / Escalates',
    desc: 'AI books appointments, answers queries, sends reminders, or transfers to staff if needed.',
    color: 'text-violet-600 bg-violet-50 border-violet-200',
  },
  {
    step: '04',
    icon: LayoutDashboard,
    title: 'Dashboard Updates Live',
    desc: 'Every call, booking, and interaction syncs to your clinic dashboard in real time.',
    color: 'text-blue-600 bg-blue-50 border-blue-200',
  },
]

export default function HowItWorksSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#f6faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">How It Works</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Up and running in 48 hours
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-xl mx-auto">
            Zero technical skills required. Our team handles the entire setup.
          </p>
        </div>

        {/* Desktop flow */}
        <div className="hidden lg:flex items-start justify-center gap-0">
          {steps.map((s, i) => (
            <div key={s.step} className="flex items-start">
              <div className="flex flex-col items-center w-56">
                <div className={`w-16 h-16 rounded-2xl border-2 ${s.color} flex items-center justify-center mb-4`}>
                  <s.icon className="w-7 h-7" />
                </div>
                <span className="text-xs font-bold text-[#7a8d83] mb-1">{s.step}</span>
                <h3 className="font-syne font-semibold text-[#0f1f17] text-center mb-2">{s.title}</h3>
                <p className="text-sm text-[#7a8d83] text-center leading-relaxed">{s.desc}</p>
              </div>
              {i < steps.length - 1 && (
                <div className="flex-1 pt-8 px-4">
                  <div className="border-t-2 border-dashed border-emerald-200 w-full" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Mobile flow */}
        <div className="lg:hidden space-y-4">
          {steps.map((s, i) => (
            <div key={s.step}>
              <div className="flex items-start gap-4 bg-white rounded-2xl p-5 border border-[#e4ebe7]">
                <div className={`w-12 h-12 rounded-xl border ${s.color} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-bold text-[#7a8d83]">{s.step}</span>
                  <h3 className="font-syne font-semibold text-[#0f1f17] mb-1">{s.title}</h3>
                  <p className="text-sm text-[#7a8d83] leading-relaxed">{s.desc}</p>
                </div>
              </div>
              {i < steps.length - 1 && (
                <div className="flex justify-center py-1">
                  <ArrowDown className="w-5 h-5 text-emerald-300" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-200 rounded-2xl px-6 py-4">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
              <Phone className="w-4 h-4 text-white" />
            </div>
            <p className="text-sm font-medium text-[#0f1f17]">
              Our team sets everything up for you.{' '}
              <a href="/request-demo" className="text-emerald-600 underline underline-offset-2">
                Get started today →
              </a>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
