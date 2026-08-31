import Image from "next/image";
import { cn } from "@/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  const usable = src && !src.includes("images.unsplash.com");
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-accent text-[11px] font-semibold text-accent-foreground",
        className,
      )}
      aria-hidden
    >
      {usable ? (
        <Image src={src!} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  );
}
