import { useEffect, useRef } from 'react';
import { Link } from "react-router-dom";
import { motion as Motion, stagger, useAnimate } from "framer-motion";
import Seo from "../../../components/Seo.jsx";

const NewSellerLandingPage = () => {
  const [scope, animate] = useAnimate();
  const descriptionRef = useRef(null);
  const userDraggedRef = useRef(false);
  const userScrolledRef = useRef(false);

  useEffect(() => {
    window.scrollTo(0, 0);
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    const handleUserScroll = () => {
      userScrolledRef.current = true;
    };

    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });

    const smoothScrollTo = (targetY, duration = 2200) => {
      const startY = window.scrollY;
      const distance = targetY - startY;
      const startTime = performance.now();

      const easeInOutCubic = (t) => (t < 0.5
          ? 4 * t * t * t
          : 1 - Math.pow(-2 * t + 2, 3) / 2);

      const step = (now) => {
        const progress = Math.min((now - startTime) / duration, 1);
        window.scrollTo(0, startY + distance * easeInOutCubic(progress));

        if (progress < 1) {
          requestAnimationFrame(step);
        }
      };

      requestAnimationFrame(step);
    };

    const playSequence = async () => {
      if (reduceMotion) {
        await animate("#welcome", { y: 0, opacity: 1 }, { duration: 0.01 });
        await animate("#typewriter span.part-1, #typewriter span.part-2, #typewriter span.part-3", { display: "inline" }, { duration: 0.01 });
        await animate("#blinker", { opacity: 0 }, { duration: 0.01 });
        return;
      }

      // Act 1: Hand appears and waves
      await animate("#hand", { scale: [0, 1.2, 1], opacity: 1 }, { duration: 0.4, ease: "easeOut" });
      await animate("#hand", { rotate: [0, 25, -15, 25, -15, 0] }, { duration: 1.0, ease: "easeInOut" });

      // Act 2: Welcome shoots up from the bottom to strike
      animate("#welcome", { y: -40, opacity: 1 }, { duration: 0.25, ease: "easeIn" });

      await new Promise(resolve => setTimeout(resolve, 220));

      // Act 3: Hand flies away, Welcome bounces into its resting place (y: 0)
      animate("#hand", { y: -800, rotate: 160, scale: 0.6, opacity: 0 }, { duration: 0.35, ease: "easeOut" });
      await animate("#welcome", { y: 0 }, { duration: 0.2, type: "spring", stiffness: 500, damping: 15 });

      // ACT 4: The Typewriter Sequence
      await animate("#blinker", { opacity: 1 }, { duration: 0.01 });
      await animate("#typewriter span.part-1", { display: "inline" }, { delay: stagger(0.08), duration: 0.01 });

      await animate("#blinker", { opacity: 0 }, { duration: 0.01 });
      await new Promise(resolve => setTimeout(resolve, 300));
      await animate("#blinker", { opacity: 1 }, { duration: 0.01 });
      await new Promise(resolve => setTimeout(resolve, 300));

      await animate("#typewriter span.part-2", { display: "inline" }, { delay: stagger(0.08), duration: 0.01 });
      await animate("#typewriter span.part-3", { display: "inline" }, { delay: stagger(0.08), duration: 0.01 });
      await animate("#blinker", { opacity: 0 }, { duration: 0.01 });

      await new Promise(resolve => setTimeout(resolve, 800));

      if (descriptionRef.current && !userDraggedRef.current && !userScrolledRef.current) {
        const targetY = descriptionRef.current.getBoundingClientRect().top + window.scrollY - 200;
        smoothScrollTo(targetY);
      }
    };

    playSequence();

    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, [animate]);

  return (
      <main className="bg-zinc-900 min-h-[200vh] overflow-visible">
        <Seo
            title="Become A Seller"
            description="Set up a 3Dprintings.xyz seller account to list physical 3D printed products and downloadable model files."
            path="/become-seller"
            noIndex
        />

        {/* THE HERO SECTION */}
        <section ref={scope} aria-label="Welcome Hero" className="min-h-screen flex items-center justify-center relative z-50 overflow-visible">
          <div className="flex flex-col items-center justify-center -mt-24 md:-mt-4 relative">

            <Motion.div
                id="hand"
                initial={{ scale: 0, opacity: 0 }}
                className="absolute -top-24 md:-top-20 z-10 text-8xl md:text-9xl origin-bottom-right drop-shadow-2xl"
                aria-hidden="true"
            >
              👋
            </Motion.div>

            <Motion.h1
                id="welcome"
                initial={{ y: "100vh", opacity: 0 }}
                drag
                onDragStart={() => { userDraggedRef.current = true; }}
                dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
                dragElastic={0.6}
                dragTransition={{ bounceStiffness: 500, bounceDamping: 15 }}
                style={{ WebkitTextFillColor: "transparent", WebkitBackgroundClip: "text", letterSpacing: "-0.02em" }}
                className="z-50 text-7xl md:text-9xl font-extrabold text-transparent bg-clip-text bg-linear-to-b from-white to-gray-400 cursor-grab active:cursor-grabbing select-none will-change-transform isolate"
            >
              Welcome
            </Motion.h1>

            <h2
                id="typewriter"
                className="z-20 mt-4 md:mt-6 text-2xl md:text-4xl font-bold drop-shadow-lg tracking-tight relative"
            >
              {/* GHOST LAYER */}
              <span className="whitespace-pre opacity-0 pointer-events-none select-none unselectable pr-2" aria-hidden="true">
              to every maker's storefront |
            </span>

              {/* TYPING LAYER */}
              <div className="absolute top-0 left-0 w-full h-full flex whitespace-pre items-center justify-center" aria-hidden="true">
                {Array.from("to every ").map((letter, i) => (
                    <span key={`p1-${i}`} className="part-1 text-white" style={{ display: 'none' }}>{letter}</span>
                ))}
                {Array.from("maker's").map((letter, i) => (
                    <span key={`p2-${i}`} className="part-2 text-orange-500" style={{ display: 'none' }}>{letter}</span>
                ))}
                {Array.from(" storefront").map((letter, i) => (
                    <span key={`p3-${i}`} className="part-3 text-white" style={{ display: 'none' }}>{letter}</span>
                ))}
                <Motion.span id="blinker" initial={{ opacity: 0 }} className="text-orange-500 font-light ml-0.5">|</Motion.span>
              </div>
              {/* SCREEN READER ONLY TEXT */}
              <span className="sr-only">to every maker's storefront</span>
            </h2>
          </div>
        </section>

        {/* THE SCROLL SECTION */}
        <section ref={descriptionRef} aria-label="Platform Description" className="w-full flex flex-col items-center justify-center">
          <Motion.div
              initial={{ y: 50, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-2xl mx-auto px-6 text-center text-sm md:text-base text-gray-400 leading-relaxed tracking-wide relative z-10"
          >
            <p>Welcome, maker. Your shop starts here.</p>
            <br />
            <p>List finished 3D printed products, downloadable model files, or both. Your storefront should make buyers understand what they are getting, how it is made, and why your work is worth ordering.</p>
            <br />
            <p>Set up the shop name, connect payouts, publish the first listing, and keep building from the seller dashboard.</p>
            <br />

            {/* FIX: Removed button wrapping the link for valid HTML */}
            <Link
                to={"/become-seller/info"}
                className="inline-block mt-8 px-8 py-3.5 bg-linear-to-b from-orange-400 to-orange-600 text-white font-bold text-lg rounded-full shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:shadow-[0_0_30px_rgba(249,115,22,0.6)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 active:scale-95 active:translate-y-0 border border-orange-400/50"
            >
              Set Up Seller Account
            </Link>
          </Motion.div>
        </section>

      </main>
  );
}

export default NewSellerLandingPage;
