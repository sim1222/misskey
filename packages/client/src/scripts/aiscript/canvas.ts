import { utils, values } from '@syuilo/aiscript';

// Validate script values before calling the browser's strongly typed canvas API.
export function createCanvasApi(ctx: CanvasRenderingContext2D) {
 return values.OBJ(new Map([
  ['clear_rect', values.FN_NATIVE(([x, y, width, height]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   utils.assertNumber(width);
   utils.assertNumber(height);
   ctx.clearRect(x.value, y.value, width.value, height.value);
  })],
  ['fill_rect', values.FN_NATIVE(([x, y, width, height]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   utils.assertNumber(width);
   utils.assertNumber(height);
   ctx.fillRect(x.value, y.value, width.value, height.value);
  })],
  ['stroke_rect', values.FN_NATIVE(([x, y, width, height]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   utils.assertNumber(width);
   utils.assertNumber(height);
   ctx.strokeRect(x.value, y.value, width.value, height.value);
  })],
  ['fill_text', values.FN_NATIVE(([text, x, y, width]) => {
   utils.assertString(text);
   utils.assertNumber(x);
   utils.assertNumber(y);
   if (width) utils.assertNumber(width);
   ctx.fillText(text.value, x.value, y.value, width?.value);
  })],
  ['stroke_text', values.FN_NATIVE(([text, x, y, width]) => {
   utils.assertString(text);
   utils.assertNumber(x);
   utils.assertNumber(y);
   if (width) utils.assertNumber(width);
   ctx.strokeText(text.value, x.value, y.value, width?.value);
  })],
  ['set_line_width', values.FN_NATIVE(([width]) => {
   utils.assertNumber(width);
   ctx.lineWidth = width.value;
  })],
  ['set_font', values.FN_NATIVE(([font]) => {
   utils.assertString(font);
   ctx.font = font.value;
  })],
  ['set_fill_style', values.FN_NATIVE(([style]) => {
   utils.assertString(style);
   ctx.fillStyle = style.value;
  })],
  ['set_stroke_style', values.FN_NATIVE(([style]) => {
   utils.assertString(style);
   ctx.strokeStyle = style.value;
  })],
  ['begin_path', values.FN_NATIVE(([]) => {
   ctx.beginPath();
  })],
  ['close_path', values.FN_NATIVE(([]) => {
   ctx.closePath();
  })],
  ['move_to', values.FN_NATIVE(([x, y]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   ctx.moveTo(x.value, y.value);
  })],
  ['line_to', values.FN_NATIVE(([x, y]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   ctx.lineTo(x.value, y.value);
  })],
  ['arc', values.FN_NATIVE(([x, y, radius, startAngle, endAngle]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   utils.assertNumber(radius);
   utils.assertNumber(startAngle);
   utils.assertNumber(endAngle);
   ctx.arc(x.value, y.value, radius.value, startAngle.value, endAngle.value);
  })],
  ['rect', values.FN_NATIVE(([x, y, width, height]) => {
   utils.assertNumber(x);
   utils.assertNumber(y);
   utils.assertNumber(width);
   utils.assertNumber(height);
   ctx.rect(x.value, y.value, width.value, height.value);
  })],
  ['fill', values.FN_NATIVE(([]) => {
   ctx.fill();
  })],
  ['stroke', values.FN_NATIVE(([]) => {
   ctx.stroke();
  })],
 ]));
}
