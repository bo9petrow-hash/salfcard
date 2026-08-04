import { CSSProperties } from "react";

/**
 * Размытый анимированный звёздный фон.
 * Позиции звёзд генерируются детерминированно (сид), поэтому
 * серверный и клиентский рендер совпадают — без мерцания гидратации.
 * Сам слой размыт через CSS (.stars-layer { filter: blur(...) }).
 */

// Простой сид-генератор (mulberry32) для стабильных «случайных» чисел.
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Star {
  top: string;
  left: string;
  size: number;
  dur: string;
  delay: string;
  large: boolean;
}

function makeStars(count: number): Star[] {
  const rand = mulberry32(20260730);
  const stars: Star[] = [];
  for (let i = 0; i < count; i += 1) {
    const size = +(rand() * 2.2 + 0.8).toFixed(2); // 0.8–3.0px
    stars.push({
      top: `${(rand() * 100).toFixed(2)}%`,
      left: `${(rand() * 100).toFixed(2)}%`,
      size,
      dur: `${(rand() * 3 + 2).toFixed(2)}s`, // 2–5s
      delay: `${(rand() * 4).toFixed(2)}s`,
      large: size > 2.4,
    });
  }
  return stars;
}

const STARS = makeStars(80);

export function StarsBackground() {
  return (
    <div className="stars-layer" aria-hidden>
      {STARS.map((s, i) => {
        const style: Record<string, string> = {
          top: s.top,
          left: s.left,
          width: `${s.size}px`,
          height: `${s.size}px`,
          // Кастомные свойства для CSS-анимации
          "--dur": s.dur,
          "--delay": s.delay,
        };
        return (
          <span
            key={i}
            className={s.large ? "star star-lg" : "star"}
            style={style as CSSProperties}
          />
        );
      })}
    </div>
  );
}
