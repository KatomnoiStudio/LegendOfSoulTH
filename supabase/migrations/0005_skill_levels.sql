-- เพิ่มคอลัมน์ skill_levels ให้ owned_characters — Skill Level layer ของ §4.2
-- (work contract #14, docs/agent-blueprint/14-progression-system.md)
--
-- ยังไม่มีทางให้ client เขียนกลับ (owned_characters มีแค่ "own characters" select policy
-- เหมือน level/exp/exp_to_next เดิม — ช่องว่างเดียวกัน ไม่ใช่ของใหม่ที่ migration นี้สร้าง
-- ดู accountRepository.supabase.ts savePlayer ที่ไม่แตะ owned_characters เลย) migration นี้
-- แค่ให้อ่านออกด้วย default shape ตรงกับ createDefaultSkillLevels()
-- (src/game/realtimeBattle/SkillProgressionSystem.ts) — ต้องแก้คู่กันถ้าค่าเริ่มต้นเปลี่ยน

alter table public.owned_characters
  add column skill_levels jsonb not null default '{
    "skill1": {"level": 1, "exp": 0, "expToNext": 200},
    "skill2": {"level": 1, "exp": 0, "expToNext": 200},
    "skill3": {"level": 1, "exp": 0, "expToNext": 200},
    "ultimate": {"level": 1, "exp": 0, "expToNext": 200}
  }'::jsonb;
