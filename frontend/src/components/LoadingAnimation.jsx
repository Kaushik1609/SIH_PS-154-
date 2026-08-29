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
        <div className='flex items-center gap-2.5 max-w-[70%] py-1.5'>
            <div className='relative w-6 h-6 flex items-center justify-center shrink-0'>
                {
                    [0, 0.45, 0.9].map((delay, i) => (
                        <motion.div
                            key={i}
                            className="absolute inset-0 rounded-full border"
                            style={{ borderColor: 'var(--accent)' }}
                            initial={{ scale: 0.3, opacity: 0.4 }}
                            animate={{ scale: 1.6, opacity: 0 }}
                            transition={{
                                duration: 1.6,
                                repeat: Infinity,
                                delay,
                                ease: "easeOut",
                            }}
                        />
                    ))
                }

                <motion.span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: 'var(--accent)' }}
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
            </div>
            <div className='flex overflow-hidden'>
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={label}
                        className="flex"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                        {
                            label.split("").map((ch, i) => (
                                <motion.div
                                    key={i}
                                    className="text-xs font-medium tracking-wide"
                                    style={{ color: 'var(--text-secondary)' }}
                                    animate={{ opacity: [0.35, 1, 0.35] }}
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
