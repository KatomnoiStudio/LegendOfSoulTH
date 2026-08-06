# Third-Party Skill Content — License Notices

Skills vendored into this repo's `.claude/skills/` from external sources, kept here per each
source's license terms so the notice travels with the content (not tracked upstream).

## `react-three-fiber/`, `threejs-webgl/`

Source: [`freshtechbro/claudedesignskills`](https://github.com/freshtechbro/claudedesignskills)
(`plugins/individual/react-three-fiber/skills/react-three-fiber/`,
`plugins/individual/threejs-webgl/skills/threejs-webgl/`). Vendored 2026-08-06 as flat
project-scoped skills (`SKILL.md` + `references/`) — commands/agents/starter-template assets from
the upstream plugin were intentionally dropped as unneeded scaffolding for an already-established
codebase (this repo already has its own R3F scene setup in `src/components/LobbyScene/`).

```
MIT License

Copyright (c) 2025 Claude Skills Project

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**Not vendored**: Anthropic's official `frontend-design` plugin (`anthropics/claude-code`,
all-rights-reserved / Commercial Terms of Service — cannot be copied into a third-party repo).
HetCreep uses it personally via `/plugin install frontend-design@claude-code-plugins`, not shared
through this repo.
