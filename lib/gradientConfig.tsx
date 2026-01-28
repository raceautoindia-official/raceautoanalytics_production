export type GradientType = 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'gray';

export interface GradientDefinition {
  id: string;
  type: GradientType;
  startColor: string;
  endColor: string;
}

export const GRADIENT_DEFINITIONS = {
  blue: {
    id: 'gradient-blue',
    type: 'blue' as const,
    startColor: '#007AFF',
    endColor: '#0049C7',
  },
  green: {
    id: 'gradient-green',
    type: 'green' as const,
    startColor: '#2ECC71',
    endColor: '#10783C',
  },
  red: {
    id: 'gradient-red',
    type: 'red' as const,
    startColor: '#FF5B5B',
    endColor: '#B61D1D',
  },
  amber: {
    id: 'gradient-amber',
    type: 'amber' as const,
    startColor: '#FFC043',
    endColor: '#9B6C00',
  },
  purple: {
    id: 'gradient-purple',
    type: 'purple' as const,
    startColor: '#8B5CF6',
    endColor: '#5B21B6',
  },
  gray: {
    id: 'gradient-gray',
    type: 'gray' as const,
    startColor: '#6B7280',
    endColor: '#374151',
  },
} as const;

export function getGradientUrl(gradientId: string): string {
  return `url(#${gradientId})`;
}

export function getGradientIdFromColor(color: string): string {
  const colorMap: Record<string, string> = {
    '#007AFF': GRADIENT_DEFINITIONS.blue.id,
    '#2ECC71': GRADIENT_DEFINITIONS.green.id,
    '#FF5B5B': GRADIENT_DEFINITIONS.red.id,
    '#FFC043': GRADIENT_DEFINITIONS.amber.id,
    '#8B5CF6': GRADIENT_DEFINITIONS.purple.id,
    '#6B7280': GRADIENT_DEFINITIONS.gray.id,
  };

  return colorMap[color] || color;
}

export function shouldUseGradient(color?: string, useGradient?: boolean): boolean {
  if (useGradient === false) return false;
  if (!color) return false;

  return color in {
    '#007AFF': true,
    '#2ECC71': true,
    '#FF5B5B': true,
    '#FFC043': true,
    '#8B5CF6': true,
  };
}

export function getGradientFillFromColor(color?: string, useGradient?: boolean): string {
  if (!color) return color || '';
  if (!shouldUseGradient(color, useGradient)) return color;

  const gradientId = getGradientIdFromColor(color);
  return getGradientUrl(gradientId);
}

interface LinearGradientProps {
  id: string;
  startColor: string;
  endColor: string;
  direction?: 'vertical' | 'horizontal';
}

export function LinearGradient({ id, startColor, endColor, direction = 'vertical' }: LinearGradientProps) {
  const x1 = direction === 'vertical' ? '0%' : '0%';
  const y1 = direction === 'vertical' ? '0%' : '0%';
  const x2 = direction === 'vertical' ? '0%' : '100%';
  const y2 = direction === 'vertical' ? '100%' : '0%';

  return (
    <linearGradient id={id} x1={x1} y1={y1} x2={x2} y2={y2}>
      <stop offset="0%" stopColor={startColor} stopOpacity={1} />
      <stop offset="100%" stopColor={endColor} stopOpacity={1} />
    </linearGradient>
  );
}

interface AreaGradientProps {
  id: string;
  startColor: string;
  endColor: string;
  startOpacity?: number;
  endOpacity?: number;
}

export function AreaGradient({ id, startColor, endColor, startOpacity = 0.18, endOpacity = 0.08 }: AreaGradientProps) {
  return (
    <linearGradient id={id} x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stopColor={startColor} stopOpacity={startOpacity} />
      <stop offset="100%" stopColor={endColor} stopOpacity={endOpacity} />
    </linearGradient>
  );
}

interface RadialGradientProps {
  id: string;
  startColor: string;
  endColor: string;
}

export function RadialGradient({ id, startColor, endColor }: RadialGradientProps) {
  return (
    <radialGradient id={id} cx="50%" cy="50%" r="50%">
      <stop offset="0%" stopColor={startColor} stopOpacity={1} />
      <stop offset="100%" stopColor={endColor} stopOpacity={1} />
    </radialGradient>
  );
}

export function renderGradientDefs(direction: 'vertical' | 'horizontal' | 'radial' = 'vertical', includeArea: boolean = false) {
  const gradients = Object.values(GRADIENT_DEFINITIONS);

  return (
    <defs>
      {gradients.map(gradient => {
        if (direction === 'radial') {
          return (
            <RadialGradient
              key={gradient.id}
              id={gradient.id}
              startColor={gradient.startColor}
              endColor={gradient.endColor}
            />
          );
        }

        return (
          <LinearGradient
            key={gradient.id}
            id={gradient.id}
            startColor={gradient.startColor}
            endColor={gradient.endColor}
            direction={direction}
          />
        );
      })}

      {includeArea && gradients.map(gradient => (
        <AreaGradient
          key={`${gradient.id}-area`}
          id={`${gradient.id}-area`}
          startColor={gradient.startColor}
          endColor={gradient.endColor}
        />
      ))}
    </defs>
  );
}
