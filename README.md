# Animation Editor

Minimal web-based animation editor. Drop multiple images or use the file input to add frames, reorder them in the timeline, play the animation, and export a horizontal spritesheet + JSON metadata.

Usage
- Open [index.html](index.html) in a browser (no server required).
- Or run a local server for correct blob handling:

```bash
python -m http.server 8000
# then open http://localhost:8000 in your browser
```

Files
- [index.html](index.html) — main UI
- [src/app.js](src/app.js) — editor logic
- [src/style.css](src/style.css) — styles

Features
- Add frames by selecting multiple image files
- Drag and drop to reorder frames
- Play / Pause and FPS control
- Export a spritesheet image and JSON metadata
