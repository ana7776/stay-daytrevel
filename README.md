# stay.daytrevel.com

숙박 제휴 수익화를 위한 Daytrevel 서브도메인 프로젝트입니다.

## Stack

- Astro static site
- MDX content
- Cloudflare Pages deployment

## Commands

```bash
npm install
npm run dev
npm run build
```

## Environment Variables

로컬 개발에서는 프로젝트 루트에 `.env` 파일을 만들고 아래 값을 설정합니다.
실제 API 키는 GitHub에 올리지 않고, `.env.example`에는 필요한 변수명만 기록합니다.

```bash
cp .env.example .env
```

필요한 키:

- `KTO_API_KEY`: 한국관광공사 API 키
- `PEXELS_API_KEY`: Pexels API 키
- `PIXABAY_API_KEY`: Pixabay API 키

## Deployment

Cloudflare Pages에서 이 저장소의 `main` 브랜치를 연결하고, 커스텀 도메인으로 `stay.daytrevel.com`을 지정합니다.

- Project name: `stay-daytrevel`
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

Cloudflare Pages 배포 환경에서는 `Settings > Variables and Secrets`에 같은 이름의 변수를 추가합니다.
