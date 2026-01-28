// app/score-card/page.tsx
import { Suspense } from "react";
import ScoreCard from "./ScoreCard";

export default function ScoreCardPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-slate-600">
          Loading score card…
        </div>
      }
    >
      <ScoreCard />
    </Suspense>
  );
}



// // app/score-card/page.tsx
// import { Suspense } from 'react';
// import ScoreCard from './ScoreCard';

// export default function ScoreCardPage() {
//   return (
//     <Suspense fallback={<div>Loading score card…</div>}>
//       <ScoreCard />
//     </Suspense>
//   );
// }
