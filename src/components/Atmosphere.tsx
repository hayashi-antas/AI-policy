import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Sparkles, Environment } from '@react-three/drei';

function Particles() {
    const ref = useRef<any>(null);
    useFrame((state) => {
        if (ref.current) {
            ref.current.rotation.y = state.clock.elapsedTime * 0.05;
            ref.current.rotation.x = state.clock.elapsedTime * 0.02;
        }
    });

    return (
        <group ref={ref}>
            {/* Golden Motes */}
            <Sparkles
                count={50}
                scale={12}
                size={4}
                speed={0.4}
                opacity={0.6}
                color="#c5a059"
            />
            {/* Stone Dust */}
            <Sparkles
                count={30}
                scale={10}
                size={2}
                speed={0.2}
                opacity={0.3}
                color="#555555"
            />
        </group>
    );
}

export default function Atmosphere() {
    return (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: -1, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
                <Particles />
            </Canvas>
        </div>
    );
}
