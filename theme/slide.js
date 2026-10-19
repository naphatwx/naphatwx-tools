/* slide(panel, open, instant): slides a disclosure panel open or shut, height + padding + opacity over 220ms.
   A click mid-slide reverses from the current height; reduced motion and instant just show or hide it. */
const EASE = getComputedStyle(document.documentElement).getPropertyValue('--ease').trim() || 'ease';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
function slide(panel, open, instant) {
  const from = panel.hidden ? 0 : panel.getBoundingClientRect().height;
  panel.getAnimations().forEach((a) => a.cancel());
  panel.style.overflow = '';
  panel.hidden = false;
  const to = open ? panel.getBoundingClientRect().height : 0;
  if (instant || reducedMotion.matches || from === to) { panel.hidden = !open; return; }
  const computedStyle = getComputedStyle(panel);
  const keyframe = (height) => height ? { height: height + 'px', paddingTop: computedStyle.paddingTop, paddingBottom: computedStyle.paddingBottom, opacity: 1 }
    : { height: '0px', paddingTop: '0px', paddingBottom: '0px', opacity: 0 };
  panel.style.overflow = 'hidden';
  const animation = panel.animate([keyframe(from), keyframe(to)], { duration: 220, easing: EASE, fill: 'forwards' });
  animation.onfinish = () => { panel.hidden = !open; panel.style.overflow = ''; animation.cancel(); };
}
