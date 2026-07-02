import HeaderClient from "./HeaderClient";
import HeaderBar from "./HeaderBar";

// 로그인 시 좌측 사이드바가 로고를 담당하므로, 헤더는 사이드바 유무에 맞춰 폭/로고 표시를 조정
export default function Header() {
  return (
    <HeaderBar>
      <HeaderClient />
    </HeaderBar>
  );
}
