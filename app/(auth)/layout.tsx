import Image from "next/image";
import Link from "next/link";
import { site } from "@/lib/site";
import { photoCredit } from "@/lib/photo-credits";

const HERO = "/photos/santubong-river-cruise.webp";

/**
 * Sign in / register: a Kuching photo with the brand on it, and the form on a sheet that slides
 * over the photo on phones (side by side from lg).
 */
export default function AuthLayout({ children }: LayoutProps<"/">) {
  const credit = photoCredit(HERO);
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-2">
      <div className="relative h-60 overflow-hidden sm:h-72 lg:sticky lg:top-0 lg:h-dvh">
        <Image
          src={HERO}
          alt=""
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/10 to-black/70" />
        <Link
          href="/"
          className="absolute top-5 left-5 flex items-center gap-2 text-base font-semibold text-white"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-brand-gradient font-bold">
            S
          </span>
          {site.shortName}
        </Link>
        <div className="absolute inset-x-5 bottom-14 text-white lg:bottom-16 lg:max-w-md">
          <p className="text-xs font-semibold tracking-widest text-white/75 uppercase">
            Kuching &amp; Sarawak
          </p>
          <p className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
            Your trip, planned in one sentence.
          </p>
        </div>
        {credit && (
          <a
            href={credit.source}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-8 left-5 text-[10px] text-white/75 hover:text-white lg:bottom-6"
          >
            Photo: {credit.author} · {credit.license}
          </a>
        )}
      </div>

      <div className="relative -mt-6 rounded-t-3xl bg-background px-5 pt-8 pb-10 lg:mt-0 lg:flex lg:min-h-dvh lg:flex-col lg:justify-center lg:rounded-none">
        <div className="mx-auto w-full max-w-sm">
          {children}
          <nav
            aria-label="Legal"
            className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground"
          >
            <Link href="/privacy" className="hover:text-foreground">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="/credits" className="hover:text-foreground">
              Photo credits
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
