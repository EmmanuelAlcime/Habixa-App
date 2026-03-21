import { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Modal,
  Dimensions,
  FlatList,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { HabixaIcon } from '@/components/HabixaIcon';
import { Colors, Fonts } from '@/constants/theme';
import type { ListingPhoto } from '@/lib/types/listing';

interface ImageGalleryProps {
  photos: ListingPhoto[];
  fallbackColor?: string;
  /** Height of the slider */
  height?: number;
}

export function ImageGallery({
  photos,
  fallbackColor = '#C8DCC8',
  height = 220,
}: ImageGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { width: screenWidth } = Dimensions.get('window');
  const scrollRef = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / screenWidth);
    setActiveIndex(Math.min(index, photos.length - 1));
  };

  if (!photos || photos.length === 0) {
    return (
      <View style={[styles.slider, { height, backgroundColor: fallbackColor }]}>
        <View style={styles.placeholder}>
          <HabixaIcon name="building" size={70} color={Colors.midnightInk} />
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.slider, { height }]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {photos.map((photo, index) => (
            <Pressable
              key={photo.id}
              style={[styles.slide, { width: screenWidth, height }]}
              onPress={() => setLightboxIndex(index)}
            >
              <Image
                source={{ uri: photo.url }}
                style={[styles.slideImage, { width: screenWidth, height }]}
                contentFit="cover"
              />
            </Pressable>
          ))}
        </ScrollView>

        {photos.length > 1 && (
          <View style={styles.pagination}>
            {photos.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === activeIndex && styles.dotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      <Modal
        visible={lightboxIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setLightboxIndex(null)}
      >
        <Pressable
          style={styles.lightboxOverlay}
          onPress={() => setLightboxIndex(null)}
        >
          <View style={styles.lightboxContent}>
            <Pressable
              style={styles.lightboxClose}
              onPress={() => setLightboxIndex(null)}
            >
              <HabixaIcon name="times" size={24} color="#fff" solid />
            </Pressable>
            {lightboxIndex !== null && (
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={lightboxIndex}
                getItemLayout={(_, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <Pressable
                    style={[styles.lightboxSlide, { width: screenWidth }]}
                    onPress={() => setLightboxIndex(null)}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={[styles.lightboxImage, { width: screenWidth }]}
                      contentFit="contain"
                    />
                  </Pressable>
                )}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(
                    e.nativeEvent.contentOffset.x / screenWidth
                  );
                  setLightboxIndex(idx);
                }}
              />
            )}
            {lightboxIndex !== null && photos.length > 1 && (
              <Text style={styles.lightboxCounter}>
                {lightboxIndex + 1} / {photos.length}
              </Text>
            )}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  slider: {
    width: '100%',
    position: 'relative',
  },
  slide: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideImage: {
    backgroundColor: Colors.ink2,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pagination: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  dotActive: {
    backgroundColor: '#fff',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
  },
  lightboxContent: {
    flex: 1,
    justifyContent: 'center',
  },
  lightboxClose: {
    position: 'absolute',
    top: 56,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lightboxImage: {
    height: Dimensions.get('window').height * 0.7,
  },
  lightboxCounter: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    fontFamily: Fonts.body,
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
});
