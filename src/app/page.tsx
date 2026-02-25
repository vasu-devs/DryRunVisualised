"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useScroll, useTransform, useAnimation } from "framer-motion";
import { ArrowRight, Code2, Play, Layers, Zap, Bot } from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Interactive Feature Cards (Neumorphic)
// ─────────────────────────────────────────────────────────────────
const FeatureCard = ({ title, desc, icon: Icon, delay, children }: any) => {
    const controls = useAnimation();

    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
            onHoverStart={() => controls.start("hover")}
            onHoverEnd={() => controls.start("initial")}
            className="group relative neu-raised p-10 overflow-hidden"
        >
            <div className="relative z-10 flex flex-col h-full">
                <div className="w-16 h-16 neu-pressed text-[var(--accent-cyan)] rounded-[1.5rem] flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110">
                    <Icon size={32} />
                </div>
                <h3 className="text-3xl font-bold text-[var(--text-main)] mb-4 tracking-tight">{title}</h3>
                <p className="text-slate-500 font-medium text-lg leading-relaxed flex-1">{desc}</p>

                {/* Mini Animation Area */}
                <div className="mt-10 h-40 neu-pressed rounded-3xl overflow-hidden relative flex items-center justify-center p-6">
                    {children(controls)}
                </div>
            </div>
        </motion.div>
    );
};

// Mini Animations mapped to Neumorphic Colors
const QuicksortMini = ({ controls }: any) => (
    <div className="flex gap-3 items-end h-full w-full justify-center pb-2">
        {[40, 70, 30, 90, 50].map((h, i) => (
            <motion.div
                key={i}
                className="w-6 neu-raised rounded-full"
                initial={{ height: h }}
                variants={{
                    hover: {
                        height: [h, Math.random() * 80 + 20, Math.random() * 80 + 20, h],
                        transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
                    }
                }}
                animate={controls}
            />
        ))}
    </div>
);

const TreeMini = ({ controls }: any) => (
    <div className="flex flex-col items-center gap-6 mt-2">
        <div className="w-8 h-8 rounded-full neu-raised flex items-center justify-center z-10">
            <div className="w-3 h-3 rounded-full bg-[var(--text-main)] opacity-20" />
        </div>
        <div className="flex gap-12">
            <div className="relative">
                <div className="absolute -top-7 left-1/2 w-1 h-8 neu-pressed origin-bottom transform -rotate-45" />
                <motion.div
                    className="w-8 h-8 rounded-full neu-raised z-10 relative flex items-center justify-center"
                    variants={{ hover: { y: [0, -8, 0], scale: [1, 1.1, 1] } }}
                    animate={controls}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                >
                    <div className="w-3 h-3 rounded-full bg-[var(--accent-cyan)]" />
                </motion.div>
            </div>
            <div className="relative">
                <div className="absolute -top-7 right-1/2 w-1 h-8 neu-pressed origin-bottom transform rotate-45" />
                <motion.div
                    className="w-8 h-8 rounded-full neu-raised z-10 relative flex items-center justify-center"
                    variants={{ hover: { y: [0, -8, 0], scale: [1, 1.1, 1] } }}
                    animate={controls}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                >
                    <div className="w-3 h-3 rounded-full bg-blue-400" />
                </motion.div>
            </div>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────
// Hero 3D Graphic (CSS/Framer representation of a Neumorphic data structure)
// ─────────────────────────────────────────────────────────────────
const NeumorphicHeroArt = () => {
    return (
        <div className="relative w-full h-full flex items-center justify-center perspective-[1000px]">
            <motion.div
                className="relative w-72 h-72 neu-raised rounded-[3rem] flex items-center justify-center transform-style-preserve-3d"
                animate={{
                    rotateY: [0, 10, -10, 0],
                    rotateX: [0, 5, -5, 0]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
                {/* Inner Pressed Canvas */}
                <div className="w-48 h-48 neu-pressed rounded-full flex items-center justify-center relative">
                    <motion.div
                        className="w-24 h-24 neu-raised rounded-[2rem] absolute"
                        animate={{ rotateZ: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    />
                    <div className="w-12 h-12 rounded-full neu-pressed bg-[var(--accent-cyan)]/10 z-10 shadow-[inset_0_0_10px_var(--accent-cyan)] flex items-center justify-center">
                        <Code2 size={20} className="text-[var(--accent-cyan)]" />
                    </div>
                </div>
            </motion.div>

            {/* Floating side blocks */}
            <motion.div
                className="absolute top-1/4 right-10 w-20 h-20 neu-raised rounded-2xl"
                animate={{ y: [-15, 15], rotateZ: [-5, 5] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", repeatType: "reverse" }}
            />
            <motion.div
                className="absolute bottom-1/4 left-10 w-16 h-16 neu-raised rounded-full"
                animate={{ y: [15, -15], scale: [0.9, 1.1] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", repeatType: "reverse", delay: 1 }}
            />
        </div>
    )
}


// ─────────────────────────────────────────────────────────────────
// Main Landing Page Component
// ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
    return (
        <div className="min-h-screen relative font-sans selection:bg-[var(--accent-cyan)]/30 overflow-hidden">

            {/* Navigation */}
            <nav className="fixed top-0 w-full z-50 py-6 px-10 flex justify-between items-center bg-[var(--bg-neu)]/80 backdrop-blur-xl border-b border-white/20">
                <div className="flex items-center gap-4 cursor-pointer">
                    <Image src="/logo.png" alt="DryRunner Logo" width={48} height={48} className="rounded-2xl shadow-lg border-2 border-white/40" />
                    <span className="text-2xl font-bold tracking-tight text-[var(--text-main)]">Dry Runner</span>
                </div>
                <div className="flex gap-8 items-center">
                    <a href="#features" className="text-base font-semibold text-slate-500 hover:text-[var(--text-main)] transition-colors">Platform</a>
                    <a href="#how" className="text-base font-semibold text-slate-500 hover:text-[var(--text-main)] transition-colors">Execution</a>
                    <Link href="/visualizer" className="group flex items-center gap-2 neu-raised px-8 py-3 rounded-full text-base font-bold text-[var(--accent-cyan)] hover:scale-105 active:scale-95 transition-all">
                        Launch App
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-48 pb-32 px-10 min-h-screen flex items-center z-10 max-w-7xl mx-auto">
                <div className="w-full grid lg:grid-cols-2 gap-20 items-center">

                    {/* Text Content */}
                    <div className="flex flex-col gap-10">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <div className="inline-flex items-center gap-3 neu-pressed px-5 py-2 rounded-full text-[var(--accent-cyan)] text-sm font-bold uppercase tracking-widest mb-8">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-cyan)] opacity-60"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--accent-cyan)]"></span>
                                </span>
                                Neu-Engine v3.0 Live
                            </div>
                            <h1 className="text-7xl sm:text-[5.5rem] font-extrabold text-[var(--text-main)] tracking-tighter leading-[1.05]">
                                Tactile Logic. <br />
                                <span className="opacity-40">Absolute Clarity.</span>
                            </h1>
                        </motion.div>

                        <motion.p
                            className="text-2xl text-slate-500 font-medium leading-relaxed max-w-xl"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        >
                            Experience data structures physically. Write Python or JavaScript and watch your memory footprint carved perfectly into a premium 3D dashboard.
                        </motion.p>

                        <motion.div
                            className="flex items-center gap-6 pt-4"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <Link href="/visualizer" className="group flex items-center justify-center gap-3 neu-raised px-10 py-5 rounded-full text-xl font-bold text-[var(--accent-cyan)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                                <Play size={24} className="fill-[var(--accent-cyan)]" />
                                Start Visualizing
                            </Link>
                        </motion.div>
                    </div>

                    {/* Highly stylized Neumorphic Graphic representing a 3D Canvas */}
                    <motion.div
                        className="relative h-[600px] w-full rounded-[4rem] neu-pressed overflow-hidden flex items-center justify-center"
                        initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 1.2, delay: 0.2, type: "spring", bounce: 0.4 }}
                    >
                        <NeumorphicHeroArt />
                    </motion.div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-40 px-10 relative z-10 w-full">
                <div className="max-w-7xl mx-auto">
                    <motion.div
                        className="text-center mb-32 max-w-4xl mx-auto"
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <h2 className="text-5xl md:text-[4rem] font-bold text-[var(--text-main)] tracking-tight mb-8">Hardware-grade UX</h2>
                        <p className="text-2xl text-slate-500 font-medium">Interact with your algorithms through beautifully machined, pressure-sensitive interfaces.</p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
                        <FeatureCard
                            title="Interpreter Engine"
                            desc="Drop in any code. The backend interpreter traces line-by-line execution, mapping variables to physical space."
                            icon={Code2}
                            delay={0}
                        >
                            {(controls: any) => <QuicksortMini controls={controls} />}
                        </FeatureCard>

                        <FeatureCard
                            title="Tactile 3D Canvas"
                            desc="Fluid, butter-smooth panning and zooming leveraging raw WebGL and Three.js physics."
                            icon={Layers}
                            delay={0.1}
                        >
                            {(controls: any) => (
                                <motion.div
                                    className="w-24 h-24 neu-raised rounded-3xl"
                                    variants={{ hover: { rotateX: [0, 20, -20, 0], rotateY: [0, 20, -20, 0] } }}
                                    animate={controls}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                />
                            )}
                        </FeatureCard>

                        <FeatureCard
                            title="Time Travel Scrubbing"
                            desc="Step backwards and forwards through algorithms like a physical video editor hardware board."
                            icon={Zap}
                            delay={0.2}
                        >
                            {(controls: any) => <TreeMini controls={controls} />}
                        </FeatureCard>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-40 px-10 relative z-10 flex justify-center">
                <motion.div
                    className="w-full max-w-5xl text-center neu-raised p-24 rounded-[4rem]"
                    initial={{ opacity: 0, scale: 0.95, y: 40 }}
                    whileInView={{ opacity: 1, scale: 1, y: 0 }}
                    viewport={{ once: true, margin: "-100px" }}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                >
                    <div className="w-24 h-24 mx-auto mb-10 neu-pressed rounded-full flex items-center justify-center">
                        <Bot size={40} className="text-[var(--text-main)] opacity-50" />
                    </div>
                    <h2 className="text-6xl font-extrabold text-[var(--text-main)] tracking-tight mb-8">Feel the code.</h2>
                    <p className="text-2xl text-slate-500 font-medium mb-16 max-w-2xl mx-auto">Stop reading flat stack traces. Start interacting with immersive, physically-rendered object memory.</p>

                    <Link href="/visualizer" className="inline-flex items-center justify-center gap-4 neu-raised px-14 py-6 rounded-full text-2xl font-bold text-[var(--text-main)] hover:text-[var(--accent-cyan)] hover:scale-105 active:scale-95 transition-all">
                        Launch Visualizer <ArrowRight size={28} />
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="py-12 text-center pb-20">
                <p className="text-slate-400 font-semibold text-lg">Designed & Machined with Next.js • Tailwind CSS • Three.js</p>
            </footer>
        </div>
    );
}
