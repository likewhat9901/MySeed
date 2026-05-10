// ─── schema.ts ────────────────────────────────────────────────────────────────
// 프론트가 사용하는 DB 테이블 타입 정의.
//
// 역할:
//   1. 친구(DB 담당)와의 계약서 — 각 테이블에서 프론트가 필요한 컬럼을 명시
//   2. queries/ · rpc/ 파일에서 import해서 타입 안정성 확보
//   3. DB 구조가 바뀌면 `npm run gen:types` 후 이 파일에 빨간줄로 감지
//
// 업데이트 방법:
//   npm run gen:types  →  database.types.ts 갱신  →  이 파일에서 빨간줄 확인 후 수정

import type { Tables } from "./database.types";
import type { WidgetStyle } from "@/features/editor/types";

// ── position jsonb 구조 ────────────────────────────────────────────────────────
// tb_widget_config.position 컬럼의 실제 JSON 형태.
// DB는 Json | null 타입이므로 쿼리 후 이 타입으로 캐스팅합니다.
export interface WidgetPosition {
  x: number
  y: number
  w: number
  h: number
  style?: WidgetStyle
}

// ══════════════════════════════════════════════════════════════════════════════
// ✅ 구현됨
// ══════════════════════════════════════════════════════════════════════════════

// ── tb_member ─────────────────────────────────────────────────────────────────
// auth.users.id(mem_id)와 1:1 연결되는 유저 프로필 테이블.
export type DbMember = Pick<Tables<'tb_member'>,
  | 'mem_id'          // PK, auth.users.id
  | 'name'
  | 'profile_image'
  | 'mem_type'        // 예: 'personal' | 'business'
  | 'regist_dt'
>

// ── tb_ledger ─────────────────────────────────────────────────────────────────
// 가계부 단위. 위젯 배치(tb_widget_config)와 실제 데이터(tb_record)의 부모.
export type DbLedger = Pick<Tables<'tb_ledger'>,
  | 'led_id'          // PK uuid
  | 'mem_id'          // FK → tb_member
  | 'led_name'
  | 'tem_id'          // FK → tb_template (템플릿 적용 시)
  | 'regist_dt'
>

// ── tb_widget ─────────────────────────────────────────────────────────────────
// 위젯 타입 카탈로그 (마스터 데이터, 불변).
// 프론트의 wid_type과 DB의 wid_id를 매핑하는 역할.
export type DbWidget = Pick<Tables<'tb_widget'>,
  | 'wid_id'          // PK uuid
  | 'wid_type'        // 프론트 WidgetType과 1:1 (예: 'expense-memo')
  | 'wid_name'        // 표시명
  | 'config_schema'   // 위젯별 설정 스키마 (미사용 중, 추후 확장)
>

// ── tb_widget_config ──────────────────────────────────────────────────────────
// 특정 ledger에 배치된 위젯 인스턴스.
// position(jsonb)에 x/y/w/h/style을 저장합니다.
export type DbWidgetConfig = Pick<Tables<'tb_widget_config'>,
  | 'con_id'          // PK uuid (프론트 WidgetItem.id와 동일)
  | 'led_id'          // FK → tb_ledger
  | 'wid_id'          // FK → tb_widget
  | 'position'        // jsonb: { x, y, w, h, style } → WidgetPosition으로 캐스팅
  | 'data_binding'    // 위젯 데이터 연결 설정 (현재 미사용)
  | 'filters'         // 데이터 필터 조건 (미사용)
  | 'aggregation'     // 집계 방식 (미사용)
>

// ══════════════════════════════════════════════════════════════════════════════
// 🔜 미구현 — 친구에게 RPC 또는 구조 확인 필요
// ══════════════════════════════════════════════════════════════════════════════

// ── tb_record ─────────────────────────────────────────────────────────────────
// 실제 가계 데이터 (수입/지출 내역).
// TODO: 위젯에 실데이터 바인딩 시 필요 — 친구에게 data(jsonb) 구조 확인 필요
export type DbRecord = Pick<Tables<'tb_record'>,
  | 'rec_id'          // PK uuid
  | 'led_id'          // FK → tb_ledger
  | 'data_type'       // 예: 'income' | 'expense'
  | 'data'            // jsonb — 실제 데이터 (구조 친구에게 확인 필요)
  | 'cate_id'         // FK → tb_category
  | 'file_id'         // FK → tb_file
  | 'regist_dt'
>

// ── tb_template ───────────────────────────────────────────────────────────────
// 위젯 배치 템플릿. 새 ledger 생성 시 선택 가능.
// TODO: 템플릿 선택 화면 구현 시 필요
export type DbTemplate = Pick<Tables<'tb_template'>,
  | 'tem_id'          // PK uuid
  | 'tem_name'
  | 'page_list'       // jsonb — 템플릿 내 페이지/위젯 구성
  | 'is_public'
>

// ── tb_category ───────────────────────────────────────────────────────────────
// 수입/지출 카테고리.
// TODO: 카테고리 필터 기능 구현 시 필요
export type DbCategory = Pick<Tables<'tb_category'>,
  | 'cate_id'         // PK uuid
  | 'mem_id'          // FK → tb_member
  | 'cate_name'
  | 'cate_type'       // 예: 'income' | 'expense'
  | 'mapping_key'     // 외부 데이터 매핑 키
>

// ── tb_import_mappings ────────────────────────────────────────────────────────
// 엑셀 → 위젯 매핑 프리셋 저장 테이블.
export type DbImportMapping = Pick<Tables<'tb_import_mappings'>,
  | 'map_id'
  | 'mem_id'
  | 'map_name'
  | 'mappings'   // jsonb: MappingEntry[] (con_id 기준; 구 저장분 widget_id는 클라에서 정규화)
  | 'regist_dt'
>

// ── tb_file ───────────────────────────────────────────────────────────────────
// 업로드된 파일 메타데이터 (영수증 이미지 등).
// TODO: 파일 첨부 기능 구현 시 필요
export type DbFile = Pick<Tables<'tb_file'>,
  | 'file_id'         // PK uuid
  | 'mem_id'          // FK → tb_member
  | 'file_name'
  | 'file_path'
  | 'file_type'
  | 'regist_dt'
>

// ── tb_bridge_tw ──────────────────────────────────────────────────────────────
// tb_template ↔ tb_widget 다대다 연결 브릿지 테이블.
// TODO: 템플릿 기능 구현 시 필요
export type DbBridgeTW = Pick<Tables<'tb_bridge_tw'>,
  | 'brg_id'          // PK uuid
  | 'tem_id'          // FK → tb_template
  | 'wid_id'          // FK → tb_widget
>
