/* KussiAmma.lk — the "tree to packet" story in WebGL.
 *
 * Progressive enhancement over the DOM version in app.js: that one keeps
 * working on its own, and this module only takes over once a WebGL context
 * actually exists. It listens for the `storyprogress` event app.js already
 * dispatches, so the scroll maths lives in exactly one place.
 *
 * Stylised, not photoreal — flat shading in the site's own three colours, so
 * the scene belongs to the paper-and-ink design rather than importing another
 * website's lighting.
 */
import * as THREE from 'three';

const INK = 0x201e1d;
const ACCENT = 0xec3013;
const PAPER = 0xf3f2f2;
const PALE = 0xffc4b8;

/* The four stage windows, identical to the DOM version. */
const W = {
  fall: [0, 0.42],
  split: [0.42, 0.58],
  grate: [0.56, 0.78],
  pack: [0.76, 1]
};

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const ramp = (p, [from, to]) => clamp01((p - from) / (to - from));

function label() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 640;
  const x = c.getContext('2d');
  x.fillStyle = '#f3f2f2';
  x.fillRect(0, 0, c.width, c.height);
  x.strokeStyle = '#201e1d';
  x.lineWidth = 14;
  x.strokeRect(7, 7, c.width - 14, c.height - 14);
  x.fillStyle = '#201e1d';
  x.textAlign = 'center';
  x.font = '800 46px Archivo, system-ui, sans-serif';
  x.fillText('KUSSIAMMA.LK', c.width / 2, 250);
  x.fillStyle = '#ec3013';
  x.fillRect(120, 285, c.width - 240, 8);
  x.fillStyle = '#444141';
  x.font = '600 32px Archivo, system-ui, sans-serif';
  x.fillText('Fresh grated', c.width / 2, 360);
  x.fillText('coconut', c.width / 2, 402);
  x.fillStyle = '#201e1d';
  x.font = '800 40px Archivo, system-ui, sans-serif';
  x.fillText('500 g', c.width / 2, 478);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** One frond: a flat leaf shape, extruded a hair so it catches the light. */
function frond(color) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.quadraticCurveTo(0.7, 0.42, 2.0, 0.12);
  s.quadraticCurveTo(0.8, 0.04, 0, -0.1);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.04, bevelEnabled: false });
  return new THREE.Mesh(g, new THREE.MeshStandardMaterial({
    color, roughness: 0.85, metalness: 0, flatShading: true, side: THREE.DoubleSide
  }));
}

function buildPalm() {
  const palm = new THREE.Group();

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-0.12, 1.0, 0.04),
    new THREE.Vector3(-0.05, 2.0, 0.02),
    new THREE.Vector3(0.22, 2.85, 0)
  ]);
  const trunk = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 40, 0.1, 10, false),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.95, flatShading: true })
  );
  trunk.castShadow = true;
  palm.add(trunk);

  const crown = new THREE.Group();
  crown.position.copy(curve.getPoint(1));
  palm.add(crown);

  for (let i = 0; i < 6; i++) {
    const f = frond(i % 3 === 1 ? ACCENT : INK);
    f.rotation.y = (i / 6) * Math.PI * 2;
    f.rotation.z = -0.42 - (i % 2) * 0.22;
    f.castShadow = true;
    crown.add(f);
  }

  // The cluster the nut drops from; the third one is the one that goes.
  const nutMat = new THREE.MeshStandardMaterial({ color: INK, roughness: 0.9, flatShading: true });
  const cluster = new THREE.Group();
  [[-0.16, -0.2, 0.08], [0.17, -0.22, -0.05], [0, -0.34, 0.02]].forEach((pos) => {
    const n = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), nutMat);
    n.position.set(...pos);
    n.castShadow = true;
    cluster.add(n);
  });
  crown.add(cluster);

  return { palm, crown, dropped: cluster.children[2] };
}

export function createStory3D(panel, canvas) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;                    // no WebGL — the DOM version stays
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d4cf, 2.1));
  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3.2, 5.4, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  scene.add(key);

  // Catches the shadow only, so the paper panel stays the ground colour.
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const { palm, crown, dropped } = buildPalm();
  palm.position.x = -1.75;
  scene.add(palm);

  const nut = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 24, 18),
    new THREE.MeshStandardMaterial({ color: INK, roughness: 0.9, flatShading: true })
  );
  nut.castShadow = true;
  scene.add(nut);

  /* Two half shells. Cut on the horizontal so each is a bowl rather than a
     ball, tipped toward the camera so you can see the white inside — a
     hemisphere viewed head-on is just a circle and reads as a whole nut. */
  function shell(outer) {
    const g = new THREE.Group();
    const husk = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: outer, roughness: 0.9, flatShading: true, side: THREE.DoubleSide
      })
    );
    husk.rotation.x = Math.PI;              // open side up
    husk.castShadow = true;
    g.add(husk);

    const flesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.30, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 1, side: THREE.DoubleSide })
    );
    flesh.rotation.x = Math.PI;
    g.add(flesh);

    g.rotation.x = -0.5;                    // tip the opening toward the camera
    return g;
  }

  const halfL = shell(INK);
  const halfR = shell(ACCENT);
  scene.add(halfL, halfR);

  const pile = new THREE.Mesh(
    new THREE.ConeGeometry(0.5, 0.8, 22),
    new THREE.MeshStandardMaterial({ color: PALE, roughness: 1, flatShading: true })
  );
  pile.castShadow = true;
  scene.add(pile);

  const packet = new THREE.Mesh(
    new THREE.BoxGeometry(0.95, 1.22, 0.3),
    [
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ map: label(), roughness: 0.92 }),
      new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.95 })
    ]
  );
  packet.castShadow = true;
  scene.add(packet);

  function resize() {
    const w = panel.clientWidth;
    const h = panel.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;

    /* The design anchors everything to a ground rule at 74% of the panel, so
       put the scene's y=0 exactly there rather than in the middle of frame. */
    const dist = 7.4;
    const visible = 2 * dist * Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0.9, 0.24 * visible, dist);
    camera.lookAt(0, 0.24 * visible, 0);
    camera.updateProjectionMatrix();
  }

  function draw(p) {
    const fall = ramp(p, W.fall);
    const split = ramp(p, W.split);
    const grate = ramp(p, W.grate);
    const pack = ramp(p, W.pack);

    // 01 — the nut lets go and falls to the ground, turning as it goes.
    const startX = palm.position.x + 0.22;
    const startY = 2.5;
    nut.visible = fall > 0.03 && p < W.split[0];
    nut.position.set(startX + (0 - startX) * fall, startY + (0.3 - startY) * fall, 0);
    nut.rotation.set(fall * 5.2, fall * 3.4, 0);
    dropped.visible = fall <= 0.03;

    // The crown recoils once as the weight leaves, then settles.
    const recoil = Math.sin(fall * Math.PI * 2) * (1 - fall) * 0.06;
    palm.rotation.z = recoil;
    crown.rotation.x = -recoil * 1.4;

    // 02 — the shells open out along the ground.
    const shellFade = pack > 0 ? 1 - pack : 1;
    halfL.visible = halfR.visible = p >= W.split[0] && shellFade > 0.02;
    halfL.position.set(-split * 0.62, 0.18 * shellFade, 0);
    halfR.position.set(split * 0.62, 0.18 * shellFade, 0);
    halfL.scale.setScalar(shellFade);
    halfR.scale.setScalar(shellFade);

    // 03 — the grated pile builds between them.
    pile.visible = grate > 0.01 && shellFade > 0.02;
    pile.scale.set(1, Math.max(0.001, grate) * shellFade, 1);
    // Cone scales about its centre, so lift it by half its scaled height to
    // keep the base sitting exactly on the ground.
    pile.position.set(0, 0.4 * grate * shellFade, 0.1);

    // 04 — the packet rises into its place and turns to face you.
    packet.visible = pack > 0.01;
    packet.position.set(0, 0.61 * pack, 0);
    packet.scale.setScalar(0.6 + pack * 0.4);
    packet.rotation.y = (1 - pack) * 1.5;

    renderer.render(scene, camera);
  }

  resize();
  window.addEventListener('resize', () => { resize(); draw(lastP); });

  let lastP = 0;
  panel.closest('.story').addEventListener('storyprogress', (e) => {
    lastP = e.detail;
    draw(lastP);
  });

  draw(0);
  return { draw, resize };
}
