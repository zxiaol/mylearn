import { Suspense } from "react";
import OnboardingClient from "./OnboardingClient";

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-slate-600">
          正在加载建档信息…
        </div>
      }
    >
      <OnboardingClient />
    </Suspense>
  );
}

