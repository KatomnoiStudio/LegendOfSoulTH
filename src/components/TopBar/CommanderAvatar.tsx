/**
 * Avatar placeholder ของผู้เล่น (ผู้บัญชาการ) — วาดเองด้วย SVG
 * เมื่อมีรูปโปรไฟล์จริง ให้เปลี่ยนมารับ prop `src` แล้ว render <img> แทน
 */
export function CommanderAvatar({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" role="img" aria-label="รูปประจำตัวผู้เล่น">
      <defs>
        <linearGradient id="avatarBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4a8f" />
          <stop offset="100%" stopColor="#131832" />
        </linearGradient>
        <clipPath id="avatarClip">
          {/* กรอบครอบภายนอก (AvatarFrame) เป็นทรงสี่เหลี่ยมมุมมนแล้ว จึงตัดภาพให้เต็มกรอบ ไม่ใช่วงกลม */}
          <rect width="64" height="64" rx="7" />
        </clipPath>
      </defs>

      <g clipPath="url(#avatarClip)">
        <rect width="64" height="64" fill="url(#avatarBg)" />
        <circle cx="32" cy="27" r="20" fill="#6d8cff" opacity="0.25" />

        {/* ไหล่และเกราะอก */}
        <path d="M8 64c0-13 11-20 24-20s24 7 24 20z" fill="#252c4d" />
        <path d="M26 46h12l-6 11z" fill="#6d8cff" opacity="0.75" />
        {/* สนับไหล่ */}
        <path d="M8 60c0-8 5-12 10-13l3 13z" fill="#3a4468" />
        <path d="M56 60c0-8-5-12-10-13l-3 13z" fill="#3a4468" />

        {/* ใบหน้า */}
        <circle cx="32" cy="30" r="12" fill="#e7c9a8" />
        {/* หมวกเกราะ */}
        <path d="M19 28a13 13 0 0 1 26 0v-3a13 13 0 0 0-26 0z" fill="#39406b" />
        <path d="M19 25a13 13 0 0 1 26 0l2-6H17z" fill="#2b3155" />
        {/* บังหน้า */}
        <rect x="20" y="26" width="24" height="4" rx="1.5" fill="#1b1f38" />
        <circle cx="27" cy="28" r="1.6" fill="#7ce8ff" />
        <circle cx="37" cy="28" r="1.6" fill="#7ce8ff" />
        {/* ยอดหมวก */}
        <path d="M30 15h4l-1 -8h-2z" fill="#f0c85a" />
      </g>
      {/* ไม่ต้องมีวงขอบในตัวเอง เพราะ AvatarFrame วาดกรอบให้แล้ว */}
    </svg>
  )
}
