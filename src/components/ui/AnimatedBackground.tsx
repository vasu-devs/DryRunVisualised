"use client";

import React from "react";
import { motion } from "framer-motion";

export const AnimatedBackground = () => {
    return (
        <div className="fixed inset-0 z-[-10] overflow-hidden bg-background pointer-events-none">
            {/* The enhanced grit noise overlay defined in globals.css */}
            <div className="noise-overlay"></div>

            {/* Fluid Mesh Gradient Blobs */}
            <div className="mesh-bg-container">
                <motion.div
                    className="mesh-blob mesh-blob-1"
                    animate={{
                        x: [0, 50, -30, 0],
                        y: [0, -50, 20, 0],
                        scale: [1, 1.1, 0.9, 1],
                    }}
                    transition={{
                        duration: 20,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                    }}
                />
                <motion.div
                    className="mesh-blob mesh-blob-2"
                    animate={{
                        x: [0, -40, 60, 0],
                        y: [0, 40, -30, 0],
                        scale: [1, 1.2, 0.8, 1],
                    }}
                    transition={{
                        duration: 25,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                        delay: 2,
                    }}
                />
                <motion.div
                    className="mesh-blob mesh-blob-3"
                    animate={{
                        x: [0, 30, -50, 0],
                        y: [0, 60, -20, 0],
                        scale: [1, 0.9, 1.1, 1],
                    }}
                    transition={{
                        duration: 22,
                        repeat: Infinity,
                        repeatType: "mirror",
                        ease: "easeInOut",
                        delay: 5,
                    }}
                />
            </div>

            {/* Gentle white vignette to focus the center but stay bright */}
            <div className="absolute inset-0 bg-gradient-radial from-transparent to-white/40 pointer-events-none"></div>
        </div>
    );
};
