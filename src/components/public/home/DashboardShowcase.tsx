import { BarChart2, Calendar, TrendingUp, Phone, CheckCircle, Clock } from 'lucide-react'

export default function DashboardShowcase() {
  return (
    <section className="py-20 lg:py-28 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <span className="inline-block text-sm font-semibold text-emerald-600 uppercase tracking-wider mb-3">Dashboard</span>
          <h2 className="font-syne font-bold text-3xl sm:text-4xl text-[#0f1f17] mb-4">
            Complete visibility into your clinic
          </h2>
          <p className="text-lg text-[#4b5d54] max-w-xl mx-auto">
            Real-time dashboards that give clinic owners and admins full control.
          </p>
        </div>

        {/* Dashboard cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Call Analytics */}
          <div className="bg-[#f6faf8] rounded-2xl p-6 border border-[#e4ebe7] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-syne font-semibold text-[#0f1f17]">Call Analytics</h3>
                <p className="text-xs text-[#7a8d83]">Last 30 days</p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Total Calls', value: '1,247', pct: 92, color: 'bg-emerald-500' },
                { label: 'AI Resolved', value: '1,147', pct: 80, color: 'bg-teal-400' },
                { label: 'Transferred', value: '100', pct: 14, color: 'bg-amber-400' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-[#4b5d54] mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-2 bg-[#e4ebe7] rounded-full overflow-hidden">
                    <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Appointment Dashboard */}
          <div className="bg-[#f6faf8] rounded-2xl p-6 border border-[#e4ebe7] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-syne font-semibold text-[#0f1f17]">Appointments</h3>
                <p className="text-xs text-[#7a8d83]">Today</p>
              </div>
            </div>
            <div className="space-y-2.5">
              {[
                { name: 'Dr. Sharma — 9:00 AM', status: 'Confirmed', c: 'text-emerald-600 bg-emerald-50' },
                { name: 'Dr. Patel — 10:30 AM', status: 'Confirmed', c: 'text-emerald-600 bg-emerald-50' },
                { name: 'Dr. Rao — 11:00 AM', status: 'Pending', c: 'text-amber-600 bg-amber-50' },
                { name: 'Dr. Sharma — 2:00 PM', status: 'Confirmed', c: 'text-emerald-600 bg-emerald-50' },
              ].map((a) => (
                <div key={a.name} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-[#e4ebe7]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-[#4b5d54]">{a.name}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${a.c}`}>{a.status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue Dashboard */}
          <div className="bg-[#f6faf8] rounded-2xl p-6 border border-[#e4ebe7] hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <h3 className="font-syne font-semibold text-[#0f1f17]">Revenue Impact</h3>
                <p className="text-xs text-[#7a8d83]">This month</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="bg-emerald-500 rounded-xl p-4 text-white">
                <p className="text-xs text-emerald-100 mb-1">Revenue from AI Bookings</p>
                <p className="font-syne font-bold text-2xl">₹4,82,000</p>
                <p className="text-xs text-emerald-200 mt-1">+23% vs last month</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 border border-[#e4ebe7]">
                  <p className="text-xs text-[#7a8d83]">No-show rate</p>
                  <p className="font-syne font-semibold text-[#0f1f17]">8.2%</p>
                  <p className="text-xs text-emerald-600">↓ from 24%</p>
                </div>
                <div className="bg-white rounded-xl p-3 border border-[#e4ebe7]">
                  <p className="text-xs text-[#7a8d83]">Avg wait time</p>
                  <p className="font-syne font-semibold text-[#0f1f17]">1.4s</p>
                  <p className="text-xs text-emerald-600">AI response</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
