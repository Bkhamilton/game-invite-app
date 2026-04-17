/**
 * FriendsBubbles.tsx
 *
 * A physics-based friends orbit screen for React Native.
 *
 * Dependencies to install:
 *   npx expo install react-native-reanimated react-native-gesture-handler
 *
 * Setup:
 *   1. Add 'react-native-reanimated/plugin' to babel.config.js plugins[]
 *   2. Wrap your app root with <GestureHandlerRootView style={{ flex: 1 }}>
 *   3. Import this component and drop it into your navigator
 *
 * Design decisions:
 *   - Max 12 "orbit" bubbles (favorites). Additional friends live in
 *     the friends list but don't orbit until a current orbiter is un-starred.
 *     This keeps the physics readable at any screen size.
 *   - Dragging a bubble flings it; it re-joins the orbit with the velocity
 *     of the throw as an angular offset, so a hard fling makes it spin fast.
 *   - The center bubble is slightly larger and pulses gently.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dimensions, FlatList, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withSpring, withTiming } from "react-native-reanimated";
import FriendProfileSheet from "./FriendProfileSheet";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_ORBIT = 12;
const { width: SW, height: SH } = Dimensions.get("window");
const CX = SW / 2;
const CY = SH / 2;

/** Orbit radii for each "ring". Bubbles pack outward as count grows. */
const ORBIT_RINGS: { maxCount: number; radius: number; bubbleR: number }[] = [
    { maxCount: 4, radius: 110, bubbleR: 36 },
    { maxCount: 12, radius: 185, bubbleR: 28 },
];

/** Base angular velocity in radians per second (alternates direction per ring). */
const BASE_OMEGA = 0.28;

const PALETTE = ["#7F77DD", "#1D9E75", "#D85A30", "#D4537E", "#378ADD", "#639922", "#BA7517", "#E24B4A", "#5DCAA5", "#AFA9EC", "#F0997B", "#9FE1CB"];

const SPRING = { damping: 18, stiffness: 180, mass: 1 };

// ─── Types ────────────────────────────────────────────────────────────────────

interface Friend {
    id: string;
    name: string;
    color: string;
    favorited: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");
}

function uid(): string {
    return Math.random().toString(36).slice(2, 9);
}

/**
 * Two rings max: inner holds up to 4, outer holds the rest (up to 8).
 * Total cap remains 12.
 */
function assignOrbits(count: number) {
    if (count === 0) return [];

    // All fit on the inner ring
    if (count <= ORBIT_RINGS[0].maxCount) {
        const spacing = (2 * Math.PI) / count;
        return Array.from({ length: count }, (_, i) => ({
            radius: ORBIT_RINGS[0].radius,
            bubbleR: ORBIT_RINGS[0].bubbleR,
            baseAngle: spacing * i,
            slotSpacing: spacing,
            omega: BASE_OMEGA,
        }));
    }

    // Split across inner (4) and outer (remainder, up to 8)
    const inner = 4;
    const outer = count - inner;
    const innerSpacing = (2 * Math.PI) / inner;
    const outerSpacing = (2 * Math.PI) / outer;
    return [
        ...Array.from({ length: inner }, (_, i) => ({
            radius: ORBIT_RINGS[0].radius,
            bubbleR: ORBIT_RINGS[0].bubbleR,
            baseAngle: innerSpacing * i,
            slotSpacing: innerSpacing,
            omega: BASE_OMEGA,
        })),
        ...Array.from({ length: outer }, (_, i) => ({
            radius: ORBIT_RINGS[1].radius,
            bubbleR: ORBIT_RINGS[1].bubbleR,
            baseAngle: outerSpacing * i,
            slotSpacing: outerSpacing,
            omega: -BASE_OMEGA * 0.7,
        })),
    ];
}

// ─── OrbitBubble ──────────────────────────────────────────────────────────────

interface OrbitBubbleProps {
    friend: Friend;
    radius: number;
    bubbleR: number;
    baseAngle: number;
    slotSpacing: number;
    omega: number;
    tick: number;
    onPress: (id: string) => void;
    onFlingLanded: (id: string, nearestN: number) => void;
}

function OrbitBubble({ friend, radius, bubbleR, baseAngle, slotSpacing, omega, tick, onPress, onFlingLanded }: OrbitBubbleProps) {
    const angleOffset = useSharedValue(0);
    const scale = useSharedValue(1);
    // Ref (not shared value) — only read on JS thread, guards the baseAngle effect
    const isDragging = useRef(false);

    const sharedTick = useSharedValue(tick);
    useEffect(() => {
        sharedTick.value = tick;
    }, [tick]);

    const sharedOmega = useSharedValue(omega);
    const sharedRadius = useSharedValue(radius);
    const sharedBaseAngle = useSharedValue(baseAngle);
    const sharedSlotSpacing = useSharedValue(slotSpacing);

    useEffect(() => {
        sharedOmega.value = omega;
        sharedRadius.value = radius;
        sharedSlotSpacing.value = slotSpacing;
    }, [omega, radius, slotSpacing]);

    // When parent shuffles this bubble's baseAngle, absorb the angular diff into
    // angleOffset so the bubble doesn't visually jump, then spring back to 0.
    // If the user is currently dragging this bubble, just silently update baseAngle.
    useEffect(() => {
        const diff = baseAngle - sharedBaseAngle.value;
        let norm = diff;
        while (norm > Math.PI) norm -= 2 * Math.PI;
        while (norm < -Math.PI) norm += 2 * Math.PI;
        sharedBaseAngle.value = baseAngle;
        if (!isDragging.current) {
            cancelAnimation(angleOffset);
            angleOffset.value = angleOffset.value - norm;
            angleOffset.value = withSpring(0, { damping: 24, stiffness: 90, mass: 1 });
        }
    }, [baseAngle]);

    const prevTouchAngle = useSharedValue(0);

    const setDragging = useCallback((val: boolean) => {
        isDragging.current = val;
    }, []);

    const gesture = Gesture.Pan()
        .onBegin(() => {
            runOnJS(setDragging)(true);
            cancelAnimation(angleOffset);
            scale.value = withSpring(1.18, SPRING);
            prevTouchAngle.value = sharedBaseAngle.value + sharedOmega.value * sharedTick.value + angleOffset.value;
        })
        .onUpdate((e) => {
            const touchAngle = Math.atan2(e.absoluteY - CY, e.absoluteX - CX);
            let delta = touchAngle - prevTouchAngle.value;
            if (delta > Math.PI) delta -= 2 * Math.PI;
            if (delta < -Math.PI) delta += 2 * Math.PI;
            angleOffset.value += delta;
            prevTouchAngle.value = touchAngle;
        })
        .onEnd((e) => {
            runOnJS(setDragging)(false);
            scale.value = withSpring(1, SPRING);

            const currentAngle = sharedBaseAngle.value + sharedOmega.value * sharedTick.value + angleOffset.value;

            const tx = -Math.sin(currentAngle);
            const ty = Math.cos(currentAngle);
            const tangentialSpeed = e.velocityX * tx + e.velocityY * ty;
            const flingOmega = tangentialSpeed / sharedRadius.value;
            const extraAngle = flingOmega * 1.2;
            const landingOffset = angleOffset.value + extraAngle;

            const spacing = sharedSlotSpacing.value;
            const nearestN = Math.round(landingOffset / spacing);
            const snappedOffset = nearestN * spacing;

            angleOffset.value = withTiming(landingOffset, { duration: 1600, easing: Easing.out(Easing.quad) }, (finished) => {
                if (finished) {
                    angleOffset.value = withSpring(snappedOffset, { damping: 22, stiffness: 120, mass: 1 }, (settled) => {
                        if (settled) {
                            runOnJS(onFlingLanded)(friend.id, nearestN);
                        }
                    });
                }
            });
        });

    const animStyle = useAnimatedStyle(() => {
        const angle = sharedBaseAngle.value + sharedOmega.value * sharedTick.value + angleOffset.value;
        const x = Math.cos(angle) * sharedRadius.value;
        const y = Math.sin(angle) * sharedRadius.value;
        return {
            transform: [{ translateX: x - bubbleR }, { translateY: y - bubbleR }, { scale: scale.value }],
        };
    });

    return (
        <GestureDetector gesture={gesture}>
            <Animated.View
                style={[
                    styles.bubble,
                    {
                        width: bubbleR * 2,
                        height: bubbleR * 2,
                        borderRadius: bubbleR,
                        backgroundColor: friend.color,
                        position: "absolute",
                        left: CX,
                        top: CY,
                    },
                    animStyle,
                ]}
            >
                <Pressable style={styles.bubbleInner} onPress={() => onPress(friend.id)}>
                    <Text style={[styles.bubbleInitials, { fontSize: bubbleR * 0.42 }]}>{initials(friend.name)}</Text>
                    <Text style={[styles.bubbleName, { fontSize: Math.max(9, bubbleR * 0.24) }]} numberOfLines={1}>
                        {friend.name.split(" ")[0]}
                    </Text>
                </Pressable>
            </Animated.View>
        </GestureDetector>
    );
}

// ─── CenterBubble ─────────────────────────────────────────────────────────────

function CenterBubble({ username }: { username: string }) {
    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(withTiming(1.06, { duration: 1800, easing: Easing.inOut(Easing.sin) }), withTiming(1.0, { duration: 1800, easing: Easing.inOut(Easing.sin) })),
            -1,
            false,
        );
    }, []);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
    }));

    const R = 56;
    return (
        <Animated.View
            style={[
                styles.centerBubble,
                {
                    width: R * 2,
                    height: R * 2,
                    borderRadius: R,
                    left: CX - R,
                    top: CY - R,
                },
                animStyle,
            ]}
        >
            <Text style={styles.centerInitials}>{initials(username)}</Text>
            <Text style={styles.centerName} numberOfLines={1}>
                {username.split(" ")[0]}
            </Text>
            <Text style={styles.centerLabel}>you</Text>
        </Animated.View>
    );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const SAMPLE_FRIENDS: Friend[] = [
    { id: uid(), name: "Alex Chen", color: PALETTE[0], favorited: true },
    { id: uid(), name: "Maya Singh", color: PALETTE[1], favorited: true },
    { id: uid(), name: "Jordan Lee", color: PALETTE[2], favorited: true },
    { id: uid(), name: "Sam Rivera", color: PALETTE[3], favorited: false },
];

export default function FriendsBubbles() {
    const [username] = useState("You"); // replace with real auth user name
    const [friends, setFriends] = useState<Friend[]>(SAMPLE_FRIENDS);
    const [modalVisible, setModalVisible] = useState(false);
    const [newName, setNewName] = useState("");
    const [listOpen, setListOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);

    // Global clock — drives all orbit animations without Reanimated shared clock
    const tick = useRef(0);
    const [tickState, setTickState] = useState(0);
    const rafRef = useRef<number | null>(null);
    const lastT = useRef<number | null>(null);

    useEffect(() => {
        const loop = (now: number) => {
            if (lastT.current !== null) {
                tick.current += (now - lastT.current) / 1000;
                setTickState(tick.current);
            }
            lastT.current = now;
            rafRef.current = requestAnimationFrame(loop);
        };
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const orbiters = useMemo(() => friends.filter((f) => f.favorited).slice(0, MAX_ORBIT), [friends]);

    const orbits = useMemo(() => assignOrbits(orbiters.length), [orbiters.length]);

    // Per-ring slot order: ringSlots[radius] = [id, id, id, ...]
    // Index in array = slot index. This is the single source of truth for who sits where.
    const ringSlots = useRef<Record<number, string[]>>({});

    // Rebuild ring slots when friends join/leave orbit (not on every fling)
    const prevOrbiterIds = useRef<string>("");
    useEffect(() => {
        const ids = orbiters.map((f) => f.id).join(",");
        if (ids === prevOrbiterIds.current) return;
        prevOrbiterIds.current = ids;

        const newSlots: Record<number, string[]> = {};
        orbits.forEach((o, i) => {
            if (!newSlots[o.radius]) newSlots[o.radius] = [];
            newSlots[o.radius].push(orbiters[i].id);
        });
        ringSlots.current = newSlots;
        // Force a re-render so baseAngles recompute
        setSlotVersion((v) => v + 1);
    }, [orbiters.map((f) => f.id).join(",")]);

    // Bump this to trigger re-render after a shuffle without changing friends state
    const [slotVersion, setSlotVersion] = useState(0);

    // Compute each orbiter's current baseAngle from ringSlots
    const baseAngles = useMemo(() => {
        const result: Record<string, number> = {};
        orbits.forEach((o, i) => {
            const id = orbiters[i]?.id;
            if (!id) return;
            const slots = ringSlots.current[o.radius];
            if (!slots) {
                result[id] = o.baseAngle;
                return;
            }
            const slotIdx = slots.indexOf(id);
            result[id] = slotIdx >= 0 ? slotIdx * o.slotSpacing : o.baseAngle;
        });
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orbiters, orbits, slotVersion]);

    // Called once a fling fully settles. nearestN is how many slots over from
    // its current slot the bubble landed (can be negative or > ringSize meaning wrapped).
    const handleFlingLanded = useCallback(
        (id: string, nearestN: number) => {
            if (nearestN === 0) return; // landed back in own slot, nothing to do

            const orbiterIdx = orbiters.findIndex((f) => f.id === id);
            if (orbiterIdx < 0) return;
            const radius = orbits[orbiterIdx].radius;
            const slots = ringSlots.current[radius];
            if (!slots || slots.length < 2) return;

            const n = slots.length;
            const currentSlot = slots.indexOf(id);
            if (currentSlot < 0) return;

            // Target slot, wrapped into ring
            const targetSlot = (((currentSlot + nearestN) % n) + n) % n;

            if (targetSlot === currentSlot) return;

            // Rotate the slots array so the flung bubble moves to targetSlot,
            // and everyone between shifts one slot in the opposite direction.
            // Strategy: splice the flung bubble out, then splice it into targetSlot.
            const updated = [...slots];
            updated.splice(currentSlot, 1); // remove from current
            updated.splice(targetSlot > currentSlot ? targetSlot - 1 : targetSlot, 0, id); // insert at target

            ringSlots.current = { ...ringSlots.current, [radius]: updated };
            setSlotVersion((v) => v + 1);
        },
        [orbiters, orbits],
    );

    const addFriend = useCallback(() => {
        if (!newName.trim()) return;
        const color = PALETTE[friends.length % PALETTE.length];
        const canOrbit = orbiters.length < MAX_ORBIT;
        setFriends((prev) => [...prev, { id: uid(), name: newName.trim(), color, favorited: canOrbit }]);
        setNewName("");
        setModalVisible(false);
    }, [newName, friends.length, orbiters.length]);

    const toggleFavorite = useCallback((id: string) => {
        setFriends((prev) => {
            const target = prev.find((f) => f.id === id)!;
            const currentOrbiters = prev.filter((f) => f.favorited).length;
            if (!target.favorited && currentOrbiters >= MAX_ORBIT) return prev; // cap
            return prev.map((f) => (f.id === id ? { ...f, favorited: !f.favorited } : f));
        });
    }, []);

    return (
        <View style={styles.screen}>
            {/* Subtle radial gradient background rings (decorative) */}
            <View style={styles.ring1} />
            <View style={styles.ring2} />
            <View style={styles.ring3} />

            {/* Orbit bubbles */}
            {orbiters.map((friend, i) => {
                const orbit = orbits[i];
                if (!orbit) return null;
                return (
                    <OrbitBubble
                        key={friend.id}
                        friend={friend}
                        tick={tickState}
                        onPress={(id) => {
                            const f = friends.find((f) => f.id === id) ?? null;
                            setSelectedFriend(f);
                            setProfileOpen(true);
                        }}
                        onFlingLanded={handleFlingLanded}
                        {...orbit}
                        baseAngle={baseAngles[friend.id] ?? orbit.baseAngle}
                    />
                );
            })}

            {/* Center bubble */}
            <CenterBubble username={username} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Friends</Text>
            </View>

            {/* Add button */}
            <Pressable style={styles.addBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.addBtnText}>＋</Text>
            </Pressable>

            <Pressable style={styles.listBtn} onPress={() => setListOpen(true)}>
                <Text style={styles.listBtnText}>≡ All Friends ({friends.length})</Text>
            </Pressable>

            {/* Hint */}
            <Text style={styles.hint}>Tap to star · drag along ring to spin · fling to speed up</Text>

            {/* Add friend modal */}
            <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
                <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
                    <Pressable style={styles.modalCard} onPress={() => {}}>
                        <Text style={styles.modalTitle}>Add friend</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Friend's name..."
                            placeholderTextColor="#888"
                            value={newName}
                            onChangeText={setNewName}
                            onSubmitEditing={addFriend}
                            autoFocus
                            maxLength={24}
                        />
                        <View style={styles.modalRow}>
                            <Pressable style={[styles.modalBtn, styles.modalCancel]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={[styles.modalBtn, styles.modalConfirm]} onPress={addFriend}>
                                <Text style={styles.modalConfirmText}>Add</Text>
                            </Pressable>
                        </View>
                        {orbiters.length >= MAX_ORBIT && (
                            <Text style={styles.capNote}>Orbit is full (12/12). New friend will be added to your list — unfavorite someone to bring them into orbit.</Text>
                        )}
                    </Pressable>
                </Pressable>
            </Modal>

            {/* All friends list modal */}
            <Modal visible={listOpen} transparent animationType="slide" onRequestClose={() => setListOpen(false)}>
                <Pressable style={styles.listOverlay} onPress={() => setListOpen(false)}>
                    <Pressable style={styles.listCard} onPress={() => {}}>
                        <View style={styles.listHeader}>
                            <Text style={styles.listTitle}>All friends</Text>
                            <Pressable onPress={() => setListOpen(false)}>
                                <Text style={styles.listClose}>✕</Text>
                            </Pressable>
                        </View>
                        <Text style={styles.listSub}>
                            Orbiting: {orbiters.length}/{MAX_ORBIT} · tap ★ to toggle orbit
                        </Text>
                        <FlatList
                            data={friends}
                            keyExtractor={(f) => f.id}
                            renderItem={({ item }) => (
                                <View style={styles.listRow}>
                                    <View style={[styles.listAvatar, { backgroundColor: item.color }]}>
                                        <Text style={styles.listAvatarText}>{initials(item.name)}</Text>
                                    </View>
                                    <Text style={styles.listName}>{item.name}</Text>
                                    <Pressable onPress={() => toggleFavorite(item.id)} style={styles.starBtn}>
                                        <Text style={[styles.star, item.favorited && styles.starActive]}>{item.favorited ? "★" : "☆"}</Text>
                                    </Pressable>
                                </View>
                            )}
                            style={styles.listFlatList}
                            contentContainerStyle={{ paddingBottom: 32 }}
                        />
                    </Pressable>
                </Pressable>
            </Modal>
            {/* Friend profile sheet */}
            <FriendProfileSheet
                visible={profileOpen}
                onClose={() => setProfileOpen(false)}
                friend={
                    selectedFriend
                        ? {
                              id: selectedFriend.id,
                              name: selectedFriend.name,
                              color: selectedFriend.color,
                              status: { kind: "online" }, // replace with real status data
                          }
                        : null
                }
            />
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: "#0D0D12",
    },

    // Background decoration rings
    ring1: {
        position: "absolute",
        width: 240,
        height: 240,
        borderRadius: 120,
        borderWidth: 0.5,
        borderColor: "rgba(127,119,221,0.15)",
        left: CX - 120,
        top: CY - 120,
    },
    ring2: {
        position: "absolute",
        width: 380,
        height: 380,
        borderRadius: 190,
        borderWidth: 0.5,
        borderColor: "rgba(127,119,221,0.09)",
        left: CX - 190,
        top: CY - 190,
    },
    ring3: {
        position: "absolute",
        width: 500,
        height: 500,
        borderRadius: 250,
        borderWidth: 0.5,
        borderColor: "rgba(127,119,221,0.05)",
        left: CX - 250,
        top: CY - 250,
    },

    // Center bubble
    centerBubble: {
        position: "absolute",
        backgroundColor: "#7F77DD",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#7F77DD",
        shadowOpacity: 0.55,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
        elevation: 12,
        zIndex: 10,
    },
    centerInitials: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "600",
        letterSpacing: 1,
    },
    centerName: {
        color: "rgba(255,255,255,0.85)",
        fontSize: 11,
        marginTop: 1,
        maxWidth: 90,
    },
    centerLabel: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 9,
        letterSpacing: 1.2,
        marginTop: 1,
        textTransform: "uppercase",
    },

    // Orbit bubbles
    bubble: {
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#000",
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 6,
        zIndex: 5,
    },
    bubbleInner: {
        flex: 1,
        width: "100%",
        alignItems: "center",
        justifyContent: "center",
    },
    bubbleInitials: {
        color: "#fff",
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    bubbleName: {
        color: "rgba(255,255,255,0.8)",
        marginTop: 1,
    },

    // Header
    header: {
        position: "absolute",
        top: Platform.OS === "ios" ? 56 : 24,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerTitle: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "600",
        letterSpacing: -0.5,
    },
    listBtn: {
        backgroundColor: "rgba(255,255,255,0.08)",
        borderRadius: 20,
        height: 52,
        justifyContent: "center",
        alignItems: "center",
        paddingVertical: 14,
        width: 300,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.15)",
        position: "absolute",
        bottom: Platform.OS === "ios" ? 48 : 32,
        left: 28,
    },
    listBtnText: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 18,
    },

    // Add button
    addBtn: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 48 : 32,
        right: 28,
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: "#7F77DD",
        alignItems: "center",
        justifyContent: "center",
        shadowColor: "#7F77DD",
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    addBtnText: {
        color: "#fff",
        fontSize: 26,
        lineHeight: 30,
    },

    // Hint
    hint: {
        position: "absolute",
        bottom: Platform.OS === "ios" ? 112 : 96,
        left: 0,
        right: 0,
        textAlign: "center",
        color: "rgba(255,255,255,0.2)",
        fontSize: 11,
        letterSpacing: 0.5,
    },

    // Add modal
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        alignItems: "center",
        justifyContent: "center",
    },
    modalCard: {
        width: SW * 0.84,
        backgroundColor: "#1A1A24",
        borderRadius: 20,
        padding: 24,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.1)",
    },
    modalTitle: {
        color: "#fff",
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 16,
    },
    modalInput: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        color: "#fff",
        fontSize: 16,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.12)",
        marginBottom: 16,
    },
    modalRow: {
        flexDirection: "row",
        gap: 10,
    },
    modalBtn: {
        flex: 1,
        borderRadius: 10,
        paddingVertical: 12,
        alignItems: "center",
    },
    modalCancel: {
        backgroundColor: "rgba(255,255,255,0.07)",
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.12)",
    },
    modalCancelText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 15,
    },
    modalConfirm: {
        backgroundColor: "#7F77DD",
    },
    modalConfirmText: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
    },
    capNote: {
        color: "rgba(255,180,80,0.8)",
        fontSize: 12,
        marginTop: 12,
        lineHeight: 17,
    },

    // Friends list modal
    listOverlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    listCard: {
        backgroundColor: "#13131C",
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        paddingHorizontal: 24,
        height: SH * 0.72,
        borderWidth: 0.5,
        borderBottomWidth: 0,
        borderColor: "rgba(255,255,255,0.1)",
    },
    listFlatList: {
        flex: 1,
        marginTop: 4,
    },
    listHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 4,
    },
    listTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "600",
    },
    listClose: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 18,
        padding: 4,
    },
    listSub: {
        color: "rgba(255,255,255,0.35)",
        fontSize: 12,
        marginBottom: 16,
    },
    listRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: "rgba(255,255,255,0.06)",
    },
    listAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    listAvatarText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "600",
    },
    listName: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
    },
    starBtn: {
        padding: 8,
    },
    star: {
        fontSize: 22,
        color: "rgba(255,255,255,0.25)",
    },
    starActive: {
        color: "#F0C050",
    },
});
