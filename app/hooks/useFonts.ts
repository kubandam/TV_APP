import { useFonts as useExpoFonts } from 'expo-font';
import { FONTS } from '../theme/fonts';

export const useFonts = () => {
  const [fontsLoaded, fontError] = useExpoFonts({
    [FONTS.avalon.thin]: require('../../assets/fonts/AVALONT.ttf'),
    [FONTS.avalon.normal]: require('../../assets/fonts/AVALONN.ttf'),
    [FONTS.avalon.italic]: require('../../assets/fonts/AVALONI.ttf'),
    [FONTS.avalon.bold]: require('../../assets/fonts/AVALONB.ttf'),
  });

  return { fontsLoaded, fontError };
};
