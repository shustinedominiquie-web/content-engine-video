"use client";

import { LandingPageInput } from "@/components/LandingPageInput";
import { PageLayout } from "@/components/PageLayout";
import type { ModelId } from "@/types/generation";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";

const Home: NextPage = () => {
  const goToDashboard = () => router.push("/dashboard");
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);

  const handleNavigate = (
    prompt: string,
    model: ModelId,
    attachedImages?: string[],
  ) => {
    setIsNavigating(true);
    // Store images in sessionStorage (too large for URL params)
    if (attachedImages && attachedImages.length > 0) {
      sessionStorage.setItem(
        "initialAttachedImages",
        JSON.stringify(attachedImages),
      );
    } else {
      sessionStorage.removeItem("initialAttachedImages");
    }
    const params = new URLSearchParams({ prompt, model });
    router.push(`/generate?${params.toString()}`);
  };

  return (
    <PageLayout>
      <div style={{ position: "fixed", top: 16, right: 16, zIndex: 50 }}>
        <button onClick={goToDashboard} style={{ padding: "10px 20px", background: "#818cf8", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
          Content Engine Dashboard
        </button>
      </div>
      <LandingPageInput
        onNavigate={handleNavigate}
        isNavigating={isNavigating}
        showCodeExamplesLink
      />
    </PageLayout>
  );
};

export default Home;
