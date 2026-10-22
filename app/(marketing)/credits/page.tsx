import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { allPhotoCredits } from "@/lib/photo-credits";

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Who took the photos in Sarawak Trip Planner, and their licences.",
};

export default function CreditsPage() {
  const credits = allPhotoCredits();
  return (
    <LegalPage title="Photo credits" updated="October 2026">
      <p>
        The photos of places and dishes come from{" "}
        <a href="https://commons.wikimedia.org" target="_blank" rel="noopener noreferrer">
          Wikimedia Commons
        </a>{" "}
        and are used under the licence shown. They were resized and cropped. Thank you to every
        photographer below.
      </p>
      <ul>
        {credits.map(([url, c]) => (
          <li key={url}>
            <strong>{c.alt}</strong> — photo by{" "}
            <a href={c.source} target="_blank" rel="noopener noreferrer">
              {c.author}
            </a>
            ,{" "}
            {c.licenseUrl ? (
              <a href={c.licenseUrl} target="_blank" rel="noopener noreferrer">
                {c.license}
              </a>
            ) : (
              c.license
            )}
          </li>
        ))}
      </ul>
    </LegalPage>
  );
}
