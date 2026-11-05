/**
 * Live Roadster nose on a Bloch sphere.
 * The point is the nose direction. Pitch, yaw, and the filter move it every frame.
 * Roll twists the glyph and does not move the point.
 *
 * |0⟩ is straight up. Demo frame: pitch 106°, so the nose sits 16° off |0⟩.
 * Dynamics are a plant plus a gyro/accel complementary filter, not a vehicle socket.
 * A foreign BroadcastChannel('bloch-state') can drive the point instead.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.RoadsterBloch = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const TAU = Math.PI * 2;
  const PITCH0 = 106 * Math.PI / 180;
  const ALT0 = 51.4;
  const DF0 = 4706;

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wrap(a) {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  }
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function qmul(a, b) {
    return [
      a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
      a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
      a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
      a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0]
    ];
  }
  function qnorm(q) {
    const n = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
    return [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
  }
  function qconj(q) { return [q[0], -q[1], -q[2], -q[3]]; }
  function qrotate(q, v) {
    const w = q[0], x = q[1], y = q[2], z = q[3];
    const vx = v[0], vy = v[1], vz = v[2];
    const tx = 2 * (y * vz - z * vy);
    const ty = 2 * (z * vx - x * vz);
    const tz = 2 * (x * vy - y * vx);
    return [
      vx + w * tx + (y * tz - z * ty),
      vy + w * ty + (z * tx - x * tz),
      vz + w * tz + (x * ty - y * tx)
    ];
  }
  function integrate(q, wx, wy, wz, dt) {
    const dq = qmul(q, [0, wx, wy, wz]);
    return qnorm([
      q[0] + dq[0] * 0.5 * dt,
      q[1] + dq[1] * 0.5 * dt,
      q[2] + dq[2] * 0.5 * dt,
      q[3] + dq[3] * 0.5 * dt
    ]);
  }
  function quatPitch(p) {
    const a = p * 0.5;
    return [Math.cos(a), 0, -Math.sin(a), 0];
  }

  function cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  /**
   * World-vertical precession plus a slow pitch nod.
   * The nose stays near the demo frame and walks around |0⟩.
   */
  function plantRates(q, t) {
    const nose = noseOf(q);
    const axis = cross([0, 0, 1], nose);
    const am = Math.hypot(axis[0], axis[1], axis[2]) || 1;
    const theta = Math.acos(clamp(nose[2], -1, 1));
    const thetaWant = (16 + 6 * Math.sin(t * 0.45)) * Math.PI / 180;
    const nod = 1.8 * (thetaWant - theta);
    const omega = 0.36;
    const world = [
      (nod * axis[0]) / am,
      (nod * axis[1]) / am,
      omega + (nod * axis[2]) / am
    ];
    const b = qrotate(qconj(q), world);
    return { wx: b[0], wy: b[1], wz: b[2] };
  }

  function downforceKg(pitch, alt, t) {
    const pitchDeg = pitch * 180 / Math.PI;
    const sealP = Math.exp(-(((pitchDeg - 106) / 28) ** 2));
    const sealA = Math.exp(-Math.abs(alt - ALT0) / 36);
    const fan = 1 + 0.08 * Math.sin(t * 0.7);
    return DF0 * sealP * sealA * fan;
  }

  function noseOf(q) {
    const n = qrotate(q, [1, 0, 0]);
    const m = Math.hypot(n[0], n[1], n[2]) || 1;
    return [n[0] / m, n[1] / m, n[2] / m];
  }

  function adoptNose(state, nose) {
    const theta = Math.acos(clamp(nose[2], -1, 1));
    let phi = Math.atan2(nose[1], nose[0]);
    if (phi < 0) phi += TAU;
    const along = nose[0] * Math.cos(state.yaw) + nose[1] * Math.sin(state.yaw);
    const pitch = Math.atan2(nose[2], along);
    if (Math.abs(Math.cos(pitch)) > 0.15) {
      let yaw = Math.atan2(nose[1], nose[0]);
      if (Math.abs(pitch) > Math.PI / 2) yaw = wrap(yaw + Math.PI);
      const jump = wrap(yaw - state.yaw);
      if (Math.abs(jump) < 1.2 || Math.abs(Math.cos(pitch)) > 0.35) state.yaw = wrap(state.yaw + jump);
    }
    state.pitch = pitch;
    const dot = clamp(nose[0] * state.anchor[0] + nose[1] * state.anchor[1] + nose[2] * state.anchor[2], -1, 1);
    const ct = Math.cos(theta / 2);
    const st = Math.sin(theta / 2);
    state.nose = nose;
    state.theta = theta;
    state.phi = phi;
    state.rx = nose[0];
    state.ry = nose[1];
    state.rz = nose[2];
    state.p0 = ct * ct;
    state.p1 = st * st;
    state.alpha = ct;
    state.betaRe = st * Math.cos(phi);
    state.betaIm = st * Math.sin(phi);
    state.anchorAng = Math.acos(dot);
    state.downforce = downforceKg(pitch, state.alt, state.t);
  }

  function pushHistory(state, nose) {
    state.trail.push(nose[0], nose[1], nose[2]);
    const cap = 480 * 3;
    if (state.trail.length > cap) state.trail.splice(0, state.trail.length - cap);
    state.sparks.pitch.push(state.pitch * 180 / Math.PI);
    state.sparks.theta.push(state.theta * 180 / Math.PI);
    state.sparks.df.push(state.downforce);
    state.sparks.alt.push(state.alt);
    Object.keys(state.sparks).forEach((k) => {
      if (state.sparks[k].length > 240) state.sparks[k].shift();
    });
    if (state.t - state.lastLog >= 0.5) {
      state.lastLog = state.t;
      state.log.unshift({
        t: state.t,
        pitch: state.pitch * 180 / Math.PI,
        theta: state.theta * 180 / Math.PI,
        phi: state.phi * 180 / Math.PI,
        n: state.posN,
        e: state.posE,
        alt: state.alt,
        df: state.downforce
      });
      if (state.log.length > 12) state.log.pop();
    }
  }

  function create(opts) {
    const o = opts || {};
    const pitch = o.pitchDeg != null ? o.pitchDeg * Math.PI / 180 : PITCH0;
    const q = quatPitch(pitch);
    const state = {
      t: 0,
      q: q.slice(),
      qTruth: q.slice(),
      yaw: 0,
      roll: 0,
      pitch: pitch,
      alt: ALT0,
      posN: 0,
      posE: 0,
      trail: [],
      prevNose: null,
      noseRate: 0,
      residual: 0,
      gyro: { wx: 0, wy: 0, wz: 0 },
      rng: mulberry32(o.seed == null ? 1 : o.seed),
      anchor: [Math.cos(pitch), 0, Math.sin(pitch)],
      sparks: { pitch: [], theta: [], df: [], alt: [] },
      log: [],
      lastLog: -1,
      source: 'estimator'
    };
    adoptNose(state, noseOf(state.q));
    pushHistory(state, state.nose);
    state.prevNose = state.nose.slice();
    return state;
  }

  function step(state, dt) {
    dt = clamp(dt, 0, 0.05);
    const t1 = state.t + dt;
    const truth = plantRates(state.qTruth, t1);
    state.qTruth = integrate(state.qTruth, truth.wx, truth.wy, truth.wz, dt);

    const rnd = state.rng;
    const gyro = {
      wx: truth.wx + (rnd() - 0.5) * 0.004,
      wy: truth.wy + (rnd() - 0.5) * 0.004,
      wz: truth.wz + (rnd() - 0.5) * 0.004
    };
    state.q = integrate(state.q, gyro.wx, gyro.wy, gyro.wz, dt);

    let up = qrotate(qconj(state.qTruth), [0, 0, 1]);
    up = [up[0] + (rnd() - 0.5) * 0.02, up[1] + (rnd() - 0.5) * 0.02, up[2] + (rnd() - 0.5) * 0.02];
    const um = Math.hypot(up[0], up[1], up[2]) || 1;
    up = [up[0] / um, up[1] / um, up[2] / um];
    const est = qrotate(qconj(state.q), [0, 0, 1]);
    const e = cross(up, est);
    const k = 2.4;
    state.q = integrate(state.q, e[0] * k, e[1] * k, e[2] * k, dt);
    const right = qrotate(state.q, [0, 1, 0]);
    state.roll = Math.asin(clamp(right[2], -1, 1));
    state.gyro = gyro;

    state.t = t1;
    const nose = noseOf(state.q);
    const plant = noseOf(state.qTruth);
    adoptNose(state, nose);
    const nd = clamp(nose[0] * plant[0] + nose[1] * plant[1] + nose[2] * plant[2], -1, 1);
    state.residual = Math.acos(nd);
    state.plant = plant;

    if (state.prevNose) {
      const dx = nose[0] - state.prevNose[0];
      const dy = nose[1] - state.prevNose[1];
      const dz = nose[2] - state.prevNose[2];
      state.noseRate = Math.hypot(dx, dy, dz) / dt;
    }
    state.prevNose = nose.slice();

    const climb = 5.5 * Math.sin(state.pitch - PITCH0) + 0.45 * Math.sin(state.t * 0.55);
    state.alt += climb * dt;
    state.alt += (ALT0 - state.alt) * (1 - Math.exp(-dt / 14));
    const speed = 10;
    state.posN += nose[0] * speed * dt;
    state.posE += nose[1] * speed * dt;
    state.downforce = downforceKg(state.pitch, state.alt, state.t);
    pushHistory(state, nose);
    state.source = 'estimator';
    return state;
  }

  /** Standard Bloch point, θ from |0⟩, φ from +x toward +y. */
  function noseFromBloch(theta, phi) {
    return [
      Math.sin(theta) * Math.cos(phi),
      Math.sin(theta) * Math.sin(phi),
      Math.cos(theta)
    ];
  }

  return {
    create: create,
    step: step,
    plantRates: plantRates,
    downforceKg: downforceKg,
    noseOf: noseOf,
    noseFromBloch: noseFromBloch,
    quatPitch: quatPitch,
    PITCH0: PITCH0,
    ALT0: ALT0,
    DF0: DF0
  };
});
