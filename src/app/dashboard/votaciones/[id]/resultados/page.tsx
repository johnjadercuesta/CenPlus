"use client";

import { useParams } from "next/navigation";
import VotacionAnalytics from "@/components/VotacionAnalytics";

export default function ResultadosVotacionPage() {
  const params = useParams();
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <VotacionAnalytics id={String(params.id)} />
    </div>
  );
}
