## 폴더 설명
app/            모든 페이지, 라우트, 레이아웃
    layout.tsx                  # 전체 레이아웃
    page.tsx                    # 홈 페이지 (/)
    globals.css                 # 전역 스타일
    auth/                       # 그룹 폴더 (URL에 안 나타남)
        login/
            page.tsx            # /login
        signup/
            page.tsx            # /signup
components/     재사용할 React 컴포넌트
hooks/          커스텀 React 훅 (useState 등 로직)
lib/            헬퍼 함수, API 호출, 유틸리티
types/          TypeScript 인터페이스/타입
constants/      고정된 상수값
styles/         글로벌 CSS (Tailwind 쓰면 필요 적음)
public/         이미지, 폰트 등 정적 파일