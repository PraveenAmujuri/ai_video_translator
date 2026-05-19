import GLSLHills from "./ui/GLSLHills";
import GooeyNav from "./ui/GooeyNav";
import {AnimatedThemeToggler} from "./ui/animated-theme-toggler";
const items = [
  { label: "Home", href: "#" },
  { label: "About", href: "#" },
  { label: "Contact", href: "#" },
];


export default function HeroSection() {

  return (

    <section className="relative h-screen bg-black">

      {/* WAVES */}
      <div className="absolute inset-0 z-0">

        <GLSLHills />

      </div>
{/* Move this out of your inner content section, put it at the very top of <HeroSection /> */}
{/* GLOBAL STICKY NAVBAR */}
{/* GLOBAL STICKY NAVBAR */}
{/* Fixed by switching the background color to bg-transparent while keeping the backdrop-blur intact */}
<header className="fixed top-0 inset-x-0 w-full z-[9999] bg-transparent backdrop-blur-md border-b border-white/[0.03]">
  <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
    
    {/* Left Side: Brand Identity */}
    <div className="flex items-center gap-2">
      <span className="text-white font-bold tracking-tight text-sm uppercase font-sans">
        V_Matrix
      </span>
      <span className="text-[9px] bg-white/10 text-white/50 px-1.5 py-0.5 rounded-sm font-mono tracking-widest scale-90">
        v2.0
      </span>
    </div>

    {/* Right Side: GooeyNav + Theme Toggler Alignment */}
    <div className="flex items-center gap-4">
      <GooeyNav
        items={[
          { label: "Home", href: "#" },
          { label: "Features", href: "#features" },
          { label: "Docs", href: "#docs" },
          { label: "Github", href: "#github" },
        ]}
        initialActiveIndex={0}
      />
      
      {/* Clean Industrial Separator */}
      <div className="h-4 w-[1px] bg-white/10 mx-2" />
      
      <AnimatedThemeToggler 
        variant="circle" 
        duration={500}
      />
    </div>

  </div>
</header>
      {/* VERY LIGHT OVERLAY */}
      <div className="absolute inset-0 bg-black/40 z-10 pointer-events-none" />




      {/* CONTENT */}
      <div className="relative z-20 flex h-full items-center justify-center px-6">

        <div className="max-w-6xl text-center">


{/* TOP LIGHT TEXT */}
<p
  className="
  text-[24px]
  md:text-[36px]
  italic
  font-light
  tracking-[-0.03em]
  text-white/90
"
>

  Break The

</p>

{/* MAIN HEADING */}
<h1
  className="
  mt-1
  text-[62px]
  leading-[1]
  md:text-[96px]
  font-bold
  tracking-[-0.045em]
  text-white/95
"
>

  Audio Barrier.

</h1>

          {/* DESCRIPTION */}
          <p
            className="
            mx-auto
            mt-8
            max-w-3xl
            text-[18px]
            leading-relaxed
            text-white/55
          "
          >

            Real-time AI dubbing with synchronized multilingual playback,
            cinematic subtitle localization,
            and natural voice generation.

          </p>

        </div>

      </div>

    </section>

  );

}