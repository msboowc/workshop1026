// app.js – 화면 동작 (목록 그리기, 일정 추가)

let tasks = [];
let loadError = '';         // 일정을 못 읽었을 때 화면에 보여 줄 이유
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

// ── 저장 위치 (04 단원 : Supabase 표 wx_tasks) ── DB 호출은 이 구역 안에서만
let db = null;

// 연결 준비 (문제가 있으면 이유 글자, 없으면 '')
function checkConfig() {
  if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || !SUPABASE_KEY) return 'config.js 에 Supabase 주소 · 공개용 키를 넣어 주세요.';
  if (typeof supabase === 'undefined') return 'supabase-js 를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.';
  if (!db) db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
  return '';
}

function dbErrorText(error) {
  if (error.code === '23514') return 'DB 규칙에 맞지 않습니다. (지역 · 구분 값, 빈칸 확인)';
  return 'DB 오류: ' + error.message;
}

async function loadData() {
  loadError = checkConfig();
  if (loadError) { tasks = []; return; }
  const { data, error } = await db.from('wx_tasks').select('title, region, kind, owner').order('id');
  if (error) { tasks = []; loadError = dbErrorText(error); return; }
  tasks = data;
}

async function insertTask(t) {
  const msg = checkConfig();
  if (msg) return msg;
  const { error } = await db.from('wx_tasks').insert(t);
  return error ? dbErrorText(error) : '';
}
// ── 저장 위치 끝 ──

// 오늘 날짜 (YYYY-MM-DD, 내 PC 시간 기준)
function todayText() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return d.getFullYear() + '-' + mm + '-' + dd;
}

function renderTasks() {
  const body = document.getElementById('taskList');
  body.innerHTML = '';
  if (loadError) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'stop';
    td.textContent = '일정을 읽지 못했습니다. ' + loadError;
    tr.appendChild(td);
    body.appendChild(tr);
  }
  for (const t of tasks) {
    const w = weatherByRegion[t.region];
    const r = judge(t.kind, w);
    const tr = document.createElement('tr');
    for (const v of [t.title, t.region, t.kind, t.owner, weatherText(w)]) {
      const td = document.createElement('td');
      td.textContent = v;
      tr.appendChild(td);
    }
    const td = document.createElement('td');
    td.textContent = r.text;
    td.className = r.level;
    tr.appendChild(td);
    body.appendChild(tr);
  }
}

async function addTask(e) {
  e.preventDefault();
  const form = e.target;
  const msgBox = document.getElementById('msgBox');
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  msgBox.textContent = '';
  const err = await insertTask(t);
  if (err) { msgBox.textContent = err; return; }
  form.reset();
  await loadData();
  renderTasks();
}

// 03 단원 : 지역별 날씨를 받아 표를 다시 그림 (실패해도 목록은 그대로)
async function loadWeather() {
  const box = document.getElementById('weatherBox');
  const testMode = new URLSearchParams(location.search).get('test');
  box.textContent = '날씨 불러오는 중…';
  try {
    const res = await fetch(buildWeatherUrl());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    weatherByRegion = applyTest(parseWeather(await res.json()), testMode);
    const lines = REGIONS.map(r => r.name + ' ' + weatherText(weatherByRegion[r.name]));
    if (testMode === 'wind') lines.push('시험 모드: 풍속 12 m/s');
    box.textContent = lines.join('  |  ');
  } catch (err) {
    box.textContent = '날씨를 받지 못했습니다. 판단은 \'날씨 확인 전\'으로 표시합니다.';
  }
  renderTasks();
}

// 04 단원 : 지금 표를 md 파일로 내려받기 (내 PC 다운로드 폴더)
function saveJudgeMd() {
  const testMode = new URLSearchParams(location.search).get('test');
  const md = buildJudgeMd(todayText(), tasks, weatherByRegion, testMode);
  const url = URL.createObjectURL(new Blob([md], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = '현장일정_판단_' + todayText() + '.md';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);   // 바로 지우면 내려받기가 취소되는 브라우저가 있음
}

document.getElementById('todayBox').textContent = todayText();
document.getElementById('taskForm').addEventListener('submit', addTask);
document.getElementById('mdButton').addEventListener('click', saveJudgeMd);
loadData().then(renderTasks);
loadWeather();
