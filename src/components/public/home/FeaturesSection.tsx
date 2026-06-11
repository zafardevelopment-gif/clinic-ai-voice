import Link from 'next/link'
import {
  Calendar, RefreshCw, XCircle, User, Clock, HelpCircle, Globe, Phone,
  Bell, Users, Megaphone, AlertTriangle, HeartHandshake, CreditCard, BarChart2, Building2, ArrowRight
} from 'lucide-react'

const features = [
  { icon: Calendar, title: 'Appointment Booking', desc: 'Patients book slots by calling. AI checks availability and confirms instantly.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: RefreshCw, title: 'Rescheduling', desc: 'Change appointment time via a natural voice conversation.', color: 'text-teal-600 bg-teal-50' },
  { icon: XCircle, title: 'Cancellation', desc: 'Cancel and free up the slot for the next patient automatically.', color: 'text-rose-600 bg-rose-50' },
  { icon: User, title: 'Doctor Availability', desc: 'AI knows which doctor is available and when — real time.', color: 'text-blue-600 bg-blue-50' },
  { icon: Clock, title: 'Slot Suggestions', desc: 'Suggests nearest available slots when preferred time is taken.', color: 'text-violet-600 bg-violet-50' },
  { icon: HelpCircle, title: 'FAQ Handling', desc: 'Answers clinic location, timing, doctor info, fees, and more.', color: 'text-amber-600 bg-amber-50' },
  { icon: Globe, title: 'Multi-Language Support', desc: 'Hindi, English, Tamil, Telugu, Kannada, and more.', color: 'text-indigo-600 bg-indigo-50' },
  { icon: Phone, title: 'Human Handoff', desc: 'Transfers complex or urgent calls to clinic staff seamlessly.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: Bell, title: 'Missed Call Callback', desc: 'Automatically calls back patients who could not reach the clinic.', color: 'text-orange-600 bg-orange-50' },
  { icon: Users, title: 'Waitlist Management', desc: 'Adds patients to waitlist and notifies when a slot opens.', color: 'text-teal-600 bg-teal-50' },
  { icon: Megaphone, title: 'Outbound Campaigns', desc: 'Sends health tips, vaccination reminders, and follow-up calls.', color: 'text-pink-600 bg-pink-50' },
  { icon: AlertTriangle, title: 'Emergency Escalation', desc: 'Detects emergency keywords and escalates to on-call staff.', color: 'text-red-600 bg-red-50' },
  { icon: HeartHandshake, title: 'Family Booking', desc: 'Book appointments for multiple family members in one call.', color: 'text-emerald-600 bg-emerald-50' },
  { icon: CreditCard, title: 'Payment Collection', desc: 'Collect consultation fees via Razorpay link over SMS/WhatsApp.', color: 'text-green-600 bg-green-50' },
  { icon: BarChart2, title: 'Analytics Dashboard', desc: 'Call volume, booking rates, no-show trends — all visualized.', color: 'text-violet-600 bg-violet-50' },
  { icon: Building2, title: 'Multi-Clinic Support', desc: 'One platform for chains — manage all clinics from a single admin.', color: 'text-blue-600 bg-blue-50' },
]

export default function FeaturesSection() {
  return (
    <section className="py-20 lg:py-28 bg-white" id="features">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Features</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Everything your clinic needs — in one AI
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-2xl mx-auto">
            16 powerful features purpose-built for healthcare communication automation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="group p-5 rounded-2xl border border-[#e4ebe7] hover:border-emerald-200 hover:shadow-md bg-white hover:bg-emerald-50/20 transition-all"
            >
              <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-sm text-[#0f1f17] mb-1.5">{title}</h3>
              <p className="text-xs text-[#7a8d83] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/features"
            className="inline-flex items-center gap-2 px-6 py-3 border border-emerald-200 text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-colors"
          >
            Explore all features
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
