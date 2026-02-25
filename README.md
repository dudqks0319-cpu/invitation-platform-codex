# 초대장플랫폼 (codex버전)

결혼식/돌잔치/집들이/칠순/결혼전모임 모바일 초대장을 만드는 웹앱입니다.

## 이번 버전 핵심 (비판적 관점 개선 반영)

1. **개인정보 URL 노출 제거**
   - 초대장 데이터 전체를 URL에 넣지 않고,
   - 서버 저장 후 `짧은 링크(/i/{slug})`만 공유합니다.

2. **서버 저장 구조**
   - 로컬 개발: `data/store.json` 파일 저장
   - Vercel 배포: `BLOB_READ_WRITE_TOKEN`이 있으면 **Vercel Blob 저장** 사용
   - `BLOB_ACCESS`(`public`/`private`)로 Blob 접근 타입을 환경변수로 선택
   - 추후 DB(PostgreSQL, Supabase 등)로 교체하기 쉽도록 API 구조 분리.

3. **관리자 대시보드**
   - `/admin` 에서 초대장 목록, RSVP(참석/불참/동반인원) 확인 가능.
   - `ADMIN_KEY` 기반 간단 인증.

4. **카카오 공유 실패 대비**
   - 키 미입력/실패 시 시스템 공유 또는 링크 복사로 자동 fallback.

5. **지도 정확도 개선**
   - 주소 오타 리스크를 줄이기 위해 `lat,lng 좌표(선택)` 입력 지원.
   - 좌표 입력 시 좌표를 우선해 지도 링크/임베드를 생성.

---

## 시작하기

```bash
npm install
npm run dev
```

기본 주소: `http://localhost:3000`

### 환경변수

- `PORT` (기본: 3000)
- `ADMIN_KEY` (기본: `change-me-admin-key`)
- `DATA_DIR` (선택, 파일 저장 모드에서만 사용)
- `BLOB_READ_WRITE_TOKEN` (선택, 설정 시 Vercel Blob 저장 모드 활성화)
- `BLOB_STORE_PATH` (선택, 기본: `invitation-platform/store.json`)
- `BLOB_ACCESS` (선택, `public` 또는 `private`, 기본: `private`)

운영 환경에서는 반드시 `ADMIN_KEY`를 변경하세요.
Vercel 운영에서는 `BLOB_READ_WRITE_TOKEN` 연결을 권장합니다.

---

## 페이지

- 제작 페이지: `/`
- 공개 초대장: `/i/{slug}`
- 관리자 대시보드: `/admin`

---

## API 요약

### Public
- `POST /api/invitations` : 초대장 저장 + slug 생성
- `GET /api/invitations/:slug` : 초대장 조회
- `POST /api/invitations/:slug/rsvp` : RSVP 제출
- `GET /api/health` : API 헬스체크 (`/health` 호환 유지)

### Admin (`x-admin-key` 헤더 필수)
- `GET /api/admin/invitations`
- `GET /api/admin/invitations/:id`
- `PUT /api/admin/invitations/:id`
- `GET /api/admin/invitations/:id/rsvps`

관리자 인증은 보안상 `x-admin-key` **헤더만 허용**합니다.

### 에러 응답 형식
- API 에러는 공통적으로 `{"ok": false, "error": "...", "code": "..."}` 형식을 반환합니다.

---

## 보안/운영 메모

- 현재 기본 구조는 JSON 저장 기반이며,
  Vercel에서는 Blob 토큰이 연결되면 Blob 저장으로 동작합니다.
- Blob 모드에서는 버전 스냅샷 방식으로 저장해 CDN 캐시 이슈를 줄였습니다(최신 버전 우선 조회).
- **Blob 토큰이 없는 Vercel 배포는 `/tmp` 휘발성 저장**이므로 데이터 유실 위험이 큽니다.
- 트래픽/확장성 관점에서는 PostgreSQL/Supabase 같은 DB 전환을 권장합니다.
- RSVP API에는 기본적인 IP rate limit이 적용되어 있습니다.
- 최신 템플릿은 외부 사진 대신 그라디언트 기반 배경으로 교체해 저작권 리스크를 낮췄습니다.

---

## 향후 권장 개선

- DB 전환 + 트랜잭션/백업
- 카카오 메시지 템플릿 승인 기반 공유 고도화
- 관리자 권한(역할 분리), 로그인 세션화
- RSVP 엑셀 다운로드/통계 차트
- 도메인 커스텀 + 링크 만료 정책
