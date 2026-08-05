const replacements: Array<[RegExp, string]> = [
  [/stable visual and postural control supports cleaner timing and directional control/gi, "a steady head and balanced body help you time the movement and control the result"],
  [/visual and postural control/gi, "head steadiness and balance"],
  [/body position and head control/gi, "keep your head steady through contact"],
  [/preparation and backlift timing/gi, "get ready earlier"],
  [/head[- ]stability contact rehearsal/gi, "steady-head contact drill"],
  [/strike window/gi, "contact"],
  [/postural control/gi, "balance"],
  [/directional control/gi, "control of the result"],
  [/pelvis[-– ]thorax separation/gi, "timing between the hips and shoulders"],
  [/shoulder[-– ]pelvis separation/gi, "timing between the shoulders and hips"],
  [/proximal[-– ]to[-– ]distal sequencing/gi, "the movement sequence from the body to the racket"],
  [/kinetic chain/gi, "whole-body movement sequence"],
  [/centre of mass/gi, "body balance point"],
  [/center of mass/gi, "body balance point"],
  [/recovery initiation latency/gi, "delay before recovery starts"],
  [/angular velocity/gi, "turning speed"],
  [/trunk/gi, "upper body"],
  [/pelvis/gi, "hips"],
  [/thorax/gi, "upper body"],
  [/kinematic proxy/gi, "video-based estimate"],
  [/criterion-based/gi, "movement-based"],
  [/within reference/gi, "on track"],
  [/slightly below reference/gi, "developing"],
  [/below reference/gi, "priority"],
  [/contact proxy/gi, "estimated contact moment"],
  [/repetition/gi, "swing"],
];

export function plainLanguage(input: string | null | undefined) {
  if (!input) return "";
  let value = input.trim();
  for (const [pattern, replacement] of replacements) value = value.replace(pattern, replacement);
  value = value.replaceAll("_", " ");
  value = value.replace(/\s+/g, " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function concise(input: string | null | undefined, maxLength = 190) {
  const value = plainLanguage(input);
  if (value.length <= maxLength) return value;
  const sentenceEnd = value.lastIndexOf(".", maxLength);
  if (sentenceEnd > maxLength * 0.55) return value.slice(0, sentenceEnd + 1);
  return `${value.slice(0, maxLength - 1).trim()}…`;
}
