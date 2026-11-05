# Sphere

Live attitude instrument. The gauge, the wire sphere, and the alignment plate read one sample. The main travel is smoothed so a reversal does not draw as a slip.

Open `index.html` in a browser.

- [Zen](https://lang.ugrad.ai/zen.html) is the translator. The drawer links to it. It does not run in this page.
- [KBatch](https://kbatch.ugrad.ai) is the path geometry. The codex uses its short-hop rule on one QWERTY: efficiency is 100 minus average key distance times 22.
- [Qbit Globe](https://mueee.qbitos.ai/qbit-globe.html) is the letter wheel. This page links to it.

Sources opens a right drawer. The menu is a vertical edge rail — Live, Sphere, Bloch, Path, Codex, Cube, Flow, Rays, Tether, Sources — with 44px targets. SET, PART, LAYER, and the Zen, KBatch, and Globe links live in that drawer.

`?plate=1` is the alignment strip. `?t=` seeks the event pass. `?menu=codex` opens the word board. `?word=` sets that word. `?sources=1` opens the drawer.

Layer 1 is the requested attitude. Layer 2 counters the cleaned rate and slews with drag. Layer 3 is the rebound plus the landing blend toward the next recorded key.

Rays follow the Sionna RT path shape: vertices plus an interaction. Line of sight is the travel. Specular is the counter-balance. Diffraction is a sharp bend. The force ray is the belly, scaled by the gauge. [Sionna RT](https://github.com/NVlabs/sionna-rt) does not run in the page. A low-pass differentiator cleans the rate those rays use.

Coordinates publish on `BroadcastChannel('sphere-coords')` and on `window.SphereTether.latest`. Each fix has `l1`, `l2`, and `l3` in degrees, a unit vector, and a projection pair in about −1…1. Start the relay for another device or a projector:

```
node tether/server.mjs
```

Senders and receivers use `ws://127.0.0.1:9741/sphere`. `GET /coords` is the last fix. The process prints the LAN address.
