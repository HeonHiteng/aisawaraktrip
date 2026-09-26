import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Delete your account",
  description: "How to delete your Sarawak Trip Planner account and data.",
};

/** The public "how do I delete my account and data" page Google Play asks for. */
export default function DeleteAccountPage() {
  return (
    <LegalPage title="Delete your account and data" updated="September 2026">
      <p>
        You can delete your <strong>Sarawak Trip Planner</strong> account and the data
        attached to it at any time, without contacting us.
      </p>

      <h2>In the app</h2>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Sign in and open the <strong>Profile</strong> tab.</li>
        <li>Scroll to <strong>Account</strong> and choose <strong>Delete my account</strong>.</li>
        <li>Type <strong>DELETE</strong> to confirm.</li>
      </ol>
      <p>
        Using the app as a guest? The same button there reads <strong>Delete guest data</strong>.
      </p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account and sign-in details, and your profile (name, phone, country).</li>
        <li>Your saved trips and itineraries.</li>
        <li>Your bookings, the payment records attached to them, and your reviews.</li>
      </ul>
      <p>
        Deletion is immediate and permanent. Backups are overwritten on our normal backup
        cycle. Card details are handled by our payment provider and are never stored by us.
      </p>

      <h2>When we can&apos;t delete straight away</h2>
      <p>
        We stop the deletion, and tell you why, while you have an upcoming confirmed booking
        (a local operator is expecting you — cancel it first) or a refund that is still being
        processed. Once those are settled you can delete your account.
      </p>

      <h2>Can&apos;t sign in?</h2>
      <p>
        Email us from the address on your account at{" "}
        <a href="mailto:privacy@example.com">privacy@example.com</a> and ask for your account to
        be deleted; we will confirm and complete it. Replace with your registered business
        contact before launch.
      </p>
    </LegalPage>
  );
}
