import { useRef, type CSSProperties } from 'react';
import { cn } from '../../shared/ui';
import './animated-characters.css';
import {
  characterState,
  type CharacterFocus,
  type CharacterSubmitStatus,
} from './characterState';
import { useCharacterLook, usePrefersReducedMotion } from './useCharacterLook';

interface AnimatedCharactersProps {
  focus: CharacterFocus;
  passwordVisible: boolean;
  submitStatus: CharacterSubmitStatus;
  className?: string;
}

interface CharacterSpec {
  id: 'big' | 'mid' | 'small' | 'semi';
  body: string;
  eyes: [number, number][];
  mouth: [number, number];
  /** Duración del parpadeo: distinta en cada uno (CA8). */
  blink: string;
}

/** Geometría tomada de `docs/diseño/stitch/login/login.png` (DESIGN.md, «Ilustración: cuatro personajes»). */
const CHARACTERS: CharacterSpec[] = [
  {
    id: 'big',
    body: 'M168 330 V34 Q168 18 184 18 H266 Q280 18 282 32 L288 330 Z',
    eyes: [[208, 73], [236, 73]],
    mouth: [222, 95],
    blink: '4.3s',
  },
  {
    id: 'mid',
    body: 'M279 330 L281 128 Q282 114 296 114 H330 Q342 114 344 128 L355 330 Z',
    eyes: [[296, 147], [324, 147]],
    mouth: [310, 169],
    blink: '5.2s',
  },
  {
    id: 'small',
    body: 'M355 330 V201.5 A37.5 37.5 0 0 1 430 201.5 V330 Z',
    eyes: [[377, 210], [405, 210]],
    mouth: [391, 232],
    blink: '3.7s',
  },
  {
    id: 'semi',
    body: 'M45 330 A105 105 0 0 1 255 330 Z',
    eyes: [[155, 276], [183, 276]],
    mouth: [169, 298],
    blink: '4.8s',
  },
];

const SPARKLE = 'M0 -10 Q1.6 -1.6 10 0 Q1.6 1.6 0 10 Q-1.6 1.6 -10 0 Q-1.6 -1.6 0 -10 Z';

/**
 * T07c · Ilustración decorativa del login: cuatro personajes en SVG propio que reaccionan al foco, a la contraseña
 * visible y al envío. Solo recibe esas tres entradas (CA13); nunca el valor de la contraseña. Las poses y las
 * animaciones están en `animated-characters.css`.
 */
export function AnimatedCharacters({ focus, passwordVisible, submitStatus, className }: AnimatedCharactersProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const { pose, followCursor } = characterState({ focus, passwordVisible, submitStatus });

  useCharacterLook(svgRef, followCursor && !reducedMotion);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 470 360"
      // Se ajusta al alto disponible sin deformarse y con la base de los personajes abajo.
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      focusable="false"
      data-pose={pose}
      className={cn('characters pointer-events-none select-none', className)}
    >
      <defs>
        {CHARACTERS.map(({ id }) => (
          <linearGradient key={id} id={`char-${id}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: `var(--color-char-${id}-from)` }} />
            <stop offset="1" style={{ stopColor: `var(--color-char-${id}-to)` }} />
          </linearGradient>
        ))}
        <filter id="char-shadow-blur" x="-20%" y="-200%" width="140%" height="500%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      <ellipse className="shadow" cx="240" cy="338" rx="205" ry="9" filter="url(#char-shadow-blur)" />
      {/* La posición va en el <g>: la animación CSS del destello reemplaza el `transform` de su propio elemento. */}
      <g transform="translate(445 47)">
        <path className="sparkle sparkle-lg" d={SPARKLE} />
      </g>
      <g transform="translate(14 165) scale(0.7)">
        <path className="sparkle sparkle-sm" d={SPARKLE} />
      </g>

      {CHARACTERS.map((c, i) => (
        <g key={c.id} className="enter" style={{ '--i': i } as CSSProperties}>
          <g className={`char char-${c.id}`} style={{ '--i': i } as CSSProperties}>
            <path className="body" d={c.body} fill={`url(#char-${c.id})`} />
            <g className="face">
              <g className="eyes" style={{ '--blink': c.blink } as CSSProperties}>
                {c.eyes.map(([x, y]) => (
                  <g key={x}>
                    <circle className="eye-white" cx={x} cy={y} r="6.5" />
                    <g className="pupil">
                      <circle className="eye-pupil" cx={x} cy={y} r="3.3" />
                      <circle className="eye-shine" cx={x + 1.2} cy={y - 1.2} r="1.1" />
                    </g>
                  </g>
                ))}
              </g>
              <g className="lids">
                {c.eyes.map(([x, y]) => (
                  <path key={x} d={`M${x - 5} ${y} Q${x} ${y + 4} ${x + 5} ${y}`} />
                ))}
              </g>
              <path
                className="mouth"
                d={`M${c.mouth[0] - 7} ${c.mouth[1]} Q${c.mouth[0]} ${c.mouth[1] + 6} ${c.mouth[0] + 7} ${c.mouth[1]}`}
              />
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
