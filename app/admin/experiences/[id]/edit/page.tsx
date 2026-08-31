import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ExperienceForm } from "@/components/admin/experience-form";
import { adminGetExperience, adminListVendors } from "@/lib/domain/admin";
import { demoLocations } from "@/lib/demo/fixtures";
import { saveExperience } from "@/app/admin/experiences/actions";

export const metadata: Metadata = { title: "Edit experience" };

export default async function EditExperiencePage({
  params,
}: PageProps<"/admin/experiences/[id]/edit">) {
  const { id } = await params;
  const [experience, vendors] = await Promise.all([
    adminGetExperience(id),
    adminListVendors(),
  ]);
  if (!experience) notFound();

  return (
    <div className="max-w-2xl space-y-5">
      <Link
        href="/admin/experiences"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Experiences
      </Link>
      <h1 className="text-2xl font-bold tracking-tight">{experience.title}</h1>
      <ExperienceForm
        action={saveExperience}
        vendors={vendors}
        locations={demoLocations}
        experience={experience}
      />
    </div>
  );
}
