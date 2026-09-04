# TOUR_API_KEY 안내

이 저장소의 히어로 이미지 자동화(`scripts/fill-hero-images.mjs` 등)는
한국관광공사 TourAPI 키가 있어야 실제 장소 사진을 받아온다. 키 발급처, 다른
여행 저장소에는 어떤 이름으로 들어가 있는지, 새 저장소에 이 자동화를 추가하는
절차는 **`ana7776/daytrevel`의 [`docs/tour-api-setup-guide.md`](https://github.com/ana7776/daytrevel/blob/main/docs/tour-api-setup-guide.md)**
가 원본이므로 그쪽을 확인할 것 — 이 파일은 요약본이다.

## 이 저장소 기준 요약

- **Secret 이름**: `TOUR_API_KEY` (선택: `PEXELS_API_KEY`, TourAPI에 없는 장소용 폴백)
- **넣는 곳**: 이 저장소 GitHub Settings → Secrets and variables → Actions
- **실행 방법**: Actions 탭 → "히어로 이미지 채우기" 워크플로 → Run workflow
  - `slugs` 비우면 `heroImage` 없는 글 전체 대상
  - `force`, `tour_only`, `dry_run` 옵션은 워크플로 입력값 설명 참고
- **콘텐츠 디렉터리**: `src/content/spots`, `src/content/stays` 두 곳을 모두 훑는다
- **검색 키워드 매핑**: `scripts/set-tour-hero-images.mjs`의 `KEYWORDS` 객체에
  슬러그별로 등록. 새 글을 추가하면 여기에도 항목을 추가해야 TourAPI가 찾는다
  (Pexels 폴백 검색어는 `scripts/set-hero-images.mjs`의 `QUERIES`에 등록)
