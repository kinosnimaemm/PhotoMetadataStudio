const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Polyfill for older Safari (e.g. Safari 14) that doesn't fully support <dialog>
document.querySelectorAll('dialog').forEach(d => {
  if (!d.showModal) {
    d.showModal = function() {
      this.setAttribute("open", "");
      this.style.display = "block";
      this.style.position = "fixed";
      this.style.top = "50%";
      this.style.left = "50%";
      this.style.transform = "translate(-50%, -50%)";
      this.style.zIndex = "9999";
      this.style.background = "var(--ink)";
      this.style.color = "var(--paper)";
    };
    d.close = function() {
      this.removeAttribute("open");
      this.style.display = "none";
    };
  }
});

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
  gate: { label: "Brandenburg Gate", city: "Berlin", country: "Germany", countryCode: "DE", lat: 52.516275, lon: 13.377704, altitude: 38, timeZone: "Europe/Berlin", search: "германия берлин бранденбургские ворота европа germany berlin europe" },
  alex: { label: "Alexanderplatz", city: "Berlin", country: "Germany", countryCode: "DE", lat: 52.521918, lon: 13.413215, altitude: 37, timeZone: "Europe/Berlin", search: "германия берлин александерплац europe" },
  munich: { label: "Marienplatz", city: "Munich", country: "Germany", countryCode: "DE", lat: 48.137154, lon: 11.576124, altitude: 519, timeZone: "Europe/Berlin", search: "германия мюнхен мариенплац europe" },
  hamburg: { label: "Speicherstadt", city: "Hamburg", country: "Germany", countryCode: "DE", lat: 53.5438, lon: 9.9881, altitude: 8, timeZone: "Europe/Berlin", search: "германия гамбург europe" },
  cologne: { label: "Cologne Cathedral", city: "Cologne", country: "Germany", countryCode: "DE", lat: 50.941278, lon: 6.958281, altitude: 58, timeZone: "Europe/Berlin", search: "германия кёльн кельн собор europe" },
  times: { label: "Times Square", city: "New York", region: "New York", country: "United States", countryCode: "US", lat: 40.758, lon: -73.9855, altitude: 15, timeZone: "America/New_York", search: "сша америка нью-йорк таймс сквер штаты usa america new york" },
  central: { label: "Central Park", city: "New York", region: "New York", country: "United States", countryCode: "US", lat: 40.7812, lon: -73.9665, altitude: 24, timeZone: "America/New_York", search: "сша америка нью-йорк центральный парк usa america" },
  brooklyn: { label: "Brooklyn Bridge", city: "New York", region: "New York", country: "United States", countryCode: "US", lat: 40.706086, lon: -73.996864, altitude: 12, timeZone: "America/New_York", search: "сша америка нью-йорк бруклинский мост usa america" },
  hollywood: { label: "Hollywood Boulevard", city: "Los Angeles", region: "California", country: "United States", countryCode: "US", lat: 34.1016, lon: -118.3267, altitude: 108, timeZone: "America/Los_Angeles", search: "сша америка калифорния лос-анджелес голливуд usa america california" },
  venice: { label: "Venice Beach", city: "Los Angeles", region: "California", country: "United States", countryCode: "US", lat: 33.985, lon: -118.4695, altitude: 3, timeZone: "America/Los_Angeles", search: "сша америка калифорния лос-анджелес венис бич пляж usa california" },
  golden: { label: "Golden Gate Bridge", city: "San Francisco", region: "California", country: "United States", countryCode: "US", lat: 37.8199, lon: -122.4783, altitude: 67, timeZone: "America/Los_Angeles", search: "сша америка калифорния сан-франциско золотые ворота usa california" },
  miami: { label: "South Beach", city: "Miami Beach", region: "Florida", country: "United States", countryCode: "US", lat: 25.7826, lon: -80.1341, altitude: 2, timeZone: "America/New_York", search: "сша америка флорида майами саут бич пляж usa america florida miami" },
  orlando: { label: "Walt Disney World", city: "Orlando", region: "Florida", country: "United States", countryCode: "US", lat: 28.3772, lon: -81.5707, altitude: 31, timeZone: "America/New_York", search: "сша америка флорида орландо дисней usa florida" },
  keywest: { label: "Duval Street", city: "Key West", region: "Florida", country: "United States", countryCode: "US", lat: 24.5551, lon: -81.78, altitude: 2, timeZone: "America/New_York", search: "сша америка флорида ки-уэст usa florida" },
  vegas: { label: "Las Vegas Strip", city: "Las Vegas", region: "Nevada", country: "United States", countryCode: "US", lat: 36.1147, lon: -115.1728, altitude: 613, timeZone: "America/Los_Angeles", search: "сша америка невада лас-вегас казино usa nevada" },
  chicago: { label: "Millennium Park", city: "Chicago", region: "Illinois", country: "United States", countryCode: "US", lat: 41.8826, lon: -87.6226, altitude: 181, timeZone: "America/Chicago", search: "сша америка иллинойс чикаго usa illinois" },
  dc: { label: "National Mall", city: "Washington", region: "D.C.", country: "United States", countryCode: "US", lat: 38.8895, lon: -77.0353, altitude: 10, timeZone: "America/New_York", search: "сша америка вашингтон капитолий usa washington dc" },
  boston: { label: "Freedom Trail", city: "Boston", region: "Massachusetts", country: "United States", countryCode: "US", lat: 42.3601, lon: -71.0589, altitude: 14, timeZone: "America/New_York", search: "сша америка массачусетс бостон usa massachusetts" },
  seattle: { label: "Pike Place Market", city: "Seattle", region: "Washington", country: "United States", countryCode: "US", lat: 47.6097, lon: -122.3422, altitude: 30, timeZone: "America/Los_Angeles", search: "сша америка сиэтл вашингтон usa washington" },
  austin: { label: "South Congress", city: "Austin", region: "Texas", country: "United States", countryCode: "US", lat: 30.25, lon: -97.75, altitude: 149, timeZone: "America/Chicago", search: "сша америка техас остин usa texas" },
  neworleans: { label: "French Quarter", city: "New Orleans", region: "Louisiana", country: "United States", countryCode: "US", lat: 29.9584, lon: -90.0644, altitude: 2, timeZone: "America/Chicago", search: "сша америка луизиана новый орлеан usa louisiana" },
  honolulu: { label: "Waikiki Beach", city: "Honolulu", region: "Hawaii", country: "United States", countryCode: "US", lat: 21.2766, lon: -157.8269, altitude: 3, timeZone: "Pacific/Honolulu", search: "сша америка гавайи гонолулу вайкики пляж usa hawaii" },
  toronto: { label: "CN Tower", city: "Toronto", country: "Canada", countryCode: "CA", lat: 43.6426, lon: -79.3871, altitude: 76, timeZone: "America/Toronto", search: "канада торонто canada" },
  vancouver: { label: "Stanley Park", city: "Vancouver", country: "Canada", countryCode: "CA", lat: 49.3017, lon: -123.1417, altitude: 15, timeZone: "America/Vancouver", search: "канада ванкувер canada" },
  cancun: { label: "Playa Delfines", city: "Cancún", country: "Mexico", countryCode: "MX", lat: 21.0875, lon: -86.7693, altitude: 5, timeZone: "America/Cancun", search: "мексика канкун пляж mexico cancun" },
  rio: { label: "Copacabana Beach", city: "Rio de Janeiro", country: "Brazil", countryCode: "BR", lat: -22.9711, lon: -43.1822, altitude: 3, timeZone: "America/Sao_Paulo", search: "бразилия рио-де-жанейро копакабана пляж brazil rio" },
  london: { label: "Piccadilly Circus", city: "London", country: "United Kingdom", countryCode: "GB", lat: 51.510067, lon: -0.133869, altitude: 22, timeZone: "Europe/London", search: "англия великобритания лондон пикадилли uk england britain" },
  tower: { label: "Tower Bridge", city: "London", country: "United Kingdom", countryCode: "GB", lat: 51.505456, lon: -0.075356, altitude: 10, timeZone: "Europe/London", search: "англия великобритания лондон тауэрский мост uk england" },
  edinburgh: { label: "Royal Mile", city: "Edinburgh", country: "United Kingdom", countryCode: "GB", lat: 55.9508, lon: -3.1875, altitude: 90, timeZone: "Europe/London", search: "шотландия эдинбург scotland uk" },
  paris: { label: "Eiffel Tower", city: "Paris", country: "France", countryCode: "FR", lat: 48.85837, lon: 2.294481, altitude: 35, timeZone: "Europe/Paris", search: "франция париж эйфелева башня france europe" },
  louvre: { label: "Louvre Museum", city: "Paris", country: "France", countryCode: "FR", lat: 48.860611, lon: 2.337644, altitude: 36, timeZone: "Europe/Paris", search: "франция париж лувр музей france" },
  nice: { label: "Promenade des Anglais", city: "Nice", country: "France", countryCode: "FR", lat: 43.6951, lon: 7.2654, altitude: 4, timeZone: "Europe/Paris", search: "франция ницца лазурный берег france riviera" },
  rome: { label: "Colosseum", city: "Rome", country: "Italy", countryCode: "IT", lat: 41.89021, lon: 12.492231, altitude: 21, timeZone: "Europe/Rome", search: "италия рим колизей italy europe" },
  venicesm: { label: "St Mark's Square", city: "Venice", country: "Italy", countryCode: "IT", lat: 45.434, lon: 12.3388, altitude: 2, timeZone: "Europe/Rome", search: "италия венеция сан-марко italy" },
  milan: { label: "Duomo di Milano", city: "Milan", country: "Italy", countryCode: "IT", lat: 45.464211, lon: 9.191383, altitude: 122, timeZone: "Europe/Rome", search: "италия милан дуомо italy" },
  florence: { label: "Ponte Vecchio", city: "Florence", country: "Italy", countryCode: "IT", lat: 43.768, lon: 11.2531, altitude: 50, timeZone: "Europe/Rome", search: "италия флоренция italy" },
  madrid: { label: "Puerta del Sol", city: "Madrid", country: "Spain", countryCode: "ES", lat: 40.416947, lon: -3.703528, altitude: 650, timeZone: "Europe/Madrid", search: "испания мадрид spain europe" },
  barcelona: { label: "Sagrada Família", city: "Barcelona", country: "Spain", countryCode: "ES", lat: 41.403629, lon: 2.174356, altitude: 38, timeZone: "Europe/Madrid", search: "испания барселона саграда фамилия spain" },
  amsterdam: { label: "Dam Square", city: "Amsterdam", country: "Netherlands", countryCode: "NL", lat: 52.373169, lon: 4.893, altitude: 2, timeZone: "Europe/Amsterdam", search: "нидерланды голландия амстердам netherlands holland" },
  lisbon: { label: "Belém Tower", city: "Lisbon", country: "Portugal", countryCode: "PT", lat: 38.6916, lon: -9.216, altitude: 5, timeZone: "Europe/Lisbon", search: "португалия лиссабон portugal" },
  vienna: { label: "Stephansplatz", city: "Vienna", country: "Austria", countryCode: "AT", lat: 48.208516, lon: 16.373091, altitude: 171, timeZone: "Europe/Vienna", search: "австрия вена austria" },
  prague: { label: "Charles Bridge", city: "Prague", country: "Czechia", countryCode: "CZ", lat: 50.086447, lon: 14.411856, altitude: 195, timeZone: "Europe/Prague", search: "чехия прага карлов мост czech" },
  warsaw: { label: "Old Town Market", city: "Warsaw", country: "Poland", countryCode: "PL", lat: 52.2497, lon: 21.0122, altitude: 100, timeZone: "Europe/Warsaw", search: "польша варшава poland" },
  krakow: { label: "Main Market Square", city: "Kraków", country: "Poland", countryCode: "PL", lat: 50.061667, lon: 19.937222, altitude: 219, timeZone: "Europe/Warsaw", search: "польша краков poland" },
  athens: { label: "Acropolis", city: "Athens", country: "Greece", countryCode: "GR", lat: 37.9715, lon: 23.7267, altitude: 150, timeZone: "Europe/Athens", search: "греция афины акрополь greece" },
  santorini: { label: "Oia", city: "Santorini", country: "Greece", countryCode: "GR", lat: 36.4618, lon: 25.3753, altitude: 100, timeZone: "Europe/Athens", search: "греция санторини ия остров greece island" },
  istanbul: { label: "Hagia Sophia", city: "Istanbul", country: "Türkiye", countryCode: "TR", lat: 41.008587, lon: 28.980175, altitude: 40, timeZone: "Europe/Istanbul", search: "турция стамбул айя-софия turkey istanbul" },
  kyiv: { label: "Khreshchatyk Street", city: "Kyiv", country: "Ukraine", countryCode: "UA", lat: 50.447731, lon: 30.522513, altitude: 120, timeZone: "Europe/Kyiv", search: "украина киев крещатик ukraine kiev" },
  lviv: { label: "Rynok Square", city: "Lviv", country: "Ukraine", countryCode: "UA", lat: 49.841952, lon: 24.031592, altitude: 296, timeZone: "Europe/Kyiv", search: "украина львов площадь рынок ukraine" },
  odesa: { label: "Potemkin Stairs", city: "Odesa", country: "Ukraine", countryCode: "UA", lat: 46.4886, lon: 30.7416, altitude: 30, timeZone: "Europe/Kyiv", search: "украина одесса потёмкинская лестница ukraine odessa" },
  dubai: { label: "Burj Khalifa", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.197197, lon: 55.274376, altitude: 12, timeZone: "Asia/Dubai", search: "оаэ эмираты дубай бурдж-халифа uae emirates" },
  marina: { label: "Dubai Marina", city: "Dubai", country: "United Arab Emirates", countryCode: "AE", lat: 25.0805, lon: 55.1403, altitude: 5, timeZone: "Asia/Dubai", search: "оаэ эмираты дубай марина uae" },
  abudhabi: { label: "Sheikh Zayed Mosque", city: "Abu Dhabi", country: "United Arab Emirates", countryCode: "AE", lat: 24.4129, lon: 54.475, altitude: 12, timeZone: "Asia/Dubai", search: "оаэ эмираты абу-даби мечеть uae" },
  telaviv: { label: "Gordon Beach", city: "Tel Aviv", country: "Israel", countryCode: "IL", lat: 32.0833, lon: 34.7667, altitude: 5, timeZone: "Asia/Jerusalem", search: "израиль тель-авив пляж israel" },
  giza: { label: "Pyramids of Giza", city: "Giza", country: "Egypt", countryCode: "EG", lat: 29.9792, lon: 31.1342, altitude: 60, timeZone: "Africa/Cairo", search: "египет гиза каир пирамиды egypt cairo" },
  tokyo: { label: "Shibuya Crossing", city: "Tokyo", country: "Japan", countryCode: "JP", lat: 35.6595, lon: 139.7005, altitude: 30, timeZone: "Asia/Tokyo", search: "япония токио сибуя japan" },
  kyoto: { label: "Fushimi Inari Shrine", city: "Kyoto", country: "Japan", countryCode: "JP", lat: 34.9671, lon: 135.7727, altitude: 70, timeZone: "Asia/Tokyo", search: "япония киото фусими инари храм japan" },
  seoul: { label: "Gangnam", city: "Seoul", country: "South Korea", countryCode: "KR", lat: 37.4979, lon: 127.0276, altitude: 40, timeZone: "Asia/Seoul", search: "корея сеул каннам korea" },
  shanghai: { label: "The Bund", city: "Shanghai", country: "China", countryCode: "CN", lat: 31.2401, lon: 121.4905, altitude: 5, timeZone: "Asia/Shanghai", search: "китай шанхай набережная china" },
  hongkong: { label: "Victoria Peak", city: "Hong Kong", country: "Hong Kong", countryCode: "HK", lat: 22.2759, lon: 114.1455, altitude: 552, timeZone: "Asia/Hong_Kong", search: "гонконг пик виктория hong kong china" },
  singapore: { label: "Marina Bay Sands", city: "Singapore", country: "Singapore", countryCode: "SG", lat: 1.2834, lon: 103.8607, altitude: 5, timeZone: "Asia/Singapore", search: "сингапур марина бэй singapore" },
  bangkok: { label: "Grand Palace", city: "Bangkok", country: "Thailand", countryCode: "TH", lat: 13.75, lon: 100.4913, altitude: 3, timeZone: "Asia/Bangkok", search: "таиланд бангкок дворец thailand" },
  phuket: { label: "Patong Beach", city: "Phuket", country: "Thailand", countryCode: "TH", lat: 7.8965, lon: 98.2966, altitude: 3, timeZone: "Asia/Bangkok", search: "таиланд пхукет патонг пляж thailand" },
  bali: { label: "Uluwatu Temple", city: "Bali", country: "Indonesia", countryCode: "ID", lat: -8.8291, lon: 115.0849, altitude: 70, timeZone: "Asia/Makassar", search: "индонезия бали улувату храм indonesia" },
  maldives: { label: "Hulhumalé Beach", city: "Malé", country: "Maldives", countryCode: "MV", lat: 4.2105, lon: 73.5409, altitude: 1, timeZone: "Indian/Maldives", search: "мальдивы мале пляж остров maldives island" },
  sydney: { label: "Sydney Opera House", city: "Sydney", country: "Australia", countryCode: "AU", lat: -33.8568, lon: 151.2153, altitude: 5, timeZone: "Australia/Sydney", search: "австралия сидней опера australia" },
  melbourne: { label: "Federation Square", city: "Melbourne", country: "Australia", countryCode: "AU", lat: -37.8183, lon: 144.9671, altitude: 15, timeZone: "Australia/Melbourne", search: "австралия мельбурн australia" },
};

// --- Тосты вместо alert() ---
function toast(message, type = "error") {
  const host = $("#toastHost");
  const node = document.createElement("div");
  node.className = `toast toast-${type}`;
  node.textContent = message;
  host.append(node);
  requestAnimationFrame(() => node.classList.add("visible"));
  setTimeout(() => {
    node.classList.remove("visible");
    setTimeout(() => node.remove(), 350);
  }, 4200);
}

// ============ Язык интерфейса (RU/EN) ============
const LANG_KEY = "metadataStudioLang";
let lang = localStorage.getItem(LANG_KEY) || ((navigator.language || "").toLowerCase().startsWith("ru") ? "ru" : "en");

const STR = {
  customCoords: { ru: "Свои координаты", en: "Custom coordinates" },
  counter: { ru: (n) => `${n} из 10`, en: (n) => `${n} of 10` },
  actionEmpty: { ru: "Сначала добавьте хотя бы одну фотографию", en: "Add at least one photo first" },
  actionReady: { ru: (n, name) => `${n} фото · профиль «${name}»`, en: (n, name) => `${n} photo${n === 1 ? "" : "s"} · profile “${name}”` },
  noProfile: { ru: "не выбран", en: "not selected" },
  processDefault: { ru: "Обработать фотографии", en: "Process photos" },
  processN: { ru: (n) => `Обработать ${n} ${n === 1 ? "фотографию" : "фотографии"}`, en: (n) => `Process ${n} photo${n === 1 ? "" : "s"}` },
  originalNames: { ru: "Исходные имена", en: "Original names" },
  defaultBatchName: { ru: "Название", en: "Batch" },
  maxPhotos: { ru: "Можно добавить максимум 10 фотографий.", en: "You can add at most 10 photos." },
  pasted: { ru: (n) => `Добавлено из буфера: ${n} фото`, en: (n) => `Pasted from clipboard: ${n} photo${n === 1 ? "" : "s"}` },
  tzHint: { ru: (city, off) => `Время трактуется по часам локации: ${city} (${off})`, en: (city, off) => `Times are interpreted in the location's clock: ${city} (${off})` },
  deleteAgain: { ru: "Нажмите ещё раз, чтобы удалить", en: "Click again to delete" },
  deleteTitle: { ru: "Удалить пресет", en: "Delete preset" },
  deviceRequired: { ru: "Выбери модель телефона.", en: "Pick a phone model." },
  coordsInvalid: { ru: "Проверь координаты.", en: "Check the coordinates." },
  presetNameRequired: { ru: "Введи название пресета.", en: "Enter a preset name." },
  cloudSaveErr: { ru: "Ошибка сохранения профиля в облаке.", en: "Failed to save the profile to the cloud." },
  fillBelow: { ru: "Заполните точные данные ниже", en: "Fill in the exact details below" },
  fillCityCountry: { ru: (c) => `${c} · заполните город и страну ниже`, en: (c) => `${c} · fill in city and country below` },
  btnSaveLocal: { ru: "<span>Выбрать папку и сохранить</span><b>↓</b>", en: "<span>Choose folder & save</span><b>↓</b>" },
  btnDownloadZip: { ru: "<span>Скачать партию ZIP</span><b>↓</b>", en: "<span>Download batch ZIP</span><b>↓</b>" },
  btnPreparingZip: { ru: "<span>Готовлю ZIP…</span><b>↓</b>", en: "<span>Preparing ZIP…</span><b>↓</b>" },
  btnDownloaded: { ru: "<span>Партия скачана</span><b>✓</b>", en: "<span>Batch downloaded</span><b>✓</b>" },
  btnChooseMac: { ru: "<span>Выбери папку в окне macOS…</span><b>↗</b>", en: "<span>Pick a folder in the macOS window…</span><b>↗</b>" },
  btnSavedOpened: { ru: "<span>Сохранено, папка открыта</span><b>✓</b>", en: "<span>Saved, folder opened</span><b>✓</b>" },
  savedN: { ru: (n, p) => `Сохранено ${n} файлов: ${p}`, en: (n, p) => `Saved ${n} files: ${p}` },
  resultReady: { ru: (n) => `${n} фото готовы.`, en: (n) => `${n} photo${n === 1 ? "" : "s"} ready.` },
  resultBatch: { ru: (p) => `${p} · последовательная партия`, en: (p) => `${p} · sequential batch` },
  prepN: { ru: (n) => `Подготовка ${n} фото…`, en: (n) => `Preparing ${n} photo${n === 1 ? "" : "s"}…` },
  progressLine: { ru: (d, tot, cur) => `${d} из ${tot} · ${cur}`, en: (d, tot, cur) => `${d} of ${tot} · ${cur}` },
  processFail: { ru: "Не удалось обработать партию.", en: "Failed to process the batch." },
  balance: { ru: (n) => `${n} фото`, en: (n) => `${n} photos` },
  balanceUnlimited: { ru: "∞ фото", en: "∞ photos" },
  downloadFail: { ru: "Не удалось скачать партию.", en: "Failed to download the batch." },
  saveFail: { ru: "Не удалось сохранить партию.", en: "Failed to save the batch." },
  supabaseNA: { ru: "Supabase не настроен.", en: "Supabase is not configured." },
  signupOk: { ru: "Регистрация успешна! Проверьте почту.", en: "Signed up! Check your email." },
  authTitleLogin: { ru: "Вход в систему", en: "Sign in" },
  authTitleReg: { ru: "Регистрация", en: "Sign up" },
  authToggleLogin: { ru: "Нет аккаунта? Зарегистрироваться", en: "No account? Sign up" },
  authToggleReg: { ru: "Уже есть аккаунт? Войти", en: "Already have an account? Sign in" },
  authSubmitLogin: { ru: "Войти", en: "Sign in" },
  authSubmitReg: { ru: "Создать аккаунт", en: "Create account" },
  brandLocal: { ru: "Загрузите фото, выберите профиль и сохраните готовую партию. Просто, последовательно и только на вашем Mac.", en: "Upload photos, pick a profile and save the finished batch. Simple, consistent and only on your Mac." },
  brandCloud: { ru: "Загрузите фото, выберите профиль и скачайте готовую партию. Файлы удаляются с сервера сразу после скачивания.", en: "Upload photos, pick a profile and download the finished batch. Files are deleted from the server right after download." },
  trustLocal: { ru: "<strong>Ваши фото под защитой.</strong> Они удаляются с локального сервера сразу после сохранения.", en: "<strong>Your photos stay protected.</strong> They are deleted from the local server immediately after saving." },
  trustCloud: { ru: "<strong>Ваши фото под защитой.</strong> Они удаляются с сервера сразу после скачивания.", en: "<strong>Your photos stay protected.</strong> They are deleted from the server immediately after download." },
  saveHintLocal: { ru: "Файлы записываются напрямую на Mac.<br>Браузерное поле Where from не создаётся.", en: "Files are written directly to your Mac.<br>No browser “Where from” field is created." },
  saveHintCloud: { ru: "После скачивания временные фотографии<br>сразу удаляются с сервера.", en: "Temporary photos are deleted from the server<br>right after download." },
  kb: { ru: "КБ", en: "KB" },
  mb: { ru: "МБ", en: "MB" },
  themeTitle: { ru: (p) => `Тема: ${({ auto: "авто", light: "светлая", dark: "тёмная" })[p]}`, en: (p) => `Theme: ${p}` },
  docTitle: { ru: "Metadata Studio — приватная работа с метаданными фотографий", en: "Metadata Studio — private photo metadata workspace" }
};

function t(key, ...args) {
  const entry = STR[key];
  if (!entry) return key;
  const value = entry[lang] || entry.ru;
  return typeof value === "function" ? value(...args) : value;
}

// Статические узлы: RU берётся из HTML при первом применении, EN — из словаря
const STATIC_I18N = [
  ["#loginButton", "text", "Sign in"],
  [".section-heading h2", "text", ["Add photos", "Choose a profile"]],
  [".drop-empty strong", "text", "Choose photos"],
  [".drop-empty span", "text", "or drag them here, or just press Ctrl+V / ⌘V"],
  [".drop-empty small", "text", "JPEG, HEIC, PNG, TIFF, WEBP · up to 80 MB"],
  [".sequence-panel summary span", "text", "Names & time"],
  [".sequence-grid label", "first", ["Start number", "First photo date", "Time step"]],
  ["#intervalSeconds option", "text", ["15 seconds", "30 seconds", "45 seconds", "1 minute", "3 minutes", "5 minutes"]],
  [".naming-options span", "text", ["iPhone style", "Custom name", "Keep originals"]],
  ["#customName", "ph", "Batch name"],
  ["#restorePresets", "text", "Restore"],
  ["#openBuilder", "html", "<span>+</span> Create your own"],
  [".section-help", "text", "The phone and geolocation will be applied to all selected photos."],
  [".passport-row span", "text", ["Camera", "Location", "GPS", "Shot"]],
  ["#showTags", "first", "Which fields will be written "],
  ["#result .eyebrow", "text", "STEP 3 · DONE"],
  ["#tagsDialog .eyebrow", "text", "PROFILE CONTENTS"],
  ["#processingDialog h2", "text", "Processing photos…"],
  ["#processingStatus", "text", "Your files are queued and being processed. Please don't close the tab."],
  ["#presetDialog .eyebrow", "text", "PROFILE BUILDER"],
  [".builder-heading h2", "text", "Build your own profile"],
  [".builder-heading > p", "text", "Pick a phone and a point on the map — click the map to drop your own pin. Everything else is preconfigured."],
  [".profile-name-field > span", "text", "Profile name"],
  ["#presetName", "ph", "e.g. iPhone · New York"],
  [".builder-card-title b", "text", ["Phone", "Location"]],
  [".builder-card-title small", "text", ["Model and camera parameters", "Preset spot or a click on the map"]],
  ["#deviceSearch", "ph", "Search: iPhone, Pixel, Galaxy…"],
  ["#locationSearch", "ph", "Search: country, state, city… (USA, Florida, Miami)"],
  [".location-select-label", "first", "Pick a place"],
  [".advanced-fields summary span", "text", "Advanced parameters"],
  [".advanced-fields summary small", "text", "ISO, exposure, coordinates and captions"],
  [".advanced-fields .form-grid label", "first", ["ISO", "Exposure", "Latitude", "Longitude", "City", "Country", "Country code", "Place name", "Time zone"]],
  [".form-note", "text", "The profile is saved in this browser and appears first in the list."],
  [".builder-save", "first", "Create profile "],
  ["#authDialog .auth-heading p", "text", "Sync profiles in the cloud"],
  ["#googleAuthButton", "first", " Continue with Google"],
  [".auth-divider span", "text", "Or"],
  [".auth-form label", "first", ["Email", "Password"]],
  ["#topupButton", "text", "Top up"],
  [".pricing-heading h2", "text", "Top up your balance"],
  [".pricing-heading p", "text", "Pick the plan that fits you."],
  [".plan-tagline", "text", ["Essentials", "A month of freedom"]],
  [".plan-price small", "text", " / mo"],
  [".plan-card li", "html", ["<b>50</b> trial photos at sign-up", "<b>+5</b> free photos every day", "1 active profile max", "Metadata removal", "<b>Unlimited</b> photos, no limits", "<b>Unlimited</b> profiles", "Metadata removal", "24/7 support"]],
  [".dialog-close-plan", "text", "Current plan"],
  [".buy-button", "text", "Subscribe"],
  [".plan-badge", "text", "BEST VALUE"]
];
const ruOriginals = new Map();

function applyLang() {
  document.documentElement.lang = lang;
  document.title = t("docTitle");
  const langButton = $("#langToggle");
  if (langButton) langButton.textContent = lang === "ru" ? "EN" : "RU";
  STATIC_I18N.forEach(([selector, kind, en], idx) => {
    document.querySelectorAll(selector).forEach((node, nodeIdx) => {
      const key = `${idx}:${nodeIdx}`;
      const enValue = Array.isArray(en) ? en[nodeIdx] : en;
      if (enValue == null) return;
      if (kind === "first") {
        const textNode = Array.from(node.childNodes).find((child) => child.nodeType === 3 && child.nodeValue.trim());
        if (!textNode) return;
        if (!ruOriginals.has(key)) ruOriginals.set(key, textNode.nodeValue);
        textNode.nodeValue = lang === "ru" ? ruOriginals.get(key) : enValue;
      } else if (kind === "ph") {
        if (!ruOriginals.has(key)) ruOriginals.set(key, node.placeholder);
        node.placeholder = lang === "ru" ? ruOriginals.get(key) : enValue;
      } else if (kind === "html") {
        if (!ruOriginals.has(key)) ruOriginals.set(key, node.innerHTML);
        node.innerHTML = lang === "ru" ? ruOriginals.get(key) : enValue;
      } else {
        if (!ruOriginals.has(key)) ruOriginals.set(key, node.textContent);
        node.textContent = lang === "ru" ? ruOriginals.get(key) : enValue;
      }
    });
  });
  refreshDynamicTexts();
}

function refreshDynamicTexts() {
  if (typeof refreshModeCopy === "function") refreshModeCopy();
  if (typeof updateButton === "function") updateButton();
  if (typeof updateNamePreview === "function") updateNamePreview();
  const counterNode = document.querySelector("#fileCounter");
  if (counterNode && typeof selectedFiles !== "undefined") {
    counterNode.textContent = t("counter", selectedFiles.length);
  }
  if (typeof selectedProfile !== "undefined" && selectedProfile && typeof updateTzHint === "function") updateTzHint(selectedProfile);
  if (typeof renderLocationOptions === "function" && document.querySelector("#locationSearch")) {
    renderLocationOptions(document.querySelector("#locationSearch").value);
  }
}

// ============ Тема: авто / светлая / тёмная ============
const THEME_KEY = "metadataStudioTheme";
const THEME_ORDER = ["auto", "light", "dark"];
const THEME_ICONS = { auto: "◐", light: "☀", dark: "☾" };
let themePref = localStorage.getItem(THEME_KEY) || "auto";
const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

function applyTheme() {
  const resolved = themePref === "auto" ? (darkQuery.matches ? "dark" : "light") : themePref;
  document.documentElement.dataset.theme = resolved;
  const button = $("#themeToggle");
  if (button) {
    button.textContent = THEME_ICONS[themePref];
    button.title = t("themeTitle", themePref);
  }
}
document.addEventListener("DOMContentLoaded", () => {
  setupUI();
  updateAuthUI();
  applyLang();
  
  // Global error catcher for debugging
  window.addEventListener('error', (event) => {
    toast("Global Error: " + event.message);
  });
  window.addEventListener('unhandledrejection', (event) => {
    toast("Unhandled Promise: " + (event.reason?.message || event.reason));
  });
  const originalConsoleError = console.error;
  console.error = function(...args) {
    originalConsoleError.apply(console, args);
    toast("Console Error: " + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' '));
  };

  // Diagnostic URL toast
  if (window.location.search || window.location.hash) {
    const diagnosticStr = "URL Data: " + window.location.search + window.location.hash;
    setTimeout(() => toast(diagnosticStr.substring(0, 100)), 1500);
  }

  // Parse OAuth errors from URL hash or query string
  const urlParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const errorDesc = urlParams.get("error_description") || hashParams.get("error_description");
  if (errorDesc) {
    setTimeout(() => toast(errorDesc.replace(/\+/g, ' ')), 500);
    window.history.replaceState(null, "", window.location.pathname);
  }
});
darkQuery.addEventListener("change", () => { if (themePref === "auto") applyTheme(); });
$("#themeToggle").addEventListener("click", () => {
  themePref = THEME_ORDER[(THEME_ORDER.indexOf(themePref) + 1) % THEME_ORDER.length];
  localStorage.setItem(THEME_KEY, themePref);
  applyTheme();
});
$("#langToggle").addEventListener("click", () => {
  lang = lang === "ru" ? "en" : "ru";
  localStorage.setItem(LANG_KEY, lang);
  applyLang();
});
applyTheme();

let selectedFiles = [];
let profiles = [];
let selectedProfile = null;
let namingMode = "iphone";
let resultToken = null;
let previewUrls = [];
let runtime = { mode: "local", localSave: true, database: false };

let supabaseClient = null;
let session = null;
const authBar = $("#authBar");
const userEmail = $("#userEmail");
const userProfile = $("#userProfile");
const userAvatar = $("#userAvatar");
const userBalanceText = $("#userBalanceText");
const topupButton = $("#topupButton");
const loginButton = $("#loginButton");
const logoutButton = $("#logoutButton");
const authDialog = $("#authDialog");
const pricingDialog = $("#pricingDialog");
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
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} ${t("kb")}` : `${(bytes / 1024 / 1024).toFixed(1)} ${t("mb")}`;
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
    ? t("actionReady", selectedFiles.length, selectedProfile?.name || t("noProfile"))
    : t("actionEmpty");
  processButton.querySelector("span").textContent = hasFiles
    ? t("processN", selectedFiles.length)
    : t("processDefault");
}

function updateNamePreview() {
  const first = Math.min(9999, Math.max(1, Number(startNumber.value) || 1));
  const last = ((first - 1 + Math.max(0, selectedFiles.length - 1)) % 9999 + 1);
  if (namingMode === "iphone") namePreview.textContent = `IMG_${String(first).padStart(4, "0")} → IMG_${String(last).padStart(4, "0")}`;
  if (namingMode === "original") namePreview.textContent = t("originalNames");
  if (namingMode === "custom") namePreview.textContent = `${customName.value.trim() || t("defaultBatchName")} 01 →`;
}

function renderFiles() {
  previewUrls.forEach((url) => URL.revokeObjectURL(url));
  previewUrls = [];
  fileCounter.textContent = t("counter", selectedFiles.length);
  fileCounter.classList.toggle("has-files", selectedFiles.length > 0);
  dropEmpty.hidden = selectedFiles.length > 0;
  fileGrid.hidden = selectedFiles.length === 0;
  fileGrid.innerHTML = "";
  selectedFiles.forEach((file, index) => {
    const card = document.createElement("article");
    card.className = "queue-card";
    const isHeic = /\.heic$/i.test(file.name) || file.type === "image/heic";
    const url = !isHeic && file.type.startsWith("image/") ? URL.createObjectURL(file) : "";
    if (url) previewUrls.push(url);
    card.innerHTML = `
      <div class="queue-index">${String(index + 1).padStart(2, "0")}</div>
      ${url ? `<img src="${url}" alt="">` : `<div class="file-fallback">HEIC</div><img hidden alt="">`}
      <div class="queue-meta"><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span></div>
      <div class="queue-actions">
        <button type="button" data-move="${index}" data-direction="-1" aria-label="Выше">↑</button>
        <button type="button" data-move="${index}" data-direction="1" aria-label="Ниже">↓</button>
        <button type="button" data-remove="${index}" aria-label="Удалить">×</button>
      </div>
    `;
    fileGrid.append(card);
    if (isHeic) renderHeicPreview(file, card.querySelector("img[hidden]"));
  });
  updateNamePreview();
  updateButton();
}

function addFiles(files) {
  const incoming = Array.from(files).filter((file) =>
    /\.(jpe?g|heic|png|tiff?|webp)$/i.test(file.name) || file.type.startsWith("image/")
  );
  if (!incoming.length) return;
  if (selectedFiles.length + incoming.length > 10) toast(t("maxPhotos"), "info");
  selectedFiles = [...selectedFiles, ...incoming].slice(0, 10);
  result.hidden = true;
  renderFiles();
}

// --- Вставка из буфера обмена (Ctrl+V / Cmd+V) ---
window.addEventListener("paste", (event) => {
  if (event.target.closest("input, textarea, select")) return;
  const files = Array.from(event.clipboardData?.files || []);
  if (files.length) {
    event.preventDefault();
    addFiles(files);
    toast(t("pasted", files.length), "success");
  }
});

// --- Превью HEIC: лениво подгружаем конвертер только когда он нужен ---
let heicLoader = null;
const heicPreviewCache = new WeakMap();
function loadHeicConverter() {
  if (!heicLoader) {
    heicLoader = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "/vendor/heic2any.min.js";
      script.onload = () => resolve(window.heic2any);
      script.onerror = () => reject(new Error("heic2any failed to load"));
      document.head.append(script);
    });
  }
  return heicLoader;
}

async function renderHeicPreview(file, img) {
  try {
    let url = heicPreviewCache.get(file);
    if (!url) {
      const heic2any = await loadHeicConverter();
      const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.4 });
      url = URL.createObjectURL(Array.isArray(blob) ? blob[0] : blob);
      heicPreviewCache.set(file, url);
    }
    img.src = url;
    img.closest(".queue-card")?.querySelector(".file-fallback")?.remove();
    img.hidden = false;
  } catch {
    /* Превью не критично — оставляем заглушку HEIC */
  }
}

function resetWorkspace() {
  selectedFiles = [];
  renderFiles();
  result.hidden = true;
  resultList.innerHTML = "";
  resultToken = null;
  startNumber.value = Math.floor(Math.random() * 8000 + 1000);
  startDate.value = localDateTimeValue();
  customName.value = "";
  updateNamePreview();
}

// --- «Паспорт» профиля: что именно окажется в метаданных ---
function renderPassport(profile) {
  const passport = $("#profilePassport");
  const tags = profile.tags || {};
  const device = [tags["EXIF:Make"], tags["EXIF:Model"]].filter(Boolean).join(" ");
  if (!device) {
    passport.hidden = true;
    return;
  }
  const lat = Number(tags["EXIF:GPSLatitude"]);
  const lon = Number(tags["EXIF:GPSLongitude"]);
  const latRef = tags["EXIF:GPSLatitudeRef"] === "S" ? "-" : "";
  const lonRef = tags["EXIF:GPSLongitudeRef"] === "W" ? "-" : "";
  const place = [tags["IPTC:Sub-location"], tags["IPTC:City"]].filter(Boolean).join(", ");
  $("#passportDevice").textContent = device;
  $("#passportLocation").textContent = place || "—";
  $("#passportGps").textContent = Number.isFinite(lat) && Number.isFinite(lon)
    ? `${latRef}${lat.toFixed(4)}, ${lonRef}${lon.toFixed(4)}`
    : "—";
  $("#passportShot").textContent = [
    tags["EXIF:ISO"] ? `ISO ${tags["EXIF:ISO"]}` : "",
    tags["EXIF:ExposureTime"] || "",
    tags["EXIF:FNumber"] ? `f/${tags["EXIF:FNumber"]}` : ""
  ].filter(Boolean).join(" · ") || "—";
  passport.hidden = false;
}

function updateTzHint(profile) {
  const hint = $("#tzHint");
  if (!profile?.timeZone) {
    hint.hidden = true;
    return;
  }
  try {
    const offset = new Intl.DateTimeFormat("ru-RU", { timeZone: profile.timeZone, timeZoneName: "shortOffset" })
      .formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value || "";
    const city = profile.timeZone.split("/").pop().replaceAll("_", " ");
    hint.textContent = t("tzHint", city, offset);
    hint.hidden = false;
  } catch {
    hint.hidden = true;
  }
}

function selectProfile(profile) {
  selectedProfile = profile;
  profileDescription.textContent = profile.description;
  document.querySelectorAll(".profile-option").forEach((node) => {
    node.classList.toggle("selected", node.dataset.id === profile.id);
  });
  renderPassport(profile);
  updateTzHint(profile);
  try {
    localStorage.setItem("metadataStudioLastProfile", profile.id);
  } catch {}
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
  profileList.innerHTML = "";
  profiles.forEach((profile) => profileList.append(profileCard(profile)));
  const lastUsed = localStorage.getItem("metadataStudioLastProfile");
  const next = profiles.find((profile) => profile.id === defaultId) ||
    profiles.find((profile) => profile.id === lastUsed) ||
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
  if (!device) throw new Error(t("deviceRequired"));
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
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lon)) throw new Error(t("coordsInvalid"));
  const timeZone = locationKey === "custom" ? ($("#presetTimeZone").value || undefined) : location.timeZone;
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
    timeZone,
    tags,
    platform: device.platform,
    custom: true
  };
}

function renderDeviceOptions(query = "") {
  const select = $("#presetDevice");
  select.innerHTML = "";
  const normalized = query.trim().toLowerCase();
  const filtered = DEVICE_CATALOG.filter((item) =>
    `${item.brand} ${item.model}`.toLowerCase().includes(normalized)
  );
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
  const fallback = filtered.find((item) => item.id === select.value) ||
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
  // Удаление в два клика вместо confirm(): первый клик «взводит» кнопку
  if (!button.classList.contains("arm-delete")) {
    button.classList.add("arm-delete");
    button.textContent = "✓";
    button.title = t("deleteAgain");
    setTimeout(() => {
      button.classList.remove("arm-delete");
      button.textContent = "×";
      button.title = t("deleteTitle");
    }, 3000);
    return;
  }
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
  $("#tagList").innerHTML = "";
  for (const [tag, value] of Object.entries(selectedProfile.tags)) {
    const item = document.createElement("div");
    item.className = "tag-item";
    item.innerHTML = `<span>${escapeHtml(tag)}</span><b>${escapeHtml(value)}</b>`;
    $("#tagList").append(item);
  }
  tagsDialog.showModal();
});
// --- Карта в конструкторе профиля (Leaflet + OpenStreetMap) ---
let builderMap = null;
let builderMarker = null;

function setBuilderPoint(lat, lon, { pan = true } = {}) {
  if (!builderMap) return;
  builderMarker.setLatLng([lat, lon]);
  if (pan) builderMap.setView([lat, lon], Math.max(builderMap.getZoom(), 12));
}

function applyMapPoint(lat, lon) {
  $("#presetLat").value = lat.toFixed(6);
  $("#presetLon").value = lon.toFixed(6);
  $("#presetLocation").value = "custom";
  $("#presetPlace").value = "";
  $("#presetCity").value = "";
  $("#presetCountry").value = "";
  $("#presetCountryCode").value = "";
  updateLocationPreview(null);
  $("#locationPreviewMeta").textContent = t("fillCityCountry", `${lat.toFixed(6)}, ${lon.toFixed(6)}`);
}

function initBuilderMap() {
  if (builderMap || !window.L) return;
  const start = LOCATION_LIBRARY[$("#presetLocation").value] || LOCATION_LIBRARY.gate;
  builderMap = L.map("presetMap", { attributionControl: true, zoomControl: true })
    .setView([start.lat, start.lon], 12);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(builderMap);
  builderMarker = L.marker([start.lat, start.lon], { draggable: true }).addTo(builderMap);
  builderMap.on("click", (event) => {
    setBuilderPoint(event.latlng.lat, event.latlng.lng, { pan: false });
    applyMapPoint(event.latlng.lat, event.latlng.lng);
  });
  builderMarker.on("dragend", () => {
    const point = builderMarker.getLatLng();
    applyMapPoint(point.lat, point.lng);
  });
}

// --- Список часовых поясов для своих координат ---
function populateTimeZones() {
  const select = $("#presetTimeZone");
  if (!select || select.options.length) return;
  const zones = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  zones.forEach((zone) => {
    const option = document.createElement("option");
    option.value = zone;
    option.textContent = zone.replaceAll("_", " ");
    select.append(option);
  });
  if (zones.includes(browserZone)) select.value = browserZone;
}

$("#openBuilder").addEventListener("click", () => {
  presetDialog.showModal();
  populateTimeZones();
  // Карта инициализируется только когда диалог уже виден (иначе Leaflet не знает размеров)
  setTimeout(() => {
    initBuilderMap();
    if (builderMap) builderMap.invalidateSize();
  }, 60);
});
document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", () => document.getElementById(button.dataset.close).close());
});

function refreshModeCopy() {
  const local = !runtime || runtime.localSave !== false;
  $("#brandSummary").textContent = t(local ? "brandLocal" : "brandCloud");
  $(".trust-line p").innerHTML = t(local ? "trustLocal" : "trustCloud");
  $(".save-actions > span").innerHTML = t(local ? "saveHintLocal" : "saveHintCloud");
  if (result.hidden) cleanSaveButton.innerHTML = t(local ? "btnSaveLocal" : "btnDownloadZip");
}

function updateLocationPreview(location) {
  if (!location) {
    $("#locationPreviewName").textContent = t("customCoords");
    $("#locationPreviewMeta").textContent = t("fillBelow");
    return;
  }
  $("#locationPreviewName").textContent = location.label;
  $("#locationPreviewMeta").textContent = `${location.city}, ${location.country} · ${location.lat.toFixed(6)}, ${location.lon.toFixed(6)}`;
}

// --- Поиск по локациям: страна, штат, город — на русском и английском ---
function locationHaystack(key) {
  const l = LOCATION_LIBRARY[key];
  return `${l.label} ${l.city} ${l.region || ""} ${l.country} ${l.countryCode} ${l.search || ""}`.toLowerCase();
}

function locationOptionText(l) {
  const cityPart = l.region && l.country === "United States" ? `${l.city}, ${l.region}` : l.city;
  return `${cityPart} · ${l.label}`;
}

function renderLocationOptions(query = "") {
  const select = $("#presetLocation");
  const previous = select.value;
  const tokens = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const keys = Object.keys(LOCATION_LIBRARY).filter((key) => {
    if (!tokens.length) return true;
    const hay = locationHaystack(key);
    return tokens.every((tokenPart) => hay.includes(tokenPart));
  });
  select.innerHTML = "";
  const groups = new Map();
  keys.forEach((key) => {
    const l = LOCATION_LIBRARY[key];
    if (!groups.has(l.country)) {
      const group = document.createElement("optgroup");
      group.label = l.country;
      groups.set(l.country, group);
      select.append(group);
    }
    const option = document.createElement("option");
    option.value = key;
    option.textContent = locationOptionText(l);
    groups.get(l.country).append(option);
  });
  const custom = document.createElement("option");
  custom.value = "custom";
  custom.textContent = t("customCoords");
  select.append(custom);
  const keep = keys.includes(previous) ? previous : (previous === "custom" && !tokens.length ? "custom" : keys[0] || "custom");
  select.value = keep;
  if (keep !== previous) select.dispatchEvent(new Event("change"));
}

$("#locationSearch").addEventListener("input", () => renderLocationOptions($("#locationSearch").value));

$("#presetLocation").addEventListener("change", () => {
  const location = LOCATION_LIBRARY[$("#presetLocation").value];
  if (location) {
    $("#presetLat").value = location.lat;
    $("#presetLon").value = location.lon;
    $("#presetCity").value = location.city;
    $("#presetCountry").value = location.country;
    $("#presetCountryCode").value = location.countryCode;
    $("#presetPlace").value = location.label;
    if (location.timeZone && $("#presetTimeZone")) $("#presetTimeZone").value = location.timeZone;
    setBuilderPoint(location.lat, location.lon);
  }
  updateLocationPreview(location);
});

// Ручное изменение координат двигает метку на карте
["presetLat", "presetLon"].forEach((id) => {
  $(`#${id}`).addEventListener("change", () => {
    const lat = Number($("#presetLat").value);
    const lon = Number($("#presetLon").value);
    if (Number.isFinite(lat) && Number.isFinite(lon)) setBuilderPoint(lat, lon);
  });
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
    if (!profile.name) throw new Error(t("presetNameRequired"));
    
    if (session) {
      const res = await fetch("/api/profiles/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify(profile)
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "LIMIT_REACHED") {
          presetDialog.close();
          $("#pricingDialog").showModal();
          throw new Error(data.error);
        }
        throw new Error(data.error || t("cloudSaveErr"));
      }
      profile.id = data.id;
    } else {
      const custom = [profile, ...loadCustomProfilesLocal()];
      localStorage.setItem("metadataStudioPresets", JSON.stringify(custom));
    }

    profiles = [profile, ...profiles.filter((item) => item.id !== profile.id)];
    renderProfiles(profile.id);
    presetDialog.close();
    event.target.reset();
  } catch (error) {
    if (error.message) toast(error.message);
  }
});

processButton.addEventListener("click", async () => {
  if (runtime.mode === "cloud" && !session) {
    authDialog.showModal();
    return;
  }

  processButton.disabled = true;
  const processingDialog = $("#processingDialog");
  processingDialog.showModal();
  processingDialog.removeAttribute("inert");
  result.hidden = true;
  resultToken = null;
  cleanSaveButton.disabled = false;
  cleanSaveButton.innerHTML = t(!runtime || runtime.localSave !== false ? "btnSaveLocal" : "btnDownloadZip");

  const clientToken = crypto.randomUUID ? crypto.randomUUID() : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const formData = new FormData();
  selectedFiles.forEach((file) => formData.append("photos", file));
  formData.append("profile", selectedProfile.custom ? "custom" : selectedProfile.id);
  if (selectedProfile.custom) formData.append("customProfile", JSON.stringify(selectedProfile));
  formData.append("namingMode", namingMode);
  formData.append("customName", customName.value);
  formData.append("startNumber", startNumber.value);
  formData.append("startDate", startDate.value);
  formData.append("intervalSeconds", intervalSeconds.value);
  formData.append("clientToken", clientToken);

  // Живой прогресс: опрашиваем сервер, пока идёт обработка
  const statusNode = $("#processingStatus");
  const progressTrack = $("#progressTrack");
  const progressFill = $("#progressFill");
  const defaultStatus = statusNode.textContent;
  const progressTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/progress/${clientToken}`);
      if (!res.ok) return;
      const progress = await res.json();
      progressTrack.hidden = false;
      progressFill.style.width = `${Math.round((progress.done / progress.total) * 100)}%`;
      statusNode.textContent = progress.current
        ? t("progressLine", Math.min(progress.done + 1, progress.total), progress.total, progress.current)
        : t("prepN", progress.total);
    } catch {}
  }, 600);

  try {
    const response = await fetch("/api/process", { 
      method: "POST", 
      headers: getAuthHeaders(),
      body: formData 
    });
    let payload;
    let rawText = "";
    try {
      rawText = await response.text();
      payload = JSON.parse(rawText);
    } catch (e) {
      throw new Error(`Ошибка сервера (HTTP ${response.status}): ${rawText.slice(0, 80).replace(/<[^>]*>?/gm, '')}`);
    }
    
    if (!response.ok) {
      if (payload.error && payload.error.includes("Недостаточно баланса")) {
        pricingDialog.showModal();
      }
      throw new Error(payload.error || t("processFail"));
    }

    // Update balance UI
    if (userBalanceText) {
      userBalanceText.textContent = payload.unlimited ? t("balanceUnlimited") : t("balance", payload.credits);
    }

    resultToken = payload.token;
    $("#resultTitle").textContent = t("resultReady", payload.count);
    resultDetails.textContent = t("resultBatch", payload.profile);
    resultList.innerHTML = "";
    payload.files.forEach((file, index) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.innerHTML = `
        <b>${escapeHtml(file.name)}</b>
        <span>${new Date(file.captureDate).toLocaleString("ru-RU")}</span>
        <button class="small-dl-btn" data-index="${index}" title="Скачать">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
        </button>
        <span class="pending-mark">•</span>
      `;
      resultList.append(row);
    });
    result.hidden = false;
    result.scrollIntoView({ behavior: "smooth", block: "nearest" });
  } catch (error) {
    toast(error.message);
  } finally {
    clearInterval(progressTimer);
    progressTrack.hidden = true;
    progressFill.style.width = "0%";
    statusNode.textContent = defaultStatus;
    processingDialog.close();
    processingDialog.setAttribute("inert", "");
    updateButton();
  }
});

topupButton?.addEventListener("click", () => {
  pricingDialog.showModal();
});

$$(".buy-button").forEach(btn => {
  btn.addEventListener("click", async () => {
    if (!session) {
      toast("Пожалуйста, войдите в аккаунт.");
      return;
    }
    const originalText = btn.textContent;
    btn.textContent = "Загрузка...";
    btn.disabled = true;
    try {
      const res = await fetch("/api/payments/checkout", {
        method: "POST",
        headers: { "Authorization": `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ошибка оплаты");
      window.location.href = data.pay_url;
    } catch (err) {
      toast(err.message);
      btn.textContent = originalText;
      btn.disabled = false;
    }
  });
});

cleanSaveButton.addEventListener("click", async () => {
  if (!resultToken) return;
  cleanSaveButton.disabled = true;
  if (!runtime.localSave) {
    cleanSaveButton.innerHTML = t("btnPreparingZip");
    try {
      const response = await fetch(`/api/download-batch/${resultToken}`);
      if (!response.ok) {
        let payload;
        let rawText = "";
        try {
          rawText = await response.text();
          payload = JSON.parse(rawText);
        } catch (e) {
          throw new Error(`Ошибка сервера (HTTP ${response.status}): ${rawText.slice(0, 80).replace(/<[^>]*>?/gm, '')}`);
        }
        throw new Error(payload.error || t("downloadFail"));
      }
      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") || "";
      let fileName = "Metadata Studio.zip";
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/);
      if (utf8Match) {
        fileName = decodeURIComponent(utf8Match[1]);
      } else {
        const asciiMatch = disposition.match(/filename="?([^";]+)"?/);
        if (asciiMatch) fileName = asciiMatch[1];
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      resultToken = null;
      cleanSaveButton.innerHTML = t("btnDownloaded");
      setTimeout(() => {
        resetWorkspace();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }, 700);
    } catch (error) {
      toast(error.message);
      cleanSaveButton.disabled = false;
      cleanSaveButton.innerHTML = t("btnDownloadZip");
    }
    return;
  }

  cleanSaveButton.innerHTML = t("btnChooseMac");
  try {
    const response = await fetch(`/api/save/${resultToken}`, { method: "POST" });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || t("saveFail"));
    resultDetails.textContent = t("savedN", payload.count, payload.path);
    cleanSaveButton.innerHTML = t("btnSavedOpened");
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
    if (error.message !== "Сохранение отменено.") toast(error.message);
    cleanSaveButton.disabled = false;
    cleanSaveButton.innerHTML = t(!runtime || runtime.localSave !== false ? "btnSaveLocal" : "btnDownloadZip");
  }
});

resultList.addEventListener("click", async (e) => {
  const btn = e.target.closest(".small-dl-btn");
  if (!btn || !resultToken) return;
  const index = btn.dataset.index;
  const downloadUrl = `/api/download/${resultToken}/${index}`;
  
  // Меняем иконку на спиннер или делаем полупрозрачной на время скачивания
  btn.style.opacity = "0.5";
  btn.style.pointerEvents = "none";

  try {
    const response = await fetch(downloadUrl);
    if (!response.ok) throw new Error("Ошибка загрузки");
    
    const blob = await response.blob();
    const disposition = response.headers.get("content-disposition") || "";
    let fileName = `photo-${index}.jpg`;
    const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/);
    if (utf8Match) {
      fileName = decodeURIComponent(utf8Match[1]);
    } else {
      const asciiMatch = disposition.match(/filename="?([^";]+)"?/);
      if (asciiMatch) fileName = asciiMatch[1];
    }
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    toast(err.message);
  } finally {
    btn.style.opacity = "0.7";
    btn.style.pointerEvents = "auto";
  }
});

async function updateAuthUI() {
  if (session) {
    const meta = session.user?.user_metadata || {};
    const email = session.user?.email || "";
    const name = meta.full_name || email || "User";
    const avatarUrl = meta.avatar_url;

    userEmail.textContent = name;
    
    if (avatarUrl) {
      userAvatar.style.background = `url(${avatarUrl}) center/cover`;
      userAvatar.textContent = "";
    } else {
      userAvatar.style.background = "linear-gradient(145deg, #ff6a44, #d83a1c)";
      userAvatar.textContent = name.charAt(0).toUpperCase();
    }

    userProfile.hidden = false;
    loginButton.hidden = true;
    
    // Fetch credits
    try {
      const res = await fetch("/api/user/credits", { headers: getAuthHeaders() });
      if (res.ok) {
        const { credits, unlimited } = await res.json();
        userBalanceText.textContent = unlimited ? t("balanceUnlimited") : t("balance", credits);
      }
    } catch (e) {
      console.error("Ошибка загрузки баланса:", e);
    }
  } else {
    userProfile.hidden = true;
    loginButton.hidden = false;
  }
}

googleAuthButton.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return toast(t ? t("supabaseNA") : "Supabase не настроен.");
  try {
    const { error } = await supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin }
    });
    if (error) throw error;
  } catch (err) {
    toast(err.message);
  }
});

loginButton.addEventListener("click", () => authDialog.showModal());
logoutButton.addEventListener("click", async () => {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
    session = null;
    updateAuthUI();
    loadProfiles();
  }
});

authToggleMode.addEventListener("click", () => {
  authMode = authMode === "login" ? "register" : "login";
  authTitle.textContent = t(authMode === "login" ? "authTitleLogin" : "authTitleReg");
  authToggleMode.textContent = t(authMode === "login" ? "authToggleLogin" : "authToggleReg");
  authSubmit.innerHTML = `${t(authMode === "login" ? "authSubmitLogin" : "authSubmitReg")} <span>→</span>`;
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!supabaseClient) return toast(t("supabaseNA"));
  authSubmit.disabled = true;
  try {
    const email = $("#authEmail").value;
    const password = $("#authPassword").value;
    const { data, error } = authMode === "login"
      ? await supabaseClient.auth.signInWithPassword({ email, password })
      : await supabaseClient.auth.signUp({ email, password });
    
    if (error) throw error;
    if (authMode === "register" && !data.session) {
      toast(t("signupOk"), "success");
    } else {
      session = data.session;
      updateAuthUI();
      loadProfiles();
      authDialog.close();
    }
  } catch (err) {
    toast(err.message);
  } finally {
    authSubmit.disabled = false;
  }
});

async function init() {
  try {
    const configRes = await fetch("/api/config");
    const config = await configRes.json();
    if (config.supabaseUrl && window.supabase) {
      supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseKey);
      
      supabaseClient.auth.onAuthStateChange((event, newSession) => {
        session = newSession;
        updateAuthUI();
      });

      // Manually check if hash has access token
      if (window.location.hash.includes("access_token")) {
        toast("Hash detected: " + window.location.hash.substring(0, 30) + "...");
      } else if (window.location.search.includes("code")) {
        toast("Query code detected");
      }

      // Manually process PKCE code to catch any hidden errors
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      if (code) {
        const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
        if (error) {
          toast("Exchange Error: " + error.message);
        }
      }

      const { data, error } = await supabaseClient.auth.getSession();
      if (error) {
        setTimeout(() => toast("Auth Error: " + error.message), 1000);
      }
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
    applyLang();
  } catch (err) {
    console.error(err);
    profileDescription.textContent = "Ошибка загрузки данных.";
    applyLang();
  }
}

startDate.value = localDateTimeValue();
startNumber.value = Math.floor(Math.random() * 8000 + 1000);
renderDeviceOptions();
renderLocationOptions("");
updateNamePreview();

init();
