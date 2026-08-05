# Pigsy 2.5D transformation sprite prompts

Reference assets:

- `public/characters/pig-warrior.png` for Pigsy identity and props.
- `public/characters/monkey-anim-0.png` for the target 2.5D game-art style.

All frames use a flat `#00ff00` background and explicitly lock costume, camera,
ground line, and head-to-foot scale. The sequence is:

1. Ready idle.
2. Roar anticipation.
3. Full roar.
4. Arms rising from roar.
5. Transformation hand pose.
6. 35% human transformation.
7. 70% human transformation.
8. Handsome human form.

The playable animation reverses frames 6 through 0 after holding frame 7, so the
return transformation uses the exact same visual states in reverse and cannot
drift into a different character.
