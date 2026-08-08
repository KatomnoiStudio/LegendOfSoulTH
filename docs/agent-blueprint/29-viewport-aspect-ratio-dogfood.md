# Screen Aspect Ratio & Responsive Layout Dogfood (#29 / DF22)

> **Document Type**: Work Contract / Dogfood Testing Protocol  
> **Target System**: Responsive Viewport, Safe-Area & Aspect Ratio Scaling System  
> **Author**: Antigravity  
> **Approved By**: HetCreep (Ring 0)  
> **Core Principle**: **Pin (X + Y) + Base Dimension (W × H) + Outer Adaptive Scale Wrapper**

---

## 1. Core Architecture & Mathematical Principle

ระบบการจัดวาง UI และการเรนเดอร์ภาพของ _Legend of Soul TH_ ใช้สถาปัตยกรรม **3-Layer Pin-Scale Layout**:

$$\text{Final Position} = \text{AnchorPin}(X, Y) + \left( \text{BaseOffset}(W, H) \times \text{AdaptiveScale} \right) + \text{SafeAreaInset}$$

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ Outer Viewport (Worldwide Aspect Ratios: 4:3 -> 32:9)                      │
│                                                                             │
│  [Top-Left Pin: Player Vitals]       [Top-Center: Stage Info]   [Top-Right] │
│                                                                             │
│                                                                             │
│                             GAMEPLAY CANVAS                                 │
│                         (Aspect Ratio Clamped /                             │
│                          Adaptive Camera View)                              │
│                                                                             │
│                                                                             │
│  [Bottom-Left Pin: Joystick]                  [Bottom-Right Pin: Cluster]   │
│   (X: 14%, Y: 76%, >=48px)                     (ATK + S1..S3 + ULT Arc)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

1. **Layer 1: Anchor Pins (X + Y)**
   - ยึดขอบและจุดอ้างอิงของหน้าจออย่างแม่นยำ ไม่เลื่อนไหลตามขนาดจอ:
     - `Top-Left`: ข้อมูลเลือด/สถานะผู้เล่น (Player Vitals)
     - `Top-Center`: เวลาด่าน, เป้าหมาย 3 ดาว (Stage Timer & Objectives)
     - `Top-Right`: ปุ่ม Pause, ข้อมูลบอส/ศัตรู
     - `Bottom-Left`: Virtual Joystick (ค่าเริ่มต้น X: 14%, Y: 76% จากขอบจอ)
     - `Bottom-Right`: Combat Action Cluster (ปุ่ม ATK หลัก พร้อมโค้งสกิล S1, S2, S3, ULT)
     - `Center`: หน้าต่างแจ้งเตือน (Modals), ผลการต่อสู้ (Victory/Defeat), เมนูเลือกตู้กาชา
2. **Layer 2: Base Dimensions (W × H) & Min Touch Targets**
   - ปุ่มทุกปุ่มและกล่องทุกกล่องมีขนาดเรขาคณิตฐาน (Base Geometry):
     - ปุ่ม ATK: เส้นผ่านศูนย์กลาง 92px
     - ปุ่ม Ultimate: เส้นผ่านศูนย์กลาง 66px
     - ปุ่มสกิล S1–S3: เส้นผ่านศูนย์กลาง 56px
     - **กฎเหล็ก**: ทุก Touch Target ต้องมีขนาดไม่ต่ำกว่า **48 × 48px** (WCAG / Mobile Usability Standard)
3. **Layer 3: Outer Adaptive Scale & Safe-Area Wrapper**
   - ครอบด้วยระบบสเกลปรับขนาดตามความละเอียดหน้าจอ (DPI / Viewport Scale)
   - ผสานขอบแหว่ง (Notch, Dynamic Island, Home Indicator Bar) ผ่าน CSS `env(safe-area-inset-*)`

---

## 2. Worldwide Screen Aspect Ratio Matrix (ตารางอัตราส่วนหน้าจอทั่วโลก)

### 2.1 แนวนอน (Landscape) — สัดส่วนหลักของการเล่นเกม (Primary Focus)

| กลุ่มอุปกรณ์                   | อัตราส่วน (Ratio) |              Viewport ตัวอย่าง               | อุปกรณ์ยอดนิยม                            | เกณฑ์การทดสอบ (Pass Criteria)                                   |
| :----------------------------- | :---------------: | :------------------------------------------: | :---------------------------------------- | :-------------------------------------------------------------- |
| **Ultra-tall Mobile**          | **20:9 / 20.5:9** |          `915 × 412`<br>`920 × 400`          | Galaxy S23/S24, Xiaomi 13, Pixel 8        | จอยสติ๊กและปุ่มสกิลไม่ชนขอบโค้ง, Safe-area ซ้ายขวาเว้นพอดี      |
| **Modern iPhone**              |    **19.5:9**     |          `844 × 390`<br>`932 × 430`          | iPhone 12/13/14/15/16 Pro Max             | ไม่โดน Dynamic Island / Notch บัง, Safe-area Inset ≥12px        |
| **Wide Mobile**                |  **18:9 (2:1)**   |          `720 × 360`<br>`800 × 400`          | สมาร์ตโฟน Android รุ่นมาตรฐาน             | คลัสเตอร์สกิลเรียงโค้งสวยงาม ระยะห่างปุ่ม ≥14px                 |
| **Standard Mobile / Handheld** |     **16:9**      | `667 × 375`<br>`1280 × 720`<br>`1920 × 1080` | iPhone SE, Nintendo Switch, จอมือถือ 16:9 | ไม่เกิดปุ่มซ้อนทับกัน (No overlaps), ปุ่มไม่ตกขอบล่าง           |
| **Compact Legacy Mobile**      | **16:9 Compact**  |                 `568 × 320`                  | iPhone 5/SE1, มือถือจอเล็ก                | ระบบ Scale ย่อขนาดอัตโนมัติ ปุ่มยังคงขนาดแตะได้ ≥48px           |
| **Laptop / Modern PC**         |     **16:10**     |        `1440 × 900`<br>`1920 × 1200`         | MacBook Air/Pro, Steam Deck, จอทำงาน      | ขยายพื้นที่บนล่าง ไม่เกิดแถบดำที่ไม่จำเป็น                      |
| **Tablet / iPad**              |   **4:3 / 3:2**   |        `1024 × 768`<br>`1366 × 1024`         | iPad Pro 11"/12.9", Surface Pro           | จอเกือบจัตุรัส คลัสเตอร์ปุ่มไม่ขยับเข้าหากันจนเกะกะสายตา        |
| **Foldable (Unfolded)**        |   **6:5 / 1:1**   |         `884 × 736`<br>`1080 × 1080`         | Galaxy Z Fold 5 (กางจอ), Pixel Fold       | HUD ด้านบนและปุ่มด้านล่างเว้นระยะปลอดภัย กล้องกลางไม่ถูกบดบัง   |
| **Ultrawide Desktop**          |  **21:9 / 32:9**  |        `2560 × 1080`<br>`3840 × 1080`        | จอโค้ง Ultrawide, Super Ultrawide         | ภาพไม่ยืดเบี้ยว (No Stretch Distortion), HUD ยึดขอบอย่างสง่างาม |

---

### 2.2 แนวตั้ง (Portrait) — โหมดหน้าจอแนวตั้ง

| กลุ่มอุปกรณ์        | อัตราส่วน (Ratio) |     Viewport ตัวอย่าง      | พฤติกรรมที่ถูกต้อง (Expected Behavior)                                                            |
| :------------------ | :---------------: | :------------------------: | :------------------------------------------------------------------------------------------------ |
| **Mobile Portrait** | **9:19.5 / 9:16** | `390 × 844`<br>`375 × 667` | แสดงผล `BattlePortraitOverlay` แนะนำให้ผู้เล่น "หมุนหน้าจอเป็นแนวนอน" หรือปรับ HUD เป็นโหมดรองรับ |
| **Tablet Portrait** |   **3:4 / 2:3**   |        `768 × 1024`        | ตรวจจับการหมุนหน้าจอ แจ้งเตือน Fullscreen/Orientation prompt อย่างนุ่มนวล                         |

---

## 3. เกณฑ์การทดสอบทางเรขาคณิต (Mathematical Pass Criteria)

ทุก Viewport ในตารางด้านบนต้องผ่านการทดสอบ 6 ข้อ:

1. **No Clipping / In-Bounds**:
   $$\forall \text{btn} \in \text{Controls}: \quad 0 \le \text{btn.x} - r \quad \land \quad \text{btn.x} + r \le \text{Viewport.Width} - \text{SafeArea.Right}$$
   $$\forall \text{btn} \in \text{Controls}: \quad 0 \le \text{btn.y} - r \quad \land \quad \text{btn.y} + r \le \text{Viewport.Height} - \text{SafeArea.Bottom}$$
2. **No Control Overlaps (ระยะห่างปุ่ม)**:
   $$\forall A, B \in \text{Controls} \; (A \ne B): \quad \text{Distance}(\text{Center}_A, \text{Center}_B) \ge r_A + r_B + \text{MIN\_BUTTON\_GAP\_PX}$$
3. **Minimum Touch Target (ความสะดวกในการสัมผัส)**:
   $$\forall \text{btn} \in \text{Controls}: \quad 2 \times r_{\text{touch}} \ge 48\text{px}$$
4. **Left-Right Hand Thumb Comfort Zone (การเข้าถึงด้วยนิ้วหัวแม่มือ)**:
   - จอยสติ๊กต้องอยู่ฝั่งซ้ายของจอ ($X \le 35\% \text{ Width}$)
   - ปุ่มสกิลและโจมตีต้องอยู่ฝั่งขวาของจอ ($X \ge 60\% \text{ Width}$)
5. **No Center Collision (ไม่บังพื้นที่การต่อสู้ตรงกลาง)**:
   - พื้นที่กึ่งกลางระหว่าง $X \in [35\%, 60\%]$ ด้านล่างต้องโล่ง เพื่อให้ผู้เล่นเห็นตัวละครและศัตรู
6. **Orientation Prompt Trigger**:
   - เมื่อ $\text{Width} < \text{Height}$ (Portrait) ตัวกรองต้องระบุ `isPortrait = true` และแสดงผลข้อความแจ้งเตือนอย่างถูกต้อง
