import { Link } from "react-router-dom";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function HeadingText({ className = "" }) {
  return (
    <div
      className={cn(
        "relative h-[32rem] w-[38rem] max-w-full scale-[0.82] origin-top-left drop-shadow-[0_4px_2px_rgba(0,0,0,0.25)]",
        "sm:scale-90 md:scale-100",
        className,
      )}
    >
      <h1 className="absolute left-0 top-0 font-display text-[4.8rem] leading-none text-[#232323] dark:text-neutral-100 sm:text-[6rem] md:text-[7.4rem]">
        A marketplace
      </h1>

      <div className="absolute left-1 top-[8.3rem] rotate-[-4deg] bg-[#5A7CE2] px-5 py-3 shadow-[0_18px_50px_rgba(90,124,226,0.28)] sm:top-[10rem] md:top-[11.2rem] dark:bg-[#82a0ff]">
        <p className="rotate-[3deg] font-display text-[5.7rem] font-medium italic leading-none text-[#0f0f0f] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] sm:text-[7.4rem] md:text-[8.9rem]">
          For ideas
        </p>
      </div>

      <p className="absolute left-5 top-[18.3rem] font-display text-[5rem] leading-none text-[#232323] dark:text-neutral-100 sm:top-[22rem] sm:text-[6.2rem] md:top-[25.3rem] md:text-[7.2rem]">
        made real
      </p>
    </div>
  );
}

function HumanNote({ className = "" }) {
  return (
    <div
      className={cn(
        "relative rotate-[2.5deg] rounded-[3.5rem] p-8 opacity-90 shadow-[0_34px_90px_rgba(0,0,0,0.12)]",
        "bg-[radial-gradient(circle_at_90%_80%,rgba(203,255,236,0.95),transparent_26%),radial-gradient(circle_at_18%_85%,rgba(255,188,221,0.95),transparent_32%),radial-gradient(circle_at_75%_15%,rgba(255,233,184,0.95),transparent_30%),linear-gradient(135deg,#f5e2ff,#d7c9ff_45%,#f4b7ff)]",
        "dark:bg-[radial-gradient(circle_at_90%_80%,rgba(34,197,94,0.42),transparent_26%),radial-gradient(circle_at_18%_85%,rgba(244,114,182,0.38),transparent_32%),radial-gradient(circle_at_75%_15%,rgba(250,204,21,0.32),transparent_30%),linear-gradient(135deg,#312e81,#1e1b4b_45%,#581c87)]",
        className,
      )}
    >
      <div className="absolute left-1/2 top-[-1.1rem] h-10 w-36 -translate-x-1/2 -rotate-2 rounded-full border-2 border-white/80 bg-pink-200/50 shadow-pink-300/40 backdrop-blur-md dark:border-white/20 dark:bg-pink-400/30" />

      <p className="text-lg font-medium text-[#0d0d0d] dark:text-white sm:text-xl">
        3Dprintings.xyz
      </p>

      <h2 className="mt-5 text-3xl font-semibold leading-tight text-[#232323] dark:text-white sm:text-4xl">
        Why our Platform?
      </h2>

      <p className="mt-5 max-w-[22rem] text-lg leading-snug text-[#0d0d0d] dark:text-neutral-100 sm:text-2xl">
        Because we have low fees for buyers and sellers. No listing fees, ever.
      </p>
    </div>
  );
}

function CTAButton({ children, to, variant = "green" }) {
  const isGreen = variant === "green";

  return (
    <Link
      to={to}
      className={cn(
        "relative flex h-16 min-w-[14rem] items-center justify-center overflow-hidden rounded-[1.6rem] border border-white px-8 text-xl text-black transition duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/50 active:scale-[0.98]",
        "sm:h-20 sm:min-w-[17rem] sm:text-2xl",
        isGreen
          ? "bg-gradient-to-b from-[#00E58D] to-[#00C278] shadow-[0_32px_80px_rgba(0,229,141,0.32)]"
          : "bg-gradient-to-b from-[#FF5700] to-[#EF5200] shadow-[0_32px_80px_rgba(255,88,0,0.32)]",
      )}
    >
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] shadow-[inset_0_1px_18px_rgba(255,255,255,0.55)]" />
      <span className="relative z-10">{children}</span>
    </Link>
  );
}

export default function LandingPage() {
  return (
    <main
      id="main-content"
      className="min-h-screen overflow-hidden bg-gray-50 text-neutral-950 transition-colors duration-300 dark:bg-neutral-950 dark:text-white"
    >
      <section className="mx-auto flex min-h-screen w-full max-w-[1580px] flex-col px-6 py-24 sm:px-10 lg:relative lg:h-screen lg:min-h-[760px] lg:px-16 lg:py-0">
        <div className="lg:absolute lg:left-20 lg:top-1/2 lg:-translate-y-1/2">
          <HeadingText />
        </div>

        <div className="mt-8 flex justify-center lg:absolute lg:left-[61%] lg:top-[26%] lg:mt-0">
          <HumanNote className="w-full max-w-[25rem] sm:max-w-[34rem] lg:w-[39rem]" />
        </div>

        <div className="mt-16 flex flex-col items-center gap-6 sm:flex-row sm:justify-center lg:absolute lg:bottom-[14%] lg:left-[54%] lg:mt-0">
          <CTAButton to="/products" variant="green">
            Browse products
          </CTAButton>
          <CTAButton to="/become-seller" variant="orange">
            Start selling
          </CTAButton>
        </div>
      </section>
    </main>
  );
}
