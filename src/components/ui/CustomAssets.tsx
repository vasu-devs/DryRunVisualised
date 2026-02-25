"use client";

import React from "react";
import { motion } from "framer-motion";

export const FuturisticGrid = () => (
    <div className="absolute inset-0 z-[-5] opacity-30 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
    </div>
);

export const FloatingDSAAssets = () => {
    return (
        <div className="absolute inset-0 z-[-4] pointer-events-none overflow-hidden">
            {/* Abstract Node Link Graph */}
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 0.15, y: [0, -20, 0] }}
                transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/4 left-10"
            >
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="50" cy="50" r="10" stroke="var(--color-brand-purple)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <circle cx="150" cy="80" r="15" stroke="var(--color-brand-blue)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <circle cx="100" cy="150" r="12" stroke="var(--color-brand-pink)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <path d="M57 57 L140 75" stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                    <path d="M145 90 L107 140" stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                    <path d="M92 145 L55 60" stroke="rgba(0,0,0,0.15)" strokeWidth="1" strokeDasharray="4 4" />
                </svg>
            </motion.div>

            {/* Binary Tree Snippet */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 0.1, scale: [1, 1.05, 1] }}
                transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                className="absolute bottom-1/4 right-20"
            >
                <svg width="250" height="250" viewBox="0 0 250 250" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="125" cy="40" r="20" stroke="var(--color-brand-blue)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <circle cx="65" cy="120" r="15" stroke="var(--color-brand-pink)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <circle cx="185" cy="120" r="15" stroke="var(--color-brand-purple)" strokeWidth="1.5" fill="transparent" opacity="0.6" />
                    <circle cx="35" cy="200" r="10" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="transparent" />
                    <circle cx="95" cy="200" r="10" stroke="rgba(0,0,0,0.3)" strokeWidth="1" fill="transparent" />
                    <path d="M115 55 L75 105" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                    <path d="M135 55 L175 105" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                    <path d="M60 135 L40 190" stroke="rgba(0,0,0,0.1)" strokeWidth="1" strokeDasharray="2 2" />
                    <path d="M70 135 L90 190" stroke="rgba(0,0,0,0.1)" strokeWidth="1" strokeDasharray="2 2" />
                </svg>
            </motion.div>
        </div>
    );
};
