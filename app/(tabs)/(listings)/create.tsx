import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';

type PhotoAsset = {
  uri: string;
  file?: File;
  fileName?: string;
  mimeType?: string;
  /** True when loaded from API (already on server) - skip re-upload */
  isExisting?: boolean;
  /** Server photo id for existing photos - used when reordering */
  photoId?: number;
};
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getApiBaseUrl } from '@/lib/api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import { useTheme } from '@/context/ThemeContext';
import { HabixaIcon } from '@/components/HabixaIcon';
import { LocationForm, type LocationValue } from '@/components/LocationForm';
import { MapLocationPicker } from '@/components/MapLocationPicker';
import { Colors, Fonts } from '@/constants/theme';
import { api, Endpoints } from '@/lib/api/client';
import { usePlacesAutocomplete } from '@/hooks/usePlacesAutocomplete';
import { PROPERTY_TYPES, PROPERTY_TYPE_LABELS, type PropertyType } from '@/lib/constants/propertyTypes';
import { AMENITY_OPTIONS, LAND_AMENITY_OPTIONS, getAmenityById } from '@/lib/constants/amenities';
import { isLandType } from '@/lib/constants/propertyTypes';
import { AvailableDatePicker } from '@/components/AvailableDatePicker';

const STEPS = ['Basics', 'Location', 'Photos', 'Pricing', 'Review'];
const TOTAL_STEPS = 5;

interface CreateListingFormState {
  type: 'rent' | 'sale';
  propertyType: PropertyType;
  title: string;
  description: string;
  amenities: string[];
  address: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  latitude: number | null;
  longitude: number | null;
  price: string;
  priceLabel: string;
  bedrooms: string;
  bathrooms: string;
  sqft: string;
  availableDate: string;
  photoAssets: PhotoAsset[];
}

const defaultFormState: CreateListingFormState = {
  type: 'rent',
  propertyType: 'apartment',
  title: '',
  description: '',
  amenities: [],
  address: '',
  city: '',
  state: '',
  country: '',
  postal_code: '',
  latitude: null,
  longitude: null,
  price: '',
  priceLabel: '/month',
  bedrooms: '',
  bathrooms: '',
  sqft: '',
  availableDate: '',
  photoAssets: [],
};

/** Parse price string (handles commas as thousands separators) to a number */
function parsePriceString(str: string): number {
  if (!str || !str.trim()) return 0;
  const cleaned = str.replace(/,/g, '');
  const num = Number(cleaned);
  return Number.isNaN(num) ? 0 : num;
}

function getLocationValue(form: CreateListingFormState): LocationValue {
  return {
    city: form.city,
    region: form.state,
    postalCode: form.postal_code,
    country: form.country,
  };
}

function payloadFromForm(form: CreateListingFormState, status: 'draft' | 'active') {
  const payload: Record<string, unknown> = {
    type: form.type,
    property_type: form.propertyType,
    title: form.title.trim() || 'Untitled',
    description: form.description.trim() || '',
    price: parsePriceString(form.price),
    address: form.address.trim() || '',
    city: form.city.trim() || '',
    state: form.state || undefined,
    country: form.country || '',
    postal_code: form.postal_code || undefined,
    latitude: form.latitude ?? undefined,
    longitude: form.longitude ?? undefined,
    bedrooms: form.bedrooms ? parseInt(form.bedrooms, 10) : undefined,
    bathrooms: form.bathrooms ? parseInt(form.bathrooms, 10) : undefined,
    area_sqft: form.sqft ? parseFloat(form.sqft) : undefined,
    amenities: form.amenities.length > 0 ? form.amenities : undefined,
    available_date: form.availableDate.trim() || undefined,
    status,
  };
  return payload;
}

export default function CreateListingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ draftId?: string; editId?: string }>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const loadId = params.editId ?? params.draftId;
  const isEditMode = !!params.editId;

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateListingFormState>(defaultFormState);
  const [listingId, setListingId] = useState<string | null>(null);
  const [loadingDraft, setLoadingDraft] = useState(!!loadId);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishPhase, setPublishPhase] = useState<'idle' | 'publishing' | 'success'>('idle');
  const [publishProgress, setPublishProgress] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const descriptionInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const descriptionSectionYRef = useRef(0);
  const cityInputRef = useRef<TextInput>(null);
  const addressInput = form.address;
  const { suggestions, loading: placesLoading, error: placesError } = usePlacesAutocomplete(addressInput, { minLength: 2 });
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [loadingPlaceDetails, setLoadingPlaceDetails] = useState(false);

  const handleSelectAddressSuggestion = useCallback(
    async (s: { placeId: string | null; description: string }) => {
      updateForm({ address: s.description });
      setShowAddressSuggestions(false);
      if (!s.placeId) return;
      setLoadingPlaceDetails(true);
      setError(null);
      try {
        const details = await api.get<{
          address?: string;
          city?: string;
          state?: string;
          countryCode?: string;
          postalCode?: string;
          latitude?: number;
          longitude?: number;
        }>(Endpoints.places.details(s.placeId), { skipAuth: true });
        updateForm({
          address: details.address ?? s.description,
          city: details.city ?? '',
          state: details.state ?? '',
          country: details.countryCode ?? '',
          postal_code: details.postalCode ?? '',
          latitude: details.latitude ?? null,
          longitude: details.longitude ?? null,
        });
      } catch {
        // Address already set; other fields unchanged
      } finally {
        setLoadingPlaceDetails(false);
      }
    },
    []
  );

  const loadDraft = useCallback(async (id: string) => {
    setLoadingDraft(true);
    setError(null);
    try {
      const listing = await api.get<{
        id: number;
        type: string;
        property_type?: string;
        title: string;
        description?: string;
        price: number;
        address: string;
        city?: string;
        state?: string;
        country?: string;
        postal_code?: string;
        latitude?: number;
        longitude?: number;
        bedrooms?: number;
        bathrooms?: number;
        area_sqft?: number;
        available_date?: string;
        amenities?: string[];
        photos?: { id: number; path: string; url?: string }[];
      }>(Endpoints.listings.show(id));
      const validPropertyType = (listing.property_type && PROPERTY_TYPES.includes(listing.property_type as PropertyType))
        ? (listing.property_type as PropertyType)
        : 'apartment';
      const draftAmenities = listing.amenities;
      const baseUrl = getApiBaseUrl().replace(/\/$/, '');
      const existingPhotos: PhotoAsset[] = Array.isArray(listing.photos)
        ? listing.photos.map((p) => ({
            uri: `${baseUrl}/storage/${p.path}`,
            isExisting: true,
            photoId: p.id,
          }))
        : [];
      setForm({
        type: (listing.type === 'sale' ? 'sale' : 'rent') as 'rent' | 'sale',
        propertyType: validPropertyType,
        title: listing.title || '',
        description: listing.description || '',
        amenities: Array.isArray(draftAmenities) ? draftAmenities : [],
        address: listing.address || '',
        city: listing.city || '',
        state: listing.state || '',
        country: listing.country || '',
        postal_code: listing.postal_code || '',
        latitude: listing.latitude != null ? Number(listing.latitude) : null,
        longitude: listing.longitude != null ? Number(listing.longitude) : null,
        price: listing.price != null ? String(listing.price) : '',
        priceLabel: listing.type === 'rent' ? '/month' : '',
        bedrooms: listing.bedrooms != null ? String(listing.bedrooms) : '',
        bathrooms: listing.bathrooms != null ? String(listing.bathrooms) : '',
        sqft: listing.area_sqft != null ? String(listing.area_sqft) : '',
        availableDate: listing.available_date ?? '',
        photoAssets: existingPhotos,
      });
      setListingId(String(listing.id));
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to load listing');
    } finally {
      setLoadingDraft(false);
    }
  }, []);

  useEffect(() => {
    if (loadId) loadDraft(loadId);
  }, [loadId, loadDraft]);

  const updateForm = useCallback((updates: Partial<CreateListingFormState,>) => {
    setForm((prev) => ({ ...prev, ...updates }));
    setError(null);
  }, []);

  const setLocationValue = useCallback((loc: LocationValue) => {
    setForm((prev) => ({
      ...prev,
      city: loc.city,
      state: loc.region,
      postal_code: loc.postalCode,
      country: loc.country,
    }));
  }, []);

  const saveDraft = async () => {
    const hasMinimum = form.title.trim() && form.address.trim() && form.city.trim() && form.country;
    if (!hasMinimum && !listingId) {
      setError('Enter at least title, address, city and country to save a draft.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let id = listingId;
      if (id) {
        await api.put(Endpoints.listings.update(id), payloadFromForm(form, 'draft'));
      } else {
        const res = await api.post<{ id: number }>(Endpoints.listings.store(), payloadFromForm(form, 'draft'));
        id = String(res.id);
        setListingId(id);
      }
      const newPhotos = form.photoAssets.filter((a) => !a.isExisting);
      let uploadedIds: { id: number; path: string; url: string }[] = [];
      if (newPhotos.length > 0 && id) {
        uploadedIds = await uploadPhotos(id, form.photoAssets);
      }
      if (form.photoAssets.length > 0 && id) {
        let idx = 0;
        const orderedIds = form.photoAssets.map((a) =>
          a.photoId != null ? a.photoId : uploadedIds[idx++]?.id ?? -1
        ).filter((id) => id > 0);
        if (orderedIds.length > 0) {
          await reorderPhotosApi(id, orderedIds);
        }
      }
      Alert.alert('Saved', 'Draft saved. You can continue later from My Listings.');
      router.back();
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const uploadPhotos = async (
    id: string,
    assets: PhotoAsset[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ id: number; path: string; url: string }[]> => {
    const newAssets = assets.filter((a) => !a.isExisting);
    if (newAssets.length === 0) return [];
    const formData = new FormData();
    for (let i = 0; i < newAssets.length; i++) {
      const asset = newAssets[i];
      if (Platform.OS === 'web' && asset.file) {
        formData.append('photos[]', asset.file, asset.fileName ?? `photo-${i}.jpg`);
      } else {
        formData.append('photos[]', {
          uri: asset.uri,
          name: asset.fileName ?? `photo-${i}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      }
    }
    onProgress?.(newAssets.length, newAssets.length);
    const res = await api.postFormData<{ photos: { id: number; path: string; url: string }[] }>(
      Endpoints.listings.photos(id),
      formData
    );
    return res.photos ?? [];
  };

  const reorderPhotosApi = async (id: string, order: number[]) => {
    if (order.length === 0) return;
    await api.patch(Endpoints.listings.photosReorder(id), { order });
  };

  const publish = async () => {
    const required = form.title.trim() && form.description.trim() && form.address.trim()
      && form.city.trim() && form.country && form.price && parsePriceString(form.price) >= 0;
    if (!required) {
      setError('Please complete title, description, location, and price before publishing.');
      return;
    }
    setPublishing(true);
    setPublishPhase('publishing');
    setPublishProgress('Publishing…');
    setError(null);
    try {
      let id = listingId;
      if (id) {
        await api.put(Endpoints.listings.update(id), payloadFromForm(form, 'active'));
      } else {
        const res = await api.post<{ id: number }>(Endpoints.listings.store(), payloadFromForm(form, 'active'));
        id = String(res.id);
        setListingId(id);
      }
      if (form.photoAssets.length > 0) {
        const total = form.photoAssets.length;
        setPublishProgress(`Uploading photos (${total}/${total})…`);
        const uploadedIds = await uploadPhotos(id!, form.photoAssets, (current, t) => {
          setPublishProgress(`Uploading photos (${current}/${t})…`);
        });
        let idx = 0;
        const orderedIds = form.photoAssets.map((a) =>
          a.photoId != null ? a.photoId : uploadedIds[idx++]?.id ?? -1
        ).filter((id) => id > 0);
        if (orderedIds.length > 0) {
          await reorderPhotosApi(id!, orderedIds);
        }
      }
      setPublishPhase('success');
      setPublishProgress('');
      setTimeout(() => {
        router.replace('/(tabs)/(listings)');
      }, 1500);
    } catch (e) {
      const err = e as { message?: string };
      setError(err?.message ?? 'Failed to publish');
      Alert.alert('Publish failed', err?.message ?? 'Failed to publish');
      setPublishing(false);
      setPublishPhase('idle');
      setPublishProgress('');
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add listing images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (!result.canceled && result.assets.length) {
      const newAssets: PhotoAsset[] = result.assets.map((a) => ({
        uri: a.uri,
        file: a.file,
        fileName: a.fileName ?? undefined,
        mimeType: a.mimeType ?? 'image/jpeg',
      }));
      setForm((prev) => ({ ...prev, photoAssets: [...prev.photoAssets, ...newAssets] }));
    }
  };

  const removePhoto = (index: number) => {
    setForm((prev) => ({
      ...prev,
      photoAssets: prev.photoAssets.filter((_, i) => i !== index),
    }));
  };

  if (loadingDraft) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.terracotta} />
        <Text style={[styles.loadingText, { color: colors.text }]}>{isEditMode ? 'Loading listing…' : 'Loading draft…'}</Text>
      </View>
    );
  }

  const showPublishOverlay = publishPhase === 'publishing' || publishPhase === 'success';

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: colors.background }]}>
      {showPublishOverlay && (
        <View style={[styles.publishOverlay, { backgroundColor: colors.background }]} pointerEvents="box-none">
          <View style={[styles.publishOverlayContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {publishPhase === 'success' ? (
              <>
                <View style={[styles.successIconWrap, { backgroundColor: 'rgba(92,124,111,0.15)' }]}>
                  <HabixaIcon name="check-circle" size={48} color={Colors.sage} solid />
                </View>
                <Text style={[styles.publishOverlayTitle, { color: colors.text }]}>Published!</Text>
                <Text style={[styles.publishOverlaySub, { color: colors.textSecondary }]}>Your listing is now live.</Text>
              </>
            ) : (
              <>
                <ActivityIndicator size="large" color={Colors.terracotta} />
                <Text style={[styles.publishOverlayTitle, { color: colors.text }]}>{publishProgress || 'Publishing…'}</Text>
              </>
            )}
          </View>
        </View>
      )}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <HabixaIcon name="arrow-left" size={18} color={colors.text} solid />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>{isEditMode ? 'Edit Listing' : 'Create Listing'}</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={[styles.stepRow, { borderBottomColor: colors.border }]}>
        {STEPS.map((label, i) => (
          <View key={label} style={styles.stepDotWrap}>
            <View
              style={[
                styles.stepDot,
                step >= i + 1 && { backgroundColor: Colors.terracotta },
                step > i + 1 && { backgroundColor: Colors.sage },
              ]}
            />
            <Text style={[styles.stepLabel, { color: colors.textSecondary }]} numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: 'rgba(194,103,58,0.15)', borderColor: Colors.terracotta }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={insets.top + 60}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(keyboardHeight, 24) },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {step === 1 && (
            <View style={styles.stepContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Listing type</Text>
              <View style={styles.typeRow}>
                <Pressable
                  style={[styles.typeBtn, { backgroundColor: form.type === 'rent' ? Colors.terracotta : colors.card, borderColor: colors.border }]}
                  onPress={() => updateForm({ type: 'rent', priceLabel: '/month' })}
                >
                  <Text style={[styles.typeBtnText, { color: form.type === 'rent' ? Colors.desertSand : colors.text }]}>For Rent</Text>
                </Pressable>
                <Pressable
                  style={[styles.typeBtn, { backgroundColor: form.type === 'sale' ? Colors.terracotta : colors.card, borderColor: colors.border }]}
                  onPress={() => updateForm({ type: 'sale', priceLabel: '' })}
                >
                  <Text style={[styles.typeBtnText, { color: form.type === 'sale' ? Colors.desertSand : colors.text }]}>For Sale</Text>
                </Pressable>
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Property type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.propertyTypeScroll}>
                {PROPERTY_TYPES.map((pt) => (
                  <Pressable
                    key={pt}
                    style={[
                      styles.propertyTypeChip,
                      { backgroundColor: form.propertyType === pt ? Colors.terracotta : colors.card, borderColor: colors.border },
                    ]}
                    onPress={() => {
                      const switchingToLand = pt === 'land';
                      const switchingFromLand = form.propertyType === 'land';
                      updateForm({
                        propertyType: pt,
                        amenities: (switchingToLand || switchingFromLand) ? [] : form.amenities,
                      });
                    }}
                  >
                    <Text style={[styles.propertyTypeChipText, { color: form.propertyType === pt ? Colors.desertSand : colors.text }]}>
                      {PROPERTY_TYPE_LABELS[pt]}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Title</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="e.g. Cozy 2BR near downtown"
                placeholderTextColor={colors.textSecondary}
                value={form.title}
                onChangeText={(title) => updateForm({ title })}
                returnKeyType="next"
                onSubmitEditing={() => {
                  descriptionInputRef.current?.focus();
                  const y = Math.max(0, descriptionSectionYRef.current - 80);
                  scrollViewRef.current?.scrollTo({ y, animated: true });
                }}
              />
              <View
                onLayout={(e) => {
                  descriptionSectionYRef.current = e.nativeEvent.layout.y;
                }}
              >
                <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Description</Text>
                <TextInput
                  ref={descriptionInputRef}
                  style={[styles.input, styles.textArea, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  placeholder="Describe the property, neighborhood, and amenities..."
                  placeholderTextColor={colors.textSecondary}
                  value={form.description}
                  onChangeText={(description) => updateForm({ description })}
                  multiline
                  numberOfLines={4}
                />
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                {isLandType(form.propertyType) ? 'Land features' : 'Amenities'}
              </Text>
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                {isLandType(form.propertyType)
                  ? 'Basic infrastructure that already exists'
                  : 'Select all that apply'}
              </Text>
              <View style={styles.amenitiesRow}>
                {(isLandType(form.propertyType) ? LAND_AMENITY_OPTIONS : AMENITY_OPTIONS).map((a) => {
                  const selected = form.amenities.includes(a.id);
                  return (
                    <Pressable
                      key={a.id}
                      style={[
                        styles.amenityChip,
                        { backgroundColor: selected ? Colors.terracotta : colors.card, borderColor: colors.border },
                      ]}
                      onPress={() => {
                        const next = selected
                          ? form.amenities.filter((x) => x !== a.id)
                          : [...form.amenities, a.id];
                        updateForm({ amenities: next });
                      }}
                    >
                      <HabixaIcon name={a.icon} size={11} color={selected ? Colors.desertSand : Colors.sage} solid />
                      <Text style={[styles.amenityChipText, { color: selected ? Colors.desertSand : colors.text }]}>
                        {a.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Available date</Text>
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                When will this property be available?
              </Text>
              <AvailableDatePicker
                value={form.availableDate}
                onChange={(availableDate) => updateForm({ availableDate })}
                colors={colors}
              />
            </View>
          )}

          {step === 2 && (
            <View style={styles.stepContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Address</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Start typing an address..."
                placeholderTextColor={colors.textSecondary}
                value={form.address}
                onChangeText={(address) => { updateForm({ address }); setShowAddressSuggestions(true); }}
                onFocus={() => setShowAddressSuggestions(true)}
                onBlur={() => setTimeout(() => setShowAddressSuggestions(false), 200)}
                returnKeyType="next"
                onSubmitEditing={() => cityInputRef.current?.focus()}
              />
              {loadingPlaceDetails && (
                <View style={[styles.addressLoadingRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <ActivityIndicator size="small" color={Colors.terracotta} />
                  <Text style={[styles.addressLoadingText, { color: colors.textSecondary }]}>Filling city, country...</Text>
                </View>
              )}
              {showAddressSuggestions && form.address.trim().length >= 2 && !loadingPlaceDetails && (
                <View style={[styles.suggestionsBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {placesLoading ? (
                    <View style={[styles.suggestionRow, { paddingVertical: 14 }]}>
                      <ActivityIndicator size="small" color={Colors.terracotta} />
                      <Text style={[styles.suggestionMain, { color: colors.textSecondary, marginLeft: 10 }]}>Searching...</Text>
                    </View>
                  ) : placesError ? (
                    <View style={[styles.suggestionRow, { paddingVertical: 14 }]}>
                      <Text style={[styles.suggestionMain, { color: Colors.terracotta, fontSize: 13 }]}>{placesError}</Text>
                    </View>
                  ) : suggestions.length > 0 ? (
                    suggestions.slice(0, 5).map((s) => (
                      <Pressable
                        key={s.placeId ?? s.description}
                        style={[styles.suggestionRow, { borderBottomColor: colors.border }]}
                        onPress={() => handleSelectAddressSuggestion(s)}
                      >
                        <Text style={[styles.suggestionMain, { color: colors.text }]}>{s.mainText}</Text>
                        <Text style={[styles.suggestionSub, { color: colors.textSecondary }]}>{s.secondaryText}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <View style={[styles.suggestionRow, { paddingVertical: 14 }]}>
                      <Text style={[styles.suggestionMain, { color: colors.textSecondary }]}>No addresses found</Text>
                    </View>
                  )}
                </View>
              )}
              <LocationForm
                value={getLocationValue(form)}
                onChange={setLocationValue}
                style={styles.locationForm}
                cityInputRef={cityInputRef}
              />
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Location on map (optional)</Text>
              <MapLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onLocationChange={(latitude, longitude) => updateForm({ latitude, longitude })}
                height={180}
              />
            </View>
          )}

          {step === 3 && (
            <View style={styles.stepContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Photos</Text>
              <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
                Drag to reorder — first image is the featured image
              </Text>
              <Pressable
                style={[styles.addPhotosBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={pickImages}
              >
                <HabixaIcon name="camera" size={24} color={Colors.terracotta} solid />
                <Text style={[styles.addPhotosText, { color: colors.text }]}>Add photos ({form.photoAssets.length}/10)</Text>
              </Pressable>
              {form.photoAssets.length > 0 && (
                <DraggableFlatList
                  horizontal
                  data={form.photoAssets}
                  onDragEnd={({ data }) => updateForm({ photoAssets: data })}
                  keyExtractor={(asset) => (asset.photoId ? `existing-${asset.photoId}` : `new-${asset.uri}`)}
                  renderItem={({ item, drag, isActive, getIndex }) => (
                    <ScaleDecorator activeScale={1.05}>
                      <Pressable
                        onLongPress={drag}
                        disabled={isActive}
                        style={[styles.photoThumbWrap, isActive && styles.photoThumbDragging]}
                      >
                        <Image source={{ uri: item.uri }} style={styles.photoThumb} contentFit="cover" />
                        {getIndex() === 0 && (
                          <View style={[styles.featuredBadge, { backgroundColor: Colors.terracotta }]}>
                            <Text style={styles.featuredBadgeText}>Featured</Text>
                          </View>
                        )}
                        <Pressable
                          style={styles.photoRemove}
                          onPress={() => removePhoto(getIndex())}
                        >
                          <HabixaIcon name="times" size={12} color="#fff" solid />
                        </Pressable>
                      </Pressable>
                    </ScaleDecorator>
                  )}
                  containerStyle={styles.photoScroll}
                />
              )}
            </View>
          )}

          {step === 4 && (
            <View style={styles.stepContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Price</Text>
              <View style={styles.priceRow}>
                <TextInput
                  style={[styles.input, styles.priceInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                  placeholder="0"
                  placeholderTextColor={colors.textSecondary}
                  value={form.price}
                  onChangeText={(price) => updateForm({ price })}
                  keyboardType="decimal-pad"
                />
                {form.type === 'rent' && (
                  <Text style={[styles.priceUnit, { color: colors.textSecondary }]}>{form.priceLabel}</Text>
                )}
              </View>
              {!isLandType(form.propertyType) && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bedrooms</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={form.bedrooms}
                    onChangeText={(bedrooms) => updateForm({ bedrooms })}
                    keyboardType="number-pad"
                  />
                  <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Bathrooms</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                    value={form.bathrooms}
                    onChangeText={(bathrooms) => updateForm({ bathrooms })}
                    keyboardType="decimal-pad"
                  />
                </>
              )}
              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Area (sq ft)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
                placeholder="Optional"
                placeholderTextColor={colors.textSecondary}
                value={form.sqft}
                onChangeText={(sqft) => updateForm({ sqft })}
                keyboardType="decimal-pad"
              />
            </View>
          )}

          {step === 5 && (
            <View style={styles.stepContent}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Summary</Text>
              <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.summaryTitle, { color: colors.text }]}>{form.title || 'Untitled'}</Text>
                <Text style={[styles.summaryType, { color: colors.textSecondary }]}>
                  {PROPERTY_TYPE_LABELS[form.propertyType]} · {form.type === 'rent' ? 'For Rent' : 'For Sale'}
                </Text>
                <Text style={[styles.summaryPrice, { color: colors.text }]}>
                  ${form.price ? parsePriceString(form.price).toLocaleString() : '0'}{form.type === 'rent' ? ' /month' : ''}
                </Text>
                <Text style={[styles.summaryAddress, { color: colors.textSecondary }]}>
                  {[form.address, form.city, form.state, form.country].filter(Boolean).join(', ')}
                </Text>
                <Text style={[styles.summaryDetails, { color: colors.textSecondary }]}>
                  {!isLandType(form.propertyType)
                    ? `${form.bedrooms || 0} bed · ${form.bathrooms || 0} bath${form.sqft ? ` · ${form.sqft} sqft` : ''}`
                    : form.sqft
                      ? `${form.sqft} sqft lot`
                      : 'Land'}
                </Text>
                {form.availableDate ? (
                  <Text style={[styles.summaryDetails, { color: colors.textSecondary }]}>
                    Available: {form.availableDate}
                  </Text>
                ) : null}
                {form.amenities.length > 0 && (
                  <Text style={[styles.summaryAmenities, { color: colors.textSecondary }]}>
                    {form.amenities
                      .map((id) => getAmenityById(id)?.label ?? id)
                      .join(' · ')}
                  </Text>
                )}
                <Text style={[styles.summaryPhotos, { color: colors.textSecondary }]}>
                  {form.photoAssets.length} photo(s)
                </Text>
              </View>
            </View>
          )}

          <View
            style={[
              styles.footer,
              styles.footerInScroll,
              {
                paddingBottom: insets.bottom + 24,
                paddingTop: 24,
                backgroundColor: colors.background,
                borderTopColor: colors.border,
              },
            ]}
          >
            <View style={styles.footerRow}>
              {step > 1 ? (
                <Pressable
                  style={[styles.footerBtn, styles.footerBtnSecondary, { borderColor: colors.border }]}
                  onPress={() => setStep(step - 1)}
                >
                  <Text style={[styles.footerBtnTextSecondary, { color: colors.text }]}>Back</Text>
                </Pressable>
              ) : null}
              {step < TOTAL_STEPS ? (
                <Pressable
                  style={[styles.footerBtn, styles.footerBtnPrimary]}
                  onPress={() => setStep(step + 1)}
                >
                  <Text style={styles.footerBtnTextPrimary}>Next</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    style={[styles.footerBtn, styles.footerBtnSecondary, { borderColor: colors.border }]}
                    onPress={saveDraft}
                    disabled={saving || publishing}
                  >
                    {saving ? <ActivityIndicator size="small" color={Colors.terracotta} /> : <Text style={[styles.footerBtnTextSecondary, { color: colors.text }]}>Save draft</Text>}
                  </Pressable>
                  <Pressable
                    style={[styles.footerBtn, styles.footerBtnPrimary]}
                    onPress={publish}
                    disabled={saving || publishing}
                  >
                    {publishing ? <ActivityIndicator size="small" color={Colors.desertSand} /> : <Text style={styles.footerBtnTextPrimary}>Publish</Text>}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  publishOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  publishOverlayContent: {
    padding: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    alignItems: 'center',
    minWidth: 200,
    gap: 16,
  },
  publishOverlayTitle: {
    fontFamily: Fonts.display,
    fontSize: 20,
  },
  publishOverlaySub: {
    fontFamily: Fonts.body,
    fontSize: 14,
  },
  successIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  backBtn: { padding: 8, marginLeft: -8 },
  title: { fontFamily: Fonts.display, fontSize: 18, flex: 1, textAlign: 'center' },
  headerRight: { width: 34 },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
  },
  stepDotWrap: { alignItems: 'center', flex: 1 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.muted,
    marginBottom: 4,
  },
  stepLabel: { fontSize: 9, fontFamily: Fonts.body },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
  },
  errorText: { fontFamily: Fonts.body, fontSize: 13, color: Colors.terracotta },
  loadingText: { fontFamily: Fonts.body, fontSize: 14, marginTop: 8 },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },
  stepContent: { gap: 16 },
  fieldLabel: { fontFamily: Fonts.label, fontSize: 12, marginBottom: 4 },
  fieldHint: { fontFamily: Fonts.body, fontSize: 11, marginBottom: 8 },
  amenitiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  amenityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 0.5,
  },
  amenityChipText: { fontFamily: Fonts.heading, fontSize: 12 },
  input: {
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontFamily: Fonts.body,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: { height: 100, paddingTop: 12 },
  typeRow: { flexDirection: 'row', gap: 10 },
  propertyTypeScroll: { marginTop: 4, marginBottom: 4, maxHeight: 44 },
  propertyTypeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 0.5,
    marginRight: 8,
  },
  propertyTypeChipText: { fontFamily: Fonts.heading, fontSize: 12 },
  typeBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  typeBtnText: { fontFamily: Fonts.heading, fontSize: 14 },
  locationForm: { marginTop: 8 },
  addressLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    gap: 8,
  },
  addressLoadingText: { fontFamily: Fonts.body, fontSize: 13 },
  suggestionsBox: {
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    overflow: 'hidden',
    minHeight: 48,
  },
  suggestionRow: { paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 0.5 },
  suggestionMain: { fontFamily: Fonts.heading, fontSize: 14 },
  suggestionSub: { fontFamily: Fonts.body, fontSize: 12, marginTop: 2 },
  addPhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPhotosText: { fontFamily: Fonts.heading, fontSize: 14 },
  photoScroll: { marginTop: 12, maxHeight: 100 },
  photoThumbWrap: { marginRight: 12, position: 'relative' },
  photoThumbDragging: { opacity: 0.9, zIndex: 10 },
  photoThumb: { width: 80, height: 80, borderRadius: 8 },
  featuredBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  featuredBadgeText: { fontFamily: Fonts.heading, fontSize: 9, color: Colors.desertSand, letterSpacing: 0.5 },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  priceInput: { flex: 1 },
  priceUnit: { fontFamily: Fonts.body, fontSize: 16 },
  sectionLabel: { fontFamily: Fonts.heading, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 12 },
  summaryCard: { padding: 16, borderRadius: 12, borderWidth: 0.5 },
  summaryTitle: { fontFamily: Fonts.display, fontSize: 18 },
  summaryType: { fontFamily: Fonts.body, fontSize: 12, marginTop: 4 },
  summaryPrice: { fontFamily: Fonts.display, fontSize: 22, marginTop: 8 },
  summaryAddress: { fontFamily: Fonts.body, fontSize: 13, marginTop: 8 },
  summaryDetails: { fontFamily: Fonts.body, fontSize: 13, marginTop: 4 },
  summaryAmenities: { fontFamily: Fonts.body, fontSize: 12, marginTop: 4 },
  summaryPhotos: { fontFamily: Fonts.body, fontSize: 12, marginTop: 4 },
  footer: {
    paddingHorizontal: 20,
    borderTopWidth: 0.5,
  },
  footerInScroll: {
    marginTop: 8,
  },
  footerRow: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  footerBtn: {
    minWidth: 100,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerBtnPrimary: { backgroundColor: Colors.terracotta, flex: 1 },
  footerBtnSecondary: { borderWidth: 1, flex: 1 },
  footerBtnTextPrimary: { fontFamily: Fonts.heading, fontSize: 15, color: Colors.desertSand },
  footerBtnTextSecondary: { fontFamily: Fonts.heading, fontSize: 15 },
});
