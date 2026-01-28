// app/forecast/GlobalStyles.js
export default function GlobalStyles() {
  return (
    <style jsx global>{`
      :root {
        --bg: #2c2e31;
        --fg: #ffc107;
        --accent: #15afe4;
        --accent-active: #ffdc00;
      }

      /* Dark panel */
      .recharts-brush .recharts-brush-background {
        fill: rgba(30, 30, 30, 0.85) !important;
        stroke: none !important;
      }

      /* The selected window */
      .recharts-brush .recharts-brush-slide {
        fill: var(--accent, #15afe4) !important;
        fill-opacity: 0.15 !important;
      }

      /* handles */
      .recharts-brush .recharts-brush-traveller {
        fill: var(--accent, #15afe4) !important;
        stroke: var(--fg, #ffc107) !important;
        stroke-width: 1 !important;
        cursor: ew-resize;
      }
      .recharts-brush .recharts-brush-traveller-end {
        fill: var(--accent, #15afe4) !important;
        stroke: var(--fg, #ffc107) !important;
        stroke-width: 1 !important;
      }

      /* labels */
      .recharts-brush .recharts-brush-text {
        fill: var(--fg, #ffc107) !important;
        font-size: 0.75rem !important;
      }

      /* bar hover polish */
      .recharts-bar-rectangle {
        filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.25));
        transition: transform 200ms ease, filter 200ms ease;
      }
      .recharts-bar-rectangle:hover {
        transform: translateY(-4px);
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.35))
          drop-shadow(0 0 6px rgba(255, 255, 255, 0.2));
      }

      /* pie hover */
      .recharts-pie-sector {
        transform-box: fill-box;
        transform-origin: 50% 50%;
        transition: transform 200ms ease, filter 200ms ease;
      }
      .recharts-pie-sector:hover {
        transform: scale(1.05);
        filter: drop-shadow(0 0 4px rgba(255, 193, 7, 0.15))
          drop-shadow(0 0 8px rgba(255, 193, 7, 0.08));
      }
    `}</style>
  );
}


// export default function GlobalStyles () {
//     return (
//         <style jsx global>{`
//       /* Dark panel */
//       .recharts-brush .recharts-brush-background {
//         fill: rgba(30,30,30,0.85) !important;
//         stroke: none !important;
//       }

//       /* The selected window */
//       .recharts-brush .recharts-brush-slide {
//         fill: var(--accent, #15AFE4) !important;
//         fill-opacity: 0.15 !important;
//       }
      
//       /* The little handles you drag */
//       .recharts-brush .recharts-brush-traveller {
//         fill: var(--accent, #15AFE4) !important;
//         stroke: var(--fg, #FFC107) !important;
//         stroke-width: 1 !important;
//         cursor: ew-resize;
//       }
//       .recharts-brush .recharts-brush-traveller-end {
//         fill: var(--accent, #15AFE4) !important;
//         stroke: var(--fg, #FFC107) !important;
//         stroke-width: 1 !important;
//       }

//       /* The year labels under the brush */
//       .recharts-brush .recharts-brush-text {
//         fill: var(--fg, #FFC107) !important;
//         font-size: 0.75rem !important;
//       }
//       .chart-card {
//         background: #1F2023;
//         border-radius: 8px;
//         padding: 16px;
//         box-shadow: 0 4px 16px rgba(0,0,0,0.5);
//       }
//        /* give every bar a subtle shadow & smooth transition */
//       .recharts-bar-rectangle {
//         filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
//         transition: transform 200ms ease, filter 200ms ease;
//       }
//       /* hover: lift & brighten */
//       .recharts-bar-rectangle:hover {
//         transform: translateY(-4px);
//         filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35))
//                 drop-shadow(0 0 6px rgba(255,255,255,0.2));
//       }
//       /* make slices gently pop on hover */
//       .recharts-pie-sector {
//         /* ensure scale is applied from the pie's center, not the slice's own box */
//         transform-box: fill-box;
//         transform-origin: 50% 50%;
//         transition: transform 200ms ease, filter 200ms ease;
//       }
//       .recharts-pie-sector:hover {
//         transform: scale(1.05);
//         /* a two-stage glow: inner softer pale accent, outer stronger active accent */
//         filter:
//           drop-shadow(0 0 4px rgba(255, 193, 7, 0.15))
//           drop-shadow(0 0 8px rgba(255, 193, 7, 0.08));
//       }

//       /* tooltip already styled via CustomTooltip */

//       /* legend icons a little bigger & spaced */
//       .recharts-legend-item .recharts-legend-item-icon {
//         width: 12px;
//         height: 12px;
//         margin-right: 6px;
//       }
//     `}</style>
//     )
// } 