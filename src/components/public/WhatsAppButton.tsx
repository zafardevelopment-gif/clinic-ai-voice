'use client'

/**
 * WhatsApp Floating Button
 * Appears at bottom-right on all public pages.
 * Clicking opens a WhatsApp chat with the support number.
 * TODO: Update PHONE_NUMBER if it changes.
 */

const PHONE_NUMBER = '919204298771' // +91 92042 98771 (no + or spaces)
const PRE_FILLED_MESSAGE = encodeURIComponent(
  'Hi! I want to know more about MediVoice AI for my clinic.'
)
const WA_URL = `https://wa.me/${PHONE_NUMBER}?text=${PRE_FILLED_MESSAGE}`

export default function WhatsAppButton() {
  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with MediVoice AI on WhatsApp"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#25D366] hover:bg-[#20b958] text-white font-semibold text-sm px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5 group"
    >
      {/* WhatsApp SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        className="w-5 h-5 fill-white flex-shrink-0"
        aria-hidden="true"
      >
        <path d="M16 0C7.164 0 0 7.163 0 16c0 2.822.737 5.469 2.027 7.77L0 32l8.463-2.004A15.934 15.934 0 0 0 16 32c8.836 0 16-7.164 16-16S24.836 0 16 0zm0 29.333a13.28 13.28 0 0 1-6.75-1.835l-.484-.289-5.022 1.188 1.26-4.875-.317-.502A13.267 13.267 0 0 1 2.667 16C2.667 8.636 8.636 2.667 16 2.667S29.333 8.636 29.333 16 23.364 29.333 16 29.333zm7.276-9.878c-.398-.2-2.354-1.162-2.72-1.295-.366-.133-.632-.2-.898.2-.266.398-1.03 1.295-1.263 1.562-.232.266-.465.3-.863.1-.398-.2-1.682-.62-3.203-1.978-1.184-1.056-1.983-2.361-2.216-2.759-.232-.398-.025-.614.175-.813.18-.178.398-.465.598-.697.2-.232.266-.398.4-.664.133-.266.066-.498-.033-.697-.1-.2-.898-2.162-1.23-2.96-.325-.778-.655-.672-.898-.684l-.765-.013c-.266 0-.697.1-1.063.498-.366.398-1.395 1.363-1.395 3.325s1.428 3.858 1.628 4.124c.2.266 2.81 4.29 6.81 6.018.952.411 1.695.657 2.274.841.955.304 1.825.261 2.512.158.766-.114 2.354-.962 2.686-1.893.333-.93.333-1.727.233-1.893-.1-.166-.366-.266-.765-.465z" />
      </svg>
      <span className="hidden sm:inline">Chat on WhatsApp</span>
    </a>
  )
}
