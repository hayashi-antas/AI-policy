import React from 'react';
import { motion } from 'framer-motion';

interface Props {
    children: React.ReactNode;
    delay?: number;
}

export default function RevealSection({ children, delay = 0 }: Props) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut", delay }}
        >
            {children}
        </motion.div>
    );
}
