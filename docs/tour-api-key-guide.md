# TOUR_API_KEY 안내

이 저장소의 히어로 이미지 자동화(`scripts/fill-hero-images.mjs` 등)는
한국관광공사 TourAPI 키가 있어야 실제 장소 사진을 받아온다. 키 발급처, 다른
여행 저장소에는 어떤 이름으로 들어가 있는지, 새 저장소에 이 자동화를 추가하는
절차는 **`ana7776/daytrevel`의 [`docs/tour-api-setup-guide.md`](https://github.com/ana7776/daytrevel/blob/main/docs/tour-api-setup-guide.md)**
가 원본이므로 그쪽을 확인할 것 — 이 파일은 요약본이다.

## 이 저장소 기준 요약

- **Secret 이름 3개** (모두 data.go.kr 마이페이지 → 오픈API → 활용신청 현황에서 발급):
  1. `TOUR_API_KEY` — 한국관광공사_국문 관광정보 서비스_GW (KorService2). 등록된
     관광지의 실제 사진(대표사진·상세사진)을 가져온다. **1순위 소스**
  2. `TOUR_PHOTO_API_KEY` — 한국관광공사_관광사진 정보_GW (PhotoGalleryService1).
     큐레이션된 전문 사진을 가져온다. 1번이 실패했을 때 시도하는 **2순위 소스**
     (휴게소·선착장 같은 시설류는 등록이 없을 수 있음)
  3. `PEXELS_API_KEY` (선택) — 위 두 개 다 없을 때 쓰는 **3순위 스톡 사진** 폴백
- **넣는 곳**: 이 저장소 GitHub Settings → Secrets and variables → Actions
- **실행 방법**: Actions 탭 → "히어로 이미지 채우기" 워크플로 → Run workflow
  - `slugs` 비우면 `heroImage` 없는 글 전체 대상
  - `force`, `tour_only`, `dry_run` 옵션은 워크플로 입력값 설명 참고
    (`tour_only`는 한국관광공사 두 소스만 쓰고 Pexels로는 안 덮어씀)
- **콘텐츠 디렉터리**: `src/content/spots`, `src/content/stays` 두 곳을 모두 훑는다
- **검색 키워드 매핑**: 슬러그별로 아래 두 파일에 각각 등록해야 한다
  - `scripts/set-tour-hero-images.mjs`의 `KEYWORDS` (TourAPI)
  - `scripts/set-photo-gallery-hero-images.mjs`의 `KEYWORDS` (관광사진갤러리)
  - Pexels 폴백 검색어는 `scripts/set-hero-images.mjs`의 `QUERIES`에 등록
