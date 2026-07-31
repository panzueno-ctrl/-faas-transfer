import React from 'react';
import { View } from 'react-native';
import Svg, { Rect, Defs, LinearGradient, Stop, G, Path } from 'react-native-svg';

interface LogoFaaSProps {
    size?: number;
    showBackground?: boolean;
    watermark?: boolean;
}

export default function LogoFaaS({ size = 100, showBackground = false, watermark = false }: LogoFaaSProps) {
    const opacity = watermark ? 0.05 : 1;
    
    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    {/* Fond de l'icône (App Icon) pour qu'il se détache de la sidebar */}
                    <LinearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor="#1E2433" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#0B0C10" stopOpacity={opacity} />
                    </LinearGradient>
                    
                    {/* Dégradé 1: Cyan vers Bleu Electrique (Vitesse) */}
                    <LinearGradient id="gradVertical" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#06B6D4" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#3B82F6" stopOpacity={opacity} />
                    </LinearGradient>
                    
                    {/* Dégradé 2: Bleu Electrique vers Violet (Technologie/Cloud) */}
                    <LinearGradient id="gradTop" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#3B82F6" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#8B5CF6" stopOpacity={opacity} />
                    </LinearGradient>
                    
                    {/* Dégradé 3: Violet vers Rose (Énergie/Mouvement) */}
                    <LinearGradient id="gradMid" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#8B5CF6" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#EC4899" stopOpacity={opacity} />
                    </LinearGradient>
                </Defs>

                {/* Fond sombre abstrait avec une légère bordure (utilisé dans la sidebar) */}
                {showBackground && (
                    <Rect x="0" y="0" width="100" height="100" rx="24" fill="url(#bgGradient)" stroke="#2A303C" strokeWidth="2" />
                )}

                {/* Le groupe principal avec un "skewX" (-15 deg) pour donner une impression de Vitesse (Transfer) */}
                <G transform={showBackground ? "translate(18, 15) scale(0.65) skewX(-15)" : "translate(12, 10) scale(0.8) skewX(-15)"}>
                    
                    {/* Barre verticale principale du F (Cyan -> Bleu) */}
                    <Rect x="15" y="10" width="24" height="80" rx="12" fill="url(#gradVertical)" />
                    
                    {/* Barre horizontale supérieure (Bleu -> Violet) */}
                    <Rect x="45" y="10" width="48" height="24" rx="12" fill="url(#gradTop)" />
                    
                    {/* Barre horizontale du milieu (Violet -> Rose) 
                        Transformée en FLÈCHE parfaite pour symboliser le "Transfer" */}
                    <Path 
                        d="M 45 44 h 22 l 12 12 l -12 12 h -22 a 12 12 0 0 1 0 -24 z" 
                        fill="url(#gradMid)" 
                    />
                </G>
            </Svg>
        </View>
    );
}
