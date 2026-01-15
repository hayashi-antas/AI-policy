import React, { useState } from 'react';
import { motion } from 'framer-motion';

export default function SynergyBadge() {
    const [hovered, setHovered] = useState(false);

    return (
        <motion.div
            className="synergy-badge"
            onHoverStart={() => setHovered(true)}
            onHoverEnd={() => setHovered(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
        >
            <div className="synergy-label">
                <span className="icon">✦</span>
                <span className="text">AI x HUMAN SYNERGY</span>
            </div>

            <div className="synergy-meter">
                {/* Human contribution bar */}
                <motion.div
                    className="bar human"
                    initial={{ width: 0 }}
                    animate={{ width: '40%' }}
                    transition={{ duration: 1.5, delay: 2.5 }}
                />
                {/* AI contribution bar */}
                <motion.div
                    className="bar ai"
                    initial={{ width: 0 }}
                    animate={{ width: '60%' }}
                    transition={{ duration: 1.5, delay: 3 }}
                />
            </div>

            <motion.div
                className="details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: hovered ? 1 : 0, height: hovered ? 'auto' : 0 }}
            >
                <p>Human Architecture: 40%</p>
                <p>AI Acceleration: 60%</p>
            </motion.div>
        </motion.div>
    );
}
