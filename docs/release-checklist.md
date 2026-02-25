# Release Checklist

프로덕션 릴리스 전에 기능 단위 커밋과 동작을 함께 검증하기 위한 체크리스트입니다.

## 1) 기본 품질 게이트

- [ ] `npm ci`
- [ ] `npm test`
- [ ] `npm run smoke`
- [ ] CI(`.github/workflows/ci.yml`) 최신 실행이 성공 상태

## 2) 기능별 검증 (커밋 단위)

각 항목은 관련 커밋을 명시하고 검증 결과(요약/스크린샷/로그 링크)를 남깁니다.

| 기능 | 관련 커밋 | 검증 절차 | 결과 기록 |
| --- | --- | --- | --- |
| 초대장 생성 + 짧은 링크 | `<commit-hash>` | `POST /api/invitations` 호출 후 `slug`, `shortUrl` 확인 | [ ] |
| 공개 초대장 조회 | `<commit-hash>` | `GET /api/invitations/:slug`와 `/i/{slug}` HTML 렌더 확인 | [ ] |
| RSVP 제출/집계 | `<commit-hash>` | `POST /api/invitations/:slug/rsvp` 후 집계(`total`, `attending`, `totalGuests`) 확인 | [ ] |
| 관리자 조회/수정 | `<commit-hash>` | `x-admin-key`로 관리자 API 호출(`401`/`200` 케이스 모두) | [ ] |
| 저장 모드 설정 | `<commit-hash>` | `/health`의 `storeMode`, `blobAccess`가 배포 의도와 일치하는지 확인 | [ ] |
| 정적 페이지 라우팅 | `<commit-hash>` | `/`, `/admin`, `/i/{slug}` `200 text/html` 확인 | [ ] |

## 3) 배포 설정 점검 (Vercel)

- [ ] `ADMIN_KEY`가 기본값(`change-me-admin-key`)이 아님
- [ ] `BLOB_READ_WRITE_TOKEN` 설정 여부가 운영 정책과 일치
- [ ] `BLOB_ACCESS`가 `private`(또는 의도된 값)으로 설정
- [ ] `BLOB_STORE_PATH`가 환경별로 충돌 없이 분리됨

## 4) 배포 후 스모크 (실서버)

- [ ] `GET /health` 200 + `ok: true`
- [ ] 메인/관리자/초대장 페이지 정상 렌더
- [ ] 테스트 초대장 생성/조회/RSVP 실제 동작
- [ ] 잘못된 관리자 키 요청이 `401` 반환

## 5) 릴리스 승인 기록

- 릴리스 태그: `<vX.Y.Z>`
- 승인자: `<name>`
- 승인 시각(UTC): `<YYYY-MM-DDTHH:mm:ssZ>`
- 롤백 기준 커밋: `<commit-hash>`
