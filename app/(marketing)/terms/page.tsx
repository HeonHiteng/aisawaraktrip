import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Terms for using Sarawak Trip Planner.",
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="August 2026">
      <p>
        By using <strong>Sarawak Trip Planner</strong> you agree to these terms.
        This is an early MVP provided for evaluation; terms will be finalised
        before any commercial launch.
      </p>

      <h2>The service</h2>
      <p>
        We help you plan a Kuching / Sarawak trip and book experiences directly
        with local operators. Itineraries are AI-assisted suggestions built from
        our verified catalogue — they are not travel advice, and availability,
        prices and conditions are set by each operator.
      </p>

      <h2>Demo data</h2>
      <p>
        During the MVP, attractions, vendors and experiences shown are{" "}
        <strong>sample data</strong> and are labelled as such. Bookings made
        against sample data are for demonstration only.
      </p>

      <h2>Bookings and payment</h2>
      <ul>
        <li>
          A booking is a request to the operator; it is confirmed once payment
          is received and the operator accepts.
        </li>
        <li>
          Prices are shown in Malaysian Ringgit (MYR) and include a service fee.
        </li>
        <li>
          Cancellations and refunds follow the policy shown on each experience.
        </li>
        <li>
          Payments are processed by a third-party gateway. We are not
          responsible for gateway outages or their terms.
        </li>
      </ul>

      <h2>Your responsibilities</h2>
      <ul>
        <li>Provide accurate account and traveller details.</li>
        <li>Keep your login credentials secure.</li>
        <li>
          Use the service lawfully and don&apos;t attempt to disrupt or misuse
          it.
        </li>
      </ul>

      <h2>Liability</h2>
      <p>
        The service is provided &ldquo;as is&rdquo;. To the extent permitted by
        law, we are
        not liable for the acts or omissions of independent operators, or for
        indirect or consequential loss.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:hello@example.com">hello@example.com</a>.
        Replace with your registered business contact before launch.
      </p>
    </LegalPage>
  );
}
