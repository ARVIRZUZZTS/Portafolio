You are given a task to integrate an existing React component in the codebase

The codebase should support:
- shadcn project structure  
- Tailwind CSS
- Typescript

If it doesn't, provide instructions on how to setup project via shadcn CLI, install Tailwind or Typescript.

Determine the default path for components and styles. 
If default path for components is not /components/ui, provide instructions on why it's important to create this folder
Copy-paste this component to /components/ui folder:
```tsx
social-links.tsx
"use client";

import * as React from "react";
import { Share2, X } from "lucide-react";
import {
  FaFacebook,
  FaInstagram,
  FaLinkedin,
  FaGithub,
  FaDribbble,
  FaXTwitter,
  FaGlobe,
  FaEnvelope,
} from "react-icons/fa6";

type Platform =
  | "linkedin"
  | "instagram"
  | "github"
  | "mail"
  | "facebook"
  | "x"
  | "dribbble"
  | "website";

export interface SocialLink {
  platform: Platform;
  href: string;
}

export interface SocialLinksProps {
  links: SocialLink[];
  showOnMobile?: boolean;
  /**
   * Custom Tailwind color class or raw CSS color
   * Example: "bg-slate-700" | "#00ff00" | "rgb(0,255,0)"
   */
  floatingButtonColor?: string;
}

interface PlatformStyle {
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  gradient: string;
  hoverGradient: string;
}

const PLATFORM_STYLES: Record<Platform, PlatformStyle> = {
  linkedin: {
    label: "LinkedIn",
    icon: FaLinkedin,
    gradient: "from-blue-600 to-blue-400",
    hoverGradient: "from-blue-500 to-blue-300",
  },
  instagram: {
    label: "Instagram",
    icon: FaInstagram,
    gradient: "from-pink-600 via-purple-600 to-orange-500",
    hoverGradient: "from-pink-500 via-purple-500 to-orange-400",
  },
  github: {
  label: "GitHub",
  icon: FaGithub,
  gradient:
    "from-zinc-800 to-zinc-600 dark:from-[hsl(var(--muted-foreground))] dark:to-[hsl(var(--foreground))]",
  hoverGradient:
    "from-zinc-700 to-zinc-500 dark:from-[hsl(var(--muted-foreground))] dark:to-[hsl(var(--foreground)/0.8)]",
},

  mail: {
    label: "Mail",
    icon: FaEnvelope,
    gradient: "from-cyan-600 to-blue-500",
    hoverGradient: "from-cyan-500 to-blue-400",
  },
  facebook: {
    label: "Facebook",
    icon: FaFacebook,
    gradient: "from-blue-700 to-blue-500",
    hoverGradient: "from-blue-600 to-blue-400",
  },
  x: {
    label: "X",
    icon: FaXTwitter,
    gradient: "from-[hsl(var(--foreground))] to-[hsl(var(--muted-foreground))]",
    hoverGradient:
      "from-[hsl(var(--muted-foreground))] to-[hsl(var(--muted)/0.7)]",
  },
  dribbble: {
    label: "Dribbble",
    icon: FaDribbble,
    gradient: "from-pink-600 to-pink-400",
    hoverGradient: "from-pink-500 to-pink-300",
  },
  website: {
    label: "Website",
    icon: FaGlobe,
    gradient: "from-emerald-600 to-teal-500",
    hoverGradient: "from-emerald-500 to-teal-400",
  },
};

export const SocialLinks: React.FC<SocialLinksProps> = ({
  links,
  showOnMobile = true,
  floatingButtonColor = "bg-muted",
}) => {
  const [hoveredPlatform, setHoveredPlatform] = React.useState<Platform | null>(
    null
  );
  const [mobileDockOpen, setMobileDockOpen] = React.useState(false);

  return (
    <>
      {/* ===== Desktop View ===== */}
      <div
        className={`${
          showOnMobile ? "hidden lg:flex" : "hidden md:flex"
        } flex-col fixed top-[35%] left-0 z-40`}
      >
        <ul className="space-y-3">
          {links.map(({ platform, href }) => {
            const style = PLATFORM_STYLES[platform];
            if (!style) return null;
            const Icon = style.icon;

            return (
              <li
                key={platform}
                onMouseEnter={() => setHoveredPlatform(platform)}
                onMouseLeave={() => setHoveredPlatform(null)}
                className="group"
              >
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between w-44 h-14 px-4 ml-[-120px]
                             group-hover:ml-[-10px] transition-all duration-500 ease-out
                             rounded-r-xl relative overflow-hidden border border-border
                             bg-[hsl(var(--card))] shadow-md hover:shadow-lg"
                >
                  {/* Gradient Overlay */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-r ${
                      hoveredPlatform === platform
                        ? style.hoverGradient
                        : style.gradient
                    } opacity-90 transition-all duration-500`}
                  />

                  {/* Label */}
                  <span className="relative z-10 text-white font-semibold tracking-wide text-sm group-hover:tracking-widest transition-all duration-300">
                    {style.label}
                  </span>

                  {/* Icon */}
                  <Icon
                    size={22}
                    className="relative z-10 text-white drop-shadow-sm group-hover:scale-125 transition-transform duration-500"
                  />
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ===== Mobile Floating Dock ===== */}
      {showOnMobile && (
        <div className="lg:hidden fixed bottom-6 right-6 z-50">
          {mobileDockOpen && (
            <div
              className="fixed inset-0 bg-[hsl(var(--background)/0.6)] backdrop-blur-sm"
              onClick={() => setMobileDockOpen(false)}
            />
          )}

          <div className="relative">
            {/* Floating Icons */}
            <div
              className={`absolute bottom-20 right-0 flex flex-col-reverse gap-3 transition-all duration-500 ${
                mobileDockOpen
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-8 pointer-events-none"
              }`}
            >
              {links.map(({ platform, href }, index) => {
                const style = PLATFORM_STYLES[platform];
                if (!style) return null;
                const Icon = style.icon;
                return (
                  <a
                    key={platform}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative ml-auto"
                    style={{
                      transitionDelay: mobileDockOpen ? `${index * 50}ms` : "0ms",
                    }}
                  >
                    <div
                      className={`w-14 h-14 rounded-full bg-gradient-to-br ${style.gradient}
                                 flex items-center justify-center shadow-lg hover:scale-110
                                 transition-transform duration-300 border border-border`}
                    >
                      <Icon size={22} className="text-white" />
                    </div>

                    {/* Tooltip */}
                    <div className="absolute top-1/2 -translate-y-1/2 right-16
                                    bg-[hsl(var(--popover))] text-[hsl(var(--popover-foreground))]
                                    text-xs font-medium px-3 py-1.5 rounded-md shadow-md
                                    opacity-0 group-hover:opacity-100 transition-opacity">
                      {style.label}
                      <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-2 h-2 bg-[hsl(var(--popover))] rotate-45" />
                    </div>
                  </a>
                );
              })}
            </div>

            {/* Floating Button */}
            <button
              onClick={() => setMobileDockOpen(!mobileDockOpen)}
              className={`relative flex items-center justify-center w-16 h-16 rounded-full shadow-2xl active:scale-95
                         transition-all duration-300 border border-border overflow-hidden ${floatingButtonColor}`}
              aria-label="Toggle social links"
            >
              <div className="relative z-10">
                {mobileDockOpen ? (
                  <X size={24} className="text-white" />
                ) : (
                  <Share2 size={24} className="text-white" />
                )}
              </div>
              <div className="absolute inset-0 bg-[hsl(var(--muted))] opacity-10" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SocialLinks;


demo.tsx
import * as React from "react";
import { SocialLinks } from "@/components/ui/social-links";

export default function SocialLinksDemo() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
      <SocialLinks
        links={[
          { platform: "linkedin", href: "https://linkedin.com" },
          { platform: "github", href: "https://github.com" },
          { platform: "instagram", href: "https://instagram.com" },
          { platform: "mail", href: "mailto:test@example.com" },
          { platform: "website", href: "https://example.com" },
        ]}
        floatingButtonColor="bg-slate-700"
      />
    </div>
  );
}

```

Install NPM dependencies:
```bash
react-icons, lucide-react
```

Implementation Guidelines
 1. Analyze the component structure and identify all required dependencies
 2. Review the component's argumens and state
 3. Identify any required context providers or hooks and install them
 4. Questions to Ask
 - What data/props will be passed to this component?
 - Are there any specific state management requirements?
 - Are there any required assets (images, icons, etc.)?
 - What is the expected responsive behavior?
 - What is the best place to use this component in the app?

Steps to integrate
 0. Copy paste all the code above in the correct directories
 1. Install external dependencies
 2. Fill image assets with Unsplash stock images you know exist
 3. Use lucide-react icons for svgs or logos if component requires them
