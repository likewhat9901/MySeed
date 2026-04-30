/**
 * panX/panY를 정수로 반올림하고, 그리드 CSS 배경 offset을 계산한다.
 * CSS 배경(그리드)과 위젯 레이어(transform) 사이의 서브픽셀 불일치를 방지한다.
 */
export function calcGridBackground(
  panX: number,
  panY: number,
  cellSize: number,
  scale: number,
) {
  const rpx = Math.round(panX)
  const rpy = Math.round(panY)
  const gridCell = cellSize * scale
  const bgOffsetX = ((rpx % gridCell) + gridCell) % gridCell
  const bgOffsetY = ((rpy % gridCell) + gridCell) % gridCell
  return { rpx, rpy, gridCell, bgOffsetX, bgOffsetY }
}
