import { PhoneMissed, UserX, Clock, FileText, ArrowRight, CheckCircle2 } from 'lucide-react'

const problems = [
  {
    icon: PhoneMissed,
    title: 'Missed Calls',
    desc: 'Patients calling during busy hours go unanswered. Every missed call is a lost appointment and lost revenue.',
    color: 'text-rose-600 bg-rose-50',
  },
  {
    icon: UserX,
    title: 'Overloaded Receptionists',
    desc: 'Your staff spends hours on repetitive calls instead of helping patients at the desk.',
    color: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Clock,
    title: 'No-Shows & Last-Minute Cancellations',
    desc: 'Without automated reminders, 20–30% of appointments are no-shows that cost you time and revenue.',
    color: 'text-violet-600 bg-violet-50',
  },
  {
    icon: FileText,
    title: 'Manual Follow-Ups',
    desc: 'Calling patients back, rescheduling, and managing waitlists manually is slow and error-prone.',
    color: 'text-blue-600 bg-blue-50',
  },
]

const solutions = [
  'Answers every call instantly — day or night, holidays included',
  'Books, reschedules, and cancels appointments conversationally',
  'Sends automated reminders — calls, SMS, WhatsApp',
  'Manages waitlists and fills cancellation slots automatically',
  'Escalates emergencies to human staff instantly',
  'Gives real-time analytics on every call and outcome',
]

export default function ProblemSolutionSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#f6faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">The Problem</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Your clinic deserves better than{' '}
            <span className="text-emerald-500">missed calls</span>
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-2xl mx-auto">
            Every Indian clinic faces the same challenges. We built MediVoice AI specifically to solve them.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Problems */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {problems.map(({ icon: Icon, title, desc, color }) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-5 border border-[#e4ebe7] hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-semibold text-[#0f1f17] mb-1.5">{title}</h3>
                <p className="text-sm text-[#7a8d83] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          {/* Solution */}
          <div>
            <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">The Solution</span>
            <h3 className="font-syne font-bold text-2xl sm:text-3xl text-[#0f1f17] mb-4">
              MediVoice AI handles it all — automatically
            </h3>
            <p className="text-[#4b5d54] mb-7 leading-relaxed">
              One AI voice agent that works 24/7, never gets tired, never misses a call, speaks your patients&apos;
              language, and updates your dashboard in real time.
            </p>
            <ul className="space-y-3 mb-8">
              {solutions.map((s) => (
                <li key={s} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-[#4b5d54]">{s}</span>
                </li>
              ))}
            </ul>
            <a
              href="/features"
              className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              See all features
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
