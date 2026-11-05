# Sphere

Live attitude instrument. The gauge, the wire sphere, and the alignment plate read one sample. The main travel is smoothed so a reversal does not draw as a slip.

Open `index.html` in a browser.

- [Zen](https://lang.ugrad.ai/zen.html) is the translator. The drawer links to it. It does not run in this page.
- [KBatch](https://kbatch.ugrad.ai) is the path geometry. The codex uses its short-hop rule on one QWERTY: efficiency is 100 minus average key distance times 22.
- [Qbit Globe](https://mueee.qbitos.ai/qbit-globe.html) is the letter wheel. This page links to it.

Sources opens a right drawer. The menu is a vertical edge rail — Live, Sphere, Bloch, Path, Codex, Cube, Flow, Rays, Track, Map, Waves, Limb, Tether, Sources — with 44px targets. SET, PART, LAYER, and the Zen, KBatch, and Globe links live in that drawer.

Limb draws the printed-leg project in the same black frame. The body is the Manfrotto grip skeleton at catalog length. Six TPU strands, MA–MF, follow the Figure 7 loop. The strip is the Wiley figures and the project stills. `data/muscle-skeleton.json` is the record. Payloads on that frame are grip ratings. The legs carry it. The D570 is the hanger, at 7 kg, and it does not span the drop to the pelvis.

Track opens the camera. A wire head and two wire hands sit in the same black frame. Head yaw and pitch steer the orbit. The gauge stays the recording. The face and hand models load only then. `node tether/server.mjs` also serves this folder at `http://127.0.0.1:9741/` for a browser that blocks the camera on a file page.

Map draws 256 sites on this sphere from the same sample. The chain is sample, rate, layers, map. A missing stage is refused by name. The detector uses the projection already on the tether and shows the angle between the requested nose and the counter. [g.Pangolin](https://www.gtec.at/2024/11/05/g-pangolin-ultra-high-density-eeg-system/), [g.Pype](https://gpype.gtec.at), and [FleXray](https://flexray.csail.mit.edu) stay as links. They do not run in the page.

The stage adds a six-spoke direction gauge beside the force arc. Spoke length is how this sample aligns with 0°, 60°, 120°, 180°, 240°, and 300°. The solid polygon is the requested bearing. The dashed polygon is the counter. A tick marks the bearing. The shape follows the radar in [SSIO figure 1](https://ssio-imu.github.io/images/fig1_corrected_legend.png). [SSIO](https://ssio-imu.github.io) does not run in the page, and the arms are not that figure's velocity errors. `?plate=1` keeps the force arc and the sphere.

Waves opens a ring of offset lines between the force arc and the sphere. The far rim rises with the gauge series. The near rim is dotted. Neighbor rings carry a shifted sine, which is the moiré. The form follows the black-and-white study for [Summoners HALO](https://gmunk.com/ORA-Summoners-HALO) and the line fields in [Mathographics](https://gmunk.com/Mathographics). Those projects do not run in the page.

Under the titles, the header scrolls the QWERTY hop glyphs of the current word, with pitch, yaw, and the gauge. `?plate=1` keeps that header and hides the rail, the dock, and the rings.

`?plate=1` is the alignment strip. `?t=` seeks the event pass. `?menu=codex` opens the word board. `?menu=limb` opens the printed leg. `?word=` sets that word. `?sources=1` opens the drawer.

Layer 1 is the requested attitude. Layer 2 counters the cleaned rate and slews with drag. Layer 3 is the rebound plus the landing blend toward the next recorded key.

Rays follow the Sionna RT path shape: vertices plus an interaction. Line of sight is the travel. Specular is the counter-balance. Diffraction is a sharp bend. The force ray is the belly, scaled by the gauge. [Sionna RT](https://github.com/NVlabs/sionna-rt) does not run in the page. A low-pass differentiator cleans the rate those rays use.

Coordinates publish on `BroadcastChannel('sphere-coords')` and on `window.SphereTether.latest`. Each fix has `l1`, `l2`, and `l3` in degrees, a unit vector, and a projection pair in about −1…1. Start the relay for another device or a projector:

```
node tether/server.mjs
```

Senders and receivers use `ws://127.0.0.1:9741/sphere`. `GET /coords` is the last fix. The process prints the LAN address.
