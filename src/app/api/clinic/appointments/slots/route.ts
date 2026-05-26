import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const doctorId = searchParams.get('doctor_id')
  const date = searchParams.get('date') // YYYY-MM-DD

  if (!doctorId || !date) return NextResponse.json({ error: 'doctor_id and date required' }, { status: 400 })

  const db = getDb()

  // Get doctor info (slot duration, booking rules)
  const { data: doctor } = await db
    .from('doctors')
    .select('slot_duration_minutes, booking_min_hours, booking_max_days')
    .eq('id', doctorId)
    .single()

  if (!doctor) return NextResponse.json({ error: 'Doctor not found' }, { status: 404 })

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

  // Get already booked slots for this doctor on this date
  const { data: booked } = await db
    .from('appointments')
    .select('appointment_time')
    .eq('doctor_id', doctorId)
    .eq('appointment_date', date)
    .not('status', 'in', '("cancelled","no_show")')

  const bookedTimes = new Set((booked || []).map(b => b.appointment_time.slice(0, 5)))

  // Generate slots
  const slots: string[] = []
  const [startH, startM] = avail.start_time.split(':').map(Number)
  const [endH, endM] = avail.end_time.split(':').map(Number)
  const startMin = startH * 60 + startM
  const endMin = endH * 60 + endM
  const slotDur = doctor.slot_duration_minutes || 30

  // Current time + min booking hours
  const now = new Date()
  const selectedDate = new Date(date + 'T00:00:00')
  const isToday = now.toDateString() === selectedDate.toDateString()
  const minMinutesFromNow = isToday ? now.getHours() * 60 + now.getMinutes() + (doctor.booking_min_hours || 2) * 60 : 0

  for (let min = startMin; min + slotDur <= endMin; min += slotDur) {
    const hh = String(Math.floor(min / 60)).padStart(2, '0')
    const mm = String(min % 60).padStart(2, '0')
    const timeStr = `${hh}:${mm}`

    // Skip past slots
    if (isToday && min < minMinutesFromNow) continue
    // Skip booked slots
    if (bookedTimes.has(timeStr)) continue

    slots.push(timeStr)
  }

  return NextResponse.json({ slots })
}
