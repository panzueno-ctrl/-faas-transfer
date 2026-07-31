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
                    {/* Dégradé électrique bleu/violet pour la barre principale */}
                    <LinearGradient id="gradVertical" x1="0" y1="0" x2="0" y2="1">
                        <Stop offset="0" stopColor="#3B82F6" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#8B5CF6" stopOpacity={opacity} />
                    </LinearGradient>
                    
                    {/* Dégradé cyan/bleu pour la barre du haut */}
                    <LinearGradient id="gradTop" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#06B6D4" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#3B82F6" stopOpacity={opacity} />
                    </LinearGradient>
                    
                    {/* Dégradé violet/rose pour la barre du milieu, symbolisant le transfert rapide */}
                    <LinearGradient id="gradMid" x1="0" y1="0" x2="1" y2="0">
                        <Stop offset="0" stopColor="#8B5CF6" stopOpacity={opacity} />
                        <Stop offset="1" stopColor="#ec4899" stopOpacity={opacity} />
                    </LinearGradient>
                </Defs>

                {/* Fond sombre abstrait (utilisé dans la sidebar) */}
                {showBackground && (
                    <Rect x="0" y="0" width="100" height="100" rx="24" fill="#060709" stroke="#1A1D24" strokeWidth="2" />
                )}

                <G transform={showBackground ? "translate(15, 15) scale(0.7)" : "translate(10, 10) scale(0.8)"}>
                    {/* Barre verticale principale du F */}
                    <Rect x="15" y="10" width="22" height="80" rx="11" fill="url(#gradVertical)" />
                    
                    {/* Barre horizontale supérieure (plus longue) */}
                    <Rect x="45" y="10" width="45" height="22" rx="11" fill="url(#gradTop)" />
                    
                    {/* Barre horizontale du milieu (plus courte, forme pointue ou arrondie) */}
                    <Rect x="45" y="42" width="30" height="22" rx="11" fill="url(#gradMid)" />
                </G>
            </Svg>
        </View>
    );
}
