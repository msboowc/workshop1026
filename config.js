// config.js – Supabase 연결 정보 두 줄
// Supabase → Project Settings → API Keys 에서 복사합니다.
// 공개용 키(Publishable 또는 anon public)만 넣습니다. 비밀 키(Secret · service_role)는 절대 넣지 않습니다.
const SUPABASE_URL = 'https://lhoohjejxptnrusixwad.supabase.co'
const SUPABASE_KEY = 'sb_publishable_yZ8TqYoclvVIy4RsFCRm2g_LOCe6JzF'
if (typeof module !== 'undefined') module.exports = { SUPABASE_URL, SUPABASE_KEY };   // api/kma.js(서버 함수)도 같은 값을 씀
