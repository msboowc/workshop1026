// api/kma.js – Vercel 서버 함수 : 지역의 일정(DB) · 날씨(기상청 단기예보) · 판단을 한 번에 돌려줌
// 키는 코드에 없음. Vercel → Settings → Environment Variables 의 KMA_KEY 를 씀
// 부르는 법 : /api/kma?region=대전

const { RULES, REGIONS, judge } = require('../logic.js');            // 판단 규칙은 화면과 같은 파일
const { SUPABASE_URL, SUPABASE_KEY } = require('../config.js');     // 공개용 키 (비밀 키 아님)

// 기상청 격자 좌표 (대략 — 정확한 값은 공공데이터포털 '격자_위경도' 엑셀에서 확인)
const GRID = { '세종': [66, 103], '대전': [67, 100], '태안': [48, 109], '보령': [54, 100] };

const p = (n) => String(n).padStart(2, '0');

// 한국 시간 기준 오늘 날짜 · 예보 발표 시각
// 02시 발표(02:10쯤 나옴)가 오늘 하루를 다 담음. 그 전이면 어제 23시 발표를 씀
function forecastBase(now) {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  const ymd = (d) => d.getUTCFullYear() + p(d.getUTCMonth() + 1) + p(d.getUTCDate());
  const today = ymd(kst);
  if (kst.getUTCHours() * 60 + kst.getUTCMinutes() >= 2 * 60 + 10) return { today, date: today, time: '0200' };
  const yesterday = new Date(kst.getTime() - 24 * 3600 * 1000);
  return { today, date: ymd(yesterday), time: '2300' };
}

// 단기예보 항목 → { tempMax, windMax, rainProb } (오늘 것만)
// TMX 최고기온 · WSD 풍속 · POP 강수확률 (TMX 가 없으면 시간별 기온 TMP 의 최댓값)
function toWeather(items, today) {
  const values = (cat) => items.filter((i) => i.fcstDate === today && i.category === cat).map((i) => Number(i.fcstValue));
  const max = (list) => (list.length ? Math.max(...list) : null);
  const tempMax = max(values('TMX')) ?? max(values('TMP'));
  const windMax = max(values('WSD'));
  const rainProb = max(values('POP'));
  if ([tempMax, windMax, rainProb].some((v) => v === null || Number.isNaN(v))) return null;
  return { tempMax, windMax, rainProb };
}

async function loadWeather(key, region, base) {
  const grid = GRID[region];
  // 포털 '일반 인증키'는 이미 인코딩된 키(끝이 %3D 등) → % 가 있으면 그대로, 없으면(Decoding 키) 인코딩
  const serviceKey = key.includes('%') ? key : encodeURIComponent(key);
  const url = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
    + '?serviceKey=' + serviceKey
    + '&pageNo=1&numOfRows=1000&dataType=JSON'
    + '&base_date=' + base.date + '&base_time=' + base.time
    + '&nx=' + grid[0] + '&ny=' + grid[1];
  const text = await (await fetch(url)).text();
  // 키 오류는 JSON이 아니라 XML로 옴 (SERVICE_KEY_IS_NOT_REGISTERED_ERROR 등) → 그 이름을 그대로 보여 줌
  if (!text.trim().startsWith('{')) {
    const m = text.match(/<returnAuthMsg>([^<]+)</) || text.match(/<errMsg>([^<]+)</);
    throw new Error('기상청 키 오류 : ' + (m ? m[1] : text.slice(0, 120)));
  }
  const json = JSON.parse(text);
  const header = json.response && json.response.header;
  if (!header || header.resultCode !== '00') throw new Error('기상청 응답 오류 : ' + (header ? header.resultMsg : '형식이 다름'));
  const weather = toWeather(json.response.body.items.item, base.today);
  if (!weather) throw new Error('오늘 예보 값(TMX · WSD · POP)을 찾지 못함');
  return weather;
}

// Supabase 표 wx_tasks 에서 그 지역 일정 (공개용 키 · 보기 권한만)
async function loadTasks(region) {
  const url = SUPABASE_URL + '/rest/v1/wx_tasks?select=title,region,kind,owner&order=id'
    + '&region=eq.' + encodeURIComponent(region);
  const r = await fetch(url, { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } });
  if (!r.ok) throw new Error('DB 오류 : HTTP ' + r.status);
  return r.json();
}

module.exports = async function handler(req, res) {
  const region = req.query.region;
  if (!REGIONS.some((r) => r.name === region)) {
    return res.status(400).json({ error: '지역은 ' + REGIONS.map((r) => r.name).join(' · ') + ' 중 하나 (예: /api/kma?region=대전)' });
  }
  const base = forecastBase(new Date());

  let tasks;
  try {
    tasks = await loadTasks(region);
  } catch (err) {
    return res.status(502).json({ error: '일정을 읽지 못함 : ' + err.message });
  }

  // 날씨가 실패해도 일정은 돌려줌 (판단은 '날씨 확인 전')
  let weather = null;
  let weatherError;
  const key = process.env.KMA_KEY;
  if (!key) weatherError = 'Vercel 환경변수 KMA_KEY 가 없음';
  else {
    try {
      weather = await loadWeather(key, region, base);
    } catch (err) {
      weatherError = err.message;
    }
  }

  res.status(200).json({
    region,
    date: base.today.slice(0, 4) + '-' + base.today.slice(4, 6) + '-' + base.today.slice(6),
    weather: weather && Object.assign({ source: '기상청 단기예보 (' + base.date + ' ' + base.time + ' 발표)' }, weather),
    weatherError,
    tasks: tasks.map((t) => ({ title: t.title, kind: t.kind, owner: t.owner, judge: judge(t.kind, weather || undefined).text })),
    criteria: '고소 풍속 ' + RULES.wind + ' m/s 이상 \'중지 검토\' · 최고 기온 ' + RULES.heat + '℃ 이상 \'폭염 휴식\' · 강수확률 '
      + RULES.rain + '% 이상 \'우천 주의\' (교육용 가상 기준)',
  });
};

module.exports.forecastBase = forecastBase;
module.exports.toWeather = toWeather;
