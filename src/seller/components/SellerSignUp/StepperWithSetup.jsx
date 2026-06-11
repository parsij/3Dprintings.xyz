import { useState } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import StoreNameSetup from './StoreNameSetup.jsx';
import PayoutDetails from "./PayoutDetails.jsx";

const FirstProductStep = ({ onNext, onPrev }) => (
    <Motion.section
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="w-full text-left"
        aria-labelledby="product-heading"
    >
        <h3 id="product-heading" className="text-xl font-bold text-white mb-4">Draft Your First Listing</h3>
        <p className="text-zinc-400 mb-6 text-sm">Start with the item buyers will understand fastest. You can edit details and add more listings later.</p>

        {/* FIX: Bound label to input for accessibility */}
        <div>
            <label htmlFor="product-name" className="text-xs text-zinc-400 font-semibold uppercase block mb-2">Product Name</label>
            <input
                id="product-name"
                name="productName"
                type="text"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="Articulated dragon, wall bracket, planter, or STL pack"
            />
        </div>

        <div className="mt-8 flex flex-col-reverse sm:flex-row justify-between gap-3">
            <button type="button" onClick={onPrev} className="w-full sm:w-auto px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-semibold text-zinc-400 hover:text-white transition-colors border border-zinc-800 sm:border-transparent">
                Back
            </button>
            <button type="button" onClick={onNext} className="w-full sm:w-auto px-8 py-3 sm:py-2.5 rounded-xl sm:rounded-full font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0">
                Save Draft
            </button>
        </div>
    </Motion.section>
);

const StepperWithSetup = () => {
    const steps = [
        { id: 1, title: 'Shop Profile' },
        { id: 2, title: 'Payouts' },
        { id: 3, title: 'First Listing' },
    ];

    const [currentStep, setCurrentStep] = useState(1);

    const handleNext = () => {
        if (currentStep < steps.length) setCurrentStep(currentStep + 1);
    };

    const handlePrev = () => {
        if (currentStep > 1) setCurrentStep(currentStep - 1);
    };

    const handleFinalize = () => {
        alert("Seller setup complete. You can now keep building your shop.");
    };

    return (
        <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-3 sm:p-6 font-sans select-none">
            <div className="w-full max-w-4xl bg-zinc-900 rounded-3xl p-5 sm:p-8 md:p-12 shadow-2xl border border-zinc-800/80">

                {/* TOP TRACK ROW */}
                <nav aria-label="Progress" className="flex w-full items-start mb-8 sm:mb-12">
                    <ol className="flex w-full">
                        {steps.map((step, index) => {
                            const stepNumber = index + 1;
                            const isCompleted = stepNumber < currentStep;
                            const isActive = stepNumber === currentStep;
                            const isPending = stepNumber > currentStep;
                            const isLast = index === steps.length - 1;

                            return (
                                <li key={step.id} className={`flex flex-col ${isLast ? 'w-auto' : 'flex-1'}`} aria-current={isActive ? "step" : undefined}>
                                    <div className="flex items-center w-full">

                                        <div className="shrink-0 relative">
                                            <AnimatePresence mode="wait">
                                                {isCompleted && (
                                                    <Motion.div
                                                        initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }}
                                                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-emerald-500 flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.25)]"
                                                    >
                                                        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                                            <Motion.path initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.25, ease: "easeInOut" }} strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </Motion.div>
                                                )}

                                                {isActive && (
                                                    <Motion.div
                                                        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                                        className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full border-2 border-blue-500 flex items-center justify-center bg-zinc-900"
                                                    >
                                                        <Motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]" />
                                                    </Motion.div>
                                                )}

                                                {isPending && (
                                                    <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700/40 text-zinc-500 text-xs font-bold" />
                                                )}
                                            </AnimatePresence>
                                        </div>

                                        {!isLast && (
                                            <div className="flex-1 mx-2 sm:mx-4 md:mx-6 h-0.5 bg-zinc-800 rounded-full relative overflow-hidden" aria-hidden="true">
                                                <Motion.div className="absolute top-0 left-0 h-full bg-emerald-500 origin-left" initial={{ width: "0%" }} animate={{ width: isCompleted ? "100%" : "0%" }} transition={{ duration: 0.4, ease: "easeInOut" }} />
                                                {isActive && <Motion.div className="absolute top-0 left-0 h-full bg-blue-500 origin-left" initial={{ width: "0%" }} animate={{ width: "33.3%" }} transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" }} />}
                                            </div>
                                        )}
                                    </div>

                                    <div className={`mt-3 sm:mt-5 flex flex-col items-start text-left ${isLast ? '' : 'pr-2 sm:pr-4'}`}>
                                        <span className="text-[10px] md:text-xs font-bold uppercase tracking-wider text-zinc-500 mb-0.5 sm:mb-1">
                                            Step {stepNumber}
                                        </span>
                                        <span className={`text-[10px] sm:text-sm md:text-base font-bold leading-tight sm:mb-1 transition-colors duration-300 ${isPending ? 'text-zinc-500' : 'text-zinc-100'}`}>
                                            {step.title}
                                        </span>
                                        <span className={`hidden sm:block text-[11px] md:text-xs font-semibold tracking-wide transition-colors duration-300 ${isCompleted ? 'text-emerald-500' : ''} ${isActive ? 'text-blue-500' : ''} ${isPending ? 'text-zinc-600' : ''}`}>
                                            {isCompleted && 'Completed'}
                                            {isActive && 'In Progress'}
                                            {isPending && 'Pending'}
                                        </span>
                                    </div>
                                </li>
                            );
                        })}
                    </ol>
                </nav>

                {/* BOTTOM MODULAR VIEWPORT WINDOW */}
                <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 sm:p-6 md:p-8 relative overflow-hidden min-h-75 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {currentStep === 1 && <StoreNameSetup key="step1" onNext={handleNext} />}
                        {currentStep === 2 && <PayoutDetails key="step2" onNext={handleNext} onPrev={handlePrev} />}
                        {currentStep === 3 && <FirstProductStep key="step3" onNext={handleNext} onPrev={handleFinalize} />}
                    </AnimatePresence>
                </div>
            </div>
        </main>
    );
};

export default StepperWithSetup;
