# openVAC

**Open Video ASCII Conversions** — turn any video into animated ASCII art.

<!-- hero demo -->
<img src="preview.gif" alt="ASCII video preview demo" />
<div align="center" style="margin-top: 0.5em;">
  <small>
    <a href="https://www.pexels.com/video/animated-video-of-fist-bump-8818312/" target="_blank" rel="noopener noreferrer">
      Video converted to ASCII
    </a>
  </small>
</div>

---

## What it does

Upload a video. Pick your settings. Get a full ASCII animation you can play, customize, and export — as JSON, ZIP, or a standalone HTML file that runs anywhere with zero dependencies.

<!-- conversion flow -->
<!-- <video src="" autoplay loop muted playsinline></video> -->

---

## Features

### Real-time preview

Tweak FPS, aspect ratio, black clipping, and motion filtering — see the result instantly with a 10-frame preview from the middle of your video before committing to a full conversion.

<!-- preview demo -->
<!-- <video src="" autoplay loop muted playsinline></video> -->

### Color & gradient

Pick any solid color or create gradients (linear, radial) that flow across every character. The gradient maps to the full ASCII grid using CSS `background-clip: text`.

<!-- gradient demo -->
<!-- <img src="" alt="Gradient example" /> -->

### Image mask

Upload any image as a color mask. Each ASCII character inherits the color of the corresponding pixel — the mask is static, the text animates underneath.

<!-- mask demo -->
<!-- <img src="" alt="Mask example" /> -->

### Motion filter

Suppress static backgrounds. Only the parts of the frame that change between frames get rendered — everything else fades to blank. Great for isolating a subject against a busy background.

<!-- motion demo -->
<!-- <video src="" autoplay loop muted playsinline></video> -->

### Font picker

Choose from preset monospace fonts or browse your installed system fonts (Chrome/Edge). The auto-scaling engine recalculates character metrics per font to keep the art filling the viewport.

### 3 quality tiers

Every conversion produces **low** (80 chars), **medium** (160 chars), and **high** (240 chars wide) versions. Switch between them during playback or pick one for export.

---

## Export

Download your animation in three formats:

| Format              | What you get                                                                         |
| ------------------- | ------------------------------------------------------------------------------------ |
| **JSON**            | Frame data + metadata (fps, color, font). Drop into any project.                     |
| **ZIP**             | Individual `.txt` frame files.                                                       |
| **Standalone HTML** | One file, zero dependencies. Open in any browser. Works offline. Includes scanlines. |

Code snippets are provided for **React** and **Vanilla JS** integration.

<!-- export panel screenshot -->
<!-- <img src="" alt="Export panel" /> -->

---

## The player

Full-screen canvas layout inspired by design tools. The ASCII animation fills the viewport with player controls docked at the bottom and the export panel in a right sidebar.

<!-- player screenshot -->
<!-- <img src="" alt="Player UI" /> -->

---

## Gallery

<!-- Add your best conversions here -->

<!--
<table>
  <tr>
    <td><video src="" autoplay loop muted playsinline width="400"></video></td>
    <td><video src="" autoplay loop muted playsinline width="400"></video></td>
  </tr>
  <tr>
    <td><em>Description</em></td>
    <td><em>Description</em></td>
  </tr>
</table>
-->

---

## Stack

Next.js · React · Tailwind CSS · Bash · ffmpeg · TypeScript

---

## License

MIT
