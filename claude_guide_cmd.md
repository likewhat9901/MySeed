=================================== 설치, 기본 세팅 ===================================
# 1. Claude Code 설치
* Git for Windows 사전 설치 필요
curl -fsSL https://claude.ai/install.cmd -o install.cmd && install.cmd && del install.cmd

# 2. Claude Code 시작
cd your-project
claude

# 3. 첫번째 질문 테스트
what does this project do?
what technologies does this project use?
explain the folder structure

# 4. 언어 설정 변경
1. 설치된 .claude/ 안의 settings.json 수정
===== 추가할 내용 =====
{
  "language": "ko"
}
=====================
2. /exit 후 claude 로 재시작
* 현재는 답변만 한국어로 지원. 중간 과정은 영어.


=================================== 사용 설명서 ===================================
# Plan 모드
/plan으로 Plan Mode에 진입하면 Claude가 문제를 분석하고, 단계별 계획을 세운 후 승인을 기다립니다. 실행하기 전에 무엇을, 어떤 순서로 변경하는지 미리 볼 수 있어요.
  → Claude가 실제로 파일을 수정하지 않고, 파일을 읽고 탐색하며 어떻게 작업할지 계획만 세우는 읽기 전용 모드
  → 사용자가 승인한 후에만 실행

# 특수 기호
!git status        → git 상태 확인하면서 Claude에게 공유
@src/main.js       → 특정 파일 참조

# 모델 선택 팁
Opus 4.6        복잡한 작업 (대규모 리팩토링, 아키텍처 설계, 어려운 버그)      Sonnet의 1.7배
Sonnet 4.6      평소 기본 사용 (함수 작성, 버그 수정, 테스트, 커밋 등)      
Haiku 4.5       간단한 질문, 빠른 답변이 필요할 때                          Sonnet의 1/3

# CLAUDE.md 설정
Claude가 매 세션 시작 시 자동으로 읽는 특수 파일입니다. 
1. 전역 설정 (.claude\CLAUDE.md) — 모든 프로젝트에 적용
2. 프로젝트별 설정 (프로젝트 루트의 CLAUDE.md) — 해당 프로젝트에만 적용

# 허락 요청 팝업 대처법
작업 중 "Do you want to proceed?" 같은 게 뜨면:
  1 → 허용
  2 → 거부
  Tab → 명령어 직접 수정
  Ctrl+E → 이 명령이 뭔지 Claude한테 설명 요청

# 토큰 절약 팁
1. 긴 작업 중간에 /compact → 대화 압축해서 컨텍스트 절약
2. 새 작업 시작할 때 /clear → 이전 대화 초기화
3. /cost → 수시로 사용량 체크
4. 복잡하지 않은 작업은 Sonnet 유지

# 자주 쓰는 슬래시(/) 명령어
/help		  사용 가능한 전체 명령어 보기
/clear		대화 기록 초기화 (새 작업 시작)
/compact	대화 요약 압축 (토큰 절약)
/cost		  현재 세션 토큰 사용량 확인
/model		모델 변경 (Sonnet ↔ Opus)
/exit		  Claude Code 종료

/init		  프로젝트 분석 후 CLAUDE.md 파일을 생성
/review		현재 작성된 코드에 대해 코드 리뷰를 요청

# 자주 쓰는 단축키
Shift + Tab     권한 모드 전환	           Normal → Auto-Accept → Plan(읽기 전용) 순으로 바뀝니다.
Esc + Esc	      Rewind (되감기)	          코드나 대화 내용을 특정 시점으로 되돌립니다. (실수했을 때 필수)
Ctrl + G	      외부 에디터 열기	         터미널 입력이 불편할 때 기본 텍스트 에디터에서 프롬프트를 씁니다.
Ctrl + O	      상세 모드(Verbose)        토글 AI가 도구를 실행하는 과정을 자세히 볼 수 있습니다.
Ctrl + L	      화면 지우기	               대화 기록은 남기되 터미널 화면만 깔끔하게 청소합니다.

# 실전 예시 프롬프트
이 코드에서 버그 찾아줘
로그인 기능 추가해줘
이 함수가 뭘 하는지 설명해줘
테스트 코드 작성해줘
git 커밋 메시지 작성해줘