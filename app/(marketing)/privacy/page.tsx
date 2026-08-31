import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Sarawak Trip Planner handles your personal data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="August 2026">
      <p>
        This notice explains how <strong>Sarawak Trip Planner</strong>{" "}
        (&ldquo;we&rdquo;) collects and uses personal data, in line with
        Malaysia&apos;s Personal
        Data Protection Act 2010 (PDPA). This product is an early MVP; this
        policy will be expanded before any public launch.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Account data</strong> — your email address and password (stored
          hashed by our authentication provider), and any name, phone or country
          you add to your profile.
        </li>
        <li>
          <strong>Trip data</strong> — the travel dates, budget, group and
          interests you enter, and the itineraries generated for you.
        </li>
        <li>
          <strong>Booking data</strong> — the experience, date, traveller count
          and contact details you provide when booking, plus booking status.
        </li>
        <li>
          <strong>Payment data</strong> — handled by our payment gateway. We
          store only a payment reference and status; we never see or store full
          card numbers.
        </li>
        <li>
          <strong>Technical data</strong> — basic request logs and, where
          enabled, aggregate usage analytics.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To create your account and let you sign in.</li>
        <li>To generate itineraries and process the bookings you make.</li>
        <li>To send booking confirmations and service messages.</li>
        <li>To operate, secure and improve the service.</li>
      </ul>

      <h2>Sharing</h2>
      <p>
        We share the minimum necessary data with: the local vendor for an
        experience you book (your name, contact and party size); our
        infrastructure, authentication, AI, email and payment providers, acting
        on our instructions. We do not sell personal data.
      </p>

      <h2>The AI planner</h2>
      <p>
        Your trip inputs are sent to an AI provider to help build your
        itinerary. The AI is constrained to select only from our verified
        catalogue of Sarawak attractions and operators — it cannot invent
        places, prices or vendors.
      </p>

      <h2>Retention</h2>
      <p>
        We keep account, trip and booking data while your account is active and
        for a reasonable period afterwards to meet legal and accounting
        obligations, then delete or anonymise it.
      </p>

      <h2>Your rights</h2>
      <p>
        You may access, correct or delete your data, and withdraw consent, by
        contacting us. You can edit your profile at any time, and delete a trip
        from within the app.
      </p>

      <h2>Contact</h2>
      <p>
        Data protection queries:{" "}
        <a href="mailto:privacy@example.com">privacy@example.com</a>. Replace
        with your registered business contact before launch.
      </p>
    </LegalPage>
  );
}
