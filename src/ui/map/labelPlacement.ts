/**
 * Map label placement (review 016 #14): a label sits right of its marker and flips to the left when it would be cut
 * by the canvas edge; the result always lies inside [margin, size - margin].
 */
export interface LabelBox {
  x: number
  y: number
}

/**
 * @param ax marker x, @param ay marker y (canvas px)
 * @param width measured text width, @param size canvas size
 * @param dx horizontal offset from the marker, @param dy vertical offset (text baseline)
 */
export function placeLabel(ax: number, ay: number, width: number, size: number, dx = 6, dy = -6, margin = 2): LabelBox {
  let x = ax + dx
  if (x + width > size - margin) x = ax - dx - width
  x = Math.min(Math.max(x, margin), Math.max(margin, size - margin - width))
  const y = Math.min(Math.max(ay + dy, 12 + margin), size - margin)
  return { x, y }
}
