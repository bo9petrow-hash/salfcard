@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}

html,
body {
  padding: 0;
  margin: 0;
}

body {
  min-height: 100vh;
  /* Тёмный космический градиент */
  background:
    radial-gradient(1200px 700px at 80% -10%, rgba(139, 92, 246, 0.18), transparent 60%),
    radial-gradient(900px 600px at 0% 10%, rgba(59, 130, 246, 0.16), transparent 55%),
    linear-gradient(160deg, #0b0f1e 0%, #12172a 45%, #1a1f33 100%);
  background-attachment: fixed;
  color: #e5e9f2;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

@layer components {
  /* Стеклянная карточка */
  .glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .glass-strong {
    background: rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    border: 1px solid rgba(255, 255, 255, 0.14);
  }
  /* Тёмное полупрозрачное поле ввода */
  .input-dark {
    background: rgba(10, 14, 30, 0.55);
    border: 1px solid rgba(255, 255, 255, 0.12);
    color: #f1f4fb;
  }
  .input-dark::placeholder {
    color: rgba(226, 232, 240, 0.4);
  }
  .input-dark:focus {
    outline: none;
    border-color: #60a5fa;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  }
  .input-dark:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  /* Градиентная кнопка */
  .btn-grad {
    background-image: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
    color: #fff;
    transition: filter 0.15s ease, box-shadow 0.15s ease, transform 0.05s ease;
  }
  .btn-grad:hover:not(:disabled) {
    filter: brightness(1.12);
    box-shadow: 0 8px 24px rgba(99, 102, 241, 0.4);
  }
  .btn-grad:active:not(:disabled) {
    transform: translateY(1px);
  }
  .btn-grad:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

/* ===== Звёздное небо (размытое) ===== */
.stars-layer {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  overflow: hidden;
  /* Размытие всего звёздного слоя */
  filter: blur(1.4px);
}

.star {
  position: absolute;
  border-radius: 9999px;
  background: #ffffff;
  opacity: 0.7;
  animation: star-twinkle var(--dur, 3s) ease-in-out infinite;
  animation-delay: var(--delay, 0s);
  will-change: opacity, transform;
}

/* Крупные звёзды размыты сильнее — эффект глубины */
.star-lg {
  filter: blur(0.6px);
  box-shadow: 0 0 6px 1px rgba(255, 255, 255, 0.5);
}

@keyframes star-twinkle {
  0%,
  100% {
    opacity: 0.15;
    transform: translateY(0) scale(0.9);
  }
  50% {
    opacity: 0.9;
    transform: translateY(-3px) scale(1.15);
  }
}

@keyframes star-drift {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-40px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .star {
    animation: none;
    opacity: 0.5;
  }
}

* {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

/* Мобильные: не масштабировать при фокусе на поле, убрать задержку тапа */
input,
textarea,
select,
button {
  touch-action: manipulation;
}

input,
textarea,
select {
  font-size: 16px;
}
