import Topbar from '@/components/layout/Topbar'
import PageCard from '@/components/ui/PageCard'

export default function AdminSettingsPage() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Topbar title="System Settings" subtitle="Platform configuration" />
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <PageCard title="Platform Info">
          <div className="space-y-3">
            {[
              { label: 'Platform Name', value: 'ClinicAI Voice Platform' },
              { label: 'Version',       value: '1.0.0' },
              { label: 'Environment',   value: process.env.NODE_ENV || 'production' },
            ].map(item => (
              <div key={item.label} className="flex justify-between items-center py-2"
                style={{ borderBottom: '1px solid var(--b1)' }}>
                <span className="text-sm" style={{ color: 'var(--txt2)' }}>{item.label}</span>
                <span className="text-sm font-semibold" style={{ color: 'var(--txt)' }}>{item.value}</span>
              </div>
            ))}
          </div>
        </PageCard>

        <PageCard title="API Integration">
          <div className="rounded-xl p-4" style={{ background: 'var(--s1)', border: '1px solid var(--b1)' }}>
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--txt)' }}>Voice API Endpoints</p>
            <p className="text-xs mb-3" style={{ color: 'var(--txt3)' }}>Use these endpoints to integrate with Twilio or other telephony providers.</p>
            <div className="space-y-2">
              {[
                '/api/voice/incoming-call',
                '/api/voice/process-intent',
                '/api/voice/save-conversation',
                '/api/voice/book-appointment',
              ].map(endpoint => (
                <div key={endpoint} className="flex items-center gap-3 rounded-lg px-3 py-2"
                  style={{ background: 'var(--s3)', border: '1px solid var(--b2)' }}>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'var(--teal-dim)', color: 'var(--teal)' }}>POST</span>
                  <code className="text-xs" style={{ color: 'var(--acc)', fontFamily: 'monospace' }}>{endpoint}</code>
                </div>
              ))}
            </div>
          </div>
        </PageCard>
      </div>
    </div>
  )
}
