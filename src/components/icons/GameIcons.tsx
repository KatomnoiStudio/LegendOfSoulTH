/**
 * ชุดไอคอน SVG ที่วาดเองทั้งหมด (ไม่มีทรัพย์สินจากเกม/แฟรนไชส์ใด)
 * ทุกตัวใช้ viewBox 24x24 และรับสีจาก currentColor
 */
import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

/** ดาบไขว้ — Battle */
export function BattleIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5.5 3.5 15 13l-2.5 2.5L3 6V3.5z" />
      <path d="M18.5 3.5 9 13l2.5 2.5L21 6V3.5z" />
      <path d="m4.5 20.5 4-4M19.5 20.5l-4-4" />
    </Svg>
  )
}

/** กลุ่มนักรบ — Heroes */
export function HeroesIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.4 2.7-5.6 6-5.6s6 2.2 6 5.6" />
      <path d="M16 5.6a3.2 3.2 0 0 1 0 6" />
      <path d="M17.6 14.9c2 .8 3.4 2.6 3.4 5.1" />
    </Svg>
  )
}

/** ทั่งตีเหล็ก — Barracks */
export function BarracksIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 9h5.5l3 3H18a3 3 0 0 0 3-3v-.5" />
      <path d="M3 9v3h5.5" />
      <path d="M9.5 12 8 17h8l-1.5-5" />
      <path d="M5.5 20.5h13" />
      <path d="M8 17h8l1.5 3.5h-11z" />
    </Svg>
  )
}

/** รูนอัญเชิญ — Summon */
export function SummonIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m12 3 2.2 4.9 5.3.6-4 3.6 1.1 5.2L12 14.7 7.4 17.3l1.1-5.2-4-3.6 5.3-.6z" />
      <path d="M12 19.5v1.8M6 18l-1.2 1.2M18 18l1.2 1.2" />
    </Svg>
  )
}

/** ธงกิลด์ — Guild */
export function GuildIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 21V4" />
      <path d="M6 5h11l-2.2 3.3L17 11.6H6z" fill="currentColor" fillOpacity="0.3" />
      <path d="M6 15h8" />
    </Svg>
  )
}

/** หมัดสองฝ่ายปะทะกัน — เมนูต่อสู้ */
export function ClashFistsIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.35} {...props}>
      <path d="m3.2 14.8 2.2-5.6 2.2-.8 2.5 2.3-1.2 2.1 2.2 1.9-3.8 4.1z" fill="currentColor" fillOpacity="0.32" />
      <path d="m20.8 14.8-2.2-5.6-2.2-.8-2.5 2.3 1.2 2.1-2.2 1.9 3.8 4.1z" fill="currentColor" fillOpacity="0.32" />
      <path d="m8.8 12.8 2.2-2.1M15.2 12.8 13 10.7M10.2 15.4h3.6" />
      <path d="M12 3v3M5.6 5.2l2.1 2M18.4 5.2l-2.1 2" />
    </Svg>
  )
}

/** ใบหน้าหงอคงแบบตราสัญลักษณ์ — เมนูตัวละคร */
export function WukongHeadIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.25} {...props}>
      <path d="M6.2 8.1 4.5 5.2l4 .8L12 2.8 15.5 6l4-.8-1.7 2.9" fill="currentColor" fillOpacity="0.28" />
      <path d="M6.1 10.2C6.1 6.9 8.7 5 12 5s5.9 1.9 5.9 5.2v4.3c0 3.6-2.6 6.2-5.9 6.2s-5.9-2.6-5.9-6.2z" fill="currentColor" fillOpacity="0.18" />
      <path d="M7.2 12.1c1.8-2 3.3-2.2 4.8-.7 1.5-1.5 3-1.3 4.8.7M8.5 14.1l2 1M15.5 14.1l-2 1M10.2 18h3.6" />
      <path d="M5.9 11.2c-2-.5-2.7 2.7.2 3.2M18.1 11.2c2-.5 2.7 2.7-.2 3.2" />
    </Svg>
  )
}

/** ดัมเบล — เมนูค่ายฝึก */
export function DumbbellIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.55} {...props}>
      <path d="M7.2 10.2h9.6v3.6H7.2z" fill="currentColor" fillOpacity="0.2" />
      <path d="M3.2 8.3h2.3v7.4H3.2zM18.5 8.3h2.3v7.4h-2.3z" fill="currentColor" fillOpacity="0.34" />
      <path d="M1.7 10.1h1.5v3.8H1.7zM20.8 10.1h1.5v3.8h-1.5zM5.5 10h1.7v4H5.5zM16.8 10h1.7v4h-1.7z" />
    </Svg>
  )
}

/** หยกวงแหวนโบราณ — เมนูอัญเชิญ */
export function JadeBiIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.3} {...props}>
      <path d="M12 2.7 19.7 7v10L12 21.3 4.3 17V7z" fill="currentColor" fillOpacity="0.18" />
      <circle cx="12" cy="12" r="6.2" fill="currentColor" fillOpacity="0.2" />
      <circle cx="12" cy="12" r="2.1" />
      <path d="m12 5.8 1.5 2.7-1.5 1.4-1.5-1.4zM18.2 12l-2.7 1.5-1.4-1.5 1.4-1.5zM12 18.2l-1.5-2.7 1.5-1.4 1.5 1.4zM5.8 12l2.7-1.5 1.4 1.5-1.4 1.5z" />
    </Svg>
  )
}

/** ตราพันธมิตรมังกรคู่ — เมนูกิลด์ */
export function GuildCrestIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.25} {...props}>
      <path d="M12 2.6 20 6v5.7c0 4.8-3.1 7.7-8 9.7-4.9-2-8-4.9-8-9.7V6z" fill="currentColor" fillOpacity="0.18" />
      <path d="M8.1 8.2c-2 .7-2.3 3.2-.8 4.5 1.2 1 2.7.2 3.5-1.1M15.9 8.2c2 .7 2.3 3.2.8 4.5-1.2 1-2.7.2-3.5-1.1" />
      <path d="M12 7.1v9.8M8.7 15.2 12 17.5l3.3-2.3M9.3 6.2 12 8l2.7-1.8" />
    </Svg>
  )
}

/** ซองจดหมาย — Mail */
export function MailIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="m3.6 6.8 8.4 6 8.4-6" />
    </Svg>
  )
}

/** ม้วนภารกิจ — Mission */
export function MissionIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 3.5h10a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2z" />
      <path d="M8.5 9h7M8.5 12.5h7M8.5 16h4" />
    </Svg>
  )
}

/** เฟือง — Settings */
export function SettingsIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.3} strokeLinejoin="round" {...props}>
      {/* ฟันเฟือง 8 ซี่ วาดเป็นรูปเดียวต่อเนื่อง (ส่วนโค้งยอดฟันสลับโคนฟัน) */}
      <path
        fill="currentColor"
        fillOpacity="0.18"
        d="M10.00 2.61 A9.6 9.6 0 0 1 14.00 2.61 L14.04 5.10 A7.2 7.2 0 0 1 15.44 5.67 L17.23 3.95 A9.6 9.6 0 0 1 20.05 6.77 L18.33 8.56 A7.2 7.2 0 0 1 18.90 9.96 L21.39 10.00 A9.6 9.6 0 0 1 21.39 14.00 L18.90 14.04 A7.2 7.2 0 0 1 18.33 15.44 L20.05 17.23 A9.6 9.6 0 0 1 17.23 20.05 L15.44 18.33 A7.2 7.2 0 0 1 14.04 18.90 L14.00 21.39 A9.6 9.6 0 0 1 10.00 21.39 L9.96 18.90 A7.2 7.2 0 0 1 8.56 18.33 L6.77 20.05 A9.6 9.6 0 0 1 3.95 17.23 L5.67 15.44 A7.2 7.2 0 0 1 5.10 14.04 L2.61 14.00 A9.6 9.6 0 0 1 2.61 10.00 L5.10 9.96 A7.2 7.2 0 0 1 5.67 8.56 L3.95 6.77 A9.6 9.6 0 0 1 6.77 3.95 L8.56 5.67 A7.2 7.2 0 0 1 9.96 5.10 Z"
      />
      <circle cx="12" cy="12" r="3.4" strokeWidth={1.6} />
    </Svg>
  )
}

/** เหรียญทอง — Gold */
export function GoldIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.2" fill="currentColor" fillOpacity="0.25" />
      <circle cx="12" cy="12" r="4.6" />
      <path d="M12 9.6v4.8" />
    </Svg>
  )
}

/** อัญมณี — Gem */
export function GemIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M7 4h10l4 5.5-9 10.5-9-10.5z" fill="currentColor" fillOpacity="0.25" />
      <path d="M3 9.5h18M9 4l-2 5.5 5 10.5M15 4l2 5.5-5 10.5" />
    </Svg>
  )
}

/** รูปภาพ — ปุ่มเปลี่ยนรูปโปรไฟล์ */
export function PhotoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.8" />
      <path d="m3.5 16.5 4.6-4.2 3.4 3 3.2-2.8 5.8 5" />
    </Svg>
  )
}

/** วงกรอบประดับ — ปุ่มเปลี่ยนกรอบโปรไฟล์ */
export function FrameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="m12 1.6 1.9 2-1.9 2-1.9-2z" fill="currentColor" fillOpacity="0.4" />
      <path d="m12 18.4 1.9 2-1.9 2-1.9-2z" fill="currentColor" fillOpacity="0.4" />
      <path d="m1.6 12 2-1.9 2 1.9-2 1.9z" fill="currentColor" fillOpacity="0.4" />
      <path d="m18.4 12 2-1.9 2 1.9-2 1.9z" fill="currentColor" fillOpacity="0.4" />
    </Svg>
  )
}

/** ดินสอ — ปุ่มเปลี่ยนชื่อ */
export function RenameIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16.4 15.6 4.8a2 2 0 0 1 2.8 0l.8.8a2 2 0 0 1 0 2.8L7.6 20H4z" />
      <path d="M13.8 6.6 17.4 10.2" />
    </Svg>
  )
}

/** รอยเท้าสัตว์ — สถานะว่างของสัตว์เลี้ยง */
export function PawIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <ellipse cx="12" cy="16" rx="4.6" ry="4" />
      <ellipse cx="6.3" cy="10.5" rx="2.1" ry="2.6" />
      <ellipse cx="17.7" cy="10.5" rx="2.1" ry="2.6" />
      <ellipse cx="9.6" cy="6.3" rx="1.9" ry="2.4" />
      <ellipse cx="14.4" cy="6.3" rx="1.9" ry="2.4" />
    </Svg>
  )
}

/** นาฬิกาย้อนเวลา — สถานะว่างของประวัติการต่อสู้ */
export function HistoryIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3.6 12a8.4 8.4 0 1 0 2.6-6.1" />
      <path d="M3.2 4.4v4.2h4.2" />
      <path d="M12 7.6V12l3 1.8" />
    </Svg>
  )
}

/** เครื่องหมายบวก — ปุ่มเติมทรัพยากร */
export function PlusIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  )
}

/** เครื่องหมายลบ — ปุ่มลดค่า */
export function MinusIcon(props: IconProps) {
  return (
    <Svg strokeWidth={2.4} {...props}>
      <path d="M5.5 12h13" />
    </Svg>
  )
}

/** ลำโพงมีคลื่นเสียง — ระดับเสียง */
export function VolumeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5h3l4.5-3.8v12.6L7 14.5H4z" />
      <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a7.6 7.6 0 0 1 0 10.8" />
    </Svg>
  )
}

/** ลำโพงถูกปิด — ปิดเสียง */
export function VolumeMuteIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 9.5h3l4.5-3.8v12.6L7 14.5H4z" />
      <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
    </Svg>
  )
}

/** พระจันทร์เสี้ยวกับดาว — เดินชมจันทร์ */
export function MoonWalkIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M20 14.6A8.2 8.2 0 0 1 9.4 4a8.6 8.6 0 1 0 10.6 10.6z"
        fill="currentColor"
        fillOpacity="0.25"
      />
      <path d="m17.4 3.2.85 1.9 1.9.85-1.9.85-.85 1.9-.85-1.9-1.9-.85 1.9-.85z" fill="currentColor" fillOpacity="0.7" />
    </Svg>
  )
}

/** ผังสี่ช่องพร้อมวงแหวน — เมนูจัดทีม */
export function TeamFormationIcon(props: IconProps) {
  return (
    <Svg strokeWidth={1.35} {...props}>
      <path d="M2.6 15.4 12 19.9l9.4-4.5" strokeOpacity="0.55" />
      <ellipse cx="12" cy="11.6" rx="9.4" ry="4.5" fill="currentColor" fillOpacity="0.14" />
      {/* สี่ช่องเรียงเป็นแนวโค้งเหมือนวงแหวนในลานประลอง */}
      <ellipse cx="4.9" cy="11.9" rx="1.9" ry="1" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="9.6" cy="13.2" rx="1.9" ry="1" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="14.4" cy="13.2" rx="1.9" ry="1" fill="currentColor" fillOpacity="0.5" />
      <ellipse cx="19.1" cy="11.9" rx="1.9" ry="1" fill="currentColor" fillOpacity="0.5" />
      {/* หมุดบอกตำแหน่งที่มีคนยืน */}
      <path d="M9.6 9.4v2.6M14.4 9.4v2.6" strokeWidth={1.7} />
      <path d="m9.6 4.6 1.5 3.1-1.5 1.5-1.5-1.5zM14.4 4.6l1.5 3.1-1.5 1.5-1.5-1.5z" fill="currentColor" fillOpacity="0.6" />
    </Svg>
  )
}

/** คนพร้อมเครื่องหมายบวก — เพิ่มเพื่อน */
export function AddFriendIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="9.5" cy="8.2" r="3.6" />
      <path d="M3.4 19.4a6.1 6.1 0 0 1 12.2 0" />
      <path d="M18.4 8.4v5.2M21 11h-5.2" />
    </Svg>
  )
}

/** กระดาษสองแผ่นซ้อน — คัดลอกข้อความ */
export function CopyIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.8A1.8 1.8 0 0 0 13.2 4H5.8A1.8 1.8 0 0 0 4 5.8v7.4A1.8 1.8 0 0 0 5.8 15" />
    </Svg>
  )
}

/** ตัว i ในวงกลม — ข้อมูลเกม */
export function InfoIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <circle cx="12" cy="7.9" r="0.9" fill="currentColor" stroke="none" />
    </Svg>
  )
}

/** ตั๋ว/คูปอง — ช่องกรอกโค้ด */
export function CouponIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v2a2.5 2.5 0 0 0 0 5v2a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5v-2a2.5 2.5 0 0 0 0-5z" />
      <path d="M13 6v1.8M13 11.1v1.8M13 16.2V18" />
    </Svg>
  )
}
