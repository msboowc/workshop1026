// app.js – 화면 동작 (목록 그리기, 일정 추가)

// 04 단원 : 일정 목록은 data/tasks.json 에서 읽고, 화면에서 추가한 일정만 브라우저(wx_added)에 저장
let fileTasks = [];         // data/tasks.json 에서 읽은 일정
let fileError = false;      // 파일을 못 읽었으면 true (더블클릭으로 열었을 때 등)
let tasks = [];
let weatherByRegion = {};   // 03 단원에서 지역별 날씨를 넣음

function savedTasks() {
  return JSON.parse(localStorage.getItem('wx_added') || '[]');
}

// JSON 일정을 먼저, 그 뒤에 브라우저에 저장된 일정
function combineTasks() {
  tasks = fileTasks.concat(savedTasks());
}

async function loadTasks() {
  try {
    const res = await fetch('data/tasks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const list = await res.json();
    if (!Array.isArray(list)) throw new Error('목록 형식이 아님');
    fileTasks = list;
    fileError = false;
  } catch (err) {
    fileTasks = [];
    fileError = true;
  }
  combineTasks();
}

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
  if (fileError) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 6;
    td.className = 'stop';
    td.textContent = '일정 파일을 읽지 못했습니다. 배포 주소로 열어 주세요.';
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

function addTask(e) {
  e.preventDefault();
  const t = {
    title: document.getElementById('titleInput').value.trim(),
    region: document.getElementById('regionInput').value,
    kind: document.getElementById('kindInput').value,
    owner: document.getElementById('ownerInput').value.trim(),
  };
  if (!t.title || !t.owner) return;
  const saved = savedTasks();
  saved.push(t);
  localStorage.setItem('wx_added', JSON.stringify(saved));
  e.target.reset();
  combineTasks();
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
loadTasks().then(renderTasks);
loadWeather();
