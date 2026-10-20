import * as THREE from "/vendor/three.module.min.js";
import { OrbitControls } from "/vendor/orbit-controls.js";

export function mountOverviewModels(canvas, { giveaway = null, locale = "ru-RU", labels = {} } = {}) {
  if (!canvas) return () => {};

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  camera.position.set(0, 3.55, 7.4);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minDistance = 5;
  controls.maxDistance = 10;
  controls.target.set(0, 0.8, 0);

  const packageMaterial = new THREE.MeshStandardMaterial({ color: "#718087", roughness: 0.48, metalness: 0.12 });
  const accentMaterial = new THREE.MeshStandardMaterial({ color: "#91baff", roughness: 0.38, metalness: 0.18 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: "#a3afb5", roughness: 0.34, metalness: 0.55 });
  const meshes = [];
  const modelGroups = new Map();
  const addMesh = (parent, geometry, material, position, rotation = [0, 0, 0]) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    parent.add(mesh);
    meshes.push(mesh);
    return mesh;
  };

  const gift = new THREE.Group();
  gift.position.x = -2.05;
  gift.scale.setScalar(0.7);
  gift.userData.modelRole = "gift";
  scene.add(gift);
  modelGroups.set("gift", gift);
  addMesh(gift, new THREE.BoxGeometry(1.8, 1.25, 1.8), packageMaterial, [0, 0.7, 0]);
  addMesh(gift, new THREE.BoxGeometry(1.98, 0.24, 1.98), packageMaterial, [0, 1.445, 0]);
  addMesh(gift, new THREE.BoxGeometry(0.25, 1.42, 1.84), accentMaterial, [0, 0.69, 0]);
  addMesh(gift, new THREE.BoxGeometry(1.84, 1.42, 0.25), accentMaterial, [0, 0.69, 0]);
  addMesh(gift, new THREE.BoxGeometry(0.27, 0.25, 2.02), accentMaterial, [0, 1.445, 0]);
  addMesh(gift, new THREE.BoxGeometry(2.02, 0.25, 0.27), accentMaterial, [0, 1.445, 0]);
  const bowGeometry = new THREE.TorusGeometry(0.23, 0.065, 8, 24, Math.PI * 1.8);
  addMesh(gift, bowGeometry, accentMaterial, [-0.22, 1.78, 0], [0, 0, -0.55]);
  addMesh(gift, bowGeometry, accentMaterial, [0.22, 1.78, 0], [0, 0, Math.PI + 0.55]);
  addMesh(gift, new THREE.SphereGeometry(0.12, 16, 12), accentMaterial, [0, 1.79, 0]);

  const trophy = new THREE.Group();
  trophy.position.x = 0.05;
  trophy.userData.modelRole = "trophy";
  scene.add(trophy);
  modelGroups.set("trophy", trophy);
  addMesh(trophy, new THREE.CylinderGeometry(0.34, 0.52, 0.62, 32), metalMaterial, [0, 1.36, 0]);
  addMesh(trophy, new THREE.TorusGeometry(0.32, 0.065, 10, 24), metalMaterial, [-0.5, 1.43, 0], [0, 0, Math.PI / 2]);
  addMesh(trophy, new THREE.TorusGeometry(0.32, 0.065, 10, 24), metalMaterial, [0.5, 1.43, 0], [0, 0, Math.PI / 2]);
  addMesh(trophy, new THREE.CylinderGeometry(0.11, 0.13, 0.48, 20), metalMaterial, [0, 0.82, 0]);
  addMesh(trophy, new THREE.CylinderGeometry(0.48, 0.42, 0.16, 24), metalMaterial, [0, 0.5, 0]);
  addMesh(trophy, new THREE.CylinderGeometry(0.58, 0.58, 0.18, 24), metalMaterial, [0, 0.33, 0]);

  const reward = new THREE.Group();
  reward.position.x = 2.02;
  reward.userData.modelRole = "stars";
  scene.add(reward);
  modelGroups.set("stars", reward);
  const coinGeometry = new THREE.CylinderGeometry(0.46, 0.46, 0.12, 32);
  for (let index = 0; index < 4; index += 1) {
    addMesh(reward, coinGeometry, index % 2 ? packageMaterial : metalMaterial, [0, 0.17 + index * 0.15, 0]);
  }
  const starShape = new THREE.Shape();
  for (let point = 0; point < 10; point += 1) {
    const radius = point % 2 === 0 ? 0.5 : 0.23;
    const angle = point / 10 * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius + 1.35;
    if (point === 0) starShape.moveTo(x, y);
    else starShape.lineTo(x, y);
  }
  starShape.closePath();
  addMesh(reward, new THREE.ExtrudeGeometry(starShape, { depth: 0.14, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.035, bevelThickness: 0.035 }), accentMaterial, [0, 0, -0.08]);
  const modelBaseScales = new Map([...modelGroups].map(([role, group]) => [role, group.scale.x]));

  scene.add(new THREE.HemisphereLight("#e7edf0", "#293238", 2.1));
  const keyLight = new THREE.DirectionalLight("#ffffff", 2.3);
  keyLight.position.set(-3, 6, 5);
  scene.add(keyLight);

  const stage = canvas.closest(".gift-model-stage");
  const readout = stage?.querySelector(".model-readout");
  const modelButtons = [...(stage?.querySelectorAll("[data-model-role]") || [])];
  const numberFormat = new Intl.NumberFormat(locale);
  const modelDetails = {
    gift: giveaway ? `${giveaway.title}${giveaway.prize ? ` · ${giveaway.prize}` : ""}` : labels.gift || "",
    trophy: giveaway
      ? `${numberFormat.format(Number(giveaway.winner_count || 0))} ${labels.trophy || ""}`
      : labels.trophy || "",
    stars: giveaway?.payment_stars
      ? `${numberFormat.format(Number(giveaway.payment_stars))} ★ · ${labels.stars || ""}`
      : giveaway ? labels.free || "" : labels.stars || "",
  };
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let activeRole = "gift";
  let pointerStart = null;
  const setActiveRole = (role, updateReadout = true) => {
    if (!modelGroups.has(role)) return;
    activeRole = role;
    for (const [key, group] of modelGroups) {
      group.scale.setScalar(modelBaseScales.get(key) * (key === activeRole ? 1.08 : 0.88));
    }
    for (const button of modelButtons) button.setAttribute("aria-pressed", String(button.dataset.modelRole === role));
    if (updateReadout && readout) readout.textContent = modelDetails[role] || labels.hint || "";
    renderer.render(scene, camera);
  };
  const findRoleAtPointer = (event) => {
    const bounds = canvas.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects([...modelGroups.values()], true)[0];
    let object = hit?.object;
    while (object && !object.userData.modelRole) object = object.parent;
    return object?.userData.modelRole || null;
  };
  const onModelPointerMove = (event) => {
    const role = findRoleAtPointer(event);
    canvas.classList.toggle("is-hovered", Boolean(role));
    if (role && readout) readout.textContent = modelDetails[role] || labels.hint || "";
  };
  const onModelPointerLeave = () => {
    canvas.classList.remove("is-hovered");
    if (pointerStart) return;
    if (readout) readout.textContent = modelDetails[activeRole] || labels.hint || "";
  };
  const onModelPointerDown = (event) => {
    pointerStart = { x: event.clientX, y: event.clientY };
  };
  const onModelPointerUp = (event) => {
    if (!pointerStart) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    pointerStart = null;
    if (distance > 6) return;
    const role = findRoleAtPointer(event);
    if (role) setActiveRole(role);
  };
  const onModelButtonClick = (event) => setActiveRole(event.currentTarget.dataset.modelRole);
  for (const button of modelButtons) button.addEventListener("click", onModelButtonClick);
  canvas.addEventListener("pointermove", onModelPointerMove);
  canvas.addEventListener("pointerleave", onModelPointerLeave);
  canvas.addEventListener("pointerdown", onModelPointerDown);
  canvas.addEventListener("pointerup", onModelPointerUp);

  const render = () => {
    const bounds = canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width);
    const height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  controls.addEventListener("change", render);
  controls.update();
  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(canvas);
  setActiveRole("gift");
  render();

  return () => {
    resizeObserver.disconnect();
    for (const button of modelButtons) button.removeEventListener("click", onModelButtonClick);
    canvas.removeEventListener("pointermove", onModelPointerMove);
    canvas.removeEventListener("pointerleave", onModelPointerLeave);
    canvas.removeEventListener("pointerdown", onModelPointerDown);
    canvas.removeEventListener("pointerup", onModelPointerUp);
    canvas.classList.remove("is-hovered");
    controls.removeEventListener("change", render);
    controls.dispose();
    for (const geometry of new Set(meshes.map((mesh) => mesh.geometry))) geometry.dispose();
    packageMaterial.dispose();
    accentMaterial.dispose();
    metalMaterial.dispose();
    renderer.dispose();
  };
}

export function mountActivityScene(daily, locale) {
  const host = document.querySelector("#activity-3d-scene");
  const canvas = document.querySelector("#activity-3d-canvas");
  const readout = document.querySelector("#activity-3d-readout");
  if (!host || !canvas || !readout) return () => {};

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#12171a");
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = false;
  controls.enablePan = false;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = Math.PI / 2.03;
  controls.minDistance = 8;
  controls.maxDistance = 160;

  const rows = daily.slice().sort((a, b) => a.day.localeCompare(b.day));
  const maxEntries = Math.max(1, ...rows.map((row) => Number(row.participants)));
  const barSpacing = rows.length > 45 ? 0.72 : 0.92;
  const chartWidth = Math.max(14, rows.length * barSpacing);
  const centerX = (rows.length - 1) * barSpacing / 2;
  const neutralMaterial = new THREE.MeshStandardMaterial({ color: "#718087", roughness: 0.72, metalness: 0.08 });
  const paidMaterial = new THREE.MeshStandardMaterial({ color: "#91baff", roughness: 0.58, metalness: 0.12 });
  const floor = new THREE.GridHelper(chartWidth + 2, Math.min(30, Math.max(14, rows.length)), "#3a464c", "#2a3439");
  floor.position.set(0, 0, 0);
  scene.add(floor);
  scene.add(new THREE.HemisphereLight("#e7edf0", "#293238", 2));
  const keyLight = new THREE.DirectionalLight("#ffffff", 2.3);
  keyLight.position.set(centerX - 8, 14, 18);
  scene.add(keyLight);

  const hitTargets = [];
  const unitBox = new THREE.BoxGeometry(0.62, 1, 0.68);
  for (const [index, row] of rows.entries()) {
    const participants = Number(row.participants);
    const paid = Number(row.paid_entries);
    const totalHeight = participants ? Math.max(0.16, participants / maxEntries * 5.4) : 0;
    const paidHeight = participants ? totalHeight * paid / participants : 0;
    const freeHeight = totalHeight - paidHeight;
    const group = new THREE.Group();
    group.position.x = index * barSpacing - centerX;
    group.userData.point = { day: row.day, participants, paid };

    if (freeHeight > 0) {
      const bar = new THREE.Mesh(unitBox, neutralMaterial);
      bar.scale.y = freeHeight;
      bar.position.y = freeHeight / 2;
      group.add(bar);
    }
    if (paidHeight > 0) {
      const bar = new THREE.Mesh(unitBox, paidMaterial);
      bar.scale.y = paidHeight;
      bar.position.y = freeHeight + paidHeight / 2;
      group.add(bar);
    }
    if (!participants) {
      const marker = new THREE.Mesh(unitBox, neutralMaterial);
      marker.scale.y = 0.025;
      marker.position.y = 0.0125;
      group.add(marker);
    }
    scene.add(group);
    hitTargets.push(...group.children);
  }

  camera.position.set(0, rows.length > 45 ? 13 : 10, Math.max(18, rows.length * 0.66));
  controls.target.set(0, 1, 0);
  controls.update();

  const render = () => {
    const width = Math.max(1, host.clientWidth);
    const height = Math.max(220, host.clientHeight);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(render);
  resizeObserver.observe(host);
  controls.addEventListener("change", render);
  render();

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const onPointerMove = (event) => {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(hitTargets, false)[0];
    if (!hit) {
      readout.textContent = rows.length
        ? (locale === "ru" ? "Наведите на столбец для деталей · перетаскивайте для поворота" : "Hover a column for details · drag to rotate")
        : (locale === "ru" ? "Нет регистраций за выбранный период." : "No entries in the selected period.");
      return;
    }
    let object = hit.object;
    while (object && !object.userData.point) object = object.parent;
    const point = object?.userData.point;
    if (!point) return;
    const day = new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" })
      .format(new Date(`${point.day}T12:00:00Z`));
    readout.textContent = locale === "ru"
      ? `${day}: ${point.participants} участников · ${point.paid} платных`
      : `${day}: ${point.participants} participants · ${point.paid} paid`;
  };
  const onPointerLeave = () => {
    readout.textContent = locale === "ru"
      ? "Наведите на столбец для деталей · перетаскивайте для поворота"
      : "Hover a column for details · drag to rotate";
  };
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);

  return () => {
    resizeObserver.disconnect();
    controls.removeEventListener("change", render);
    controls.dispose();
    canvas.removeEventListener("pointermove", onPointerMove);
    canvas.removeEventListener("pointerleave", onPointerLeave);
    unitBox.dispose();
    neutralMaterial.dispose();
    paidMaterial.dispose();
    floor.geometry.dispose();
    floor.material.dispose();
    renderer.dispose();
  };
}
