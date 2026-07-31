import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, G, Polygon, Circle } from 'react-native-svg';

interface LogoFaaSProps {
    size?: number;
    showBackground?: boolean;
    watermark?: boolean;
}

export default function LogoFaaS({ size = 100, showBackground = false, watermark = false }: LogoFaaSProps) {
    // Couleurs adaptées au contexte (normal vs filigrane de fond)
    const primaryColor = watermark ? 'rgba(74, 158, 255, 0.08)' : '#4a9eff';
    const secondaryColor = watermark ? 'rgba(30, 90, 200, 0.08)' : '#1e5ac8';
    const accentColor = watermark ? 'rgba(255, 255, 255, 0.05)' : '#ffffff';
    const shadowColor = watermark ? 'rgba(74, 158, 255, 0.15)' : '#a1cfff';

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <Svg width={size} height={size} viewBox="0 0 100 100">
                <Defs>
                    {/* Dégradé principal pour le F et la flèche */}
                    <LinearGradient id="gradMain" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={primaryColor} stopOpacity="1" />
                        <Stop offset="1" stopColor={secondaryColor} stopOpacity="1" />
                    </LinearGradient>
                    
                    {/* Dégradé pour donner un effet 3D à l'avion en papier */}
                    <LinearGradient id="gradPlane" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={accentColor} stopOpacity="1" />
                        <Stop offset="1" stopColor={shadowColor} stopOpacity="1" />
                    </LinearGradient>
                </Defs>

                {/* Cercle de fond (pour le petit logo de la sidebar) */}
                {showBackground && (
                    <Circle cx="50" cy="50" r="50" fill="#14253d" />
                )}

                {/* On recentre et met à l'échelle le dessin */}
                <G transform={showBackground ? "translate(18, 18) scale(0.65)" : "translate(5, 5) scale(0.9)"}>
                    
                    {/* 1. La lettre F avec le coin haut-droit arrondi */}
                    <Path
                        d="M 25 10 L 65 10 C 75 10 80 15 80 25 L 80 35 L 45 35 L 45 45 L 75 45 L 75 55 L 45 55 L 45 90 L 25 90 Z"
                        fill="url(#gradMain)"
                    />
                    
                    {/* 2. La flèche / orbite qui part d'en bas à gauche et remonte */}
                    <Path
                        d="M 15 75 C -5 55 -5 35 15 20 L 20 27 C 5 40 5 55 20 70 C 35 85 55 85 70 75 L 65 65 L 90 75 L 75 95 L 70 85 C 50 95 30 90 15 75 Z"
                        fill="url(#gradMain)"
                    />

                    {/* 3. L'avion en papier (aile supérieure) */}
                    <Polygon
                        points="95,5 50,45 65,55 95,5"
                        fill="url(#gradPlane)"
                    />
                    
                    {/* 4. L'avion en papier (aile inférieure/ombre 3D) */}
                    <Polygon
                        points="95,5 65,55 70,80 95,5"
                        fill={watermark ? primaryColor : '#82bfff'}
                    />
                    
                    {/* 5. Le petit rabat interne de l'avion */}
                    <Polygon
                        points="65,55 70,80 70,60"
                        fill={watermark ? secondaryColor : '#3a8be0'}
                    />

                </G>
            </Svg>
        </View>
    );
}
