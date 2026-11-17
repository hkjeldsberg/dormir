import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="140" height="140" viewBox="0 0 64 64">
          <path d="M40 14a20 20 0 1 0 10 34A17 17 0 0 1 40 14z" fill="#F5B041" />
          <circle cx="46" cy="20" r="2" fill="#7A78E6" />
          <circle cx="52" cy="30" r="1.5" fill="#7A78E6" />
        </svg>
      </div>
    ),
    size,
  )
}
