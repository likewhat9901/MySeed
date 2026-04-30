"use client";

// ─── features/editor/api.ts ───────────────────────────────────────────────────
// 캔버스 위젯 배치 API
//
// 구성요소
// - getCanvasWidgets: ledger의 저장된 위젯 배치 조회
// - saveCanvasWidgets: 현재 캔버스 위젯 배치 전체 저장

import { callRpc, callRpcVoid } from "@/lib/supabase/core/rpc";
import type { WidgetItem, WidgetDataBinding } from "./types";
import { DEFAULT_WIDGET_STYLE } from "./types";
import type { WidgetPosition } from "@/lib/supabase/types/schema";

// get_canvas_widgets RPC가 반환하는 위젯 배치 row.
type CanvasWidgetRow = {
  con_id: string
  wid_type: WidgetItem['type']
  position: WidgetPosition
  data_binding: WidgetDataBinding
}

export async function getCanvasWidgets(ledId: string): Promise<WidgetItem[]> {
  const data = await callRpc<CanvasWidgetRow[]>(
    'get_canvas_widgets',
    { p_led_id: ledId },
    [],
  )

  return data.map(row => {
    const pos = row.position
    return {
      id:           row.con_id,
      type:         row.wid_type,
      x:            pos.x,
      y:            pos.y,
      w:            pos.w,
      h:            pos.h,
      style:        pos.style ?? { ...DEFAULT_WIDGET_STYLE },
      data_binding: row.data_binding ?? null,
    }
  })
}

// replace_canvas_widgets RPC에 전달하는 위젯 저장 payload.
type SaveCanvasWidgetConfig = {
  con_id: string
  wid_type: WidgetItem['type']
  position: WidgetPosition
  data_binding: WidgetDataBinding
}

export async function saveCanvasWidgets(ledId: string, widgets: WidgetItem[]): Promise<boolean> {
  const configs: SaveCanvasWidgetConfig[] = widgets.map(w => ({
    con_id:       w.id,
    wid_type:     w.type,
    position:     { x: w.x, y: w.y, w: w.w, h: w.h, style: w.style },
    data_binding: w.data_binding ?? null,
  }))

  return callRpcVoid('replace_canvas_widgets', {
    p_led_id: ledId,
    p_configs: configs,
  })
}
