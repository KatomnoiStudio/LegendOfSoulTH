<!--
  LICENCE NOTICE — THIS FILE ONLY

  Copyright (c) 2026 HetCreep. All rights reserved.

  This file is licensed under Creative Commons Attribution-NonCommercial-NoDerivatives 4.0
  International (CC BY-NC-ND 4.0): https://creativecommons.org/licenses/by-nc-nd/4.0/
  It is NOT covered by the MIT licence that governs the rest of this repository. Same terms as
  the carve-out for docs/SPRITE-DESIGN-LOCK.md — see the repository LICENSE file for the full text.

  Commercial use, adaptation, or redistribution as part of a paid product or service requires a
  separate written licence from the copyright holder.

  STANDING GRANT — Katomnoi Studio (github.com/KatomnoiStudio)
  Katomnoi Studio is granted a perpetual, irrevocable, royalty-free licence to use, reproduce,
  modify, and create derivative works from this file, and to apply it in the Studio's own products
  and services, including commercially. This grant does NOT include the right to sublicense the
  file, or to distribute it or substantial portions of it to third parties. The Studio may ship
  what it BUILDS from this document (the migration, the config, the game itself) freely; the
  document itself stays the copyright holder's to license.

  ⚠️ DRAFT — NOT LEGAL ADVICE. Written by an AI assistant at the owner's direction and NOT reviewed
  by a lawyer. Things a lawyer must settle before this is relied on:
    1. The named holder must be a real legal person or registered entity. "LegendofSoulTH" in the
       repository LICENSE is a project name, which is weak for enforcement.
    2. This file is unusually fact-heavy — real drop rates, pity thresholds, and prices from six
       live games, wage figures, and formulas derived mechanically from them. Facts and formulas
       are not copyrightable in most jurisdictions; what this notice can protect is the selection,
       arrangement, and expression of the derivation, not the underlying numbers a reader could
       independently derive from the same public sources.
    3. The core price derivation (§11.8, `c`) is anchored to Thailand's own minimum and average
       wage data specifically — burden measured against a Thai day's wage, not a converted foreign
       price. This document was produced and ratified inside Thailand, for a Thai-market game, at
       Thai labour cost; that anchoring is why it is licensed as a standalone Thai-market economic
       artefact rather than published as a general engineering standard.
-->

# Design Lock — Gacha Rate Domain

> **Licence — this file only.** © 2026 HetCreep. Katomnoi Studio holds a standing licence to use
> it, not a share of the copyright — see the notice above.
> Released under [CC BY-NC-ND 4.0](https://creativecommons.org/licenses/by-nc-nd/4.0/), **not**
> under the MIT licence covering the rest of this repository. Commercial use or adaptation
> requires a separate written licence from the copyright holder.

**สถานะ**: ล็อกครบ 12/12 ข้อ (2026-08-13) — ผ่าน adversarial review 3 lens (verdict: BREAKS ทั้ง 3) ทุก fatal/serious พับเข้ากฎแล้วหรือรับเป็น known limit
**ขอบเขต**: ทุกตัวเลขในโดเมน gacha rate — band rate, per-character rate, pity, cost, shard, disclosure
**ผู้อ่านเป้าหมาย**: HetCreep และ agent/dev ทุกคนที่จะแตะเลข gacha หลังจากนี้ โดยไม่ต้องมี context ของ session นี้

**Open state — ล็อกค่าแล้วแต่ยัง implement ไม่ครบ, banner ยัง publish ไม่ได้**: schema DDL (§11.16) ยังไม่ apply เป็น migration จริง · `startStar[rarity]=2` mechanic ยังไม่มีในโค้ด · ชะตากรรม `★6` ใน `STAR_MULTIPLIERS`/`MAX_STAR_TIER` ยังไม่ตัดสิน · banner ปิดอยู่จนกว่า `monkey-king` จะผ่าน sprite conformance (I6, ตกอยู่ 51×) และมีตัวละคร `common` อย่างน้อยหนึ่งตัว (I3) — ดู `docs/agent-blueprint/23-gacha-system.md` §"Config in" ซึ่งยังอ้างเลขเก่าที่เอกสารนี้แทนที่แล้ว (ยังไม่ sync)

---

## 1. กฎ

> **ทุกตัวเลขใน gacha คือ BASE ที่เขียนด้วยมือครั้งเดียวต่อ banner type และ SCALE ที่เป็นเลขคณิตล้วนบน pool membership ระหว่างสองอย่างนี้ไม่มีอะไรถูกพิมพ์ด้วยมือ**
>
> BASE คือ: ลำดับความหายาก `ord[r]` (หนึ่งชุดต่อเกม), ตาราง band rate `B[r]` ที่รวมได้ 1 พอดีและเป็นฟังก์ชันของ **banner TYPE เท่านั้น**, featured share `u`, weight ต่อ entry `w[i] ≥ 1` (default 1), multi size `K`, discount `d`, cost `c`, pity threshold `P[r]`, ช่วง reach ที่ยอมรับได้ `tau_min`/`tau_max`, shards ต่อ duplicate `S[r]`, ladder `L[r][k]`, และ `rho` = ทศนิยมของ column ที่เก็บ rate
>
> ทุกอย่างที่เหลือถูก **DERIVE**: rate ของตัวละครหนึ่งตัว = band rate × within-band share โดย share = `u` แบ่งในกลุ่ม featured + `(1−u)` แบ่งตาม weight ข้าม **สมาชิกทุกตัวในแบนด์นั้น รวม featured ด้วย** — นิยามถูกต้องที่ N = 1, 2, 7, 50 โดยไม่มี special case และผลรวมของแบนด์ไม่ขยับเมื่อมีตัวละครเข้าหรือออก
>
> **ผลรวม rate ของ pool เท่ากับ 1 พอดี ไม่ใช่ "ภายใน tolerance"** — สมาชิกตัวสุดท้ายของแต่ละแบนด์ดูดเศษปัดเข้าตัวเอง
>
> เพราะ `B` เป็นฟังก์ชันของ banner type อย่างเดียว **ความคืบหน้าของ asset pipeline เปลี่ยนได้แค่ว่าใครอยู่ใน pool ไม่เคยเปลี่ยน rate** — banner จะ **publishable** ก็ต่อเมื่อ invariant ทุกข้อผ่านและสมาชิก pool ทุกตัวผ่าน asset gate ตัวละครที่ยังไม่พร้อมทำให้ banner ส่งไม่ได้ ไม่ใช่ทำให้เศรษฐกิจขยับ
>
> Pity คือ counter ที่ไม่แตะ sampler: เป้าหมายถูก derive จาก `ord[r]` + pool (ไม่เคยประกาศ), ยิงที่จำนวน pull เต็มจำนวนที่บอกผู้เล่น, และการ force draw สุ่ม share ใหม่ภายในแบนด์นั้น
>
> **ตัวเลขที่ผู้เล่นเห็น = แถวเดียวกับที่ server สุ่ม** ทั้ง base %, delivered % (รวมผลของ pity), per-character %, pity denominator, pool list และราคา ไม่มีเลขไหนถูกพิมพ์ซ้ำใน UI, docs, tests หรือ client config และ **invariant ทุกข้อคือ assertion ที่ทำให้ build พัง ไม่ใช่ให้ผู้เล่นเจอ**

**สิ่งที่กฎนี้ไม่ครอบ** (ระบุไว้ตรงนี้เพื่อไม่ให้อ่านเกิน): ระดับของ `B`, `P`, `c`, `d`, `S`, `L`, `u`, `tau` — เป็นการตัดสินใจของ owner ทั้งหมด (§8) · terminal state ของผู้เล่นที่เก็บครบ (§8.12) · ค่าคงที่ของ statistical test (§8.13)

---

## 2. สูตร

```
-- ============ BASE (เขียนครั้งเดียว ไม่เคยต่อตัวละคร ไม่เคยต่อเคส) ============
ord[r]        rarity ordinal, หนึ่งชุดต่อเกม  (rare < epic < legendary)
B[type][r]    band rate ต่อ banner TYPE
u             featured share ของแบนด์ตัวเอง, 0 <= u < 1
w[i]          weight ต่อ entry, integer >= 1, default 1
featured(i)   boolean
K, d, c       multi size, discount, single cost
P[r]          pity threshold (pull เต็มจำนวน); infinity = แบนด์นั้นไม่มี pity
tau_min,tau_max  ช่วง reach fraction ที่ยอมรับได้
S[r]          shards ต่อ duplicate ของ rarity r
L[r][k]       shards ที่ต้องใช้ถึงดาว k  (L[r][k] = L[k] ทุก r คือรูปที่ ship อยู่วันนี้)
rho           = scale ของ rate column   (numeric(8,7) => rho = 7)

-- ============ SCALE (derive; ไม่เคยพิมพ์) ============
pool_r  = { i : rarity(i) = r }              N_r = |pool_r|
feat_r  = { i in pool_r : featured(i) }      F_r = |feat_r|
W_r     = SUM(w[i] for i in pool_r)

share(i) = u * (featured(i) ? 1/F_r : 0) + (1 - u) * w[i] / W_r     -- ใช้ u ตรง ๆ ไม่มี fallback
                                                                     -- I10 บังคับว่า u > 0 => F_r >= 1

ideal(i) = B[rarity(i)] * share(i)

-- residual absorption: absorber = สมาชิกที่ character_id มากสุดในแบนด์
rate(i)        = round(ideal(i), rho)                          ถ้า i ไม่ใช่ absorber
rate(absorber) = B[r] - SUM(rate(j) for j in pool_r, j != absorber)
=> SUM(rate(i) for i in pool_r) = B[r] พอดี ทุก N_r >= 1
=> SUM(rate(i) for i in pool)   = SUM(B[r]) = 1 พอดี

cost(n) = c                        ถ้า n == 1
        = ceil(K * c * (1 - d))    ถ้า n == K

-- ============ PITY (derive) ============
pity_rarity = r ที่ ord[r] สูงสุด ในบรรดา r ที่ B[r] > 0 และ N_r >= 1
q           = B[pity_rarity]
pity ยิงเมื่อ counter[pity_rarity] + 1 >= P[pity_rarity]      -- ต้องพลาดติดกัน P-1 ครั้ง
forced draw = สุ่ม share(i) ภายใน pool_{pity_rarity}          -- ไม่ใช่ order-by-id-limit-1
counter reset = 0 เมื่อได้ rarity ที่ ord >= ord[pity_rarity], ไม่งั้น +1

reach       = (1 - q)^(P - 1)                    -- สัดส่วน cycle ที่ถึงเพดานจริง
E[cycle]    = (1 - (1 - q)^P) / q                -- pull เฉลี่ยต่อ 1 pity-band hit

-- ============ DELIVERED RATE (สิ่งที่ผู้เล่นได้จริง ไม่ใช่ base) ============
D[pity_rarity] = 1 / E[cycle]
D[r]           = B[r] * (1 - D[pity_rarity]) / (1 - q)          สำหรับ r != pity_rarity
D_char(i)      = D[rarity(i)] * share(i)
=> SUM(D[r]) = 1

-- ============ SHARD / LADDER (derive) ============
shards_granted(i) = is_new(i) ? 0 : S[rarity(i)]    -- นิพจน์เดียว ทั้ง write และ client payload
star_k_cost       = L[rarity(i)][k]
pulls_to_terminal(i) = SUM(L[rarity(i)][k] for k) / (S[rarity(i)] * D_char(i))

-- ============ RENDER (ทั้งหมด derive จากแถวเดียวกับที่ sampler อ่าน) ============
display_band_pct(r)       = round(100 * B[r], rho)
display_delivered_pct(r)  = round(100 * D[r], rho)
display_char_pct(i)       = round(100 * rate(i), rho)
display_char_delivered(i) = round(100 * D_char(i), rho)
display_reach_pct         = round(100 * reach, rho)
display_pity              = "{counter จาก server ณ ตอนเปิด modal} / P[pity_rarity]"
rounding note             = "ปัดที่ทศนิยมตำแหน่งที่ rho; ผลรวมถูกบังคับให้เท่ากับ 100% พอดี"
```

### INVARIANTS — assertion ที่ทำให้ build พัง แต่ละข้อฆ่า finding ที่ระบุชื่อ

| #       | Invariant                                                                                                                                   | ฆ่า finding                                                                                  |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **I1**  | `SUM(B[r]) == 1` พอดีที่ rho และ `0 < B[top] < 1`                                                                                           | เดิม                                                                                         |
| **I2**  | `SUM(rate(i) for i in pool) == 1` **พอดี** (residual absorption) ไม่ใช่ tolerance                                                           | **FATAL** roster-7 tolerance ไม่ scale ตาม N (roster 20 ตาย 74.3%, roster 50 ตาย 89.4%)      |
| **I3**  | `B[r] > 0 => N_r >= 1`                                                                                                                      | forced pity เลือก NULL แล้ว hard-error ถาวร                                                  |
| **I3b** | `B[r] = 0 => N_r = 0`                                                                                                                       | สมาชิก pool ที่ 0% ปรากฏใน list แต่สุ่มไม่ได้ (เคส `common`)                                 |
| **I4**  | `0 < B[pity_rarity] < 1`                                                                                                                    | pool ที่ทุกตัวเป็น pity_rarity → counter ค้างที่ 0                                           |
| **I5**  | `display_band_pct(r) == round(100*B[r], rho)` — จริงโดยโครงสร้างหลัง I2                                                                     | **SERIOUS** I5 เดิมพังที่ 38/50 band size                                                    |
| **I5b** | `SUM(D[r]) == 1` และหน้าจอต้องแสดง `display_delivered_pct(r)`                                                                               | **FATAL** P=1 ส่ง legendary 100% ขณะประกาศ 5%; และ +27.33% relative ที่ค่าที่ ship อยู่      |
| **I5c** | ทุก `i`: % ต่อตัวที่แสดง == `round(100*rate(i), rho)`                                                                                       | **SERIOUS** featured_shown ไม่มี assertion; roster โต 20× เงียบ ๆ                            |
| **I6**  | `publishable(banner) <=> I1..I15 ทุกข้อ AND ทุก i ผ่าน asset gate`                                                                          | **FATAL** I6 เดิมไม่รวม I5 → banner ที่ disclosure ผิดยัง publishable                        |
| **I7**  | `w[i] >= 1` (integer) ทุก i → `W_r >= N_r >= 1`                                                                                             | **FATAL** `w = 0` → division_by_zero ทุก pull ทุกผู้เล่น; `w < 0` → rate ติดลบ               |
| **I8**  | แถวที่ role `anon` มองเห็น == แถวที่ SECURITY DEFINER มองเห็น (id เดียวกัน rate เดียวกัน)                                                   | **FATAL** test รันเป็น superuser → พิสูจน์ odds ของ row set ที่ผู้เล่นอ่านไม่ได้             |
| **I9**  | `tau_min <= (1-q)^(P-1) <= tau_max`                                                                                                         | **FATAL** I4 เป็น non-degeneracy ไม่ใช่ liveness — B[top]=0.30 → pity ยิงทุก 103,520 pulls   |
| **I10** | `u > 0 => F_r >= 1` ในแบนด์ที่ถือ featured slot (ไม่มี fallback `u_r = 0`)                                                                  | **SERIOUS** ถอด featured ออกเพราะ asset → rate ตัวที่เหลือกระโดด 8× และ banner ยัง published |
| **I11** | `rate(i) >= 10^-rho` ทุก i (คง `check (drop_rate > 0 and drop_rate <= 1)` ไว้)                                                              | zero-rate row ผูก cumulative กับตัวก่อนหน้า → tie ใน `limit 1`                               |
| **I12** | monotone rarity: `max(rate ในแบนด์ที่หายากกว่า) < min(rate ในแบนด์ที่พบง่ายกว่า)`                                                           | **SERIOUS** L1/E10/R39 → legendary กลายเป็นตัวที่พบบ่อยที่สุดใน pool                         |
| **I13** | monotone grind: `pulls_to_terminal(หายากกว่า) >= pulls_to_terminal(พบง่ายกว่า)`                                                             | **SERIOUS** S[r] rarity-keyed × L rarity-blind → ตัวหายากที่สุดจบเกมก่อน, เกมสั้นลง 5.4×     |
| **I14** | projection ของ `K`, `L`, `ord`, `rho` เท่ากับ base (อ่าน `pg_get_constraintdef` + ค่าคงที่ TS + `information_schema.columns.numeric_scale`) | **SERIOUS** Postgres CHECK ใช้ subquery ไม่ได้ → literal 3 ชุดของ K และ 2 ชุดของ L รอดกฎ     |
| **I15** | ไม่มีแถว `gacha_pity` ของคู่ (banner, rarity) ที่ไม่ใช่ pity_rarity ปัจจุบันของ banner นั้น                                                 | **SERIOUS** เปลี่ยน B แล้ว counter เก่าถูกตีความใหม่เงียบ ๆ                                  |

---

## 3. base ที่นิยามครั้งเดียว

| term                 | ความหมาย                                                | ข้อจำกัดจากกฎ (LOCKED)                                                                                       | ค่าปัจจุบัน                                                                                                                                  |
| -------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ord[r]`             | ลำดับความหายาก หนึ่งชุด**ต่อเกม** ไม่ใช่ต่อ banner      | total order บนชื่อ rarity ทุกตัวที่ schema ยอมรับ                                                            | **ยังไม่มีในโปรเจกต์** — grep `RARITY_ORDER`/`rarityRank`/`RARITY_TIER` = 0 hits ค่าที่ต้องเขียน: `common 0 < rare 1 < epic 2 < legendary 3` |
| `B[type][r]`         | band rate ต่อ banner type                               | `SUM = 1` พอดีที่ rho, `0 < B[top] < 1`, ไม่อ่าน pool size / จำนวนตัวละคร / asset readiness                  | `legendary 0.05 / epic 0.25 / rare 0.70` — **ระดับเป็น OPEN (§8.1)**                                                                         |
| `u`                  | featured share ของแบนด์ตัวเอง หนึ่งค่าต่อ banner        | `0 <= u < 1`; `u > 0` บังคับ `F_r >= 1` (I10)                                                                | `0` (ยังไม่มี featured)                                                                                                                      |
| `w[i]`               | weight ต่อ entry — ปุ่มเดียวที่กฎอนุญาตให้ตั้งต่อ entry | **integer >= 1** ห้าม 0 ห้ามติดลบ (I7); การถอนตัวละครออกทำโดยลบแถวหรือให้ตกที่ asset gate **ไม่ใช่ `w = 0`** | `1` ทั้งหมด                                                                                                                                  |
| `featured(i)`        | flag membership ไม่ใช่ rate                             | boolean                                                                                                      | ยังไม่มี column                                                                                                                              |
| `K`                  | ขนาด multi-pull                                         | หนึ่งนิยาม; schema CHECK + RPC guard + TS union อ้างถึงมันผ่าน I14                                           | `10`                                                                                                                                         |
| `d`                  | discount ของ multi                                      | หนึ่ง scalar ต่อ banner, default 0                                                                           | **ไม่ได้ประกาศ** — `900/1000` แปลว่ามี `d = 0.10` ซ่อนอยู่ **OPEN (§8.3)**                                                                   |
| `c`                  | cost_single                                             | หนึ่งค่าต่อ banner ในสกุลที่ banner ประกาศ                                                                   | `100 gem` — **ระดับเป็น OPEN (§8.4)**                                                                                                        |
| `P[r]`               | pity threshold ต่อแบนด์ หน่วยเป็น pull เต็ม             | `infinity` = แบนด์นั้นไม่มี counter; ต้องผ่าน I9                                                             | `P[legendary] = 30` — **ระดับเป็น OPEN (§8.2)**                                                                                              |
| `tau_min`, `tau_max` | ช่วง reach fraction ที่ยอมรับได้                        | `tau_min <= (1-q)^(P-1) <= tau_max`                                                                          | **ยังไม่มี — OPEN (§8.2)** ค่าที่วัดได้วันนี้คือ 22.594%                                                                                     |
| `S[r]`               | shards ต่อ duplicate ของ rarity r                       | หนึ่งแถวต่อ rarity, source-agnostic (wish/shop/grant/compensation ใช้อันเดียวกัน), นิพจน์เดียว               | `1` ทุก rarity — **ระดับเป็น OPEN (§8.5)**                                                                                                   |
| `L[r][k]`            | shards ที่ต้องใช้ถึงดาว k                               | หนึ่ง array หนึ่งบ้าน; รูป rarity-blind (`L[r][k] = L[k]`) ยังถูกกฎ **ก็ต่อเมื่อ** ผ่าน I13                  | `1/2/4/8/12` (สะสม 27) — **รูปเป็น OPEN (§8.6)**                                                                                             |
| `rho`                | ทศนิยมสำหรับทั้งการแสดงผลและ tolerance                  | **เขียนเป็น base = 7 และ `drop_rate` ต้องคง type `numeric(8,7)`** — I14 ยืนยันสองฝั่งตรงกัน                  | `7`                                                                                                                                          |

**การตัดสินเรื่องรูปทางกายภาพ (แก้จาก FATAL "rho อ่านจาก column ที่กฎลบเอง")**: `drop_rate` **ไม่** ถูกลดชั้นเป็น VIEW ที่ไม่มี type มันยังเป็น stored column `numeric(8,7)` พร้อม `check (drop_rate > 0 and drop_rate <= 1)` เดิม แต่มีผู้เขียนคนเดียวคือฟังก์ชัน derive ที่คำนวณจากสูตร §2 และ test ยืนยันว่า stored == derived สำหรับทุก banner (idempotent) เหตุผล: VIEW แบบ unconstrained numeric ทำให้ `information_schema.columns.numeric_scale` เป็น NULL — `rho` ที่กฎบอกว่า "อ่านจาก schema" จะอ่านไม่ได้ และการลบ CHECK เปิดรูให้ rate = 0 และ rate ติดลบพร้อมกัน

---

## 4. scale และมันเป็นฟังก์ชันของอะไร

| scale term                      | เป็นฟังก์ชันของ                                                    | ไม่เป็นฟังก์ชันของ                       |
| ------------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `N_r`                           | pool membership                                                    | roster ทั้งหมด, วันวางจำหน่าย            |
| `F_r`                           | pool membership + flag `featured`                                  | อะไรที่ผู้เล่นทำ                         |
| `W_r`                           | pool membership + `w[i]`                                           | rarity, ราคา                             |
| `share(i)`                      | `u`, `F_r`, `w[i]`, `W_r`                                          | `B`, pity, spend, จำนวนที่ผู้เล่นถืออยู่ |
| `rate(i)`                       | `B[rarity(i)]`, `share(i)`, และตำแหน่ง absorber                    | อะไรที่พิมพ์บน client                    |
| `absorber(r)`                   | `character_id` มากสุดในแบนด์ — deterministic, ไม่มีการเลือกด้วยมือ | —                                        |
| `cost_multi`                    | `K`, `c`, `d`                                                      | ราคาที่ตั้งอิสระ                         |
| `pity_rarity`                   | `ord[r]` + `B[r] > 0` + `N_r >= 1`                                 | ค่าที่ประกาศไว้ (ค่าประกาศหายไป)         |
| `reach`                         | `q`, `P`                                                           | roster size                              |
| `E[cycle]`, `D[r]`, `D_char(i)` | `q`, `P`, `B`, `share`                                             | —                                        |
| `pulls_to_terminal(i)`          | `L`, `S`, `D_char(i)`                                              | —                                        |
| `publishable(banner)`           | I1..I15 + asset gate ของสมาชิกทุกตัว                               | ใครจำได้ว่าต้องกดปิด                     |
| `display_*` ทุกตัว              | แถวสด ๆ ที่ sampler อ่าน                                           | ข้อความ, doc, client config              |

**ข้อเดียวที่กฎยอมรับว่าเป็นการเขียนด้วยมือ**: `ord[r]` เป็น total order 4 แถวที่ต้องเขียนครั้งเดียวต่อเกม lens "Pity liveness" พิสูจน์ว่า departure #6 ("derive pity_rarity") **ไม่ implementable ตามที่เขียนไว้เดิม** — `rarity` เป็น `text` และการเรียงตามธรรมชาติของ SQL ให้ `common < epic < legendary < rare` ทำให้ `max(rarity)` = `'rare'` แล้ว pity ยิงทุก 2.08e+15 pulls โดย invariant เขียวหมด กฎจึงยอมรับ ordinal table เป็น BASE อย่างเปิดเผย ไม่ใช่แกล้งว่ามัน derive ได้

---

## 5. เลขที่ตกลงมาจากกฎ สำหรับ roster วันนี้

ทุกตัวเลขข้างล่างคือ **output ของสูตร §2** ไม่มีค่าไหนวางด้วยมือ input คือ `B = 0.05/0.25/0.70` (ระดับเป็น OPEN), `u = 0`, `w = 1` ทุกตัว, `P[legendary] = 30`, `c = 100`, `K = 10`, `d` ยังไม่ประกาศ, `S = 1`, `L` สะสม 27, `rho = 7`

### 5.1 กรณี 1 legendary พร้อม (สถานะ pool วันนี้)

```
pool: monkey-king(L) · pig-warrior(E) · celestial-archer(E) · nezha-warden(R) · sand-sage(R)
N_leg = 1   N_epic = 2   N_rare = 2   F = 0 ทุกแบนด์   W_r = N_r
```

**share และ base rate**

```
share(monkey-king)      = 0*0 + (1-0)*1/1 = 1.0000000
rate(monkey-king)       = 0.05 * 1.0000000 = 0.0500000   -> 5.0000000 %
share(each epic)        = 1/2 = 0.5000000
rate(each epic)         = 0.25 * 0.5 = 0.1250000         -> 12.5000000 %
share(each rare)        = 1/2 = 0.5000000
rate(each rare)         = 0.70 * 0.5 = 0.3500000         -> 35.0000000 %

absorber: ไม่มีเศษ (ทุกค่าจบพอดีที่ 7dp)
SUM = 0.0500000 + 0.1250000*2 + 0.3500000*2 = 1.0000000  พอดี   [I2]
```

ค่าเหล่านี้ตรงกับ `migration:108-112` ทุกหลัก — กฎ **reproduce** seed ที่ ship อยู่ ไม่ได้ reprice มัน

**monotone rarity (I12)**

```
0.0500000 (leg) < 0.1250000 (epic) < 0.3500000 (rare)   ผ่าน
เพดาน roster ที่ B ชุดนี้บังคับ:  N_epic < 5*N_leg  และ  N_rare < 2.8*N_epic
วันนี้:  2 < 5  ผ่าน   ·   2 < 5.6  ผ่าน
```

**pity ที่ derive ได้**

```
ord สูงสุดที่ B>0 และ N>=1  ->  pity_rarity = legendary        (ไม่ประกาศ)
q = 0.05      P = 30
reach       = 0.95^(30-1) = 0.95^29 = 0.2259355  -> 22.5936 % ของ cycle ถึงเพดาน
E[cycle]    = (1 - 0.95^30)/0.05 = (1 - 0.2146388)/0.05 = 15.7072248 pulls
```

> **แก้ตัวเลขที่ผิดในข้อเสนอเดิม**: ข้อเสนอเขียน "P=30 leaves 21.5% of runs reaching the ceiling" นั่นคือ `0.95^30` เงื่อนไขที่ ship จริงคือ `v_pity + 1 >= P` (migration:223) ซึ่งต้องพลาดติดกัน **29** ครั้ง ค่าที่ถูกคือ `0.95^29 = 22.594%` closed form ที่ถูกต้องคือ `P = ceil(ln(tau)/ln(1-q)) + 1`

**delivered rate — สิ่งที่ผู้เล่นได้จริง (ต้องขึ้นจอ ตาม I5b)**

```
D[legendary] = 1 / 15.7072248 = 0.0636650   ->  6.3665 %
factor       = (1 - 0.0636650)/(1 - 0.05) = 0.9856158
D[epic]      = 0.25 * 0.9856158 = 0.2464040 ->  24.6404 %   (ต่อตัว 12.3202 %)
D[rare]      = 0.70 * 0.9856158 = 0.6899311 ->  68.9931 %   (ต่อตัว 34.4966 %)
SUM(D) = 6.3665 + 24.6404 + 68.9931 = 100.0000 %            [I5b]
```

**ช่องว่าง base ↔ delivered ของแบนด์ legendary = 5.0000% → 6.3665% = +27.33% relative** นี่คือช่องว่างที่ระบบวันนี้ปิดตาไว้ทั้งหมด: test ที่ `gachaAuthority.integration.test.ts:241-247` กรอง `isPity` ออกจาก distribution check พร้อมคอมเมนต์ยอมรับตรง ๆ ว่ามันดันอัตราขึ้น แต่ไม่มีที่ไหนวัดหรือประกาศตัวเลขนี้ กฎบังคับให้ประกาศทั้งคู่ ตามรูปของ Genshin/HSR (base 0.600% vs consolidated 1.600%)

**ต้นทุนที่ derive ได้**

```
cost(1)  = c = 100 gem
cost(10) = ceil(10 * 100 * (1 - d))
           d = 0     -> 1000     (default ตาม exemplar)
           d = 0.10  ->  900     (= ค่าที่ ship อยู่; ต้องให้ owner ratify §8.3)
pull คาดหวังถึง legendary ที่ระบุชื่อ  = 1/0.0636650 = 15.71 pulls = 1,571 gem
(ถ้าไม่มี pity เลยคือ 1/0.05 = 20.00 pulls = 2,000 gem)
```

**pulls_to_terminal (I13) ที่ `S=1`, `L` สะสม 27**

```
monkey-king (leg)  27 / (1 * 0.0636650) = 424.1 pulls
each epic          27 / (1 * 0.1232020) = 219.2 pulls
each rare          27 / (1 * 0.3449655) =  78.3 pulls
เรียงตาม ord: 424.1 >= 219.2 >= 78.3   ผ่าน I13
```

คู่ `S`/`L` ที่ ship อยู่วันนี้ **ผ่าน** ส่วนข้อเสนอ "S[r] rarity-keyed (10/5/1)" ทำให้เป็น 42.4 / 43.8 / 78.3 → legendary จบก่อน rare → **I13 พัง build** นั่นคือผลที่ต้องการ: กฎบล็อกการเปลี่ยนที่กลับหัวเกม โดยไม่ไปตัดสินระดับ

**สถานะการเผยแพร่วันนี้**

```
I1 ผ่าน · I2 ผ่าน · I3 ผ่าน · I4 ผ่าน · I5/I5b/I5c ผ่าน · I7 ผ่าน · I9 ต้องรอ tau (OPEN)
I12 ผ่าน · I13 ผ่าน
asset gate: monkey-king ตก sprite conformance band
=> publishable(banner) = FALSE
```

`active = false` ที่ `20260810110000:10` จึงเป็น**ผลของกฎ ไม่ใช่การกดปิดด้วยมือ** — และ re-run migration เดิมจะ republish ไม่ได้อีก เพราะ `ON CONFLICT DO UPDATE ... active=true` ที่ `migration:104` ถูกแทนด้วย predicate

### 5.2 กรณี 2 legendary พร้อม (สิ่งที่ PR #118 กำลังขอ)

```
N_leg = 2   N_epic = 2   N_rare = 2   u = 0   w = 1 ทุกตัว
```

```
share(each legendary) = (1-0) * 1/2 = 0.5000000
rate(each legendary)  = 0.05 * 0.5  = 0.0250000   ->  2.5000000 %
epic / rare ไม่ขยับเลย: 0.1250000 *2 และ 0.3500000 *2
SUM = 0.0250000*2 + 0.1250000*2 + 0.3500000*2 = 1.0000000 พอดี      [I2]

I12: 0.0250000 < 0.1250000 < 0.3500000          ผ่าน
เพดาน roster: 2 < 5*2=10 ผ่าน · 2 < 5.6 ผ่าน

pity: pity_rarity ยังเป็น legendary, q ยังเป็น 0.05, reach ยัง 22.594%
      -> forced draw สุ่ม share ภายในแบนด์: legendary ละ 50% ของการยิง pity
      (ไม่ใช่ order-by-character_id ที่ให้ monkey-king 100% ตลอดกาล)

delivered: D[legendary] = 6.3665 % (band ไม่ขยับ)  -> ต่อตัว 3.1832 %
           D[epic] 24.6404 % · D[rare] 68.9931 %   -> SUM 100.0000 %

pull คาดหวังถึง legendary ที่ระบุชื่อ = 1/0.0318325 = 31.41 pulls = 3,141 gem
                                        (จาก 15.71 pulls / 1,571 gem)
pulls_to_terminal ของ legendary หนึ่งตัว = 27/0.0318325 = 848.2 pulls
```

**ตัวเลขที่ต้องขึ้นจอเพราะการเปลี่ยนนี้ (I5c)**: 5.0000% → 2.5000% ต่อตัว และ 15.71 → 31.41 pulls การเจือจาง 2× จะมองเห็น **ก็ต่อเมื่อ** render per-character ตาม I5c ถ้า render แค่ band % (ตามข้อเสนอเดิม) หน้าจอยังเขียนว่า "ตำนาน 5%" ทั้งที่ราคาของตัวละครที่ผู้เล่นอยากได้ขึ้นเป็นสองเท่า — นี่คือ SERIOUS finding "roster growth silently moves the economy" และเป็นเหตุผลที่ Blue Archive ประกาศ `0.021495%` ต่อคน และ FGO ประกาศ `0.016%` ต่อใบ

**ถ้า owner เปิด featured slot ในกรณีนี้** (`u = 0.5`, monkey-king เป็น featured):

```
share(featured) = 0.5*(1/1) + 0.5*(1/2) = 0.7500000  -> rate 0.0375000 -> 3.7500000 %
share(other)    = 0        + 0.5*(1/2) = 0.2500000  -> rate 0.0125000 -> 1.2500000 %
SUM band = 0.0500000 พอดี · I12: 0.0375 < 0.125 ผ่าน
I10: F_leg = 1 >= 1 ผ่าน — ถ้าถอน monkey-king ออกเพราะ asset, F_leg = 0 -> banner ส่งไม่ได้
     (ไม่มี fallback u_r = 0 อีกแล้ว: fallback เดิมทำให้ rate ตัวที่เหลือกระโดด 0.625% -> 5.000%
      คือ 8× โดย invariant ทั้ง 6 ข้อเขียวและจอแสดง "5%" เหมือนเดิมทุก byte)
```

---

## 6. สิ่งที่กฎนี้แทนที่

| magic number วันนี้                                                                         | file:line                                                                                                                                            | term ที่ผลิตมันแทน                                                                                                                   |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `cost_single 100`                                                                           | `supabase/migrations/20260809073000_p9_gacha_server_authority.sql:90`                                                                                | base `c` หนึ่งค่าบนแถว banner                                                                                                        |
| `cost_multi 900`                                                                            | `…20260809073000…:91`                                                                                                                                | `ceil(K*c*(1-d))` — `900` เผย `d = 0.10` ที่ไม่ได้ประกาศ (§8.3)                                                                      |
| `pity_threshold 30`                                                                         | `…20260809073000…:92`                                                                                                                                | base `P[legendary]` อ่านโดย server + client + test                                                                                   |
| `pity_rarity 'legendary'`                                                                   | `…20260809073000…:93`                                                                                                                                | derive จาก `ord[r]` + pool; CHECK ที่ไม่ผูกกับ pool หายไป                                                                            |
| `active = true` ใน seed และใน `ON CONFLICT DO UPDATE`                                       | `…20260809073000…:94`, `:104`                                                                                                                        | predicate `publishable(banner)` (I6)                                                                                                 |
| `drop_rate 0.0500000` monkey-king                                                           | `…20260809073000…:108`                                                                                                                               | `B[legendary] * share = 0.05 * 1.0`                                                                                                  |
| `drop_rate 0.1250000` pig-warrior                                                           | `…20260809073000…:109`                                                                                                                               | `0.25 * (1/2)`                                                                                                                       |
| `drop_rate 0.1250000` celestial-archer                                                      | `…20260809073000…:110`                                                                                                                               | `0.25 * (1/2)`                                                                                                                       |
| `drop_rate 0.3500000` nezha-warden                                                          | `…20260809073000…:111`                                                                                                                               | `0.70 * (1/2)`                                                                                                                       |
| `drop_rate 0.3500000` sand-sage                                                             | `…20260809073000…:112`                                                                                                                               | `0.70 * (1/2)`                                                                                                                       |
| `pull_count in (1,10)` — schema CHECK                                                       | `…20260809073000…:38`                                                                                                                                | base `K`, pinned ด้วย I14 (**CHECK ยัง hardcode — ดู limit ข้างล่าง**)                                                               |
| `p_pull_count not in (1,10)` — RPC guard                                                    | `…20260809073000…:168`                                                                                                                               | base `K`                                                                                                                             |
| TS union `1 \| 10` × 4 ไฟล์                                                                 | `src/components/GachaModal/GachaModal.tsx:12`, `src/data/accountRepository.supabase.ts:179`, `src/hooks/useAuth.ts:93`, `src/pages/LobbyPage.tsx:70` | base `K`, pinned ด้วย I14                                                                                                            |
| `shards = shards + 1` (write)                                                               | `…20260809073000…:262`                                                                                                                               | `S[rarity(i)]`                                                                                                                       |
| `case when v_is_new then 0 else 1 end` (payload)                                            | `…20260809073000…:277`                                                                                                                               | **นิพจน์เดียวกับ write** — literal ที่สองถูกลบทิ้ง                                                                                   |
| `rates: legendary 0.05 / epic 0.25 / rare 0.7`                                              | `src/game/gacha/gachaConfig.ts:45-47`                                                                                                                | `B[r]` เขียนฝั่ง server ครั้งเดียว; copy บน client ถูกลบ                                                                             |
| `costSingle 100`, `costMulti 900`, `pityThreshold 30`, `pityGuaranteedRarity 'legendary'`   | `src/game/gacha/gachaConfig.ts:40-43`                                                                                                                | `c`, `cost(K)`, `P`, `pity_rarity` — render จาก DB                                                                                   |
| `weight: 1` × 5 entries (dead field)                                                        | `src/game/gacha/gachaConfig.ts:50-54`                                                                                                                | `w[i]` ที่ทำงานจริง; doc-comment ภาษาไทยหยุดเป็นร้อยแก้วติดกับ field ที่ไม่มีใครอ่าน                                                 |
| client tolerance `0.0001`                                                                   | `src/game/gacha/gachaConfig.ts:81`                                                                                                                   | หายไปทั้งก้อน — I2 บังคับผลรวม **เท่ากับ 1 พอดี** ไม่ใช่ tolerance ช่องว่าง 1000× กับ server `1e-7` (`…:203`) จึงไม่มีอะไรให้ต่างกัน |
| `validateBannerConfig` ที่ไม่มีใครเรียก                                                     | `src/game/gacha/gachaConfig.ts:66-81`                                                                                                                | ลบ — I1..I15 ถูก enforce ใน test (§9)                                                                                                |
| string odds `"ตำนาน 5% · มหากาพย์ 25% · หายาก 70%"`                                         | `src/components/GachaModal/GachaModal.tsx:150`                                                                                                       | `display_band_pct(r)` + `display_delivered_pct(r)` + `display_char_pct(i)` จากแถวสด                                                  |
| pool showcase จาก client array                                                              | `src/components/GachaModal/GachaModal.tsx:98`                                                                                                        | render จาก `gacha_banner_pool` ผ่าน anon SELECT grant ที่ provision ไว้แล้วและยังไม่มีใครใช้ (`…:79`)                                |
| description ที่ drift ไปแล้วจริง                                                            | `src/components/GachaModal/GachaModal.tsx:78` (vs `20260810110000:11`)                                                                               | render จากแถว banner — นี่คือหลักฐานว่าการ drift เกิดขึ้นแล้วไม่ใช่สมมติฐาน                                                          |
| pity numerator จาก client cache                                                             | `src/components/GachaModal/GachaModal.tsx:29, 93`                                                                                                    | ต้อง fetch ใหม่ตอนเปิด modal (สอง tab แสดง 12/30 ขณะ server ถือ 25/30)                                                               |
| test `RATES = {0.05, 0.25, 0.7}`                                                            | `src/data/gachaAuthority.integration.test.ts:221-223`                                                                                                | SELECT จากแถวเดียวกัน                                                                                                                |
| test `PITY_THRESHOLD = 30`                                                                  | `src/data/gachaAuthority.integration.test.ts:225`                                                                                                    | SELECT `P` จาก banner row                                                                                                            |
| pity boundary fixture `29`                                                                  | `src/data/gachaAuthority.integration.test.ts:162`                                                                                                    | `P - 1` คำนวณ                                                                                                                        |
| seed balance `3000`, `999999` และ assertion `2900` / `-100`                                 | `…gachaAuthority.integration.test.ts:70, 236, 295, 134, 151, 155`                                                                                    | `PULLS * c` และ `c`                                                                                                                  |
| fixture `pity_threshold 50` (ต่างจาก live 30 โดยไม่มีเหตุผล)                                | `src/data/starAscension.integration.test.ts:810`                                                                                                     | อ่าน `P` จาก base เดียวกัน                                                                                                           |
| shard ladder `1/2/4/8/12` × 3 ชุด                                                           | `supabase/migrations/20260808204905_p9_star_ascension_server_authority.sql:138-145` และ `:32`, `src/game/progression/StarAscensionSystem.ts:28-33`   | `L[r][k]` หนึ่ง array + I14 pin สอง projection                                                                                       |
| `BATCH_01_GACHA_BANNER` (costGems 160, softPityAt 74, hardPityAt 90, weights 5/12/12/18/18) | `src/game/heroes/gachaPool.ts:17-25`                                                                                                                 | ต้องเป็น banner row จริง (มี `B`, `c`, `P`, `w` ของตัวเอง) หรือถูกลบ — วันนี้ไม่มีใครอ่านตัวเลข (§8.10)                              |
| prose copy ของชุด rate/cost/pity                                                            | `docs/agent-blueprint/23-gacha-system.md:17`                                                                                                         | generate จาก view เดียวกัน หรือ doc ระบุ**กฎ**และไม่พกตัวเลขเลย                                                                      |
| `"a 5%/25%/70% pool on a 5-hero Standard Banner"`                                           | `AGENT_BLUEPRINT.md:35`                                                                                                                              | **พบเพิ่มโดย adversarial lens** — census เดิมตกไป                                                                                    |
| `"Five Production Batch 01 Heroes disclose a 5%/25%/70% pool"`                              | `TASKS.md:28`                                                                                                                                        | **พบเพิ่มโดย adversarial lens** — census เดิมตกไป                                                                                    |
| `GACHA_PRODUCTION_CONTENT_READY` คำนวณจาก `STANDARD_BANNER.pool`                            | `src/game/featureFlags.ts:43-46`, gate ที่ `src/pages/LobbyPage.tsx:330`                                                                             | input ที่ถูกลบ → gate ต้องอ่าน DB; banner ที่ไม่ publishable จะไม่ปรากฏผ่าน RLS อยู่แล้ว (`migration:51-53`)                         |

**ACCEPTED LIMIT — literal ที่รอดกฎ 5 ตัว** พิสูจน์ใน engine แล้วว่า `create table t(a int check (a in (select 1)))` → `ERROR: cannot use subquery in check constraint` ดังนั้น `check (pull_count in (1,10))` (`migration:38`), `check (shards_spent in (1,2,4,8,12))` (`20260808204905:32`) และ TS union `1 | 10` **พิมพ์ด้วยมือต่อไปตลอด** กฎประโยคแรก ("nothing between the two is ever typed by hand") **ไม่จริง 100% สำหรับ K และ L** ทางออกคือ I14: literal เหล่านี้ถูก pin ด้วย assertion ที่อ่าน `pg_get_constraintdef` เทียบกับ base — drift ถูก**จับ** ไม่ใช่ถูก**ป้องกัน** ระบุไว้ตรง ๆ แทนที่จะอ้างว่าปิดได้

---

## 7. ที่มาจาก exemplar

| องค์ประกอบของกฎ                                                   | exemplar                                                                                                                                                                                                                                                                                                                                                                                           | source                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **band rate เป็นค่าคงที่ ฟังก์ชันของ banner TYPE เท่านั้น**       | Genshin 0.600% นิ่งตอน roster 5→8 ตัว · HSR 0.600%/1.600%/90 เหมือนกันทุกหลักจาก v1.5 (2023-11) ถึง v4.4 (2026-08) ขณะ roster ~9→70+ · Arknights 2% จากภาพ disclosure วันเปิดตัวถึงโพสต์ EN 2026-04-28 · FGO 1% สิบเอ็ดปี · FEH 3%/3% ที่ 90 ตัว และ 3.00%/3.00% ที่ ~1528 ตัว                                                                                                                     | `webstatic.mihoyo.com/hk4e/gacha_info/cn_gf01/3c6c223d4d5ada706c7216b82da2593cc17050/zh-cn.json` · `operation-webstatic.hoyoverse.com/gacha_info/hkrpg/prod_official_asia/62ffca0e47e9976da3e46aa66ced1a7babe12c8e/en-us.json` · `web.hycdn.cn/arknights/official/upload/images/20190501/4952117a99a56d4e39b6dae5cef354a0.png` · `automaton-media.com/articles/newsjp/20220101-187652/` · `new-guide.fire-emblem-heroes.com/en-US/feh-2020.html` |
| **share(i) = u/F + (1−u)·w/W โดย featured อยู่ในเศษที่เหลือด้วย** | HSR พิสูจน์ด้วยเลข ไม่ใช่สมมติ: `p = 0.5 + 0.5/8 = 0.5625` → long-run share ของ featured = `1/(2−p) = 1/1.4375 = 0.695652` × 1.600% = **1.113%** ตรงกับที่พิมพ์ · `u=0.75, N=8` → `p = 0.78125` → `1/1.21875 × 1.870% = 1.534%` ตรงกับที่พิมพ์ · การอ่านแบบ featured-EXCLUDED ให้ 1.067% ไม่ตรง                                                                                                    | `operation-webstatic.hoyoverse.com/gacha_info/hkrpg/prod_official_asia/b634d753f418b734b3d2203437dea57d6ca47890/en-us.json`                                                                                                                                                                                                                                                                                                                      |
| **w default 1 พร้อม override ที่ประกาศครั้งเดียว**                | Genshin คำสั่งยืนบนทุก banner record: "In most cases, the base probability of all characters and weapons is evenly distributed. If there is a boost or guarantee in effect, please refer to the corresponding rules" · Arknights 「在6★剩余出率【30%】中以5倍权值出率提升」 — 5 เท่าของ**น้ำหนัก** ซึ่งมีความหมายก็ต่อเมื่อ default weight = 1                                                     | `gs.hoyoverse.com/static/hk4e-official-gacha-probability-fe/index.html?lang=en-us` · `ak.hypergryph.com/news/6273`                                                                                                                                                                                                                                                                                                                               |
| **rate ต่อตัวเป็นเลขคณิตที่ generate ไม่ใช่ authored**            | Blue Archive: featured 0.700000%, อีก 107 ตัวเท่ากันหมดที่ 0.021495% = (3.0−0.7)/107 และ Nexon ประกาศทิศทางการ derive เอง 「세부 확률은 소수점 7번째 자리에서 반올림한 수치이며, 실제 합산 확률은 100%에 맞추어 적용됩니다」 · FGO (1.000−0.700)/18 = 0.016 · FEH "Heroes do not have individual drop rates"                                                                                       | `m.nexon.com/probability/7717?client_id=MjcwOA&language=ko` · `4gamer.net/games/266/G026651/20180404124/` · `feheroes.fandom.com/wiki/Summon`                                                                                                                                                                                                                                                                                                    |
| **ผลรวมถูกบังคับให้เป็น 1 พอดี + ประกาศกฎการปัดข้างตาราง**        | Blue Archive ปัดที่ทศนิยมที่ 7 แล้วบังคับผลรวมเป็น 100% พอดี (คือ residual absorption) · FGO ประกาศตรงข้าม 「確率は小数第4位で切り捨てているため，合計値が100％にならないこともある」 — เราเลือกรูปของ Blue Archive เพราะ server บังคับ sum = 1 อยู่แล้ว                                                                                                                                           | `m.nexon.com/probability/7716?client_id=MjcwOA&language=ko` · `4gamer.net/games/266/G026651/20180404124/`                                                                                                                                                                                                                                                                                                                                        |
| **roster โต = pool membership ขยับ ไม่ใช่ rate**                  | Arknights ถอด 6★ 21 ตัวและ 5★ 37 ตัวออกจาก pool (2023-03-30) แทนที่จะขึ้นจาก 2% · HSR แช่ permanent 5★ pool ไว้ที่ 7 ตัวเดิมสามปี และตรึง event pool ที่ N=8 · Blue Archive กัน Fest/Recollection/Archive ออกจาก 108 · FGO curate pool ต่อ banner (18 non-pickup 5★ ทั้งที่มี 65) · FEH ปลด hero จากแบนด์ 5★ ลง 4★                                                                                 | `ak.hypergryph.com/news/2023033352.html` · `web.archive.org/web/20231205120735id_/https://operation-webstatic.hoyoverse.com/gacha_info/hkrpg/prod_official_eur/ad9815cdf2308104c377aac42c7f0cdd8d/en-us.json` · `dengekionline.com/elem/000/001/768/1768014/`                                                                                                                                                                                    |
| **pity เป็น counter นอก sampler บอกเป็นจำนวน pull เต็ม**          | Blue Archive เพดาน 200 point · FGO 330 step function แบน 1–329 · Arknights spark 300 contract แบบ deterministic · FEH 40-summon free choice                                                                                                                                                                                                                                                        | `bluearchive.jp/news/newsJump/229` · `webview.fate-go.us/webview/summon/20241226_newyear_cd_sFIBRKo_1_header.html` · `new-guide.fire-emblem-heroes.com/en-US/feh-3020.html`                                                                                                                                                                                                                                                                      |
| **P index ตามแบนด์ โดย infinity = ปิด**                           | Genshin และ HSR รัน counter 90 pull ของแบนด์บน **และ** floor 10 pull ของแบนด์รอง · Blue Archive ทำเรื่องเดียวกันด้วยตารางแยกบน slot ที่ 10                                                                                                                                                                                                                                                         | `operation-webstatic.hoyoverse.com/gacha_info/hk4e/os_asia/6ed9a6edd7e178c49d152d0c7789c45f19271cca/en-us.json` · `m.nexon.com/probability/7716?client_id=MjcwOA&language=ko`                                                                                                                                                                                                                                                                    |
| **multi เป็น batch ของ UI ไม่มีเนื้อหาเชิงเศรษฐกิจ (d = 0)**      | Genshin 10-pull = 10 Fates เป๊ะ · HSR "a pure UI convenience" · Arknights 6000 Orundum = 10 × 600 · Blue Archive 1200 Pyroxene = 10 × 120 และโบนัส slot ที่ 10 ให้โอกาส 3★ **เพิ่มศูนย์**                                                                                                                                                                                                          | `operation-webstatic.hoyoverse.com/gacha_info/hkrpg/prod_official_asia/62ffca0e47e9976da3e46aa66ced1a7babe12c8e/en-us.json` · `bluearchive.jp/news/newsJump/624`                                                                                                                                                                                                                                                                                 |
| **duplicate keyed ตาม rarity และ source-agnostic**                | Genshin คำต่อคำ "whether obtained in a wish, redeemed at the shop, or awarded by the game" · HSR ใช้ถ้อยคำเดียวกัน · ระดับตาม rarity: Blue Archive 30/5/1, FGO 90/50/30, Arknights 10/5→15/8 · **ไม่มี exemplar ไหนให้ flat ข้าม rarity**                                                                                                                                                          | `gs.hoyoverse.com/static/hk4e-official-gacha-probability-fe/index.html?lang=en-us` · `news.fate-go.jp/info/servant_coin/`                                                                                                                                                                                                                                                                                                                        |
| **ประกาศทั้ง base และ delivered (consolidated)**                  | Genshin พิมพ์คู่ 0.600% base / 1.600% consolidated ทุก banner · HSR เหมือนกัน และรายงานของมันสรุปเองว่า "two partitions must sum to exactly 100%… that is a one-line assertion and it would have caught the class of bug that makes a studio restate its odds"                                                                                                                                     | `operation-webstatic.mihoyo.com/gacha_info/hk4e/cn_gf01/6ed9a6edd7e178c49d152d0c7789c45f19271cca/zh-cn.json`                                                                                                                                                                                                                                                                                                                                     |
| **display generate จากตารางที่ sampler อ่าน**                     | ทุก exemplar ให้คำเตือน ไม่ใช่แบบอย่าง: Genshin EN ทำคำว่า "promotional" หล่นจนพิมพ์ประโยคผิดบนหน้าที่ผูกกับกฎหมาย · Blue Archive tutorial รัน 2.5% ค้างอยู่ **สิบสองเดือน** หลังยกทั้งเกมเป็น 3% และต้อง patch แยก · Arknights เผยแพร่ PNG ที่ทำมือ · FGO เป็นเคสบวกเคสเดียว (เศษที่พิมพ์เปลี่ยนตาม pool size แบบเลขคณิต = พฤติกรรมของ generator)                                                 | `bluearchive.jp/news/newsJump/344` · `operation-webstatic.mihoyo.com/gacha_info/hk4e/cn_gf01/6ed9a6edd7e178c49d152d0c7789c45f19271cca/zh-cn.json` · `4gamer.net/games/266/G026651/20180404124/`                                                                                                                                                                                                                                                  |
| **ประกาศ rate ต่อตัวละคร ไม่ใช่แค่ band %**                       | Blue Archive 0.021495% ต่อคน (ตามกฎหมายเกาหลี) · FGO 0.016% ต่อใบ ตั้งแต่ 2018-04-04 (เพราะ Apple App Store Review Guidelines 2017) · FEH เปิด "Details" ให้ผู้เล่นนับเอง                                                                                                                                                                                                                          | `m.nexon.com/probability/7717?client_id=MjcwOA&language=ko` · `nlab.itmedia.co.jp/nl/articles/1804/04/news130.html`                                                                                                                                                                                                                                                                                                                              |
| **carve-out คงที่ ไม่หดตาม pool**                                 | Blue Archive featured เป็น 0.700000% สัมบูรณ์ ไม่ใช่สัดส่วนของเศษที่หดลง ซึ่งเป็นสิ่งที่ทำให้โมเดลรอดมาถึง 108 ตัว — ในกฎนี้แสดงเป็น `u` (สัดส่วนของ**แบนด์ตัวเอง** ซึ่งคงที่) จึงภูมิคุ้มกันการโต pool เหมือนกัน                                                                                                                                                                                  | `m.nexon.com/probability/7717?client_id=MjcwOA&language=ko`                                                                                                                                                                                                                                                                                                                                                                                      |
| **deny-by-default gate บน pool readiness**                        | **exemplar อ่อนที่สุด ระบุตรง ๆ**: ไม่มี exemplar ไหนเผยแพร่ asset-readiness gate เพราะ asset pipeline ของเขาอยู่เหนือ config disclosure ทั้งหมด ตัวเทียบใกล้สุดคือ banner ที่ไม่อยู่ใน `gacha/list.json` ก็สุ่มไม่ได้ ที่มาจริงคือพฤติกรรมที่วัดได้ของ repo นี้เอง: `active` deny-by-default (`migration:14`) + RLS (`:51-53`) + RPC lookup (`:194`) ประกาศกฎนี้อยู่แล้ว I6 แค่ถอดการกดด้วยมือออก | `operation-webstatic.hoyoverse.com/gacha_info/hkrpg/prod_official_asia/gacha/list.json`                                                                                                                                                                                                                                                                                                                                                          |

### DEPARTURE — สิ่งที่ไม่มี exemplar รองรับ พร้อมเหตุผล

1. **ไม่มี soft-pity ramp** — Genshin/HSR/Arknights รัน ramp ทั้งหมด เรา ship flat + hard step หนึ่งขั้น ซึ่งเป็นรูปของ FGO และ Blue Archive **เหตุผล**: ramp เพิ่มเลขที่ผู้เล่นตรวจไม่ได้และเราทดสอบไม่ไหวที่ sample 1000 pull และวันนี้มันเป็นไอน้ำอยู่แล้ว — `MASTER_BLUEPRINT §7.1` lock ramp ไว้ แต่ RPC ที่ ship มีแต่ hard pity และ `softPityAt` ตัวเดียวใน tree คือ dead code ที่พก 74 ของ Genshin มา
2. **featured slot มีอยู่แต่ว่าง (`u = 0`)** — machinery พร้อม ณ วินาทีที่แบนด์มีสองคน **แต่ต่างจากข้อเสนอเดิม**: ไม่มี fallback `u_r = 0` อีกแล้ว (I10) fallback นั้นแปลง outage ที่มองเห็นเป็นการจัดสรรใหม่ที่มองไม่เห็น
3. **banner type เดียว ไม่ใช่ห้า** — `B` scope ที่ banner type เพื่อให้กฎ generalize แต่การ ship หลาย type บน roster 7 ตัวคือ over-build ที่สตูดิโอใหญ่ได้สิทธิ์หลังสะสม content หลายปี
4. **ไม่มีชั้นสกุลเงินที่สอง** — exemplar ทั้งห้าใช้สองโทเคน เราคิด gem ตรง สองขั้นมีไว้บังราคาต่อ pull ที่ scale นี้ซื้ออะไรไม่ได้และเพิ่มที่ให้ราคา drift เป็นสองเท่า — repo นี้โดนมาแล้วจาก currency CHECK ที่ยอมรับ `'gold'` ซึ่ง RPC ทำไม่ได้
5. **แบนด์พื้นของเราเป็นตัวละคร ไม่ใช่อุปกรณ์** — FGO ระบุเองว่าไอเดียที่ถ่ายทอดได้ที่สุดคือการผลิตปริมาณ pull ด้วย content ที่ไม่ใช่ตัวละคร (56% ของทุก pull เป็น Craft Essence) เราไม่มี equipment แบนด์ rare 70% จึงทำงานนั้นด้วยตัวละครจริง ใจกว้างกว่าทุก exemplar และเป็นหนี้ที่เคส 50 ตัวจะมาทวง
6. **pity target derive ไม่ใช่ประกาศ** — ไม่มี exemplar ไหนคำนวณ ทั้งห้าประกาศ เรา derive เพราะค่าที่ประกาศ**วัดได้ว่าขัดกับ pool ได้จริง**: pool ที่ไม่มีสมาชิกที่ pity_rarity สำเร็จ 29 pull แล้ว hard-error ตลอดกาล และ pool ที่ทุกตัวเป็น pity_rarity ทำให้ counter ค้างที่ 0 (วัดจริงบน PGlite ทั้งสองเคส) **แต่**: การ derive ต้องมี `ord[r]` ที่เขียนด้วยมือ ซึ่งเป็น base ใหม่ที่ข้อเสนอเดิมไม่มี — ประกาศไว้ตรง ๆ ใน §3
7. **publishability เป็น predicate ที่ derive** — exemplar ไม่มีตัวเทียบเพราะ asset pipeline ของเขาไม่แตะ odds config ของเรา แตะ: สภาพจริงของ repo คือ banner ที่ถูก seed active, ship ไปพร้อม legendary ที่ตก sprite conformance band, แล้วถูกปิดด้วย migration ที่เขียนด้วยมือ I6 ทำให้สวิตช์นั้นตกลงมาจากกฎแทนที่จะตกลงมาจากการที่ใครสักคนจำได้
8. **residual absorption** — Blue Archive รองรับ ("ผลรวมถูกบังคับให้เป็น 100%") แต่ไม่มี exemplar ไหนประกาศว่าใครเป็นตัวดูดเศษ **ผลข้างเคียงที่ต้องระบุ**: สมาชิกตัวสุดท้ายของแบนด์ต่างจากพี่น้องได้สูงสุด `(N_r−1)/2` ULP — ที่ `N_r = 50, rho = 7` คือ ~2.5e-6 absolute (~0.018% relative) เล็กแต่ไม่ใช่ศูนย์ และ character_id เป็นตัวเลือกโดยเรียง ไม่ใช่โดยความหมาย
9. **I12 / I13 (monotone rarity และ monotone grind)** — ไม่มี exemplar ไหนประกาศ invariant เหล่านี้ เพราะ roster ของเขาโตพอที่แบนด์จะไม่กลับหัวโดยบังเอิญ ของเราเล็กพอที่ `L1/E6/R1` (roster 8) ทำให้ legendary พบบ่อยกว่า epic ได้จริง

### แก้ข้อกล่าวหาที่ตัวมันเองผิด (ไม่ใช่การอ่อนข้อ)

adversarial lens "DISCLOSURE TRUTH" อ้างว่าเลข HSR ในข้อเสนอไม่ปิด: "0.5 + 0.5/8 = 0.5625; against the 1.600% band that is 0.900%, not 1.113%" **ข้ออ้างนี้ผิด** — 0.5625 คือ share ต่อ 5★ **หนึ่งครั้ง** ส่วน 1.113% เป็นตัวเลข **consolidated** ที่รวม sticky guarantee (แพ้หนึ่งครั้ง → 5★ ถัดไปการันตี featured) รอบเฉลี่ยยาว `2 − p` ครั้ง ดังนั้น long-run share = `1/(2−0.5625) = 0.695652` และ `0.695652 × 1.600% = 1.11304%` → ตรงกับ 1.113% ที่พิมพ์ ตรวจซ้ำกับ Light Cone: `1/(2−0.78125) × 1.870% = 1.53436%` → ตรงกับ 1.534% ทั้งสองมาจาก `up_prob` ของ banner ตัวเอง (0.50 และ 0.75) ไม่ได้ต้องการ band ที่ต่างกัน **ผลที่ตามมาคือส่วนที่ถูก**: exemplar ยืนยัน **รูปของ share()** แต่ **ไม่** ยืนยัน `featured_shown` ที่กฎเดิมเสนอ เพราะกฎนี้ไม่มี sticky guarantee ตัวเลขที่เราประกาศจึงเป็น base ไม่ใช่ consolidated ของ HSR — และช่องว่างที่ lens ชี้ถูกจริง (featured_shown ไม่มี assertion) ปิดด้วย **I5c** ซึ่งบังคับให้ทุก % ต่อตัว รวมทั้ง featured ตรงกับแถวที่เก็บ

---

## 8. สิ่งที่กฎนี้ไม่ตัดสิน — ต้องให้ owner ตัดสิน

> **⚠️ อ่านหัวข้อนี้เป็น _คำถามที่เคยถาม_ ไม่ใช่ _สถานะวันนี้_ — คำตอบอยู่ที่ §11 และสถานะรวมอยู่ที่
> §11.9** ข้อส่วนใหญ่ในลิสต์ข้างล่างปิดไปแล้วตั้งแต่ 2026-08-12/13 แต่ตัวลิสต์ไม่ได้ถูกแก้ตาม
> เพราะ §11 เขียนต่อท้ายแทนที่จะเขียนทับ
>
> **ทำไมต้องมีป้ายนี้ (2026-08-15)**: main อ่านลิสต์นี้แล้วเชื่อว่า `d` กับระดับของ `c` ยังเปิดอยู่
> แล้วไป ratify `c = 100` ลงเอกสารพี่น้อง — **ซึ่งแพงกว่า `c = 16` ที่ §11.8 ล็อกไว้ 6.25 เท่า**
> HetCreep จับได้ในเทิร์นถัดมา ป้ายนี้คือสิ่งที่ควรมีอยู่ก่อนหน้านั้น

แต่ละข้อคือ either/or ที่ตอบได้ในหนึ่งบรรทัด

1. **ระดับของ `B[top]`** — เก็บ `0.05` ไว้ **หรือ** ลดลงมาในช่วง exemplar? ช่วง exemplar: 0.600% (Genshin/HSR 5★), 0.700–0.800% (weapon/LC), 1% (FGO), 2% (Arknights), 3% (Blue Archive, FEH focus), 6% (FEH 5★ รวม) `0.05` ของเราอยู่ **เหนือทุก exemplar** = legendary ทุก ~20 pull ไม่มีบันทึกการเซ็นอนุมัติอยู่ที่ไหนในทั้ง tree **หมายเหตุผูกพัน**: `B` ตัดสินเพดาน roster ผ่าน I12 — ที่ `0.05/0.25/0.70` คือ `N_epic < 5·N_leg` และ `N_rare < 2.8·N_epic`
2. **ระดับของ `P` และค่าของ `tau_min`/`tau_max`** — เลือก `P` ตรง ๆ **หรือ** เลือก `tau` แล้วให้ `P = ceil(ln(tau)/ln(1−B[top])) + 1`? ช่วง exemplar เป็น pull: 30 (repo วันนี้), 50 (Blue Archive beginner), 80–90 (Genshin/HSR), 99 nominal ที่แทบไม่ถึง (Arknights), 200 (Blue Archive), 330 (FGO) ช่วง exemplar เป็น **reach**: FGO `0.992^329 = 7.1%` เป็นตัวเทียบเดียวที่เป็น flat rate แท้ ๆ ของเราวันนี้คือ **22.594%** — พึ่ง pity มากกว่าทุก exemplar `tau_max` ต้องต่ำกว่า 1 เสมอ (ไม่งั้น `P = 1` ผ่าน แล้วส่ง legendary 100% ขณะประกาศ 5%) และ `tau_min` ต้องมากกว่า 0 (ไม่งั้น `B[top]` ที่ใจกว้างทำให้ pity ตายโดย invariant เขียวหมด)
3. **`d`** — ratify `d = 0.10` แล้วพิมพ์ลงจอ **หรือ** เปลี่ยนราคา `cost_multi` เป็น 1000? exemplar default คือ 0 (Genshin, HSR, Arknights, Blue Archive คิด `K × c` เป๊ะบน banner หลัก; FGO แถมใบที่ 11 และ FEH รัน ladder 5/4/4/4/3 แต่ไม่มีใครลดราคาหัวข่าว) วันนี้ `900` เข้ารหัส `d = 0.10` ที่ไม่ได้ประกาศ นี่คือการเปลี่ยนราคาจริงทั้งสองทาง
4. **`c = 100 gem`** — โครงสร้าง lock แล้ว (หนึ่ง base หนึ่งแถว อ่านสองฝั่ง) ระดับถูกเลื่อนไป P9 อย่างชัดเจนที่ `MASTER_BLUEPRINT_v3.0.md:499` ในฐานะ business-model call และไม่มีบันทึกการตัดสิน 100/900 อยู่ที่ไหน กฎผลิตบันทึกนั้นไม่ได้
5. **`S[r]`** — คง flat `1` **หรือ** keyed ตาม rarity? ไม่มี exemplar ไหน flat (Blue Archive 30/5/1, FGO 90/50/30, Arknights 10/5→15/8) **แต่**: การ key ตาม rarity บน `L` ที่ rarity-blind ทำให้ตัวหายากที่สุดจบก่อน (42.4 vs 78.3 pull) และ **I13 จะทำให้ build พัง** เลือก S แล้วต้องเลือก L ให้เข้ากันในบรรทัดเดียวกัน
6. **`L`** — คง `1/2/4/8/12` (rarity-blind) **หรือ** เปลี่ยนเป็น `L[r][k]`? ค่าปัจจุบันคูณสองสะอาดถึง 8 แล้ว 12 หักรูป — ตั้งใจผ่อน หรือ 16 ที่พิมพ์เป็น 12? กฎบังคับแค่ว่ามันมีบ้านเดียวและผ่าน I13
7. **แบนด์ epic ควรมี `P[epic]` จำกัดไหม** — `infinity` (ship ได้ ถูกกฎ) **หรือ** ตัวเลข? ทุก exemplar ที่มี 3 แบนด์ขึ้นไปมี: Genshin/HSR การันตี 4★ ใน 10 pull, Blue Archive สลับตาราง slot ที่ 10, Arknights การันตี 5★ ใน 10 pull แรก **หมายเหตุ**: ต้องเพิ่ม `rarity` เข้า primary key ของ `gacha_pity` (วันนี้เป็น `(profile_id, banner_id)` ที่ `migration:26-32`) ก่อนตอบว่า YES ได้
8. **soft pity กับ blueprint** — แก้ blueprint ให้ตรงกับ flat+step **หรือ** ตั้ง schedule ทำ ramp? `MASTER_BLUEPRINT §7.1` lock ramp ที่ไม่มีโค้ดไหน implement และมี dead constant ตัวเดียวที่พกเลขของ Genshin
9. **`u`** — ตัดสินใจก่อนวันที่แบนด์มีสองคน ไม่ใช่วันนั้น ช่วง exemplar: 50% (Genshin/HSR character), 70% (Arknights anniversary), 75% (Genshin weapon / HSR LC), 80% (FGO single pickup), ~23% (Blue Archive 0.7 จาก band 3.0)
10. **`gachaPool.ts` BATCH_01_GACHA_BANNER** — ทำให้เป็น banner row จริง (มี `B`, `c`, `P`, `w` ของตัวเอง) **หรือ** ลบ? วันนี้ไม่มีใครอ่านตัวเลข importer เดียวยืนยันแค่ pool membership `74 soft / 90 hard` เป็นค่าที่ Genshin พิมพ์เป๊ะ ๆ ซึ่งชี้ไปทาง copy มากกว่า choice
11. **banner type ที่สอง** — เมื่อมีตัวละครพร้อมแค่แบนด์เดียว I3 ทำให้ gacha มืดสนิท (roster 1: publishable 0 จาก 3 mix; roster 2: 0 จาก 6; roster 3: 1 จาก 10) **ทางออกเดียวคือ authoring banner type ใหม่ที่ `B` ครอบเฉพาะแบนด์ที่พร้อม** — กฎ**อนุญาต** (มันห้ามแค่ asset progress ไปเปลี่ยน `B` ของ type ที่มีอยู่ ไม่ได้ห้ามสร้าง type) แต่การสร้าง type คือการตัดสินใจเชิงเศรษฐกิจที่ต้องมีลายเซ็น owner จะสร้าง type แบนด์เดียวเพื่อ ship เร็ว **หรือ** รอให้ครบสามแบนด์?
12. **terminal state — ACCEPTED LIMIT ของกฎนี้ · ปิดแล้วที่อื่น (2026-08-15)** ผู้เล่นที่เก็บครบชนกำแพงแล้ว banner คืนอะไรไม่ได้เลยตลอดกาล: shard เต็มเพดาน, `ascend_character_star` เป็น sink เดียวใน codebase, ไม่มี overflow conversion ไม่มี shop ไม่มี universal currency กฎนี้ **ไม่ model** เรื่องนั้น เพราะเป็นการตัดสินใจโดเมน reward ไม่ใช่ rate ทุก exemplar มี sink: HSR Companion Spirit, Genshin Masterless Starglitter/Stella Fortuna, FGO Servant Coins, Arknights Distinction Certificates, FEH merge/skill-inheritance/feathers เราไม่มีเลย ต้องเปิดเรื่องนี้แยกต่างหาก — **เปิดแล้วและปิดแล้วที่ `ECONOMY-DESIGN-LOCK.md` §P0.8**: shard ที่เกินเพดานดาวแปลงเป็นโทเคนกลาง โทเคนซื้อ shard ของตัวละคร*อื่น* ในร้าน (รูปครึ่งหลังของ Naruto Mobile) — ห่วงปิด ไม่มีสถานะตันอีก อัตรายังไม่ตั้ง
    **⚠️ เลข `~425 pull (42,500 gem)` ที่เคยเขียนไว้ตรงนี้เป็นของเก่า ลบทิ้งแล้ว** — คำนวณตอน `c=100` และก่อนล็อก `dup=6` ค่าที่ถูกต้องอยู่ใน §11.11 ของไฟล์นี้เอง: **legendary 364 pull = ฿2,909** ที่ `c=16` (epic 203 = ฿1,624 · rare 50 = ฿403) **กำแพงจริงถูกกว่าที่เคยเขียนไว้ ~7 เท่า** — ประมาณ 4 วันค่าแรงเฉลี่ยไทย ไม่ใช่กำแพงที่มีแต่ผู้เล่นจ่ายหนักชน
13. **ค่าคงที่ของ test power — ไม่ใช่ค่าเศรษฐกิจ และกฎนี้ไม่ผลิตมัน** `PULLS = 1000`, `TOLERANCE_SIGMA = 4.5`, `PITY_RUNS = 5`, ตัวคูณ `×5` ใน `PULLS_PER_RUN` ระบุไว้แทนที่จะซ่อน `TOLERANCE_SIGMA` เป็นค่าคงที่ที่มีเหตุผลรองรับดีที่สุดในโดเมนอยู่แล้ว (คอมเมนต์บันทึกประวัติ flake-rate และเป้า ~1e-5) อีกสามตัวเลือกด้วยมือโดยตั้งใจและควรอยู่แบบนั้น
14. **การจัดวางทางกายภาพของ `B`, `u`, `w`, `featured`, `ord`** — รูปที่กฎต้องการ: ตารางลูก `gacha_banner_bands` เก็บ `B[r]` และ `u`, column `weight`/`featured` บน `gacha_banner_pool`, ตาราง `rarity_order` เก็บ `ord[r]`, column `rarity` เพิ่มเข้า primary key ของ `gacha_pity`, และ `drop_rate` **คงเป็น stored `numeric(8,7)` พร้อม CHECK เดิม** โดยมีผู้เขียนคนเดียวคือฟังก์ชัน derive นี่เป็น schema change บนตารางที่ live จึงเป็นการตัดสินใจของ owner ไม่ใช่ของ subagent

---

## 9. วิธีตรวจว่ากฎถูกใช้จริง

โปรเจกต์นี้ถือว่า **lock จะจริงก็ต่อเมื่อมีอะไรเชิงกลบังคับมัน** — precedent คือ `src/game/spriteContract.test.ts`

**ไฟล์ที่ต้องมี**: `src/data/gachaRateContract.test.ts` (PGlite + role switching)

มันต้อง assert อะไรบ้าง — แต่ละกลุ่มผูกกับ invariant ที่ระบุ:

**A. กฎเลขคณิต (รันบนทุก banner ในฐาน ไม่ใช่แค่ standard-banner)**

1. `SUM(B[r]) = 1` พอดี และ `0 < B[top] < 1` — **I1**
2. `SUM(drop_rate) = 1` **พอดี** (`= 1`, ไม่ใช่ `abs(sum-1) <= eps`) — **I2** สวีปทุก mix ของ roster 1–50 ที่ publishable ผ่าน property test ไม่ใช่แค่ pool ปัจจุบัน (adversarial สวีปแล้วพบ 1051/1176 mix ตายที่ roster 50 ภายใต้ tolerance เดิม)
3. `stored drop_rate = derived rate` ทุกแถว และการรัน derive ซ้ำไม่เปลี่ยนอะไร (idempotent)
4. `w >= 1` ทุกแถว และการ INSERT `w = 0` หรือ `w = -1` ถูกปฏิเสธที่ constraint — **I7** (adversarial: `w = 0` → `division_by_zero` ทุก pull ทุกผู้เล่น และไม่มี invariant ไหนจับได้ก่อน)
5. `rate(i) >= 10^-7` ทุกแถว — **I11**
6. band ที่ `B[r] > 0` มีสมาชิก และ band ที่ `B[r] = 0` ไม่มีสมาชิก — **I3 / I3b**
7. `u > 0` ⟹ มี `featured` อย่างน้อยหนึ่งในแบนด์นั้น — **I10**
8. `max(rate)` ในแบนด์ที่หายากกว่า `< min(rate)` ในแบนด์ที่พบง่ายกว่า ตาม `ord[r]` — **I12**
9. `pulls_to_terminal` เรียงตาม `ord[r]` — **I13**

**B. กฎ pity** 10. `pity_rarity` ที่ derive = แบนด์ที่ `ord` สูงสุดใน pool ที่ `B > 0` และไม่มี column ประกาศเหลืออยู่ 11. `tau_min <= (1-q)^(P-1) <= tau_max` — **I9** พร้อม unit test แยกที่ตรึง exponent `P-1` (ไม่ใช่ `P`) โดยยิง fixture ที่ `pity_count = P-1` แล้วยืนยัน `isPity = true` 12. ไม่มีแถว `gacha_pity` ของคู่ (banner, rarity) ที่ไม่ใช่ pity_rarity ปัจจุบัน — **I15** 13. forced draw สุ่ม share ภายในแบนด์: บน pool ที่มีสอง legendary ยิง pity 200 ครั้ง แล้วยืนยันว่าทั้งสองตัวถูกให้ (วันนี้ `order by pool.character_id limit 1` ที่ `migration:231` ให้ monkey-king 100% ตลอดกาล ซึ่งไม่มีกฎที่ประกาศไว้ที่ไหนพูดถึง)

**C. disclosure — ต้องรันในฐานะผู้เล่น ไม่ใช่ superuser** 14. `set local role anon;` แล้วยืนยันว่าเซ็ตแถวที่มองเห็นเท่ากับเซ็ตที่ SECURITY DEFINER อ่าน (id เดียวกัน rate เดียวกัน) สำหรับ banner ที่ publishable — **I8** นี่คือข้อที่ test ปัจจุบันขาด: `gachaAuthority.integration.test.ts:55-56` สร้าง role `authenticated`/`anon` แต่ไม่เคย `set role` เลย ทุก assertion รวมทั้ง sum-guard ที่มีอยู่จึงรันโดย RLS ไม่ทำงาน — พิสูจน์ odds ของ row set ที่ผู้เล่นอ่านไม่ได้ 15. สำหรับ banner ที่ **ไม่** publishable: `anon` เห็น 0 แถว และ client ต้อง render สถานะ "ปิด" ไม่ใช่ตาราง odds จากผลลัพธ์ว่าง 16. `display_band_pct(r) = round(100*B[r], 7)` — **I5** 17. `SUM(display_delivered_pct(r)) = 100` และแต่ละค่าตรงกับ `round(100*D[r], 7)` — **I5b** 18. ทุก % ต่อตัวที่ render ตรงกับ `round(100*rate(i), 7)` รวมทั้งของ featured — **I5c** 19. grep ทั้ง tree แล้วไม่พบ literal `5%`/`25%`/`70%`/`0.05`/`0.25`/`0.7`/`100`/`900`/`30` ในบริบท gacha ยกเว้นแถวใน migration ที่เป็น base — census ต้องรวม `AGENT_BLUEPRINT.md:35` และ `TASKS.md:28` ที่ census เดิมตกไป

**D. projection pinning (ทางออกที่รับได้สำหรับสิ่งที่ engine ปฏิเสธ)** 20. อ่าน `pg_get_constraintdef` ของ CHECK ที่ `migration:38` และ `20260808204905:32` แล้วเทียบกับ base `K` และ `L` — **I14** 21. เทียบค่าคงที่ TS (`GachaModal.tsx:12`, `accountRepository.supabase.ts:179`, `useAuth.ts:93`, `LobbyPage.tsx:70`, `StarAscensionSystem.ts:28-33`) กับ base เดียวกัน 22. `information_schema.columns.numeric_scale` ของ `drop_rate` = `rho` — จับกรณีที่ใครลดชั้น column เป็น VIEW แล้ว `rho` อ่านไม่ได้

**E. แก้ test ที่มีอยู่** 23. `gachaAuthority.integration.test.ts:221-223` — SELECT `RATES` จากฐาน ไม่ใช่พิมพ์ 24. `gachaAuthority.integration.test.ts:225` — SELECT `P` จาก banner row 25. `gachaAuthority.integration.test.ts:162` — fixture `29` → `P - 1` คำนวณ 26. `gachaAuthority.integration.test.ts:70, 236, 295, 134, 151, 155` — balance และ assertion จาก `PULLS * c` และ `c` 27. `starAscension.integration.test.ts:810` — fixture อ่าน `P` จาก base เดียวกัน 28. **เพิ่มใหม่**: test ที่วัด **delivered** rate (ไม่กรอง `isPity` ออก) แล้วเทียบกับ `D[r]` ที่สูตรทำนาย ปัจจุบัน `:241-247` กรอง pity ออกพร้อมคอมเมนต์ยอมรับว่ามันดันอัตราขึ้น — จึงไม่มี test ไหนในโปรเจกต์วัดสิ่งที่ผู้เล่นได้จริงเลย

**สิ่งที่กฎนี้ยัง enforce ไม่ได้ — ระบุไว้**: `.github/workflows/deploy.yml` **ไม่มีขั้นตอน migration เลย** (grep `supabase db push` / `psql` / `migration` = 0 hits) migration ถูก apply ด้วยมือนอกไปป์ไลน์ ดังนั้นการเปลี่ยน `B` เป็น deploy สองขั้นที่ไม่มีอะไรเรียงลำดับให้ ทางบรรเทาที่กฎบังคับได้คือ: client อ่านแถว banner **ตอนเปิด modal** ไม่ใช่ตอนเริ่ม session (ไม่งั้นได้ความล้มเหลวแบบ Blue Archive tutorial ที่ระดับ session) และ RLS ทำให้โหมดล้มเหลวเป็น "banner ปิด" ไม่ใช่ "odds ผิด"

---

## 10. PR #118 วัดกับกฎนี้

**ข้อเสนอ**: ตัวละคร 2 ตัวที่ 50% ต่อตัว

### คำตัดสิน: **ละเมิดกฎ** ถ้าอ่าน 50% เป็นสัดส่วนของ pull ทั้งหมด

ถ้า "50% ต่อตัว" หมายถึง legendary สองตัวกินคนละ 50% ของ pull:

```
B[legendary] = 1.0
I1 พัง:  SUM(B[r]) = 1.0 + 0.25 + 0.70 = 1.95 != 1        และ  B[top] = 1.0 ไม่ผ่าน 0 < B[top] < 1
I3  พัง:  ถ้าตัดแบนด์อื่นให้ SUM = 1 แล้ว B[epic] = B[rare] = 0 แต่ pool ยังมีสมาชิกอยู่ (I3b)
I4  พัง:  B[pity_rarity] = 1.0 -> pity ยิงไม่ได้เลย (ทุก pull เป็น legendary อยู่แล้ว counter ค้าง 0)
I9  พัง:  reach = (1 - 1.0)^29 = 0 < tau_min -> pity ตายสนิท
I12 พัง:  rate ต่อตัว legendary = 0.5 > rate ต่อตัว rare 0.0 ... กลับหัวเต็มรูป
=> publishable(banner) = FALSE
```

และมันเป็นการเขียนเลขต่อตัวละครด้วยมือ ซึ่งเป็นสิ่งที่ประโยคแรกของกฎห้ามตรง ๆ

### สิ่งที่กฎบอกให้ทำแทน

ตีความคำขอให้ถูกขอบเขต: 50% ต่อตัว **ภายในแบนด์ ไม่ใช่ภายในทั้ง pool** ผลลัพธ์ตกลงมาเองโดยไม่ต้องพิมพ์เลขไหน:

```
เพิ่ม legendary ตัวที่สองเข้า pool (w = 1, ไม่ต้องแตะอะไรอีก)
N_leg 1 -> 2

share(each legendary) = (1-0) * 1/2 = 0.5000000     <- "50% ต่อตัว" อยู่ตรงนี้
rate(each legendary)  = B[legendary] * 0.5
                      = 0.05 * 0.5 = 0.0250000      -> 2.5000000 %

แบนด์ legendary ยังเป็น 0.05 เท่าเดิม  ·  epic 0.25 เท่าเดิม  ·  rare 0.70 เท่าเดิม
SUM(rate) = 0.025*2 + 0.125*2 + 0.35*2 = 1.0000000 พอดี           I2  ผ่าน
I1 ผ่าน · I3/I3b ผ่าน · I4 ผ่าน (0 < 0.05 < 1) · I12 ผ่าน (0.025 < 0.125 < 0.35)
pity ยังถึงได้: reach 22.594% เท่าเดิม · forced draw สุ่ม share ในแบนด์ -> คนละ 50% ของการยิง pity
```

**สิ่งที่ต้องขึ้นจอพร้อมกัน (บังคับโดย I5c ไม่ใช่ทางเลือก)**:

```
ตำนาน (แบนด์)      base 5.0000 %   ·  delivered 6.3665 %
  monkey-king      base 2.5000 %   ·  delivered 3.1832 %
  <legendary #2>   base 2.5000 %   ·  delivered 3.1832 %
มหากาพย์ (แบนด์)   base 25.0000 %  ·  delivered 24.6404 %   (ต่อตัว 12.5000 / 12.3202 %)
หายาก (แบนด์)      base 70.0000 %  ·  delivered 68.9931 %   (ต่อตัว 35.0000 / 34.4966 %)
การันตี            {counter สดจาก server} / 30   ·  22.5936 % ของรอบถึงเพดาน
pull คาดหวังถึง legendary ที่ระบุชื่อ: 15.71 -> 31.41 pulls (1,571 -> 3,141 gem)
```

**สรุปหนึ่งบรรทัดสำหรับ PR #118**: ตัวเลขที่ผู้เสนอต้องการ (50% ต่อตัว) ถูกต้อง แต่ต้องอยู่ในระดับ `share` ไม่ใช่ระดับ `rate` — แบนด์ไม่กลายเป็น 100%, pity ยังถึงได้, odds ที่ประกาศยังจริง, และเลข `2.5%` ไม่ได้ถูกพิมพ์ที่ไหนเลย มันตกลงมาจาก `B[legendary] × (1/N_leg)`

---

## 11. ค่าที่ owner ล็อกแล้ว (2026-08-12) — เขียนทับ §8 ข้อ 1

**สถานะ**: §8 ข้อ 1 (`B[top]`) และรูปทรงของ rarity → base stat **ปิดแล้ว** โดย owner ในการสนทนาต่อจาก
เอกสารนี้ ยังเหลือ §8 ข้อ 2-14 เปิดอยู่ตามเดิม (ข้อ 2 มีใบสั่งงานแยกที่ `ASSIGN-PITY-P-TAU.md`
ต้องอัปเดตใบนั้นให้ตรงกับ `B[top]` ที่ล็อกที่นี่ก่อนส่งจริง)

### 11.1 `B[top]` — จุดกึ่งกลาง exemplar corridor

```
min (Genshin/HSR 5★)      0.600 %
max (FEH 5★ รวม)          6.000 %
mid = (0.6 + 6) / 2       3.300 %   ->  B[top] = 0.0330000
```

**invariant ใหม่ แทน `0 < B[top] < 1` ที่ไม่มีฟัน**:

```
I16   0.0060000 <= B[top] <= 0.0600000
```

(ไม่สนจำนวนแบนด์ — corridor เป็น constraint บน `B[top]` เพียงตัวเดียว, ทดสอบแล้วที่ 2/3/4+ แบนด์
ยังผ่านเหมือนกันหมด เพราะเพดานจำนวนแบนด์ที่แท้จริงมาจาก I12 ไม่ใช่จาก corridor นี้)

### 11.2 จำนวนแบนด์ — 4 (ไม่ใช่ 3 ตามที่ §7 เคยสำรวจไว้)

สำรวจเพิ่มหลัง §7: Arknights (verified, 2019 launch + 2026 EN post) ใช้ 4 แบนด์ 6★/5★/4★/3★ —
เกมเดียวในแผงเดิมที่ 4 แบนด์ ตัวหายากน้อยยังเล่นได้จริง (ไม่ใช่ของทิ้งเหมือน 3-band ทุกเกมอื่น)
Naruto Mobile (**UNVERIFIED** — Baidu Baike + community, ไม่ใช่เอกสารทางการ Tencent) ก็ 4 แบนด์
S/A/B/C เช่นกัน

**การตัดสินใจนี้ยึดกับข้อเท็จจริงของ roster ตัวเอง ไม่ใช่คะแนนเสียงข้ามเกม**: วัด kit จริงของทั้ง
7 ตัวแล้วพบว่า **rarity ไม่เคยซื้อ effect ใด ๆ** (`monkeyKing`/`erlangShen` ทั้งคู่ legendary มี
effects = 0 · `sandSage` ที่เป็น rare มี effects มากสุด = 4) และ stat กลับหัว 3 จุด (`pig-warrior`
epic แรงสุดในเกม) — สรุปว่า roster นี้ไม่มีตัวไหนเป็น "ของทิ้ง" แบบ Genshin 3★/BA 1★ ทุกตัวออกแบบ
มาให้เล่นได้จริง โมเดล Arknights (แบนด์ล่างเล่นได้) จึงตรงกับของที่มีอยู่แล้ว ไม่ใช่โมเดลที่เลือก
มาลอย ๆ

`rarity` ordinal ยืนที่ **4 ชั้น** ตาม schema เดิมพอดี ไม่ต้องแก้ schema:

```
ord[common] 0  <  ord[rare] 1  <  ord[epic] 2  <  ord[legendary] 3
```

**แก้ไข 2026-08-13 (แทนที่ข้อความเดิมที่เคยเขียนว่า "Standard Banner ยังคง 3 แบนด์ — common เป็น
banner type ที่สอง") — Standard Banner เดียวถือครบ 4 แบนด์ตั้งแต่วันแรก ไม่มี banner ที่สอง**

ตรวจ 5 exemplar ที่สำรวจตลอดเอกสารนี้ (Genshin/HSR/FGO/Arknights/Blue Archive) แล้วพบว่า **ไม่มีเกม
ไหนแยก banner ตาม rarity เดียว** — banner จำกัดเวลาต่างจาก permanent ที่ "ใครอยู่ในพูล" ไม่ใช่
"มีกี่แบนด์" ทุก banner มีครบทุกระดับความหายากเสมอ การตัดสินใจเดิมที่แยก `common` ออกเป็น banner
ที่สองไม่มี exemplar หนุนหลัง

`B[common]` **ประกาศไว้ตั้งแต่วันนี้** แม้ `N_common = 0` — **`I3` บล็อกทั้ง banner ไม่ให้เปิดจนกว่า
`common` จะมีตัวจริง** (`B[r] > 0 => N_r >= 1`) นี่คือกลไกที่ทำหน้าที่กันไม่ให้ asset pipeline ไป
ขยับ rate ของ 3 แบนด์ที่ ship อยู่แล้วอยู่แล้วโดยธรรมชาติ (ข้อห้ามข้อ 1 ของกฎ §1) — **ไม่ต้องสร้าง
banner ที่สองเพื่อแก้ปัญหาเดียวกัน** เพราะ `B` ทั้ง 4 ค่าถูกประกาศนิ่งพร้อมกันตั้งแต่วันแรก ไม่มีวัน
redistribute เนื่องจากไม่เคยมีแค่ 3

**§8 ข้อ 11 ปิดแล้ว** — ไม่มี banner type ที่สองให้ author `preserve_relative_progress=false`
(§11.5b) ยังคงเป็น base ที่ล็อกไว้ถูกต้อง แต่ยังไม่มี banner ให้ผูกวันนี้ เก็บไว้เป็น infrastructure
สำหรับ banner จำกัดเวลาจริงในอนาคต (ที่ทุก exemplar มี) ซึ่งเป็นคนละคำถามจาก "บ้านของ common"

### 11.3 การแบ่งแบนด์ล่าง — geometric, `r` ตกจากสมการ

```
B[r] = B[top] * r^(3 - ord[r])          หา r จาก  B[top] * (1 + r + r^2 + r^3) = 1

r = 2.686857   (ตกลงมาเอง ไม่มีใครเลือก — ห่างจากสัดส่วน epic:rare ที่ ship อยู่ (2.800) แค่ 4%)

legendary   0.0330000    3.3000 %
epic        0.0886663    8.8666 %
rare        0.2382337   23.8234 %
common      0.6401000   64.0100 %      <- absorber, ดูดเศษปัดให้ SUM = 1 พอดี
SUM         1.0000000
```

verify I12 (monotone ต่อตัว, roster วันนี้ 2 legendary/3 epic/2 rare/0 common):
`0.0165 < 0.02956 < 0.11912` — ผ่าน · เพดาน roster ใหม่: `N ของแบนด์ล่าง < 2.687 x N ของแบนด์เหนือ`
(กว้างกว่าเพดานเดิมที่ 3 แบนด์ ซึ่งเคยแคบสุดที่ `N_rare < 2.800 x N_epic`)

### 11.4 rarity ซื้ออะไร — **star cap**, ไม่ใช่ตัวคูณ base ใหม่

**คำตอบ**: ยิ่งดาวสูง base stat ยิ่งดี (owner) — ผูกกับกลไกที่มีอยู่แล้ว แทนที่จะคิดตัวคูณใหม่
(`X`) ลอยๆ ไม่มีที่มา (ค้นแล้ว ไม่มีเกมไหนประกาศตัวคูณ stat ข้าม rarity ทางการ ต่างจาก drop rate
ที่ถูกกฎหมายบังคับเปิดเผย — Arknights ให้หลักฐานเชิงโครงสร้างแทน: rarity ซื้อ "เพดานที่สูงกว่า"
ไม่ใช่ตัวเลขที่ใหญ่กว่าตั้งแต่วันแรก)

```
STAR_MULTIPLIERS (มีอยู่แล้ว, starScaling.ts, Blueprint §4.3, ★6 <= 130% ★1):
  1: 1.00   2: 1.06   3: 1.12   4: 1.18   5: 1.24   6: 1.30

rarity -> star cap (ใหม่, ล็อกวันนี้):
  legendary   cap ★6   ->  1.30
  epic        cap ★5   ->  1.24
  rare        cap ★4   ->  1.18
  common      cap ★3   ->  1.12
```

**ไม่มี base term ใหม่ (`X`) ต้องเคาะ** — ทุกค่ามาจากตารางที่ Blueprint §4.3 ล็อกไว้แล้ว
ต้นทุนพ่วงเองผ่าน `L[r][k]` (rarity ต่ำ ปั้นได้ถึงแค่ cap ของตัวเอง ไปไม่ถึงเพดาน legendary)

verify monotone ทั้งสองทาง (rate ลง = power ที่ cap ก็ลงตาม, ไม่กลับหัว):

```
                B ต่อแบนด์      star cap    power ที่ cap (base rate x cap)
legendary       3.3000 %        1.30        4.290
epic            8.8666 %        1.24        10.995
rare           23.8234 %        1.18        28.112
common         64.0100 %        1.12        71.691
```

**ผลกระทบต่อ roster วันนี้ (ยังไม่แก้ในรอบนี้ — งานที่ค้าง)**:
`pig-warrior`(epic) base 1673 > `monkey-king`(legendary) base 1446 · `sand-sage`/`nezha-warden`
(rare) แรงกว่า `pilgrim-monk`/`celestial-archer`(epic) — 3 จุดกลับหัว ต้อง re-tier ทั้ง 7 ตัวให้ตรง
กับ rarity ที่ประกาศ ก่อน banner นี้ publishable จริง (`baseBudget[archetype]` ยังไม่มี — เป็นงาน
แยกจากข้อนี้)

### 11.5 `P[legendary]` = 100 — ล็อกแล้ว, แทนที่ `P=30` เดิม (หัวข้อนี้เคยเขียน 80 — แก้ 2026-08-15)

**ที่มา**: ไม่มี P ที่ประกาศทางการซ้ำกันสักคู่ใน 6 เกม (30 นี้เอง / 50 BA-beginner / 80 Genshin /
90 HSR / 99 Arknights-nominal / 200 BA-regular / 330 FGO) — ไม่มีเสียงข้างมากให้ลอกที่ตัวเลขดิบ
ต้องเทียบที่ **reach** แทน (สัดส่วนที่ชนเพดานจริง คำนวณจาก `B[top]` ของแต่ละเกมเอง ไม่ใช่ P ดิบ)

`FGO` เป็น flat-rate แท้เหมือนเรา (ไม่มี soft-pity ramp แบบ Genshin/HSR — เทียบตรงได้) reach ทางการ
= 7.1% (`0.992^329` ที่ B=0.8%) ที่ `B[top]=0.033` ของเรา `tau=0.071` ให้:

```
P = ceil( ln(0.071) / ln(1 - 0.033) ) + 1 = 80
reach จริงที่ P=80  =  (1-0.033)^79  =  7.06 %    (ตรงกับ FGO ถึงทศนิยม 2 ตำแหน่ง)
```

`P=80` ตรงกับตัวเลขดิบของ Genshin **โดยบังเอิญ** (สองสายมาบรรจบ — reach จาก FGO, ตัวเลขดิบจาก
Genshin — ไม่ได้จูนให้ตรงกัน) → เลือกเพราะมีน้ำหนักสองทาง ไม่ใช่เลือกเพราะเป็นเลขที่ใครนิยมสุด

```
เทียบ P=30 (เดิม, derive จาก B=0.05 ที่เลิกใช้แล้ว) vs P=80 (ตัวเลือกกลาง) vs P=100 (ล็อกจริง):
  P=30  @ B=0.033   reach 37.79%   E=19.23 pull   <- ถ้าไม่ขยับ P จะพึ่ง pity หนักกว่าทุก exemplar
  P=80  @ B=0.033   reach  7.06%   E=28.23 pull   <- ตรง FGO
  P=100 @ B=0.033   reach  3.61%   E=29.25 pull   <- ล็อกจริง (owner, 2026-08-12)
```

**owner ล็อก `P[legendary]=100`** (แทนที่ `P=80` ที่เสนอไว้ก่อน) — ยังผ่าน I9 สบาย
(`tau_min=0.01 <= reach 3.61% <= tau_max=0.10`) ไม่ต้องขยับขอบ reach ต่ำกว่า Genshin/HSR (80-90)
เข้าใกล้ FGO มากขึ้น (7.1%→3.61%) พึ่งการันตีน้อยลง สุ่มธรรมชาติมากขึ้น

ต้นทุนเฉลี่ยต่อ legendary ที่ `c=16` (§11.8): `29.25 pull x 16 gem x ฿0.5 = ฿233.97`

**owner ล็อกทาง (ก) — migrate ตามสัดส่วน (2026-08-12)**: ผู้เล่นที่มี `gacha_pity.pity_count`
ค้างอยู่แล้วก่อนเปลี่ยน `P` (30→100) ให้คง **ความคืบหน้าสัมพัทธ์** ไว้แทนที่จะยืดระยะหรือรีเซ็ต

```
count_new = round( count_old x P_new / P_old )  =  round( count_old x 100/30 )
```

ตรวจสัดส่วนคงที่ทุกจุด (คลาดเคลื่อนจากการปัดเศษ ≤0.3 จุดเปอร์เซ็นต์):

```
count_old=5  (16.7% ของ 30)  ->  17  (17.0% ของ 100)
count_old=15 (50.0% ของ 30)  ->  50  (50.0% ของ 100)
count_old=25 (83.3% ของ 30)  ->  83  (83.0% ของ 100)
count_old=29 (96.7% ของ 30)  ->  97  (97.0% ของ 100)
```

**ยังไม่ implement** — banner `active=false` วันนี้จึงยังไม่กระทบใคร แต่ต้องเช็คว่ามีแถวไหนใน
`gacha_pity` สะสม `pity_count > 0` อยู่แล้วหรือไม่ ก่อนวันที่เปิด banner จริง ถ้ามี ต้อง `UPDATE`
ทุกแถวด้วยสูตรนี้ในทรานแซกชันเดียวกับ migration ที่แก้ `B`/`P`/`c`/`d`

**ยังไม่ตัดสิน**: ทาง (ค) เพิ่ม column เก็บ `pity_threshold_at_time` เพื่อแก้ปัญหานี้ถาวร (ไม่ต้อง
migrate ทุกครั้งที่ `P` เปลี่ยนในอนาคต) — เป็นคนละคำถามจากการ migrate ครั้งนี้ ยกไปรวมกับข้อ 14
(schema placement)

### 11.5b `preserve_relative_progress` — base ต่อ banner TYPE, owner ล็อกกาชา 2 แบบ (2026-08-12)

**คำตอบ**: ไม่ใช่กฎเดียวทั้งระบบ เป็น **base ที่ scope ต่อ banner type** (boolean) ตรงกับรูปที่ §1
วางไว้แล้วสำหรับ `B`/`P`/`d` — ทุกค่าเป็น base เขียนครั้งเดียวต่อ banner type ไม่ใช่ค่าคงที่ข้ามระบบ

```
preserve_relative_progress[type]   boolean

type = permanent (Standard Banner)   ->  true
  count_new = round( count_old x P_new / P_old )      <- สูตรที่ล็อกไว้ข้างบน (§11.5, 30->100)

type = limited/event (banner ประเภทที่สอง, ยังไม่ authored — ดู §8 ข้อ 11)   ->  false
  count_new = 0   ทุกครั้งที่ threshold/pool ของ banner instance นั้นเปลี่ยน หรือ banner จบรอบ
```

**เหตุผล**: banner permanent ผู้เล่นสะสมความคืบหน้าไว้ต่อเนื่องไม่มีกำหนดจบ สมควรได้รับการปกป้อง
ตอนปรับสมดุล (เหมือนที่ทำกับ Standard Banner ข้างบน) banner ชั่วคราว/หมุนเวียนไม่มีข้อผูกพันสะสม
ข้ามรอบ เปิดใหม่แต่ละครั้งถือเป็นบริบทใหม่ รีเซ็ตได้โดยไม่ต้องคำนวณสัดส่วน

**⚠️ ไม่มี exemplar หนุนหลังข้อนี้ — เป็นนโยบายโปรเจกต์เอง ไม่ใช่สิ่งที่ลอกมา**: 6 เกมที่สำรวจไว้
(Genshin/HSR/FGO/Arknights/Blue Archive/FEH) มีกลไก**แยก pity pool ตาม banner family**
(Character/Weapon/Standard คนละ pool) ซึ่งเป็นคนละแกนจากที่นี่ ไม่มีข้อมูลยืนยันว่าเกมเหล่านี้ทำ
อย่างไรตอน**ปรับ P ของ banner เดิม** (เหตุการณ์หายาก ไม่ได้ค้นรอบนี้) บันทึกไว้ตรง ๆ

**แก้ไข 2026-08-13 — ไม่ผูกกับ `common` อีกต่อไป**: §11.2 ปิดข้อ 11 แล้วโดยไม่สร้าง banner type
ที่สอง (`common` เป็นแบนด์ที่ 4 ของ Standard Banner เดียว ไม่ใช่ banner แยก) `preserve_relative_
progress = false` ยังคงเป็น base ที่ล็อกไว้ถูกต้อง แต่รอ banner จำกัดเวลาจริงในอนาคต (ที่ไม่เกี่ยว
กับ `common`) มา author ก่อน ถึงจะมี migration ให้เขียนสำหรับแบบที่ 2

`tau_min`/`tau_max` (I9): ตั้ง `tau_max = 0.10`, `tau_min = 0.01` ครอบทั้ง `P=80` และ `P=100`
ไว้ในช่วง — กันทั้งสองด้าน (`P` ต่ำเกินจนแทบทุก pull เป็น pity อย่าง `P=1`, และ `P` สูงเกินจน pity
ตายเหมือนกรณี `B=0.30` ที่วัดไว้ใน §Break)

### 11.6 `d` (ส่วนลด multi-pull) — ล็อกแล้ว, `d = 0` · `cost_multi = 10 × c` ตกจากสูตรเสมอ (หัวข้อนี้เคยเขียน `900 → 1000` ซึ่งเป็นค่าก่อน §11.8 ล็อก `c=16` — แก้ 2026-08-15)

**คำตอบ**: `d` เป็น **base ต่อ banner** (ตามที่ §3 นิยามไว้แล้ว — "หนึ่ง scalar ต่อ banner,
default 0") ไม่ใช่ค่าคงที่ทั้งระบบ ลูกผสมที่ owner เลือก ("ตั้งได้ + ไม่ตั้งก็ได้") **คือรูปที่กฎ
มีอยู่แล้ว** ไม่ต้องเพิ่มกลไกใหม่ — banner ไหนอยากลดราคาก็ประกาศ `d` ของตัวเอง banner ไหนไม่ตั้ง
ใช้ default `d=0`

**invariant ใหม่**:

```
I17   cost_multi = ceil( K x c x (1 - d) )
```

`cost_multi` ต้องตกจากสูตรนี้เสมอ พิมพ์แยกจากสูตร = ละเมิด I17 ทันที กันไม่ให้ส่วนลดที่ไม่ประกาศ
ซ่อนอยู่ในราคาแบบที่ `900` เดิมเป็น (ซ่อน `d=0.10` ไว้โดยไม่มีใครเขียน)

**Standard Banner — owner ยืนยันแล้ว (2026-08-12)**:

```
d = 0   (ไม่ประกาศส่วนลด — ตรงกับทุก exemplar: Genshin/HSR/Arknights/Blue Archive ทั้งหมด d=0)
cost_multi = ceil(10 x c x 1)     <- ตกจาก c โดย I17 เสมอ, ค่า c ล็อกใน §11.8 (ไม่ใช่ 1000 อีกต่อไป)
```

banner โปรโมชั่นในอนาคต (ถ้ามี) ประกาศ `d > 0` ของตัวเองได้ พร้อมเหตุผล ไม่กระทบ Standard Banner

### 11.8 `c` (cost_single) — ล็อกแล้ว, `c=16`, `cost_multi=160`

**วิธี**: ตรวจแล้วว่า "ราคาเดียวกันทุกประเทศ" (flat global USD) เป็นสมมติฐานที่ผิด — เกมกาชาสายใหญ่
ทำ regional pricing จริง (SEA ต่ำกว่า USD nominal 50-70%) โปรเจกต์นี้ขายตลาดไทยเดียว ไม่มีราคา USD
ให้แปลง เพราะฉะนั้นใช้วิธี **burden ต่อค่าแรง** เทียบกับเกมจริง 9 จุด (สกุลเงินท้องถิ่นเทียบค่าแรง
ท้องถิ่น ไม่ผ่าน FX) แทน

**ข้อผิดพลาดที่แก้ระหว่างทาง**: รอบแรกใช้ค่าแรง**ขั้นต่ำ**เป็นตัวหารทุกประเทศ ทำให้จีนดูแพงผิดปกติ
(12.70-15.88%) — ตรวจแล้วค่าแรงขั้นต่ำจีนอยู่แค่ 18-26% ของค่าแรงเฉลี่ย (ต่ำกว่า OECD เฉลี่ย 55%
มาก) ขณะที่ไทยอยู่ 47-66% ตัวหารจึงไม่เท่าเทียมกัน แก้เป็นค่าแรง**เฉลี่ย**ทุกประเทศแล้วจีนเข้ากลุ่ม
เดียวกับ JP/KR/US ทันที (3.36-4.20%, ไม่ใช่ตัวนอกกลุ่มอีกต่อไป)

**ชุดข้อมูลสุดท้าย (9 เกมจริง, ค่าแรงเฉลี่ยประเทศตัวเอง)**:

```
เกาหลี — Blue Archive (เฉลี่ย)      0.94%
ญี่ปุ่น — FGO คุ้มสุด               0.98%
สหรัฐฯ — Genshin                    1.00%
สหรัฐฯ/ญี่ปุ่น — FEH คุ้มสุด          1.08%
เกาหลี — Blue Archive (median)      1.15%
สหรัฐฯ/ญี่ปุ่น — FEH เล็กสุด          1.32%
ญี่ปุ่น — FGO เล็กสุด               1.48%
จีน — Genshin/HSR                   3.36%
จีน — Arknights                     4.20%

ค่าเฉลี่ย 1.72%  ·  มัธยฐาน 1.11%  ·  ช่วง 0.94-4.20%
```

**เลือกมัธยฐาน (1.11%)** เพราะทนต่อ CN-outlier มากกว่าค่าเฉลี่ย และใช้**ค่าแรงเฉลี่ยทั้งประเทศ**
ของไทย (฿15,700/เดือน ÷ 21.75 วัน = ฿721.84/วัน) เพื่อให้ตัวหารสอดคล้องกับที่ใช้กับ CN/JP/KR/US
ทุกจุด (national average ไม่ใช่ city-tier)

```
c = 1.11% x ฿721.84 = ฿8.01
c_gem = 8.01 / ฿0.5/gem = 16.02   ->  ปัด 16 gem
cost_multi = ceil(10 x 16 x 1) = 160 gem = ฿80.00     [I17]
```

**owner ยืนยัน c=16 (2026-08-12)**

burden จริงที่ค่านี้ = `16 gem x ฿0.5 / ฿721.84` = **1.11%** ตรง median เป๊ะ

**ราคาที่ ship อยู่ (`c=100`, 10 ครั้ง=฿500) แพงกว่าค่าที่ล็อกใหม่ 6.25 เท่า** ไม่ใช่แค่ที่เคยเสนอ
`c=240`/`c=68`/`c=85` เท่านั้นที่ผิดสัดส่วน — ราคาเดิมที่ ship อยู่บน production ก็แพงกว่ามาตรฐาน
โลกตั้งแต่ต้น ตาม I17 ราคาขึ้น/ลงจริงต้องรวมอยู่ใน migration เดียวกับที่แก้ `B`/`P`/`d` ก่อนเปิด
banner banner `active=false` วันนี้จึงยังไม่กระทบผู้เล่นจริง

**ข้อจำกัดที่ยังไม่ verify**: ค่าแรงเฉลี่ย (ไม่ใช่ขั้นต่ำ) ของ JP/KR/US ผ่านการค้นแล้ว (398,000 เยน/
เดือน, 4,247,765 วอน/เดือน, $1,250/สัปดาห์ median) แต่ราคา pull ของ FGO/FEH/Blue Archive ที่ใช้
เป็นค่าประมาณจากช่วง ไม่ใช่ตัวเลขนิ่งเดียวจาก official store โดยตรงทุกจุด — ผลกระทบต่อ `c=16`
ต่ำ (median ทนต่อความคลาดเคลื่อนของจุดเดียว) แต่ควรบันทึกไว้ว่าไม่ใช่ตัวเลข verify สมบูรณ์ 100%

### 11.9 สถานะ §8 หลังข้อนี้

ปิดแล้ว: ข้อ 1 (`B[top]` + corridor + จำนวนแบนด์ + การแบ่งแบนด์ + rarity→star cap), ข้อ 2
(`P[legendary]=100`, `tau_min=0.01`/`tau_max=0.10`, pity migration formula + preserve_relative_progress),
ข้อ 3 (`d=0`, I17), ข้อ 4 (`c=16`, `cost_multi=160`, median-burden method), ข้อ 5 (`S[r]`, ดู §11.10)
ยังเปิด: 6 (`L[r][k]`), 7 (epic pity), 8 (soft pity vs blueprint), 9 (`u`),
10 (`BATCH_01_GACHA_BANNER`), 11 (banner type ที่สอง — ตอนนี้คือบ้านของ `common` +
`preserve_relative_progress=false`), 14 (schema placement)

### 11.10 `S[r]` (shard ต่อ duplicate) — ล็อกแล้ว, derive จาก `r` ที่มีอยู่แล้ว (§11.3), ไม่มีเลขใหม่

**คำตอบ**: ไม่ต้องเลือกเลขใหม่ — ใช้ `r=2.686857` ตัวเดียวกับที่ derive การแบ่งแบนด์ (§11.3) ซ้ำ
เพราะคุณสมบัติ geometric split ทำให้ `B[common]/B[r] = r^(ord[common]-ord[r])` อยู่แล้วในตัว

```
S[r] = B[common] / B[r]        anchor: S[common] = 1  (ค่า S=1 เดิมที่ ship อยู่ ไม่ใช่เลขใหม่)

S[common]    = r^0 = 1.000
S[rare]      = r^1 = 2.687
S[epic]      = r^2 = 7.219
S[legendary] = r^3 = 19.398
```

เทียบ exemplar (ไม่ได้จูนให้ตรง แค่ตรวจว่าอยู่ในกรอบ): FGO 90/50/30 (~1.7-1.8x/ขั้น), Arknights
10/5→15/8 (~2x/ขั้น), Blue Archive 30/5/1 (~5-6x/ขั้น) — `r=2.687x` ต่อขั้นอยู่ระหว่างกลุ่มพอดี

**ตรวจ pulls-to-terminal ต่อตัวละคร** (roster วันนี้ 2 legendary/3 epic/2 rare, `L` sum=27):

```
legendary   84.36 pull
epic       126.54 pull    <- ช้ากว่า เพราะแบนด์ epic มี 3 ตัวแบ่งกัน (legendary/rare มีตัวละ 2)
rare        84.36 pull
```

**ไม่ใช่ข้อบกพร่อง** — `S[r]` ผูกกับ*แบนด์*เท่านั้นตามที่กฎ §1 กำหนด (ไม่รู้จักจำนวนตัวใน pool)
แบนด์ไหนมีตัวละครเยอะ ทุกตัวในแบนด์นั้นช้าลงเท่ากันหมด สอดคล้องกับหลักที่ว่าความคืบหน้า asset
เปลี่ยนได้แค่ pool membership ไม่เคยเปลี่ยน rate — เป็นผลข้างเคียงที่ยอมรับได้ ไม่ต้องแก้

**⚠️ ไม่มี exemplar ยืนยันตรงว่าเกมไหนใช้ geometric progression แบบนี้จริง** — 3 เกมข้างบนใช้ตัวเลข
authored เอง ไม่ใช่สูตร `r^k` เรา derive เอาเองจาก `r` ที่มีอยู่ เพื่อไม่ต้องเพิ่ม base ใหม่ ผลลัพธ์
บังเอิญอยู่ในกรอบ exemplar แต่ไม่ได้แปลว่ามีเกมไหนทำแบบนี้จริง บันทึกไว้ตรง ๆ

### 11.10b `S[r]` — เปลี่ยนเป็น FREEZE, ตัด tie จาก `B[top]`/`r` (owner, 2026-08-12)

**เหตุผลที่แก้**: `S[r]` ที่ derive จาก `r` (§11.10 ข้างบน) หมายความว่าทุกครั้งที่ `B[top]` ถูก
re-ratify ในอนาคต (แม้แค่ปรับ "ความรู้สึกตอนสุ่ม") **เศรษฐกิจการปั้นดาว** จะขยับตามไปด้วยโดยไม่มี
ใครตั้งใจแตะ — วัดช่วงสุดขั้วของ corridor แล้วต่างกันถึง **14 เท่า** (`B[top]=0.6%` ให้
`S[legendary]=134.32` ในขณะที่ `B[top]=6.0%` ให้ `S[legendary]=9.19`) สองระบบที่เป็นคนละเรื่องกัน
โดยธรรมชาติ (ความหายากตอนสุ่ม vs ต้นทุนปั้นครบดาว) ไม่ควรผูกเชือกเดียวกัน

**ค้นแล้ว ไม่มีเกมไหนผูก `S[r]` เข้ากับ drop rate ด้วยสูตร** — Blue Archive (30/5/1), FGO (90/50/30),
Arknights (10/5→15/8) ทุกตัวเป็นเลข authored ตายตัวแยกต่างหาก ไม่มีเกมไหนคำนวณจาก `B[r]` เลย
(FGO เคยเปลี่ยน rate จริง 0.7%→0.8% ปี 2022 พร้อมเพิ่มระบบ pity — ค้นไม่เจอว่าปรับ shard พร้อมกัน
หรือไม่ ไม่ยืนยันทั้งสองทาง) เพราะฉะนั้น **exemplar ทุกตัวชี้ไปทาง Freeze ไม่มีตัวไหนชี้ไปทางผูก**

**ค่าที่ล็อก** — ปัดจากค่า derive เดิม (§11.10) เป็นจำนวนเต็มตรง ๆ ไม่สร้าง pattern ใหม่:

```
S[common]    = 1
S[rare]      = 3     (จาก 2.687)
S[epic]      = 7     (จาก 7.219)
S[legendary] = 19    (จาก 19.398)
```

`S[r]` กลายเป็น **base อิสระ** ตั้งแต่นี้ — ไม่ใช่ derived value อีกต่อไป การ re-ratify `B[top]`
ในอนาคตจะไม่กระทบ `S[r]` เลย (เปลี่ยนคนละครั้ง คนละเหตุผล ต้องตัดสินใจแยกกัน)

**ตรวจ pulls-to-terminal ด้วยเลขที่ปัดแล้ว** (roster วันนี้ 2 legendary/3 epic/2 rare, `L` sum=27):

```
legendary   86.12 pull   (จาก 84.36 — ใกล้เคียงเดิม)
epic       130.51 pull   (จาก 126.54)
rare        75.56 pull   (จาก 84.36)
```

ทิศทางเดียวกับก่อนปัด (epic ยังช้าสุด ด้วยเหตุผลเดียวกับ §11.10 — แบนด์มี 3 ตัวแบ่งกัน) ไม่มีอะไร
กลับหัวจากการปัดเศษ

### 11.11 `L[r][k]` — ล็อกแล้ว, rarity-specific 3-step ladder ★2→★5, `dup=6` ทุก rarity (2026-08-12)

**แทนที่ `L=1/2/4/8/12` เดิม (rarity-blind) และแทนที่ star cap ของ §11.4 (legendary★6/epic★5/
rare★4/common★3) ด้วยรูปใหม่**: ทุก rarity เริ่ม **★2** เพดานรวม **★5** เท่ากันหมด (3 ขั้น:
★2→★3→★4→★5) ต้นทุนต่อขั้นคงที่ (ไม่โตขึ้นแต่ละขั้น) แต่ต่างกันตาม rarity

**⚠️ ขัดกับโค้ดปัจจุบัน 2 จุด ยังไม่ implement**:

1. `starScaling.ts` วันนี้ทุกตัวเริ่มที่ `Math.max(1, star)` = **★1 เสมอ** ไม่มี rarity ไหนเริ่มสูงกว่า
   — ต้องเพิ่มกลไก `startStar[rarity]=2` ใหม่ ไม่ใช่แค่แก้ตาราง
2. `MAX_STAR_TIER=6` และ `STAR_MULTIPLIERS` มีถึง ★6 — ถ้าเพดานจริงคือ ★5 ทุก rarity แล้ว ★6
   กลายเป็นค่าตายที่ไม่มีใครเข้าถึง ต้องตัดสินว่าจะลบ ★6 ออกจากตาราง หรือเก็บไว้เผื่ออนาคต

**รอบแรกที่เสนอ (`legendary=100/epic=60/rare=40/common=20` ต่อขั้น) วัดแล้วพัง**: ต้องใช้ตัวซ้ำ
**16 ตัว** (1+15) ต่อ legendary หนึ่งตัวถึงจะครบดาว — หนักกว่า FGO NP5 (5 ตัว) **3 เท่า** และหนักกว่า
Arknights Potential 6 (**0 ตัว** — มีทางอื่นไม่ต้องพึ่งกาชาเลย) จนไม่มีสัดส่วน `pulls-to-terminal`
909 pull ต่อ legendary หนึ่งตัว = **฿7,272** ที่ `c=16` (~10 วันค่าแรงเฉลี่ยไทย)

**ค่าที่ล็อกจริง — `dup=6` ทุก rarity เท่ากัน** (ตรงกับที่ Genshin/FGO ทำจริง: ทุก 5★ ต้องการ
C6/NP5 จำนวนเท่ากันหมด ไม่ต่างกันตามตัวละคร) เลือก `6` เพราะเป็นจุดเดียวที่หารลงตัวกับ `S` ทั้ง 4
rarity พร้อมกัน (`dup × S[r]` ต้องหารด้วย 3 ขั้นลงตัว — บังคับให้ `dup` เป็นพหุคูณ 3 สำหรับ
common/epic/legendary เพราะ `gcd(3,S)=1`; `rare` ไม่บังคับเพราะ `gcd(3,3)=3`) และใกล้ FGO=5 ที่สุด
เท่าที่หารลงตัวได้

```
rarity      dup   total shard   ต่อขั้น (flat, 3 ขั้น)
common      6     6             2
rare        6     18            6
epic        6     42            14
legendary   6     114           38
```

**ตรวจ pulls-to-terminal + เงินไทยที่ `c=16`** (roster วันนี้ 2 legendary/3 epic/2 rare):

```
legendary   364 pull  =  ฿2,909    (Genshin C6 ~350-540 · FGO NP5 ~500-567 — เข้ากรอบแล้ว)
epic        203 pull  =  ฿1,624
rare         50 pull  =  ฿403
```

**เหตุผลที่ legendary ยังแพงกว่า epic/rare มาก**: 2 legendary แบ่ง `B[top]=3.3%` กันเอง (rate
ต่อตัวต่ำที่สุดในระบบ) เป็นผลตามธรรมชาติของความหายาก ไม่ใช่บั๊ก — สอดคล้องกับที่ Genshin/FGO ก็แพง
กว่า mid-tier มากเช่นกัน

**ยังไม่ตัดสิน**: (1) `startStar` mechanic ใหม่ต้อง implement จริง (2) ชะตากรรมของ `★6` ใน
`STAR_MULTIPLIERS`/`MAX_STAR_TIER` (3) Arknights ชี้ทางเลือกที่ไม่มีใครถามถึง — แยกพลังหลักออกจาก
ตัวซ้ำทั้งหมด (ทางเลือกอื่นไม่ต้องพึ่งกาชาเพื่อ max) ยังไม่ได้พิจารณาสำหรับโปรเจกต์นี้

### 11.12 `P[epic]` — ล็อกแล้ว, `P[epic]=10`, floor pity คนละหมวดจาก pity หลัก (2026-08-12)

**คำตอบ**: มี — `P[epic] = 10` วัดแล้วที่ 10 pull โอกาสไม่เจอ epic เลยสูงถึง **39.52%** ใกล้เคียง
Arknights (`B[5★]=8.0%`, การันตีใน 10) มากที่สุดในแผง เทียบกับ `B[epic]=8.87%` ของเรา — สูงพอที่ทุก
exemplar ที่มี ≥3 แบนด์เลือกกันไว้หมด ไม่ใช่ความเสี่ยงเล็กน้อยที่มองข้ามได้

**⚠️ คนละบทบาทจาก pity หลัก (legendary, `I9`) — ต้อง invariant ใหม่**: `1/B[epic]=11.28`
(pull เฉลี่ยตามธรรมชาติ) สูงกว่า `P[epic]=10` ที่ตั้งไว้ แปลว่า pity นี้ **ยิงบ่อยกว่าครึ่งของรอบ**
(reach 43.36%) ไม่ใช่กลไกกันโชคร้ายสุดขั้วแบบ legendary (reach 3.61% ที่ `P=100`) — เป็น **floor
guarantee** ที่จับคู่กับ `K=10` (ขนาด multi ที่ล็อกไว้แล้ว) ความหมายจริงคือ "ทุก 1 multi ต้องได้
epic อย่างน้อย 1 ตัว" ตรงกับที่ Genshin/Arknights ตั้ง mid-tier guarantee ไว้ที่ 10 ด้วยเหตุผล
เดียวกัน (กันไม่ให้ multi หนึ่งครั้งได้แต่ของกากล้วน ไม่ใช่กันเคสหายากสุดขั้ว)

```
I18   floor_tau_min=0.30 <= reach_secondary <= floor_tau_max=0.60
      ที่ P[epic]=10: reach=43.36%   ผ่าน (ครอบตรงกลางพอดี)
```

`I18` เป็นหมวดใหม่แยกจาก `I9` — `I9` คุม pity หลัก (target reach ต่ำ 1-10%, กันโชคร้ายสุดขั้ว)
`I18` คุม floor pity (target reach สูง 30-60% โดยตั้งใจ, การันตีพื้นฐานต่อ 1 multi) ทั้งสองอยู่คู่กัน
ไม่ทดแทนกัน

**`P[epic]` คุมแค่แบนด์ ไม่คุมว่าตัวไหน**: forced draw ยังสุ่ม `share(i)` ภายใน pool epic ตามสูตร
§2 เดิม (`u=0` วันนี้ = สุ่มเท่ากันทั้ง 3 ตัว แม้ตอน pity ก็ตาม) ตรงกับพฤติกรรมจริงของ Genshin/
Arknights ที่การันตี mid-tier แบบสุ่มในแบนด์ ไม่ใช่ targeted pity เจาะจงตัว featured — ไม่ต้องแก้
อะไรเพิ่มจากที่ล็อกไว้แล้ว `u` (ข้อ 9) ยังคุมแกนนี้แยกต่างหาก

### 11.13 soft pity vs blueprint — ล็อกแล้ว, แก้ blueprint (ทาง A) (2026-08-13)

**คำตอบ**: แก้ `docs/MASTER_BLUEPRINT_v3.0.md §7.1` จาก "soft/hard pity แบบ Genshin" เป็น
"flat-rate + hard pity แบบ FGO" — **ไม่สร้าง soft-pity ramp** แก้ไขแล้วในไฟล์จริง (ไม่ใช่แค่บันทึก
ในเอกสารนี้)

**เหตุผล**: ทุกสูตรที่ล็อกไปแล้วทั้งเซสชัน (`reach=(1-q)^(P-1)`, `E=(1-(1-q)^P)/q`, `I9`, `I18`)
ตั้งอยู่บนสมมติฐาน `q` คงที่ตลอด — เป็นรูปของ FGO ไม่ใช่ Genshin แม้ `B[top]` corridor และ `P=100`
จะอ้างอิงตัวเลขจาก Genshin เป็นจุดเทียบ แต่ไม่เคยลอกกลไก ramp ของมันมาใช้จริง การสร้าง soft ramp
จริงตอนนี้ต้อง re-derive `reach`/`E`/`I9`/`I18` ใหม่ทั้งหมด และ `L` totals (§11.11) ที่ calibrate
กับ `E=364 pull` ต้องคำนวณใหม่ตามไปด้วย — รื้อทุกข้อที่ปิดไปแล้วในเซสชันนี้ ทาง A (แก้เอกสารให้ตรง
ของจริง) ถูกกว่ามากและสอดคล้องกับโครงสร้างที่มีอยู่แล้ว

### 11.14 `u` (featured share) — ล็อกแล้ว, `u=0` ถาวร ไม่ใช่แค่ default (owner, 2026-08-13)

**คำตอบ**: `u = 0` **ตลอดไป** — ไม่ใช่ค่าเริ่มต้นที่รอ banner โปรโมทมาทับในอนาคต ทุกตัวในแบนด์
เดียวกันได้ `share` เท่ากันเสมอ ไม่มีวันมี "ตัวเด่นประจำรอบ" ในระบบนี้

**ที่มา — ไม่มีสูตร มีแต่หลักฐานว่าทำไมไม่ควรมีสูตร**: สำรวจ 5 เกม (Blue Archive 23% / Genshin·HSR
50% / Arknights 70% / Genshin·HSR weapon 75% / FGO 80%) ไม่มีคู่ไหนซ้ำกันเลย เพราะ `u` ไม่ใช่
ข้อเท็จจริงที่มีที่มาแบบ `B[top]`/`P` — แต่ละเกมตั้งตามกลยุทธ์การขายของตัวเอง ไม่มี corridor
ให้หากลาง

**ค้นแล้วพบกลไกที่วิจัยแล้วจริง ไม่ใช่แค่ความรู้สึก**: near-miss effect (Skinner, variable ratio
reinforcement, 1950s) และ goal-gradient effect ทำงานแรงที่สุดเมื่อเป้าหมายเจาะจง — `u>0` คือตัวแปร
ที่กำหนดตรงว่าเป้าหมายผู้เล่นแคบแค่ไหน (`u=0` = "อยากได้ epic สักตัว" เป้ากว้าง vs `u>0` = "อยากได้
ตัวนี้ตัวเดียว" เป้าแคบ) งานวิจัยตีพิมพ์ (ScienceDirect, _loot box use ↔ problematic gambling_,
ควบคุมตัวแปรพนันเงินจริงแล้วยังพบความสัมพันธ์) เชื่อมกลไกนี้กับการพนันปัญหาโดยตรง

**เพราะฉะนั้น `u=0` ไม่ใช่แค่ "ทางที่ไม่บิดเบือนน้อยที่สุด" ในบรรดา 23-80%** — เป็นจุดนอกช่วงที่ตัด
กลไกที่วิจัยแล้วว่าเชื่อมกับการพนันปัญหาออกทั้งหมด ต่างจาก `23%` (ต่ำสุดในแผง) ที่ยังคงกลไกไว้
เพียงแค่เบากว่า

**ตรวจ I10** (`u>0 => F_r>=1`): `u=0` ทำให้ I10 เป็นจริงเสมอโดยไม่มีเงื่อนไข ไม่ชนอะไรที่ล็อกไว้ก่อนหน้า
ไม่ต้องแก้ schema ไม่ต้องมี `featured` column เลยด้วยซ้ำ (โค้ดวันนี้ก็ไม่มีอยู่แล้ว)

### 11.15 `BATCH_01_GACHA_BANNER` — ล็อกแล้ว, ลบ (2026-08-13)

**คำตอบ**: ลบ — วัดแล้ว 2 จุดที่ตัดสินได้ตรง ๆ ไม่ต้องเดา:

1. **ไม่มีใครอ่านค่าจริง** — importer เดียวในทั้ง repo คือเทสต์ของตัวเอง
   (`heroProductionBatch.test.ts`) และเทสต์นั้นเช็คแค่ `isCharacterInBatch01Pool()` (pool
   membership) ไม่มีที่ไหนอ่าน `costGems`/`softPityAt`/`hardPityAt`/`weight` ไปใช้จริงเลย
2. **เลขคือ Genshin แปะตรง ๆ** — `costGems:160` / `softPityAt:74` / `hardPityAt:90` ตรงกับ
   Genshin เป๊ะทั้งสามตัว ไม่ใช่เรื่องบังเอิญ ไฟล์เองก็มี comment ยอมรับ:
   _"รอ P9 engine merge... rate/pity ตัวเลขยัง NON-PRODUCTION"_

P9 engine (`perform_gacha_pull`, `gacha_banners` table) มาแทนที่หมดแล้ว และทุกตัวเลขในไฟล์นี้ถูก
แทนที่โดยงานที่ล็อกไปแล้วทั้งเซสชัน (`weight` → `drop_rate`/`B` §11.1-11.3 · soft pity → ปฏิเสธแล้ว
§11.13 ทาง A · ราคา → `c=16` §11.8) ไม่เหลืออะไรให้ author เป็นจริง — ไม่ใช่ตัวเลือก "ทำเป็น banner
จริงหรือลบ" อีกต่อไป มีทางเดียว

**ลงมือแล้ว**: ลบ `src/game/heroes/gachaPool.ts` · ลบ import + test block ที่อ้างถึงใน
`heroProductionBatch.test.ts` (เทสต์เดิมวัดแค่ dead code เช็คตัวเอง ไม่ได้วัดอะไรจริง) · ตรวจ
`grep` ทั้ง `src/` สะอาด ไม่มีที่อ้างเหลือ · `npx vitest run heroProductionBatch.test.ts` — **19/19
เขียว**

## 12. สถานะ §8 — ปิดครบ 12/12 (2026-08-13)

**ปิดครบทั้ง 12 ข้อเดิม**: 1 (`B`/แบนด์/star cap, §11.1-11.4), 2 (`P=100`/tau/migration/
`preserve_relative_progress`, §11.5-11.5b), 3 (`d=0`/I17, §11.6), 4 (`c=16`/`cost_multi=160`,
§11.8), 5 (`S`=1/3/7/19 frozen, §11.10-11.10b), 6 (`L`=6dup ทุก rarity, §11.11), 7 (`P[epic]=10`/
I18, §11.12), 8 (blueprint แก้แล้ว เป็น flat+hard, §11.13), 9 (`u=0` ถาวร, §11.14), 10
(`BATCH_01_GACHA_BANNER` ลบแล้ว, §11.15), 11 (ไม่ต้องมี banner type ที่สอง — `I3` บล็อกทั้ง
Standard Banner จนกว่า `common` จะมีตัวจริง แทน, §11.2 revision), 14 (schema placement ratify
DDL ตรงตามที่เสนอ, §11.16)

### 11.16 `14` schema placement — ล็อกแล้ว, ratify DDL ตรงตามที่เสนอ (owner, 2026-08-13)

**คำตอบ**: ratify ตรงตาม sketch — ไม่ใช่การตัดสินใจใหม่ เป็นผลสรุปบังคับจาก 11 ข้อที่ล็อกไปแล้ว
(ตัด `featured` ออกเพราะ `u=0` ถาวร §11.14 ทำให้ไม่จำเป็นต้องมี column นั้นเลย):

```sql
-- 1. B[r] ระดับแบนด์ — บังคับโดย I1/I2/I3 (§11.1-11.3) + drop_rate ต้องยังเป็น stored column (§11.10b)
create table gacha_banner_bands (
  banner_id  text not null references gacha_banners(id),
  rarity     text not null,
  band_rate  numeric(8,7) not null check (band_rate > 0 and band_rate <= 1),
  primary key (banner_id, rarity)
)

-- 2. w[i] — บังคับโดย I7 (§2)
alter table gacha_banner_pool add column weight integer not null default 1 check (weight >= 1)

-- 3. ord[r] — บังคับโดยสูตร pity_rarity (§2) + ลำดับ 4 ชั้นที่ล็อกแน่นอนแล้ว (§11.2)
create table rarity_order (
  rarity text primary key,
  ord    integer not null unique
)

-- 4. แยก pity counter ต่อ rarity — บังคับโดย P[epic]=10 (§11.12) ถึงจะ implement floor pity ได้จริง
alter table gacha_pity
  drop constraint gacha_pity_pkey,
  add column rarity text not null,
  add primary key (profile_id, banner_id, rarity)
```

`drop_rate` บน `gacha_banner_pool` คงเดิม เป็น stored `numeric(8,7)` พร้อม CHECK เดิม — เปลี่ยนแค่
"ใครเขียนมัน" จากพิมพ์มือเป็นฟังก์ชัน derive `B[r] × share(i)`

**ที่เหลือให้ปรับได้จริง มีแค่ชื่อ ไม่ใช่โครงสร้าง** — ชื่อตาราง/column และวิธี organize ทางกายภาพ
(แยกตารางใหม่ vs JSONB บนตารางเดิม) เปลี่ยนได้โดยไม่ขัด invariant ไหน แต่ **"มีข้อมูลอะไรบ้าง"**
ถูกล็อกไปหมดแล้วตั้งแต่ข้อ 1-12 ก่อนหน้า

**ยังไม่ทำ — migration ต้อง backfill แถวเก่า**: `gacha_pity` ที่มีแถวอยู่แล้ว (ถ้ามี) ต้อง backfill
`rarity='legendary'` ให้ทุกแถวเดิมก่อนเปลี่ยน PK (แถวเดิมทั้งหมดคือ pity ของ legendary อยู่แล้ว ตาม
ระบบเดิมที่มี pity แบนด์เดียว) — ไม่ implement รอบนี้ อยู่ในกลุ่มเดียวกับ migration อื่น ๆ ที่รอ
เปิด banner จริง

**นอกเหนือ 12 ข้อเดิม ที่ยังไม่ตัดสิน**: pity_count migration ของผู้เล่นเดิม **ปิดแล้ว** (ทาง ก,
สูตร `count_new = round(count_old × P_new/P_old)`, §11.5) · `startStar[rarity]=2` mechanic ที่
ยังไม่ implement จริง (§11.11) · ชะตากรรมของ `★6` ใน `STAR_MULTIPLIERS`/`MAX_STAR_TIER` (§11.11) ·
ทางเลือก Arknights-style (แยกพลังหลักออกจากตัวซ้ำทั้งหมด) ยังไม่ได้พิจารณาสำหรับโปรเจกต์นี้ (§11.11)

**ไฟล์จริงที่แก้ในเซสชันนี้** (นอกเหนือจากเอกสารนี้ที่ยังอยู่ scratchpad): `docs/
MASTER_BLUEPRINT_v3.0.md §7.1` · `MEMORY.md` + `MEMORY/archive/201-225.md` (item 216) · ลบ `src/
game/heroes/gachaPool.ts` + แก้ `src/game/heroes/heroProductionBatch.test.ts`

**เงื่อนไขก่อน merge เอกสารนี้เข้า repo จริง**: ต้องปิดข้อ 14 ก่อน · banner ยัง **ไม่ publishable**
อยู่ดีไม่ว่าข้อ 14 จะปิดเมื่อไหร่ เพราะ `monkey-king` ตก sprite conformance band 51× และยังไม่มี
`common` ตัวจริงสักตัว — ทั้งสองเป็นเงื่อนไขที่กฎ rate เพียงอย่างเดียวแก้ให้ไม่ได้

**เงื่อนไขก่อน merge**: banner นี้ยัง **ไม่ publishable** อยู่ดี เพราะ monkey-king ตก sprite conformance band และ legendary ตัวที่สองยังไม่มี asset gate ผ่าน PR ที่เพิ่มตัวละครเข้า pool ผ่านได้; PR ที่พลิก `active = true` ผ่านไม่ได้จนกว่า I6 จะเป็นจริง — ซึ่งตอนนี้เป็น predicate ไม่ใช่การกดสวิตช์
