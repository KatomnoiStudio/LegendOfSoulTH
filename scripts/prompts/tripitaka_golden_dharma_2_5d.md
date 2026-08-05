# Tripitaka 2.5D — Golden Dharma Wave

## Base character image prompt (built-in ImageGen)

Use case: stylized-concept  
Asset type: production-ready 2.5D mobile RPG character sprite base  
Input images: Pigsy is the exact target rendering style and camera reference; Wukong V2 is the target body-scale/proportion reference; the existing pilgrim monk is clothing reference only.  
Primary request: Create Tang Sanzang / Tripitaka as a premium 2.5D Journey to the West game character matching the polished painterly-realistic finish and three-quarter camera of the references.  
Subject: A serene handsome young Chinese Buddhist monk, bald, wearing layered Tang-dynasty saffron, deep-red, and antique-gold kasaya robes with prayer beads. Full-body stable stance with both feet visible. One open palm is upright near the chest in a Buddhist greeting/blessing gesture. The other arm extends outward with an open palm ready to release supernatural power.  
Backdrop: perfectly flat solid #00ff00 chroma-key background, with no shadow, gradient, texture, or floor.  
Constraints: one coherent identity; normal anatomy; exactly two arms and hands; five fingers per hand; readable open palms; no staff or weapon; no aura or baked energy; no text or watermark; no green on the character.

## Animation invariants

- All 24 idle frames derive from the same approved base image.
- Head, blessing hand, power hand, central lower body, legs, and feet are pixel-locked.
- Character head-to-sole height is baked to 310 px on a 640×512 frame.
- Foot anchor is baked at Y=478.
- Phaser never scales or translates the character during idle or power effects.
- Golden shockwaves, cracks, Buddha aureole, flashing rays, and particles are separate runtime layers.

## Buddha aura image prompt (built-in ImageGen)

Use case: stylized-concept  
Asset type: large 2.5D background aura sprite  
Primary request: Create one majestic, clearly recognizable seated Gautama Buddha figure as a huge guardian aura behind Tang Sanzang.  
Subject: front-facing symmetrical Buddha seated in lotus meditation, peaceful face, ushnisha, elongated earlobes, both hands in meditation mudra, complete lotus pedestal.  
Style: high-end 2.5D hand-painted mobile RPG art made of luminous antique gold and warm amber, readable at small size.  
Backdrop: perfectly flat solid #00ff00 chroma-key background with no shadow, gradient, floor, or reflection.  
Constraints: only the Buddha and lotus; no rays, halo rings, beams, particles, scenery, text, or watermark.
