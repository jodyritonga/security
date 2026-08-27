(() => {
  const canvas = document.querySelector('#dragon-canvas');
  const stage = document.querySelector('#fracture-viewport');

  if (!canvas || !stage || !canvas.getContext) return;

  const context = canvas.getContext('2d', { alpha: true });
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const triangles = [];
  const accents = [];
  const materials = {
    obsidian: { color: [22, 20, 36], edge: [118, 95, 164], alpha: .98, shine: .56 },
    skull: { color: [48, 35, 73], edge: [198, 175, 255], alpha: .99, shine: .82 },
    violet: { color: [76, 49, 121], edge: [198, 175, 255], alpha: .97, shine: .92 },
    ridge: { color: [104, 75, 153], edge: [218, 205, 255], alpha: .98, shine: 1.05 },
    jaw: { color: [28, 24, 47], edge: [145, 121, 191], alpha: .99, shine: .5 },
    membrane: { color: [34, 24, 58], edge: [117, 230, 212], alpha: .84, shine: .62 },
    membraneDark: { color: [19, 16, 34], edge: [157, 124, 255], alpha: .9, shine: .43 },
    wingBone: { color: [70, 52, 105], edge: [198, 175, 255], alpha: .98, shine: .86 },
    horn: { color: [98, 84, 126], edge: [221, 211, 244], alpha: .99, shine: .98 },
    hornTip: { color: [173, 155, 207], edge: [248, 245, 255], alpha: 1, shine: 1.14 },
    tooth: { color: [207, 218, 218], edge: [255, 255, 255], alpha: 1, shine: 1.15 },
    mouth: { color: [6, 5, 12], edge: [92, 61, 130], alpha: 1, shine: .16 },
    chest: { color: [41, 31, 64], edge: [157, 124, 255], alpha: .99, shine: .72 }
  };

  const icoVertices = [
    [-1, 1.618, 0], [1, 1.618, 0], [-1, -1.618, 0], [1, -1.618, 0],
    [0, -1, 1.618], [0, 1, 1.618], [0, -1, -1.618], [0, 1, -1.618],
    [1.618, 0, -1], [1.618, 0, 1], [-1.618, 0, -1], [-1.618, 0, 1]
  ].map((point) => {
    const length = Math.hypot(...point);
    return point.map((value) => value / length);
  });
  const icoFaces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
  ];

  const addTriangle = (a, b, c, material, group = 'body') => {
    triangles.push({ points: [a, b, c], material, group });
  };

  const addQuad = (a, b, c, d, material, group = 'body') => {
    addTriangle(a, b, c, material, group);
    addTriangle(a, c, d, material, group);
  };

  const addIcosahedron = (center, scale, material, group = 'body') => {
    const vertices = icoVertices.map(([x, y, z]) => [
      center[0] + x * scale[0],
      center[1] + y * scale[1],
      center[2] + z * scale[2]
    ]);
    icoFaces.forEach(([a, b, c], index) => {
      const faceMaterial = index % 5 === 0 && material !== 'chest' ? 'violet' : material;
      addTriangle(vertices[a], vertices[b], vertices[c], faceMaterial, group);
    });
  };

  const subtract = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  const multiply = (point, amount) => point.map((value) => value * amount);
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0]
  ];
  const normalize = (point) => {
    const length = Math.hypot(...point) || 1;
    return point.map((value) => value / length);
  };

  const addTaperedSegment = (start, end, startRadius, endRadius, material, group = 'body', sides = 5) => {
    const axis = normalize(subtract(end, start));
    const helper = Math.abs(axis[1]) < .82 ? [0, 1, 0] : [1, 0, 0];
    const basisA = normalize(cross(axis, helper));
    const basisB = normalize(cross(axis, basisA));
    const startRing = [];
    const endRing = [];

    for (let index = 0; index < sides; index += 1) {
      const angle = index / sides * Math.PI * 2;
      const radial = add(multiply(basisA, Math.cos(angle)), multiply(basisB, Math.sin(angle)));
      startRing.push(add(start, multiply(radial, startRadius)));
      endRing.push(add(end, multiply(radial, endRadius)));
    }

    for (let index = 0; index < sides; index += 1) {
      const next = (index + 1) % sides;
      addQuad(startRing[index], startRing[next], endRing[next], endRing[index], material, group);
    }

    for (let index = 1; index < sides - 1; index += 1) {
      addTriangle(startRing[0], startRing[index + 1], startRing[index], material, group);
      addTriangle(endRing[0], endRing[index], endRing[index + 1], material, group);
    }
  };

  const addHorn = (points, radii, group = 'head') => {
    points.slice(0, -1).forEach((start, index) => {
      addTaperedSegment(
        start,
        points[index + 1],
        radii[index],
        radii[index + 1],
        index === points.length - 2 ? 'hornTip' : 'horn',
        group,
        5
      );
    });
  };

  const addWing = (side) => {
    const group = side < 0 ? 'wing-left' : 'wing-right';
    const root = [side * .46, -.1, -.28];
    const shoulder = [side * 1.08, .38, -.58];
    const crown = [side * 1.62, 1.34, -.76];
    const outer = [side * 2.5, .88, -.9];
    const middle = [side * 2.23, .12, -.82];
    const lower = [side * 2.42, -.55, -.76];
    const inner = [side * 1.3, -.78, -.47];
    const rootLow = [side * .53, -.48, -.26];

    addTriangle(root, shoulder, crown, 'membraneDark', group);
    addTriangle(root, crown, outer, 'membrane', group);
    addTriangle(root, outer, middle, 'membrane', group);
    addTriangle(rootLow, root, middle, 'membraneDark', group);
    addTriangle(rootLow, middle, lower, 'membrane', group);
    addTriangle(rootLow, lower, inner, 'membraneDark', group);
    addTaperedSegment(root, crown, .038, .018, 'wingBone', group, 4);
    addTaperedSegment(root, outer, .032, .012, 'wingBone', group, 4);
    addTaperedSegment(rootLow, lower, .03, .01, 'wingBone', group, 4);
    addHorn([outer, [side * 2.68, .83, -1.03]], [.06, .005], group);
    addHorn([lower, [side * 2.58, -.7, -.9]], [.052, .005], group);
  };

  addWing(-1);
  addWing(1);

  addIcosahedron([0, -1.03, -.12], [.87, .84, .58], 'chest', 'body');
  addIcosahedron([0, -.35, -.03], [.56, .93, .5], 'obsidian', 'neck');
  addIcosahedron([0, .62, .18], [.72, .56, .61], 'skull', 'head');
  addIcosahedron([-.45, .55, .09], [.36, .36, .39], 'violet', 'head');
  addIcosahedron([.45, .55, .09], [.36, .36, .39], 'violet', 'head');

  const snoutBack = [
    [-.5, .71, .4], [.5, .71, .4], [.47, .37, .42], [-.47, .37, .42]
  ];
  const snoutFront = [
    [-.33, .58, 1.2], [.33, .58, 1.2], [.31, .27, 1.22], [-.31, .27, 1.22]
  ];
  addQuad(snoutBack[0], snoutBack[1], snoutFront[1], snoutFront[0], 'ridge', 'head');
  addQuad(snoutBack[1], snoutBack[2], snoutFront[2], snoutFront[1], 'violet', 'head');
  addQuad(snoutBack[2], snoutBack[3], snoutFront[3], snoutFront[2], 'jaw', 'head');
  addQuad(snoutBack[3], snoutBack[0], snoutFront[0], snoutFront[3], 'violet', 'head');
  addQuad(snoutFront[0], snoutFront[1], snoutFront[2], snoutFront[3], 'skull', 'head');

  const jawBack = [
    [-.47, .34, .39], [.47, .34, .39], [.4, -.02, .34], [-.4, -.02, .34]
  ];
  const jawFront = [
    [-.31, .24, 1.19], [.31, .24, 1.19], [.28, -.04, 1.09], [-.28, -.04, 1.09]
  ];
  addQuad(jawBack[0], jawBack[1], jawFront[1], jawFront[0], 'mouth', 'head');
  addQuad(jawBack[1], jawBack[2], jawFront[2], jawFront[1], 'jaw', 'head');
  addQuad(jawBack[2], jawBack[3], jawFront[3], jawFront[2], 'jaw', 'head');
  addQuad(jawBack[3], jawBack[0], jawFront[0], jawFront[3], 'jaw', 'head');
  addQuad(jawFront[0], jawFront[1], jawFront[2], jawFront[3], 'jaw', 'head');

  [-1, 1].forEach((side) => {
    addTriangle(
      [side * .45, .79, .61],
      [side * .13, .76, .83],
      [side * .34, .56, .79],
      'mouth',
      'head'
    );
    addTriangle(
      [side * .54, .75, .14],
      [side * 1.08, 1.04, -.13],
      [side * .68, .34, .08],
      'ridge',
      'head'
    );
    addTriangle(
      [side * .47, .34, .06],
      [side * .95, .17, -.12],
      [side * .55, -.05, .08],
      'violet',
      'neck'
    );
    addTaperedSegment(
      [side * .62, -.72, .06],
      [side * 1.07, -1.14, .42],
      .14,
      .1,
      'obsidian',
      'body',
      5
    );
    addHorn(
      [
        [side * .36, 1.01, .04],
        [side * .56, 1.38, -.04],
        [side * .76, 1.63, -.25],
        [side * .9, 1.78, -.48]
      ],
      [.15, .105, .055, .006]
    );
    addHorn(
      [
        [side * .55, .85, .11],
        [side * 1.0, 1.13, -.12],
        [side * 1.27, 1.15, -.39]
      ],
      [.105, .06, .006]
    );
    addHorn(
      [
        [side * 1.04, -1.13, .42],
        [side * 1.19, -1.28, .54]
      ],
      [.055, .005],
      'body'
    );
  });

  [-.18, .18].forEach((x) => {
    addTriangle([x - .055, .26, 1.23], [x + .055, .26, 1.23], [x, .02, 1.19], 'tooth', 'head');
  });
  [-.21, .21].forEach((x) => {
    addTriangle([x - .05, -.02, 1.1], [x + .05, -.02, 1.1], [x, .15, 1.2], 'tooth', 'head');
  });

  [-.46, -.83, -1.18].forEach((y, index) => {
    const width = .42 + index * .11;
    addQuad(
      [-width, y + .13, .46 - index * .04],
      [width, y + .13, .46 - index * .04],
      [width * .83, y - .11, .5 - index * .04],
      [-width * .83, y - .11, .5 - index * .04],
      index % 2 ? 'violet' : 'ridge',
      'body'
    );
  });

  const eyeShapes = [
    [[-.45, .77, .66], [-.13, .74, .88], [-.34, .62, .83]],
    [[.45, .77, .66], [.13, .74, .88], [.34, .62, .83]]
  ];
  const nostrils = [[-.18, .43, 1.235], [.18, .43, 1.235]];
  const mouthLine = [[-.31, .235, 1.205], [0, .19, 1.245], [.31, .235, 1.205]];
  const chestCrack = [
    [-.02, -.34, .54], [.1, -.58, .59], [-.07, -.78, .61],
    [.08, -1.02, .57], [-.05, -1.28, .49], [.02, -1.47, .39]
  ];

  accents.push({
    points: [[0, .95, .68], [-.05, .79, .86], [.04, .64, .93], [-.02, .48, 1.02]],
    group: 'head',
    color: 'rgba(198,175,255,.72)'
  });

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let targetYaw = 0;
  let targetPitch = 0;
  let currentYaw = 0;
  let currentPitch = 0;
  let running = false;
  let animationFrame = 0;

  const rotatePoint = ([x, y, z], pitch, yaw) => {
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const cosX = Math.cos(pitch);
    const sinX = Math.sin(pitch);
    return [x1, y * cosX - z1 * sinX, y * sinX + z1 * cosX];
  };

  const transformPoint = (point, group, time) => {
    let transformed = [...point];
    if (group === 'wing-left' || group === 'wing-right') {
      const side = group === 'wing-left' ? -1 : 1;
      const root = [side * .46, -.1, -.28];
      const flap = (reducedMotion ? 0 : Math.sin(time * .0011) * .045 + .018) * side;
      const localX = transformed[0] - root[0];
      const localY = transformed[1] - root[1];
      transformed[0] = root[0] + localX * Math.cos(flap) - localY * Math.sin(flap);
      transformed[1] = root[1] + localX * Math.sin(flap) + localY * Math.cos(flap);
    }

    const groupWeight = group === 'head'
      ? 1
      : group === 'neck'
        ? .63
        : group.startsWith('wing')
          ? .18
          : .38;
    transformed = rotatePoint(transformed, currentPitch * groupWeight, currentYaw * groupWeight);
    transformed[1] += reducedMotion ? 0 : Math.sin(time * .00125) * .025;
    return transformed;
  };

  const project = ([x, y, z]) => {
    const camera = 7.2;
    const perspective = camera / (camera - z);
    const scale = Math.min(width / 6.05, height / 4.25);
    return [
      width * .5 + x * scale * perspective,
      height * .48 - y * scale * perspective,
      z,
      perspective
    ];
  };

  const faceNormal = (a, b, c) => normalize(cross(subtract(b, a), subtract(c, a)));

  const drawModel = (time) => {
    const rendered = triangles.map((triangle) => {
      const points3d = triangle.points.map((point) => transformPoint(point, triangle.group, time));
      return {
        ...triangle,
        points3d,
        points2d: points3d.map(project),
        depth: points3d.reduce((sum, point) => sum + point[2], 0) / 3
      };
    }).sort((a, b) => a.depth - b.depth);

    rendered.forEach(({ points3d, points2d, material: materialName, depth }) => {
      const material = materials[materialName];
      const normal = faceNormal(...points3d);
      const diffuse = Math.abs(normal[0] * -.38 + normal[1] * .56 + normal[2] * .73);
      const rim = Math.max(0, 1 - Math.abs(normal[2]));
      const depthLight = Math.max(0, Math.min(1, (depth + 1.2) / 2.8));
      const light = .2 + diffuse * .64 * material.shine + rim * .12 + depthLight * .08;
      const color = material.color.map((channel, index) => {
        const tint = index === 2 ? rim * 38 : index === 1 ? rim * 13 : rim * 17;
        return Math.min(255, Math.round(channel * light + tint));
      });

      context.beginPath();
      points2d.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath();
      context.fillStyle = 'rgba(' + color.join(',') + ',' + material.alpha + ')';
      context.fill();
      context.strokeStyle = 'rgba(' + material.edge.join(',') + ',' + (.12 + diffuse * .2) + ')';
      context.lineWidth = .55 + diffuse * .6;
      context.stroke();
    });
  };

  const drawEyes = (time) => {
    context.save();
    context.globalCompositeOperation = 'screen';
    eyeShapes.forEach((shape, index) => {
      const points = shape.map((point) => project(transformPoint(point, 'head', time)));
      context.beginPath();
      points.forEach(([x, y], pointIndex) => pointIndex ? context.lineTo(x, y) : context.moveTo(x, y));
      context.closePath();
      context.fillStyle = 'rgba(117,230,212,.96)';
      context.shadowBlur = 26;
      context.shadowColor = '#75e6d4';
      context.fill();
      context.shadowBlur = 0;

      const centerX = points.reduce((sum, point) => sum + point[0], 0) / 3;
      const centerY = points.reduce((sum, point) => sum + point[1], 0) / 3;
      context.beginPath();
      context.ellipse(
        centerX + targetYaw * width * .008,
        centerY + targetPitch * height * .009,
        Math.max(1.8, width * .0032),
        Math.max(4, height * .008),
        index ? -.28 : .28,
        0,
        Math.PI * 2
      );
      context.fillStyle = 'rgba(2,5,10,.92)';
      context.fill();
    });
    context.restore();
  };

  const drawAccents = (time) => {
    context.save();
    context.globalCompositeOperation = 'screen';
    accents.forEach((accent) => {
      const points = accent.points.map((point) => project(transformPoint(point, accent.group, time)));
      context.beginPath();
      points.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
      context.strokeStyle = accent.color;
      context.lineWidth = 1.1;
      context.shadowBlur = 9;
      context.shadowColor = '#c6afff';
      context.stroke();
    });

    const crackPoints = chestCrack.map((point) => project(transformPoint(point, 'body', time)));
    [10, 3.5, 1].forEach((lineWidth, index) => {
      context.beginPath();
      crackPoints.forEach(([x, y], pointIndex) => pointIndex ? context.lineTo(x, y) : context.moveTo(x, y));
      context.strokeStyle = index === 0
        ? 'rgba(117,230,212,.08)'
        : index === 1
          ? 'rgba(117,230,212,.28)'
          : 'rgba(204,255,247,.92)';
      context.lineWidth = lineWidth;
      context.shadowBlur = index === 2 ? 14 : 0;
      context.shadowColor = '#75e6d4';
      context.stroke();
    });

    nostrils.forEach((nostril) => {
      const [x, y] = project(transformPoint(nostril, 'head', time));
      context.beginPath();
      context.arc(x, y, Math.max(2.2, width * .0028), 0, Math.PI * 2);
      context.fillStyle = 'rgba(3,3,8,.96)';
      context.strokeStyle = 'rgba(117,230,212,.54)';
      context.lineWidth = 1;
      context.shadowBlur = 10;
      context.shadowColor = '#75e6d4';
      context.fill();
      context.stroke();
    });

    const mouthPoints = mouthLine.map((point) => project(transformPoint(point, 'head', time)));
    context.beginPath();
    mouthPoints.forEach(([x, y], index) => index ? context.lineTo(x, y) : context.moveTo(x, y));
    context.strokeStyle = 'rgba(198,175,255,.58)';
    context.lineWidth = 1.2;
    context.shadowBlur = 7;
    context.shadowColor = '#9d7cff';
    context.stroke();
    context.restore();
  };

  const draw = (time = 0) => {
    context.clearRect(0, 0, width, height);
    drawModel(time);
    drawAccents(time);
    drawEyes(time);
  };

  const render = (time = 0) => {
    if (!running) return;
    currentYaw += (targetYaw - currentYaw) * .075;
    currentPitch += (targetPitch - currentPitch) * .075;
    canvas.dataset.poseYaw = currentYaw.toFixed(3);
    canvas.dataset.posePitch = currentPitch.toFixed(3);
    draw(time);
    if (!reducedMotion) {
      animationFrame = requestAnimationFrame(render);
    } else {
      animationFrame = 0;
    }
  };

  const resize = () => {
    width = Math.max(1, Math.round(canvas.clientWidth));
    height = Math.max(1, Math.round(canvas.clientHeight));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    canvas.dataset.renderer = 'realtime-polygon-3d';
    draw(performance.now());
  };

  const start = () => {
    if (running) return;
    running = true;
    resize();
    animationFrame = requestAnimationFrame(render);
  };

  const stop = () => {
    running = false;
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    targetYaw = 0;
    targetPitch = 0;
  };

  const updatePointer = (event) => {
    const bounds = stage.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width - .5) * 2;
    const y = ((event.clientY - bounds.top) / bounds.height - .5) * 2;
    targetYaw = Math.max(-1, Math.min(1, x)) * .46;
    targetPitch = Math.max(-1, Math.min(1, y)) * .28;
    canvas.dataset.targetYaw = targetYaw.toFixed(3);
    canvas.dataset.targetPitch = targetPitch.toFixed(3);
    if (reducedMotion && running) {
      currentYaw = targetYaw;
      currentPitch = targetPitch;
      draw(performance.now());
    }
  };

  stage.addEventListener('pointermove', updatePointer, { passive: true });
  stage.addEventListener('pointerleave', () => {
    targetYaw = 0;
    targetPitch = 0;
  });
  window.addEventListener('dragon:wake', start);
  window.addEventListener('dragon:sleep', stop);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    } else if (running && !animationFrame) {
      animationFrame = requestAnimationFrame(render);
    }
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(canvas);
  } else {
    window.addEventListener('resize', resize, { passive: true });
  }

  new MutationObserver(() => {
    if (stage.classList.contains('is-dragon-awake')) start();
    else stop();
  }).observe(stage, { attributes: true, attributeFilter: ['class'] });

  resize();
  if (stage.classList.contains('is-dragon-awake')) start();
})();
