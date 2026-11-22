# Gion Matsuri Video: scan the picture, watch the video

Point your phone at the printed Gion Matsuri float picture ([`target.png`](target.png)). When it is recognised, the video
plays right on the picture in AR. Controls at the bottom: **play / pause**, **back 10 s**, **forward 10 s** and a seek bar
with time played and time left. If the picture leaves the view, the video floats over the camera so you keep your place.
Desktop keys: Space = play/pause, ← / → = ∓10 s.

**Play locally:** `powershell -ExecutionPolicy Bypass -File tools/serve.ps1` then `http://localhost:8142/`
· **Without the picture:** `?demo=1` · **Without any camera:** `?preview=1` · **Other video:** `?video=<url>`

| File | What it is |
|---|---|
| `index.html`, `js/app.js` | The flow: camera permission → scan → note → watch |
| `js/scan.js` | MindAR image tracking; draws the `<video>` as a three.js plane glued to the picture |
| `js/player.js` | Play/pause, ±10 s, seek bar (drives the same `<video>`) |
| `js/data.js` | Video URL |
| `assets/gion-matsuri.mp4` | The video (576×1024, 0:44) |
| `assets/float-image.webp` | The float picture as supplied |
| `target.png` / `targets.mind` | The printable picture and its compiled MindAR target |
| `tools/make-target.html`, `tools/serve.ps1` | Flatten the picture + compile the target + poster (`?build=1`); local server with Range support |

**Rebuild the target:** start `tools/serve.ps1`, open `http://localhost:8142/tools/make-target.html?build=1` in desktop Chrome and wait for `DONE`.

Built from the [Paper Crane AR](https://github.com/naomirajwanshi02/Origami_Videos) video player, in the
[Anatomy](https://github.com/wheresryan22/anatomy) sepia theme (`vendor/anatomy/`, skill in `../.claude/skills/anatomy`).
Pins: `mind-ar@1.2.5` with `three@0.160.0`. Phones need HTTPS (e.g. GitHub Pages) for the camera.
