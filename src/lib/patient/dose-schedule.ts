/**
 * Generates concrete `patient_medicine_doses` rows for a medicine from its
 * times_of_day ('HH:MM' strings) + duration_days, starting today. If
 * duration_days is null (ongoing/ chronic medicine), generates a rolling
 * window instead of an unbounded schedule — the reminder cron or app-open
 * refresh is expected to top this up as days pass.
 */

const ROLLING_WINDOW_DAYS = 14

export interface DoseScheduleInput {
  patientMedicineId: string
  patientId: string
  timesOfDay: string[]
  durationDays: number | null
  startedAt: string // 'YYYY-MM-DD'
}

export interface GeneratedDose {
  patient_medicine_id: string
  patient_id: string
  scheduled_at: string // ISO
}

export function generateDoseSchedule(input: DoseScheduleInput): GeneratedDose[] {
  if (input.timesOfDay.length === 0) return []

  const days = input.durationDays ?? ROLLING_WINDOW_DAYS
  const doses: GeneratedDose[] = []
  const start = new Date(`${input.startedAt}T00:00:00`)

  for (let d = 0; d < days; d++) {
    for (const time of input.timesOfDay) {
      const [hh, mm] = time.split(':').map(Number)
      if (Number.isNaN(hh) || Number.isNaN(mm)) continue
      const scheduledAt = new Date(start)
      scheduledAt.setDate(scheduledAt.getDate() + d)
      scheduledAt.setHours(hh, mm, 0, 0)
      doses.push({
        patient_medicine_id: input.patientMedicineId,
        patient_id: input.patientId,
        scheduled_at: scheduledAt.toISOString(),
      })
    }
  }
  return doses
}
