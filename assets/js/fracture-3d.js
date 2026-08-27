(() => {
  const canvas = document.querySelector('#fracture-canvas');
  const viewport = document.querySelector('#fracture-viewport');

  if (!canvas || !viewport || !canvas.getContext) return;

  const context = canvas.getContext('2d', { alpha: true });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const phi = (1 + Math.sqrt(5)) / 2;
  const sourceVertices = [
    [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
    [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
    [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1]
  ].map(([x, y, z]) => {
    const length = Math.hypot(x, y, z);
    return [x / length, y / length, z / length];
  });
  const faces = [
    [0,11,5], [0,5,1], [0,1,7], [0,7,10], [0,10,11],
    [1,5,9], [5,11,4], [11,10,2], [10,7,6], [7,1,8],
    [3,9,4], [3,4,2], [3,2,6], [3,6,8], [3,8,9],
    [4,9,5], [2,4,11], [6,2,10], [8,6,7], [9,8,1]
  ];
  const crack = [
    [-.08, 1.05, .44], [.12, .67, .72], [-.05, .29, .88], [.14, -.03, .92],
    [-.13, -.38, .82], [.06, -.72, .63], [-.19, -1.04, .34]
  ];
  const particles = Array.from({ length: 42 }, (_, index) => ({
    angle: (index / 42) * Math.PI * 2,
    radius: .95 + (index % 7) * .12,
    y: ((index * 37) % 100) / 100 * 2 - 1,
    speed: .00005 + (index % 5) * .000012,
    size: index % 9 === 0 ? 1.8 : .7
  }));
  const shards = [
    { offset: [-1.22, .78, -.12], scale: .22, spin: .8 },
    { offset: [1.16, .54, .08], scale: .17, spin: -1.1 },
    { offset: [-1.09, -.72, .16], scale: .14, spin: 1.4 },
    { offset: [1.02, -.83, -.08], scale: .2, spin: -.7 }
  ];

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let pointerX = 0;
  let pointerY = 0;
  let targetX = 0;
  let targetY = 0;
  let crackOpen = 0;
  let animationFrame = 0;

  const resize = () => {
    const bounds = viewport.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  };

  const rotate = ([x, y, z], rotationX, rotationY, rotationZ = 0) => {
    const cosX = Math.cos(rotationX);
    const sinX = Math.sin(rotationX);
    const cosY = Math.cos(rotationY);
    const sinY = Math.sin(rotationY);
    const cosZ = Math.cos(rotationZ);
    const sinZ = Math.sin(rotationZ);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    const x2 = x * cosY + z1 * sinY;
    const z2 = -x * sinY + z1 * cosY;
    return [x2 * cosZ - y1 * sinZ, x2 * sinZ + y1 * cosZ, z2];
  };

  const project = ([x, y, z], scale = 1) => {
    const camera = 4.2;
    const perspective = camera / (camera - z);
    const objectScale = Math.min(width, height) * .31 * scale;
    return [width * .53 + x * objectScale * perspective, height * .48 - y * objectScale * perspective, z, perspective];
  };

  const normal = (a, b, c) => {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const length = Math.hypot(...n) || 1;
    return n.map((value) => value / length);
  };

  const drawPolyhedron = (time, rotationX, rotationY, openness) => {
    const vertices = sourceVertices.map((vertex) => rotate(vertex, rotationX, rotationY, time * .00008));
    const orderedFaces = faces.map((indices) => ({
      indices,
      depth: indices.reduce((sum, index) => sum + vertices[index][2], 0) / 3,
      split: indices.reduce((sum, index) => sum + sourceVertices[index][0], 0) >= 0 ? 1 : -1
    })).sort((a, b) => a.depth - b.depth);

    orderedFaces.forEach(({ indices, depth, split }) => {
      const points3d = indices.map((index) => vertices[index]);
      const splitOffset = split * openness * Math.min(width, height) * .026;
      const points2d = points3d.map((point) => {
        const projected = project(point);
        projected[0] += splitOffset;
        return projected;
      });
      const faceNormal = normal(...points3d);
      const light = Math.max(0, faceNormal[0] * -.35 + faceNormal[1] * .45 + faceNormal[2] * .82);
      const front = Math.max(0, Math.min(1, (depth + 1) / 2));
      const red = Math.round(15 + light * 70 + front * 16);
      const green = Math.round(17 + light * 48 + front * 12);
      const blue = Math.round(28 + light * 115 + front * 40);
      context.beginPath();
      points2d.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath();
      context.fillStyle = `rgba(${red},${green},${blue},${.68 + front * .16})`;
      context.fill();
      context.strokeStyle = `rgba(198,175,255,${.12 + light * .45})`;
      context.lineWidth = .7 + light * .8;
      context.stroke();
    });

    const edges = new Set();
    faces.forEach((indices) => indices.forEach((value, index) => {
      const next = indices[(index + 1) % 3];
      edges.add([Math.min(value, next), Math.max(value, next)].join(':'));
    }));
    context.save();
    context.globalCompositeOperation = 'screen';
    edges.forEach((edge) => {
      const [a, b] = edge.split(':').map(Number);
      const start = project(vertices[a]);
      const end = project(vertices[b]);
      const split = sourceVertices[a][0] + sourceVertices[b][0] >= 0 ? 1 : -1;
      const splitOffset = split * openness * Math.min(width, height) * .026;
      context.beginPath();
      context.moveTo(start[0] + splitOffset, start[1]);
      context.lineTo(end[0] + splitOffset, end[1]);
      context.strokeStyle = 'rgba(117,230,212,.16)';
      context.lineWidth = .55;
      context.stroke();
    });
    context.restore();
  };

  const drawCrack = (rotationX, rotationY, openness) => {
    const points = crack.map((point) => project(rotate(point, rotationX * .45, rotationY * .12, 0)));
    context.save();
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.beginPath();
    points.forEach(([x, y], pointIndex) => pointIndex ? context.lineTo(x, y) : context.moveTo(x, y));
    context.strokeStyle = `rgba(1,1,6,${.68 + openness * .3})`;
    context.lineWidth = 3 + openness * 38;
    context.shadowBlur = openness * 28;
    context.shadowColor = '#030307';
    context.stroke();
    context.globalCompositeOperation = 'screen';
    [18 + openness * 34, 7 + openness * 14, 1.7 + openness * 1.1].forEach((lineWidth, index) => {
      context.beginPath();
      points.forEach(([x, y], pointIndex) => pointIndex ? context.lineTo(x, y) : context.moveTo(x, y));
      context.strokeStyle = index === 0
        ? `rgba(116,73,255,${.09 + openness * .08})`
        : index === 1
          ? `rgba(157,124,255,${.23 + openness * .12})`
          : `rgba(248,245,255,${.95 - openness * .2})`;
      context.lineWidth = lineWidth;
      context.shadowBlur = index === 2 ? 16 + openness * 20 : 0;
      context.shadowColor = '#c6afff';
      context.stroke();
    });
    points.slice(1, -1).forEach(([x, y], index) => {
      const direction = index % 2 ? 1 : -1;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + direction * (32 + index * 9) * (1 + openness * .42), y + (-18 + index * 7) * (1 + openness * .3));
      context.strokeStyle = `rgba(117,230,212,${.55 + openness * .28})`;
      context.lineWidth = .8 + openness * .7;
      context.stroke();
    });
    context.restore();
  };

  const drawShards = (time, rotationX, rotationY, openness) => {
    shards.forEach((shard, shardIndex) => {
      const localRotation = time * .00035 * shard.spin;
      const expandedOffset = [
        shard.offset[0] + Math.sign(shard.offset[0]) * openness * .42,
        shard.offset[1] + Math.sign(shard.offset[1]) * openness * .12,
        shard.offset[2] + openness * .14
      ];
      const center = rotate(expandedOffset, rotationX * .6, rotationY * .6, localRotation);
      const projectedCenter = project(center);
      const size = Math.min(width, height) * shard.scale * projectedCenter[3] * (1 + openness * .18);
      context.save();
      context.translate(projectedCenter[0], projectedCenter[1]);
      context.rotate(localRotation + shardIndex);
      context.beginPath();
      context.moveTo(0, -size * .48);
      context.lineTo(size * .4, size * .35);
      context.lineTo(-size * .36, size * .2);
      context.closePath();
      context.fillStyle = shardIndex % 2 ? 'rgba(117,230,212,.09)' : 'rgba(157,124,255,.12)';
      context.strokeStyle = shardIndex % 2 ? 'rgba(117,230,212,.72)' : 'rgba(198,175,255,.7)';
      context.lineWidth = 1;
      context.fill();
      context.stroke();
      context.restore();
    });
  };

  const drawParticles = (time) => {
    context.save();
    context.globalCompositeOperation = 'screen';
    particles.forEach((particle, index) => {
      const angle = particle.angle + time * particle.speed;
      const x = width * .53 + Math.cos(angle) * Math.min(width, height) * particle.radius * .29;
      const y = height * .48 + particle.y * height * .38 + Math.sin(angle) * 18;
      const alpha = .18 + (index % 5) * .08;
      context.beginPath();
      context.arc(x, y, particle.size, 0, Math.PI * 2);
      context.fillStyle = index % 3 ? `rgba(198,175,255,${alpha})` : `rgba(117,230,212,${alpha + .16})`;
      context.shadowBlur = particle.size > 1 ? 10 : 0;
      context.shadowColor = '#75e6d4';
      context.fill();
    });
    context.restore();
  };

  const render = (time = 0) => {
    pointerX += (targetX - pointerX) * .055;
    pointerY += (targetY - pointerY) * .055;
    const targetOpen = Math.max(0, Math.min(1, Number(viewport.dataset.crackLevel || 0) / 3));
    crackOpen += (targetOpen - crackOpen) * (reducedMotion ? 1 : .09);
    canvas.dataset.crackOpen = crackOpen.toFixed(3);
    context.clearRect(0, 0, width, height);
    const rotationX = -.16 + pointerY * .42 + (reducedMotion ? 0 : Math.sin(time * .00027) * .035);
    const rotationY = .38 + pointerX * .52 + (reducedMotion ? 0 : time * .00014);
    drawParticles(time);
    drawShards(time, rotationX, rotationY, crackOpen);
    drawPolyhedron(time, rotationX, rotationY, crackOpen);
    drawCrack(rotationX, rotationY, crackOpen);
    if (!reducedMotion) animationFrame = requestAnimationFrame(render);
  };

  const updatePointer = (event) => {
    const bounds = viewport.getBoundingClientRect();
    targetX = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    targetY = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
  };

  viewport.addEventListener('pointermove', updatePointer, { passive: true });
  viewport.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; });
  new MutationObserver(() => {
    if (reducedMotion) render(performance.now());
  }).observe(viewport, { attributes: true, attributeFilter: ['data-crack-level'] });
  window.addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && !reducedMotion && !animationFrame) animationFrame = requestAnimationFrame(render);
    if (document.hidden && animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
  });

  resize();
  render(0);
})();
