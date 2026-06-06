interface ClassImageTemplateProps {
  title: string;
  category?: string;
  instructorName?: string;
  className?: string;
  compact?: boolean;
  artworkVariant?: ClassArtworkVariant;
  imageUrl?: string;
  textColor?: string;
  backgroundOnly?: boolean;
}

export type ClassArtworkVariant = "primary" | "alternate";

export interface ClassCategoryTemplate {
  name: string;
  emoji: string;
  gradient: string;
  text: string;
  accent: string;
  imageUrl?: string;
  alternateImageUrl?: string;
  motif: "flow" | "stage" | "power" | "calm" | "water" | "cycle" | "wellness" | "rings";
}

export const CLASS_CATEGORY_TEMPLATES: Record<string, ClassCategoryTemplate> = {
  Yoga: {
    name: "Morning Flow",
    emoji: "🧘",
    gradient: "from-teal-300 via-emerald-200 to-lime-100",
    text: "text-teal-950",
    accent: "bg-teal-500",
    imageUrl: "/art/category-yoga-illustration.png",
    alternateImageUrl: "/art/category-yoga-illustration-alt.png",
    motif: "flow",
  },
  Fitness: {
    name: "High Energy",
    emoji: "⚡",
    gradient: "from-rose-300 via-orange-200 to-amber-100",
    text: "text-rose-950",
    accent: "bg-rose-500",
    imageUrl: "/art/category-fitness-illustration.png",
    alternateImageUrl: "/art/category-fitness-illustration-alt.png",
    motif: "power",
  },
  Pilates: {
    name: "Core Balance",
    emoji: "🌙",
    gradient: "from-violet-300 via-fuchsia-200 to-pink-100",
    text: "text-violet-950",
    accent: "bg-violet-500",
    imageUrl: "/art/category-pilates-illustration.png",
    alternateImageUrl: "/art/category-pilates-illustration-alt.png",
    motif: "rings",
  },
  Dance: {
    name: "Performance Stage",
    emoji: "🎧",
    gradient: "from-amber-500 via-stone-700 to-zinc-950",
    text: "text-white",
    accent: "bg-amber-400",
    imageUrl: "/art/category-dance-template.png",
    alternateImageUrl: "/art/category-dance-template-alt.png",
    motif: "stage",
  },
  "Martial Arts": {
    name: "Discipline Dojo",
    emoji: "🥋",
    gradient: "from-red-300 via-orange-200 to-amber-100",
    text: "text-red-950",
    accent: "bg-red-500",
    imageUrl: "/art/category-martial-arts-illustration.png",
    alternateImageUrl: "/art/category-martial-arts-illustration-alt.png",
    motif: "power",
  },
  Meditation: {
    name: "Calm Space",
    emoji: "✨",
    gradient: "from-indigo-300 via-blue-200 to-cyan-100",
    text: "text-indigo-950",
    accent: "bg-indigo-500",
    imageUrl: "/art/category-meditation-illustration.png",
    alternateImageUrl: "/art/category-meditation-illustration-alt.png",
    motif: "calm",
  },
  Swimming: {
    name: "Aqua Motion",
    emoji: "〰",
    gradient: "from-cyan-300 via-sky-200 to-blue-100",
    text: "text-cyan-950",
    accent: "bg-cyan-500",
    imageUrl: "/art/category-swimming-illustration.png",
    alternateImageUrl: "/art/category-swimming-illustration-alt.png",
    motif: "water",
  },
  Cycling: {
    name: "Ride Rhythm",
    emoji: "🚴",
    gradient: "from-emerald-300 via-lime-200 to-yellow-100",
    text: "text-emerald-950",
    accent: "bg-emerald-500",
    imageUrl: "/art/category-cycling-illustration.png",
    alternateImageUrl: "/art/category-cycling-illustration-alt.png",
    motif: "cycle",
  },
  Nutrition: {
    name: "Fresh Fuel",
    emoji: "🥗",
    gradient: "from-lime-300 via-green-200 to-emerald-100",
    text: "text-lime-950",
    accent: "bg-lime-500",
    imageUrl: "/art/category-nutrition-illustration.png",
    alternateImageUrl: "/art/category-nutrition-illustration-alt.png",
    motif: "wellness",
  },
  Wellness: {
    name: "Soft Reset",
    emoji: "🌿",
    gradient: "from-emerald-300 via-teal-200 to-sky-100",
    text: "text-emerald-950",
    accent: "bg-emerald-500",
    imageUrl: "/art/category-wellness-illustration.png",
    alternateImageUrl: "/art/category-wellness-illustration-alt.png",
    motif: "wellness",
  },
  Beauty: {
    name: "Glow Studio",
    emoji: "✦",
    gradient: "from-pink-200 via-rose-100 to-amber-100",
    text: "text-rose-950",
    accent: "bg-rose-400",
    motif: "calm",
  },
  Therapy: {
    name: "Care Session",
    emoji: "◌",
    gradient: "from-sky-200 via-teal-100 to-emerald-100",
    text: "text-sky-950",
    accent: "bg-sky-500",
    motif: "flow",
  },
  Sports: {
    name: "Game Mode",
    emoji: "●",
    gradient: "from-blue-300 via-indigo-200 to-amber-100",
    text: "text-blue-950",
    accent: "bg-blue-500",
    motif: "power",
  },
  Kids: {
    name: "Bright Play",
    emoji: "★",
    gradient: "from-yellow-200 via-orange-100 to-pink-100",
    text: "text-orange-950",
    accent: "bg-yellow-400",
    motif: "rings",
  },
  Seniors: {
    name: "Gentle Pace",
    emoji: "◒",
    gradient: "from-stone-200 via-teal-100 to-sky-100",
    text: "text-stone-950",
    accent: "bg-teal-500",
    motif: "calm",
  },
  Other: {
    name: "Creative Class",
    emoji: "✦",
    gradient: "from-slate-300 via-teal-200 to-indigo-200",
    text: "text-slate-950",
    accent: "bg-slate-500",
    imageUrl: "/art/category-other-illustration.png",
    alternateImageUrl: "/art/category-other-illustration-alt.png",
    motif: "rings",
  },
};

export function getClassCategoryTemplate(category = "Other") {
  return CLASS_CATEGORY_TEMPLATES[category] ?? CLASS_CATEGORY_TEMPLATES.Other;
}

function TemplateMotif({ motif, accent }: { motif: ClassCategoryTemplate["motif"]; accent: string }) {
  if (motif === "stage") {
    return (
      <>
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/65 to-transparent" />
        <div className="absolute bottom-8 left-8 h-1 w-48 rounded-full bg-amber-200/80" />
        <div className="absolute right-7 top-7 h-16 w-16 rounded-full border border-amber-200/80" />
      </>
    );
  }

  if (motif === "power") {
    return (
      <>
        <div className={`absolute -right-10 top-8 h-32 w-32 rotate-12 rounded-[2rem] ${accent} opacity-25`} />
        <div className="absolute left-7 top-16 h-2 w-44 -rotate-12 rounded-full bg-white/45" />
        <div className="absolute bottom-12 left-12 h-2 w-28 rotate-12 rounded-full bg-white/35" />
      </>
    );
  }

  if (motif === "water") {
    return (
      <>
        <div className="absolute left-8 top-12 h-24 w-56 rounded-full border border-white/60" />
        <div className="absolute -right-10 bottom-4 h-40 w-40 rounded-full bg-white/35" />
        <div className="absolute bottom-16 left-10 h-3 w-52 rounded-full bg-white/45" />
      </>
    );
  }

  if (motif === "cycle" || motif === "rings") {
    return (
      <>
        <div className="absolute -left-10 bottom-8 h-36 w-36 rounded-full border-[18px] border-white/35" />
        <div className="absolute right-10 top-10 h-28 w-28 rounded-full border-[14px] border-white/40" />
        <div className={`absolute right-24 bottom-10 h-10 w-10 rounded-full ${accent} opacity-35`} />
      </>
    );
  }

  if (motif === "calm") {
    return (
      <>
        <div className="absolute left-10 top-12 h-32 w-32 rounded-full bg-white/40 blur-sm" />
        <div className="absolute right-10 bottom-10 h-28 w-28 rounded-full border border-white/70" />
        <div className="absolute bottom-16 left-20 h-1.5 w-44 rounded-full bg-white/50" />
      </>
    );
  }

  return (
    <>
      <div className="motion-float absolute -left-12 top-7 h-36 w-36 rounded-full bg-white/50" />
      <div className="motion-float-slow absolute bottom-6 right-5 h-28 w-28 rounded-full border border-white/70" />
      <div className={`absolute right-16 top-9 h-16 w-16 rotate-12 rounded-[1.25rem] ${accent} opacity-25`} />
      <div className="absolute bottom-10 left-14 h-7 w-24 -rotate-6 rounded-full bg-white/35" />
    </>
  );
}

export function ClassImageTemplate({
  title,
  category = "Other",
  instructorName,
  className = "",
  compact = false,
  artworkVariant = "primary",
  imageUrl,
  textColor,
  backgroundOnly = false,
}: ClassImageTemplateProps) {
  const template = getClassCategoryTemplate(category);
  const selectedImageUrl =
    imageUrl ??
    (artworkVariant === "alternate"
      ? template.alternateImageUrl ?? template.imageUrl
      : template.imageUrl);
  const initials = title
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");

  const backgroundStyle = selectedImageUrl
    ? {
        backgroundImage: backgroundOnly
          ? `linear-gradient(90deg, rgba(15,23,42,.22), rgba(15,23,42,.04) 52%, rgba(15,23,42,.16)), url(${selectedImageUrl})`
          : `linear-gradient(90deg, rgba(0,0,0,.72), rgba(0,0,0,.2) 48%, rgba(0,0,0,.48)), url(${selectedImageUrl})`,
      }
    : undefined;
  const textStyle = textColor ? { color: textColor } : undefined;
  const templateTextClass = textColor ? "" : template.text;

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] bg-gradient-to-br bg-cover bg-center ${template.gradient} ${templateTextClass} ${className}`}
      style={backgroundStyle}
    >
      <div className={`absolute inset-0 ${backgroundOnly ? "opacity-35" : "opacity-75"}`}>
        <TemplateMotif motif={template.motif} accent={template.accent} />
      </div>
      {!backgroundOnly && (
      <div className={`relative flex h-full min-h-44 flex-col justify-between p-5 ${compact ? "min-h-32" : ""}`}>
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-white/72 px-3 py-1 text-xs font-black uppercase text-slate-950 shadow-sm backdrop-blur">
            {template.emoji} {category}
          </span>
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-sm font-black text-slate-950 shadow-sm backdrop-blur">
            {initials || "CV"}
          </span>
        </div>
        <div style={textStyle}>
          <p className="max-w-xs text-2xl font-black leading-tight tracking-normal drop-shadow-sm">
            {title}
          </p>
          <p className="mt-2 text-xs font-black uppercase opacity-85 drop-shadow-sm">
            {instructorName ? `With ${instructorName}` : template.name}
          </p>
        </div>
      </div>
      )}
    </div>
  );
}
