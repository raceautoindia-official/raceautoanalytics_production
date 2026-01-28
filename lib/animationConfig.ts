export const CHART_ANIMATION = {
  duration: {
    fast: 220,
    medium: 260,
    slow: 320,
  },
  stagger: {
    minimal: 20,
    small: 30,
    medium: 40,
  },
  easing: {
    easeOut: 'ease-out',
    easeIn: 'ease-in',
    easeInOut: 'ease-in-out',
  },
} as const;

export function getStaggerDelay(index: number, staggerAmount: number = CHART_ANIMATION.stagger.medium): number {
  return index * staggerAmount;
}

export function getAnimationConfig(isReducedMotion: boolean) {
  return {
    isAnimationActive: !isReducedMotion,
    animationDuration: isReducedMotion ? 0 : CHART_ANIMATION.duration.medium,
    animationEasing: CHART_ANIMATION.easing.easeOut,
  };
}
