const $ = (selector) => document.querySelector(selector);
const fileInput = $("#fileInput");
const dropzone = $("#dropzone");
const dropEmpty = $("#dropEmpty");
const fileGrid = $("#fileGrid");
const fileCounter = $("#fileCounter");
const profileList = $("#profileList");
const profileDescription = $("#profileDescription");
const processButton = $("#processButton");
const result = $("#result");
const resultDetails = $("#resultDetails");
const resultList = $("#resultList");
const cleanSaveButton = $("#cleanSaveButton");
const namePreview = $("#namePreview");
const customName = $("#customName");
const startNumber = $("#startNumber");
const startDate = $("#startDate");
const intervalSeconds = $("#intervalSeconds");
const tagsDialog = $("#tagsDialog");
const presetDialog = $("#presetDialog");

const DEVICE_CATALOG = window.DEVICE_CATALOG || [];

const LOCATION_LIBRARY = {
  gate: { label: "Brandenburg Gate", city: "Berlin", country: "Germany", countryCode: "DE", lat: 52.516275, lon: 13.377704, altitude: 38 },
  alex: { label: "Alexanderplatz", city: "Berlin", country: "Germany", countryCode: "DE", lat: 52.521918, lon: 13.413215, altitude: 37 },
  munich: { label: "Marienplatz", city: "Munich", country: "Germany", countryCode: "DE", lat: 48.137154, lon: 11.576124, altitude: 519 },
  times: { label: "Times Square", city: "New York", country: "United States", countryCode: "US", lat: 40.758, lon: -73.9855, altitude: 15 },
  central: { label: "Central Park", city: "New York", country: "United States", countryCode: "US", lat: 40.7812, lon: -73.9665, altitude: 24 },
  hollywood: { label: "Hollywood Boulevard", city: "Los Angeles", country: "United States", countryCode: "US", lat: 34.1016, lon: -118.3267, altitude: 108 },
  miami: { label: "South Beach", city: "Miami Beach", country: "United States", countryCode: "US", lat: 25.7826, lon: -80.1341, altitude: 2 },
  golden: { label: "Golden Gate Bridge", city: "San Francisco", country: "United States", countryCode: "US", lat: 37.8199, lon: -122.4783, altitude: 67 },
  london: { label: "Piccadilly Circus", city: "London", country: "United Kingdom", countryCode: "GB", lat: 51.510067, lon: -0.133869, altitude: 22 },
  paris: { label: "Eiffel Tower", city: "Paris", country: "France", countryCode: "FR", lat: 48.85837, lon: 2.294481, altitude: 35 },
  rome: { label: "Colosseum", city: "Rome", country: "Italy", countryCode: "IT", lat: 41.89021, lon: 12.492231, altitude: 21 },
  madrid: { label: "Puerta del Sol", city: "Madrid", country: "Spain", countryCode: "ES", lat: 40.416947, lon: -3.703528, altitude: 650 },
  amsterdam: { label: "Dam Square", city: "Amsterdam", country: "Netherlands", countryCode: "NL", lat: 52.373169, lon: 4.893, altitude: 2 },
  dubai: { label: "Burj Khalifa", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.197197, lon: 55.274376, altitude: 12 },
  tokyo: { label: "Shibuya Crossing", city: "Tokyo", country: "Japan", countryCode: "JP", lat: 35.6595, lon: 139.7005, altitude: 30 }
};

let selectedFiles = [];
let profiles = [];
let selectedProfile = null;
let namingMode = "iphone";
let resultToken = null;
let previewUrls = [];
let runtime = { mode: "local", localSave: true, database: false };

let supabase = null;
let session = null;
const authBar = $("#authBar");
const userEmail = $("#userEmail");
const userProfile = $("#userProfile");
const userAvatar = $("#userAvatar");
const loginButton = $("#loginButton");
const logoutButton = $("#logoutButton");
const authDialog = $("#authDialog");
const authForm = $("#authForm");
const authTitle = $("#authTitle");
const authSubmit = $("#authSubmit");
const authToggleMode = $("#authToggleMode");
const googleAuthButton = $("#googleAuthButton");
let authMode = "login"; // "login" | "register"

function getAuthHeaders() {
  return session ? { "Authorization": `Bearer ${session.access_token}` } : {};
}

function localDateTimeValue(date = new Date()) {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 16);
}

function formatBytes(bytes) {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} КБ` : `${(bytes / 1024 / 1024).toFixed(1)} МБ`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadCustomProfilesLocal() {
  try {
    return JSON.parse(localStorage.getItem("metadataStudioPresets") || "[]");
  } catch {
    return [];
  }
}

async function fetchCustomProfilesCloud() {
  if (!session) return loadCustomProfilesLocal();
  try {
    const res = await fetch("/api/profiles/custom", { headers: getAuthHeaders() });
    if (!res.ok) throw new Error("Failed to fetch cloud profiles");
    const data = await res.json();
    return data.map(p => ({
      ...p,
      custom: true,
      subtitle: p.subtitle || "Cloud Preset"
    }));
  } catch (err) {
    console.error(err);
    return loadCustomProfilesLocal();
  }
}

function saveCustomProfiles(items) {
  localStorage.setItem("metadataStudioPresets", JSON.stringify(items));
}

function loadHiddenProfiles() {
  try {
    return new Set(JSON.parse(localStorage.getItem("metadataStudioHiddenProfiles") || "[]"));
  } catch {
    return new Set();
  }
}

function saveHiddenProfiles(items) {
  localStorage.setItem("metadataStudioHiddenProfiles", JSON.stringify([...items]));
}

function updateRestoreButton() {
  $("#restorePresets").hidden = loadHiddenProfiles().size === 0;
}

function updateButton() {
  processButton.disabled = !selectedFiles.length || !selectedProfile;
  const hasFiles = selectedFiles.length > 0;
  $("#actionHint").textContent = hasFiles
    ? `${selectedFiles.length} фото · профиль «${selectedProfile?.name || "не выбран"}»`
    : "Сначала добавьте хотя бы одну фотографию";
  processButton.querySelector("span").textContent = hasFiles
    ? `Обработать ${selectedFiles.length} ${selectedFiles.length === 1 ? "фотографию" : "фотографии"}`
    : "Обработать фотографии";
}

function updateNamePreview() {
  const first = Math.min(9999, Math.max(1, Number(startNumber.value) || 1));
  const last = ((first - 1 + Math.max(0, selectedFiles.length - 1)) % 9999 + 1);
  if (namingMode === "iphone") namePreview.textContent = `IMG_${String(first).padStart(4, "0")} → IMG_${String(last).padStart(4, "0")}`;
  if (namingMode === "original") namePreview.textContent = "Исходные имена";
  if (namingMode === "custom") namePreview.textContent = `${customName.value.trim() || "Название"} 01 →`;
}

function renderFiles() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  fileCounter.textContent = `${selectedFiles.length} из 10`;
  fileCounter.classList.toggle("has-files", selectedFiles.length > 0);
  dropEmpty.hidden = selectedFiles.length > 0;
  fileGrid.hidden = selectedFiles.length === 0;
  fileGrid.replaceChildren();
  selectedFiles.forEach((file, index) => {
    const card = document.createElement("article");
    card.className = "queue-card";
    const url = file.type.startsWith("image/") && file.type !== "image/heic" ? URL.createObjectURL(file) : "";
    if (url) previewUrls.push(url);
    card.innerHTML = `
      <div class="queue-index">${String(index + 1).padStart(2, "0")}</div>
      ${url ? `<img src="${url}" alt="">` : `<div class="file-fallback">HEIC</div>`}
      <div class="queue-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
      <div class="queue-actions">
        <button type="button" data-move="${index}" data-direction="-1" aria-label="Выше">↑</button>
        <button type="button" data-move="${index}" data-direction="1" aria-label="Ниже">↓</button>
        <button type="button" data-remove="${index}" aria-label="Удалить">×</button>
      </div>
    `;
    fileGrid.append(card);
  });
  updateNamePreview();
  updateButton();
}

function addFiles(files) {
  const incoming = Array.from(files);
  if (selectedFiles.length + incoming.length > 10) alert("Можно добавить максимум 10 фотографий.");
  selectedFiles = [...selectedFiles, ...incoming].slice(0, 10);
  result.hidden = true;
  renderFiles();
}

function resetWorkspace() {
  selectedFiles = [];
  renderFiles();
  result.hidden = true;
  resultList.replaceChildren();
  resultToken = null;
  startNumber.value = Math.floor(Math.random() * 8000 + 1000);
  startDate.value = localDateTimeValue();
  customName.value = "";
  updateNamePreview();
}

function selectProfile(profile) {
  selectedProfile = profile;
  profileDescription.textContent = profile.description;
  document.querySelectorAll(".profile-option").forEach((node) => {
    node.classList.toggle("selected", node.dataset.id === profile.id);
  });
  updateButton();
}

function profileCard(profile) {
  const label = document.createElement("label");
  label.className = `profile-option${profile.custom ? " custom-profile" : ""}`;
  label.dataset.id = profile.id;
  label.innerHTML = `
    <input type="radio" name="profile" value="${escapeHtml(profile.id)}">
    <span class="radio"></span>
    <strong>${escapeHtml(profile.name)}</strong>
    <small>${escapeHtml(profile.subtitle)}</small>
    <button type="button" class="delete-preset" data-delete="${escapeHtml(profile.id)}" aria-label="Удалить пресет" title="Удалить пресет">×</button>
  `;
  label.addEventListener("click", (event) => {
    if (!event.target.closest(".delete-preset")) selectProfile(profile);
  });
  return label;
}

function renderProfiles(defaultId) {
  profileList.replaceChildren();
  profiles.forEach((profile) => profileList.append(profileCard(profile)));
  const next = profiles.find((profile) => profile.id === defaultId) ||
    profiles.find((profile) => profile.id === "usa-iphone-17-pro-max") ||
    profiles[0];
  if (next) selectProfile(next);
}

async function loadProfiles() {
  const response = await fetch("/api/profiles");
  const builtIns = await response.json();
  const custom = await fetchCustomProfilesCloud();
  const hidden = loadHiddenProfiles();
  profiles = [...custom.map(c => ({ ...c, custom: true })), ...builtIns.filter((profile) => !hidden.has(profile.id))];
  renderProfiles();
  updateRestoreButton();
}

function buildCustomPreset() {
  const device = DEVICE_CATALOG.find((item) => item.id === $("#presetDevice").value);
  if (!device) throw new Error("Выбери модель телефона.");
  const locationKey = $("#presetLocation").value;
  const location = locationKey === "custom"
    ? {
      label: $("#presetPlace").value.trim() || "Custom location",
      city: $("#presetCity").value.trim(),
      country: $("#presetCountry").value.trim(),
      countryCode: $("#presetCountryCode").value.trim().toUpperCase(),
      lat: Number($("#presetLat").value),
      lon: Number($("#presetLon").value),
      altitude: 38
    }
    : LOCATION_LIBRARY[locationKey];
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lon)) throw new Error("Проверь координаты.");
  const tags = {
    "EXIF:Make": device.brand,
    "EXIF:Model": device.model,
    "EXIF:Software": device.software,
    "EXIF:HostComputer": device.model,
    "EXIF:LensMake": device.brand,
    "EXIF:LensModel": device.lens,
    "EXIF:FNumber": String(device.aperture),
    "EXIF:FocalLength": String(device.focal),
    "EXIF:FocalLengthIn35mmFormat": String(device.focal35),
    "EXIF:ISO": String(Number($("#presetIso").value) || 100),
    "EXIF:ExposureTime": $("#presetExposure").value.trim() || "1/100",
    "EXIF:ExposureProgram#": "2", "EXIF:MeteringMode#": "5", "EXIF:Flash#": "16",
    "EXIF:SensingMethod#": "2", "EXIF:SceneType#": "1", "EXIF:ExposureMode#": "0",
    "EXIF:WhiteBalance#": "0", "EXIF:SceneCaptureType#": "0", "EXIF:Orientation#": "1",
    "EXIF:GPSLatitude": String(Math.abs(location.lat)), "EXIF:GPSLatitudeRef": location.lat >= 0 ? "N" : "S",
    "EXIF:GPSLongitude": String(Math.abs(location.lon)), "EXIF:GPSLongitudeRef": location.lon >= 0 ? "E" : "W",
    "EXIF:GPSAltitude": String(location.altitude), "EXIF:GPSAltitudeRef#": "0",
    "EXIF:GPSMapDatum": "WGS-84", "EXIF:GPSImgDirectionRef": "M", "EXIF:GPSImgDirection": "315",
    "IPTC:City": location.city, "IPTC:Country-PrimaryLocationName": location.country,
    "IPTC:Sub-location": location.label, "XMP-photoshop:City": location.city,
    "XMP-photoshop:Country": location.country, "XMP-iptcCore:CountryCode": location.countryCode,
    "XMP-iptcCore:Location": location.label
  };
  return {
    id: `custom-${Date.now()}`,
    name: $("#presetName").value.trim(),
    subtitle: `${device.model} · ${location.label}`,
    description: `Пользовательский профиль: ${device.brand} ${device.model}, ${location.label}.`,
    tags,
    platform: device.platform,
    custom: true
  };
}

function renderDeviceOptions(query = "") {
  const select = $("#presetDevice");
  const current = select.value;
  const normalized = query.trim().toLowerCase();
  const filtered = DEVICE_CATALOG.filter((item) =>
    `${item.brand} ${item.model}`.toLowerCase().includes(normalized)
  );
  select.replaceChildren();
  const brands = [...new Set(filtered.map((item) => item.brand))];
  brands.forEach((brand) => {
    const group = document.createElement("optgroup");
    group.label = brand;
    filtered.filter((item) => item.brand === brand).forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.model;
      group.append(option);
    });
    select.append(group);
  });
  const fallback = filtered.find((item) => item.id === current) ||
    filtered.find((item) => item.model === "iPhone SE (2nd generation)") ||
    filtered[0];
  if (fallback) select.value = fallback.id;
}

fileInput.addEventListener("change", () => {
  addFiles(fileInput.files);
  fileInput.value = "";
});

window.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("dragging");
});

window.addEventListener("dragleave", (event) => {
  event.preventDefault();
  if (event.target === document.documentElement || event.target === document.body) {
    dropzone.classList.remove("dragging");
  }
});

window.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("dragging");
  if (event.dataTransfer.files.length) {
    addFiles(event.dataTransfer.files);
  }
});
fileGrid.addEventListener("click", (event) => {
  const move = event.target.closest("[data-move]");
  if (move) {
    event.preventDefault();
    const from = Number(move.dataset.move);
    const to = from + Number(move.dataset.direction);
    if (to >= 0 && to < selectedFiles.length) {
      [selectedFiles[from], selectedFiles[to]] = [selectedFiles[to], selectedFiles[from]];
      renderFiles();
    }
    return;
  }
  const button = event.target.closest("[data-remove]");
  if (!button) return;
  event.preventDefault();
  selectedFiles.splice(Number(button.dataset.remove), 1);
  renderFiles();
});

profileList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const id = button.dataset.delete;
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;
  if (!confirm(`Удалить пресет «${profile.name}»?`)) return;
  if (profile.custom) {
    if (session) {
      fetch(`/api/profiles/custom/${id}`, { method: "DELETE", headers: getAuthHeaders() }).catch(console.error);
    } else {
      localStorage.setItem("metadataStudioPresets", JSON.stringify(loadCustomProfilesLocal().filter((item) => item.id !== id)));
    }
  } else {
    const hidden = loadHiddenProfiles();
    hidden.add(id);
    saveHiddenProfiles(hidden);
  }
  profiles = profiles.filter((item) => item.id !== id);
  renderProfiles();
  updateRestoreButton();
});

$("#restorePresets").addEventListener("click", async () => {
  localStorage.removeItem("metadataStudioHiddenProfiles");
  await loadProfiles();
});

document.querySelectorAll('input[name="namingMode"]').forEach((input) => {
  input.addEventListener("change", () => {
    namingMode = input.value;
    customName.hidden = namingMode !== "custom";
    updateNamePreview();
  });
});
[customName, startNumber].forEach((input) => input.addEventListener("input", updateNamePreview));

$("#showTags").addEventListener("click", () => {
  $("#dialogTitle").textContent = selectedProfile.name;
  $("#tagList").replaceChildren();
  for (const [tag, value] of Object.entries(selectedProfile.tags)) {
    const item = document.createElement("div");
    item.className = "tag-item";
    item.innerHTML = `<span>${escapeHtml(tag)}</span><b>${escapeHtml(value)}</b>`;
    $("#tagList").append(item);
  }
  tagsDialog.showModal();
});
$("#openBuilder").addEventListener("click", () => presetDialog.showModal());
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});

function updateLocationPreview(location) {
  if (!location) {
    $("#locationPreviewName").textContent = "Свои координаты";
    $("#locationPreviewMeta").textContent = "Заполните точные данные ниже";
    return;
  }
  $("#locationPreviewName").textContent = location.label;
  $("#locationPreviewMeta").textContent = `${location.city}, ${location.country} · ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
}

$("#presetLocation").addEventListener("change", () => {
  const location = LOCATION_LIBRARY[$("#presetLocation").value];
  if (location) {
    $("#presetLat").value = location.lat;
    $("#presetLon").value = location.lon;
    $("#presetCity").value = location.city;
    $("#presetCountry").value = location.country;
    $("#presetCountryCode").value = location.countryCode;
    $("#presetPlace").value = location.label;
  }
  updateLocationPreview(location);
});
$("#deviceSearch").addEventListener("input", (event) => renderDeviceOptions(event.target.value));
$("#presetDevice").addEventListener("change", () => {
  const device = DEVICE_CATALOG.find((item) => item.id === $("#presetDevice").value);
  $("#presetIso").value = device?.platform === "ios" ? 125 : 100;
});
$("#presetForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const profile = buildCustomPreset();
    if (!profile.name) throw new Error("Введи название пресета.");
    
    if (session) {
      const res = await fetch("/api/profiles/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(profile)
      });
      if (!res.ok) throw new Error("Ошибка сохранения профиля в облаке.");
      const saved = await res.json();
      profile.id = saved.id;
    } else {
      const custom = [profile, ...loadCustomProfilesLocal()];
      localStorage.setItem("metadataStudioPresets", JSON.stringify(custom));
    }

    profiles = [profile, ...profiles.filter((item) => item.id !== profile.id)];
    renderProfiles(profile.id);
    presetDialog.close();
    event.target.reset();
  } catch (error) {
    alert(error.message);
  }
});

processButton.addEventListener("click", async () => {
  processButton.disabled = true;
  const processingDialog = $("#processingDialog");
  processingDialog.showModal();
  processingDialog.removeAttribute("inert");
  result.hidden = true;
  resultToken = null;
  cleanSaveButton.disabled = false;
  cleanSaveButton.innerHTML = "<span>Выбрать папку и сохранить</span><b>↓</b>";

  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append("photos", file));
  formData.append("profile", selectedProfile.custom ? "custom" : selectedProfile.id);
  if (selectedProfile.custom) formData.append("customProfile", JSON.stringify(selectedProfile));
  formData.append("namingMode", namingMode);
  formData.append("customName", customName.value);
  formData.append("startNumber", startNumber.value);
  formData.append("startDate", startDate.value);
  formData.append("intervalSeconds", intervalSeconds.value);

  try {
    const response = await fetch("/api/process", { method: "POST", body: formData });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Не удалось обработать партию.");
    resultToken = payload.token;
    $("#resultTitle").textContent = `${payload.count} фото готовы.`;
    resultDetails.textContent = `${payload.profile} · последовательная партия`;
    resultList.replaceChildren();
    payload.files.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.innerHTML = `<b>${escapeHtml(file.name)}</b><span>${new Date(file.captureDate).toLocaleString("ru-RU")}</span><span class="pending-mark">•</span>`;
      resultList.append(row);
    });
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    alert(error.message);
  } finally {
    processingDialog.close();
    processingDialog.setAttribute("inert", "");
    updateButton();
  }
});

cleanSaveButton.addEventListener("click", async () => {
  if (!resultToken) return;
  cleanSaveButton.disabled = true;
  if (!runtime.localSave) {
    cleanSaveButton.innerHTML = "<span>Готовлю ZIP…</span><b>↓</b>";
    try {
      const response = await fetch(`/api/download-batch/${resultToken}`);
      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Не удалось скачать партию.");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : "Metadata Studio.zip";
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resultToken = null;
      cleanSaveButton.innerHTML = "<span>Партия скачана</span><b>✓</b>";
      setTimeout(() => {
        resetWorkspace();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
    } catch (error) {
      alert(error.message);
      cleanSaveButton.disabled = false;
      cleanSaveButton.innerHTML = "<span>Скачать партию ZIP</span><b>↓</b>";
    }
    return;
  }

  cleanSaveButton.innerHTML = "<span>Выбери папку в окне macOS…</span><b>↗</b>";
  try {
    const response = await fetch(`/api/save/${resultToken}`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Не удалось сохранить партию.");
    resultDetails.textContent = `Сохранено ${payload.count} файлов: ${payload.path}`;
    cleanSaveButton.innerHTML = "<span>Сохранено, папка открыта</span><b>✓</b>";
    resultList.querySelectorAll(".pending-mark").forEach((mark) => {
      mark.replaceWith(Object.assign(document.createElement("span"), {
        className: "saved-mark", textContent: "✓"
      }));
    });
    resultToken = null;
    setTimeout(() => {
      resetWorkspace();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 700);
  } catch (error) {
    if (error.message !== "Сохранение отменено.") alert(error.message);
    cleanSaveButton.disabled = false;
    cleanSaveButton.innerHTML = "<span>Выбрать папку и сохранить</span><b>↓</b>";
  }
});

function updateAuthUI() {
  if (session) {
    const meta = session.user.user_metadata || {};
    const email = session.user.email;
    const name = meta.full_name || email;
    const avatarUrl = meta.avatar_url;

    userEmail.textContent = name;
    
    if (avatarUrl) {
      userAvatar.style.background = `url(${avatarUrl}) center/cover`;
      userAvatar.textContent = "";
    } else {
      userAvatar.style.background = "linear-gradient(135deg, #6366f1, #a855f7)";
      userAvatar.textContent = (name[0] || email[0] || "U").toUpperCase();
    }

    userProfile.style.display = "flex";
    loginButton.style.display = "none";
  } else {
    userProfile.style.display = "none";
    loginButton.style.display = "block";
  }
}

googleAuthButton.addEventListener("click", async () => {
  if (!supabase) return alert("Supabase не настроен.");
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    alert(err.message);
  }
});

loginButton.addEventListener("click", () => authDialog.showModal());
logoutButton.addEventListener("click", async () => {
  if (supabase) {
    await supabase.auth.signOut();
    session = null;
    updateAuthUI();
    loadProfiles();
  }
});

authToggleMode.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  authTitle.textContent = authMode === "login" ? "Вход в систему" : "Регистрация";
  authToggleMode.textContent = authMode === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти";
  authSubmit.innerHTML = `${authMode === "login" ? "Войти" : "Создать аккаунт"} <span>→</span>`;
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabase) return alert("Supabase не настроен.");
  authSubmit.disabled = true;
  try {
    const email = $("#authEmail").value;
    const password = $("#authPassword").value;
    const { data, error } = authMode === "login"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password });
    
    if (error) throw error;
    if (authMode === "register" && !data.session) {
      alert("Регистрация успешна! Проверьте почту.");
    } else {
      session = data.session;
      updateAuthUI();
      loadProfiles();
      authDialog.close();
    }
  } catch (err) {
    alert(err.message);
  } finally {
    authSubmit.disabled = false;
  }
});

async function init() {
  try {
    const configRes = await fetch("/api/config");
    const config = await configRes.json();
    if (config.supabaseUrl && window.supabase) {
      supabase = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      const { data } = await supabase.auth.getSession();
      session = data?.session || null;
      updateAuthUI();
    }
  } catch (err) {
    console.error("Supabase init error:", err);
  }

  try {
    const [runtimeInfo] = await Promise.all([
      fetch("/api/runtime").then(res => res.json()),
      loadProfiles()
    ]);
    
    runtime = runtimeInfo;
    if (!runtime.localSave) {
      cleanSaveButton.innerHTML = "<span>Скачать партию ZIP</span><b>↓</b>";
      $(".save-actions > span").innerHTML = "После скачивания временные фотографии<br>сразу удаляются с сервера.";
    }
  } catch (err) {
    console.error(err);
    profileDescription.textContent = "Ошибка загрузки данных.";
  }
}

startDate.value = localDateTimeValue();
startNumber.value = Math.floor(Math.random() * 8000 + 1000);
renderDeviceOptions();
updateNamePreview();

init();
