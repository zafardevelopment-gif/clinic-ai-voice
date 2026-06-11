import { Star, Quote } from 'lucide-react'

const testimonials = [
  {
    name: 'Dr. Rajesh Menon',
    title: 'Owner, Menon Dental Clinic',
    location: 'Bengaluru, Karnataka',
    avatar: 'RM',
    rating: 5,
    text:
      'Before MediVoice AI, we were missing 30–40 calls a day during OPD hours. Now our AI handles all incoming calls, books appointments, and even reminds patients the day before. Our no-show rate dropped from 22% to under 8% in the first month.',
    highlight: 'No-shows dropped from 22% → 8%',
  },
  {
    name: 'Dr. Priya Sundaram',
    title: 'MD, Sundaram Family Medicine',
    location: 'Chennai, Tamil Nadu',
    avatar: 'PS',
    rating: 5,
    text:
      'Our receptionist used to spend 4 hours a day just on calls. Now MediVoice handles all that in Tamil and English. My staff can focus on patients at the desk. The ROI was clear within the first 2 weeks.',
    highlight: '4 hours of staff time saved daily',
  },
  {
    name: 'Mr. Vikram Arora',
    title: 'COO, HealthFirst Hospital Group',
    location: 'Delhi NCR',
    avatar: 'VA',
    rating: 5,
    text:
      'We deployed MediVoice across 7 clinics simultaneously. The multi-clinic admin dashboard is excellent — I can see call analytics, appointment trends, and AI performance for every location from one screen. Truly enterprise-grade.',
    highlight: 'Deployed across 7 clinics at once',
  },
  {
    name: 'Dr. Kavitha Reddy',
    title: 'Director, Reddy Orthopaedic Centre',
    location: 'Hyderabad, Telangana',
    avatar: 'KR',
    rating: 5,
    text:
      'Patients love that they can book appointments at midnight without waiting. The AI handles Telugu and Hindi perfectly. We have seen a 31% increase in bookings just from after-hours calls that we were previously missing.',
    highlight: '31% more bookings from after-hours calls',
  },
  {
    name: 'Dr. Anand Kulkarni',
    title: 'Founder, Kulkarni ENT Clinic',
    location: 'Pune, Maharashtra',
    avatar: 'AK',
    rating: 5,
    text:
      'The setup was done in under 48 hours. The MediVoice team configured the AI for our specific specialization — ENT-related queries, doctor schedules, everything. It feels like a trained receptionist, not a robot.',
    highlight: 'Full setup in under 48 hours',
  },
  {
    name: 'Ms. Sunita Joshi',
    title: 'Practice Manager, Joshi Paediatrics',
    location: 'Mumbai, Maharashtra',
    avatar: 'SJ',
    rating: 5,
    text:
      'We have a lot of anxious parents calling at odd hours. MediVoice AI answers calmly, gives the right information, and books follow-up appointments. The emergency escalation feature alone is worth every rupee.',
    highlight: '24/7 coverage for anxious parents',
  },
]

export default function TestimonialsSection() {
  return (
    <section className="py-20 lg:py-28 bg-[#f6faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Testimonials</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Trusted by clinics across India
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-2xl mx-auto">
            Real results from real clinics — from solo practitioners to hospital groups.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.name}
              className="bg-white rounded-2xl p-6 border border-[#e4ebe7] hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-[#0f1f17]">{t.name}</p>
                    <p className="text-xs text-[#7a8d83]">{t.title}</p>
                    <p className="text-xs text-[#7a8d83]">{t.location}</p>
                  </div>
                </div>
                <Quote className="w-6 h-6 text-emerald-200 flex-shrink-0" />
              </div>

              <div className="flex items-center gap-0.5 mb-3">
                {Array(t.rating).fill(0).map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                ))}
              </div>

              <p className="text-sm text-[#4b5d54] leading-relaxed mb-4 flex-1">&ldquo;{t.text}&rdquo;</p>

              <div className="pt-4 border-t border-[#e4ebe7]">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full">
                  ✦ {t.highlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
