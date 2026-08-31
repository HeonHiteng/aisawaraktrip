import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExperienceForm } from "@/components/admin/experience-form";
import { adminListVendors } from "@/lib/domain/admin";
import { demoLocations } from "@/lib/demo/fixtures";
import { saveExperience } from "@/app/admin/experiences/actions";

export const metadata: Metadata = { title: "New experience" };

export default async function NewExperiencePage() {
  const vendors = await adminListVendors();

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/experiences"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Experiences
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">New experience</h1>
      <ExperienceForm
        action={saveExperience}
        vendors={vendors}
        locations={demoLocations}
      />
    </div>
  );
}
