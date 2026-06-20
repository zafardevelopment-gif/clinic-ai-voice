import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

// Public endpoint — no auth needed
// GET /api/public/clinic/[slug]/slots?doctor_id=...&date=YYYY-MM-DD
export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const { slug } = params
  const { searchParams } = new URL(req.url)
  const doctorId = searchParams.get('doctor_id')
  const date = searchParams.get('date')

  if (!doctorId || !date) {
    return NextResponse.json({ error: 'doctor_id and date required' }, { status: 400 })
  }

  const db = getDb()

  // Verify doctor belongs to this clinic
  const { data: clinic } = await db
    .from('clinics')
    .select('id')
    .eq('website_slug', slug)
    .eq('website_enabled', true)
    .eq('is_active', true)
    .single()

  if (!clinic) return NextResponse.json({ error: 'Clinic not found' }, { status: 404 })

  const { data: doctor } = await db
    .from('doctors')
    .select('slot_duration_minutes, booking_min_hours, booking_max_days')
    .eq('id', doctorId)
    .eq('clinic_id', clinic.id)
    .eq('is_active', true)
    .single()

  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

  // Validate date is within booking window
  const today = new Date()
  const selected = new Date(date + 'T00:00:00')
  const diffDays = Math.ceil((selected.getTime() - today.setHours(0,0,0,0)) / 86400000)
  if (diffDays < 0 || diffDays > doctor.booking_max_days) {
    return NextResponse.json({ slots: [], reason: 'Date out of booking range' })
  }

  // Get doctor availability for this day of week
  const dayOfWeek = new Date(date + 'T00:00:00').getDay()
  const { data: avail } = await db
    .from('doctor_availability')
    .select('start_time, end_time, is_available')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .single()

  if (!avail || !avail.is_available) {
    return NextResponse.json({ slots: [], reason: 'Doctor not available on this day' })
  }

  // Get already booked slots
  const { data: booked } = await db
    .from('appointments')
    .select('appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .not('status', 'in', '("cancelled","no_show")')

  const bookedTimes = new Set((booked || []).map((b: { appointment_time: string }) => b.appointment_time.slice(0, 5)))

  // Generate available slots
  const slots: string[] = []
  const [startH, startM] = avail.start_time.split(':').map(Number)
  const [endH, endM] = avail.end_time.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  const slotDur = doctor.slot_duration_minutes || 30

  const now = new Date()
  const isToday = now.toDateString() === new Date(date + 'T00:00:00').toDateString()
  const minMinutesFromNow = isToday
    ? now.getHours() * 60 + now.getMinutes() + (doctor.booking_min_hours || 2) * 60
    : 0

  for (let min = startMin; min + slotDur <= endMin; min += slotDur) {
    const hh = String(Math.floor(min / 60)).padStart(2, '0')
    const mm = String(min % 60).padStart(2, '0')
    const timeStr = `${hh}:${mm}`
    if (isToday && min < minMinutesFromNow) continue
    if (bookedTimes.has(timeStr)) continue
    slots.push(timeStr)
  }

  return NextResponse.json({ slots })
}
