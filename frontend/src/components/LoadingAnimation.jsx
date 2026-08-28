import React, { useEffect, useState } from 'react'
import { AnimatePresence, motion } from "motion/react"

function LoadingAnimation() {
    const Thinking_Labels = ["Ingesting Evidence", "Analyzing Grounding", "Generating Formats", "Validating Outputs"]
    const [labelIndex, setLabelIndex] = useState(0)

    useEffect(() => {
        const interval = setInterval(() => {
            setLabelIndex((prev) => (prev + 1) % Thinking_Labels.length)
        }, 2200)
        return () => clearInterval(interval)
    }, [])

    const label = Thinking_Labels[labelIndex]

    return (
        <div className='flex items-center gap-3 max-w-[72%] py-2'>
            <div className='relative w-9 h-9 flex items-center justify-center shrink-0'>
                {
                    [0, 0.45, 0.9].map((delay, i) => (
                        <motion.div
                            key={i}
                            className="absolute inset-0 rounded-full border border-indigo-400/30"
                            initial={{ scale: 0.3, opacity: 0.55 }}
                            animate={{ scale: 1.7, opacity: 0 }}
                            transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                delay,
                                ease: "easeOut",
                            }}
                        />
                    ))
                }

                <motion.span
                    className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"
                    style={{ boxShadow: "0 0 14px rgba(99,102,241,0.65)" }}
                    animate={{ scale: [1, 1.25, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
            <div className='flex overflow-hidden'>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={label}
                        className="flex"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                        {
                            label.split("").map((ch, i) => (
                                <motion.div
                                    key={i}
                                    className="text-[13px] font-medium tracking-wide text-indigo-300/80"
                                    animate={{ opacity: [0.3, 1, 0.3] }}
                                    transition={{
                                        duration: 1.4,
                                        repeat: Infinity,
                                        ease: "easeInOut",
                                        delay: i * 0.04,
                                    }}
                                >
                                    {ch === " " ? "\u00A0" : ch}
                                </motion.div>
                            ))
                        }
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    )
}

export default LoadingAnimation
