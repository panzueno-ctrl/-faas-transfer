import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Version Mobile Fallback (Affichage d'une icône générique)
// Pour avoir des vignettes PDF sur mobile, il faudrait installer react-native-webview
// ou un module natif lourd.
export default function PdfThumbnail({ fileUri, pageIndex, style }: { fileUri: string, pageIndex: number, style?: any }) {
    return (
        <View style={[{ width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' }, style]}>
            <Ionicons name="document-text-outline" size={40} color="rgba(255,255,255,0.4)" />
            <Text style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 12 }}>Page {pageIndex + 1}</Text>
        </View>
    );
}
