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
npm test
npm run smoke
```

기본 주소: `http://localhost:3000`

### 환경변수

- `PORT` (선택, 기본: `3000`)
- `ADMIN_KEY` (**운영 필수**, 기본값 금지)
- `DATA_DIR` (선택, 파일 저장 모드에서만 사용)
- `BLOB_READ_WRITE_TOKEN` (Blob 저장 모드 활성화 토큰)
- `BLOB_STORE_PATH` (선택, 기본: `invitation-platform/store.json`)
- `BLOB_ACCESS` (선택, `public` 또는 `private`, 기본: `private`)

## Vercel 프로덕션 배포

### 필수 환경변수

- `ADMIN_KEY`: 반드시 강한 임의 값으로 설정
- `BLOB_READ_WRITE_TOKEN`: 프로덕션 데이터 영속 저장을 위해 필수 권장
- `BLOB_ACCESS`: 운영 기본값은 `private` 권장 (`public`은 공개 읽기 전제 시에만 사용)

### 저장 모드 선택과 리스크

- Blob 모드 (`BLOB_READ_WRITE_TOKEN` 설정):
  - 장점: 배포 재시작과 무관한 영속 저장, Vercel 환경에서 운영 가능
  - 주의: 토큰 유출 시 데이터 노출/변조 위험, `BLOB_ACCESS=public`이면 URL 기반 공개 접근 리스크 존재
- File 모드 (`BLOB_READ_WRITE_TOKEN` 미설정):
  - 로컬 개발에는 간단하고 빠름
  - Vercel에서는 `/tmp` 휘발성 저장이므로 재배포/콜드스타트 시 데이터 유실 가능성 큼

### 배포 후 검증 체크리스트

1. `GET /health`가 `200`이며 `ok: true`인지 확인
2. `GET /health`의 `storeMode`가 의도한 모드(`blob` 또는 `file`)인지 확인
3. `/`, `/admin`, `/i/{임의 slug}`가 모두 HTML `200`으로 열리는지 확인
4. 테스트 초대장 1건 생성 후 조회/RSVP 저장이 정상인지 확인
5. 운영 관리자 키로 `/api/admin/invitations` 호출 시 인증 성공, 잘못된 키로는 `401`인지 확인
6. 배포 브랜치에서 `npm test`와 `npm run smoke`가 최신 커밋 기준 통과했는지 확인

기능별 상세 검증 항목은 [`docs/release-checklist.md`](docs/release-checklist.md)를 사용하세요.

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
