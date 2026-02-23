# 초대장플랫폼 (codex버전)

결혼식/돌잔치/집들이/칠순/결혼전모임 모바일 초대장을 만드는 웹앱입니다.

## 이번 버전 핵심 (비판적 관점 개선 반영)

1. **개인정보 URL 노출 제거**
   - 초대장 데이터 전체를 URL에 넣지 않고,
   - 서버 저장 후 `짧은 링크(/i/{slug})`만 공유합니다.

2. **서버 저장 구조**
   - `data/store.json` 에 초대장/RSVP 데이터를 저장합니다.
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

운영 환경에서는 반드시 `ADMIN_KEY`를 변경하세요.

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

### Admin (`x-admin-key` 필요)
- `GET /api/admin/invitations`
- `GET /api/admin/invitations/:id`
- `PUT /api/admin/invitations/:id`
- `GET /api/admin/invitations/:id/rsvps`

---

## 보안/운영 메모

- 현재 저장소는 **파일 기반 저장(JSON)** 입니다. 단일 서버 MVP에는 적합하지만,
  트래픽 증가 시 DB 이전을 권장합니다.
- RSVP API에는 기본적인 IP rate limit이 적용되어 있습니다.
- 템플릿 이미지는 데모용 에셋(`public/assets`)이며,
  상용 배포 전 라이선스 정책을 최종 검토하세요.

---

## 향후 권장 개선

- DB 전환 + 트랜잭션/백업
- 카카오 메시지 템플릿 승인 기반 공유 고도화
- 관리자 권한(역할 분리), 로그인 세션화
- RSVP 엑셀 다운로드/통계 차트
- 도메인 커스텀 + 링크 만료 정책
