/**
 * FriendProfileSheet.tsx
 *
 * A bottom-sheet style friend profile modal for a gaming activity tracker app.
 * Matches the dark aesthetic of FriendsBubbles.tsx.
 *
 * Dependencies (same as FriendsBubbles):
 *   npx expo install react-native-reanimated react-native-gesture-handler
 *
 * Usage:
 *   <FriendProfileSheet
 *     visible={profileOpen}
 *     onClose={() => setProfileOpen(false)}
 *     friend={selectedFriend}
 *   />
 */

import React, { useEffect } from "react";
import { Dimensions, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityStatus = { kind: "playing"; game: string } | { kind: "online" } | { kind: "away" } | { kind: "offline"; lastOnline: string }; // e.g. "2 hours ago"

export interface FriendProfile {
    id: string;
    name: string;
    /** Accent color used on their orbit bubble */
    color: string;
    /** Optional avatar URI. Falls back to initials bubble if not provided. */
    avatarUri?: string;
    status: ActivityStatus;
}

interface FriendProfileSheetProps {
    visible: boolean;
    onClose: () => void;
    friend: FriendProfile | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");

const STATUS_CONFIG: Record<ActivityStatus["kind"], { dot: string; label: (s: ActivityStatus) => string }> = {
    playing: {
        dot: "#1D9E75",
        label: (s) => `Playing ${(s as { kind: "playing"; game: string }).game}`,
    },
    online: {
        dot: "#1D9E75",
        label: () => "Online",
    },
    away: {
        dot: "#D4A017",
        label: () => "Away",
    },
    offline: {
        dot: "#555566",
        label: (s) => `Last online ${(s as { kind: "offline"; lastOnline: string }).lastOnline}`,
    },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");
}

// ─── StatusDot ────────────────────────────────────────────────────────────────

function StatusDot({ color, pulse }: { color: string; pulse: boolean }) {
    const scale = useSharedValue(1);

    useEffect(() => {
        if (pulse) {
            scale.value = withRepeat(
                withSequence(withTiming(1.5, { duration: 900, easing: Easing.inOut(Easing.sin) }), withTiming(1.0, { duration: 900, easing: Easing.inOut(Easing.sin) })),
                -1,
                false,
            );
        } else {
            scale.value = 1;
        }
    }, [pulse]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <View style={styles.dotWrapper}>
            {pulse && <Animated.View style={[styles.dotRing, { borderColor: color }, animStyle]} />}
            <View style={[styles.dot, { backgroundColor: color }]} />
        </View>
    );
}

// ─── AvatarBubble ─────────────────────────────────────────────────────────────

function AvatarBubble({ friend }: { friend: FriendProfile }) {
    const R = 52;

    if (friend.avatarUri) {
        return (
            <View
                style={[
                    styles.avatarContainer,
                    {
                        width: R * 2,
                        height: R * 2,
                        borderRadius: R,
                        borderColor: friend.color,
                    },
                ]}
            >
                <Image source={{ uri: friend.avatarUri }} style={{ width: R * 2, height: R * 2, borderRadius: R }} />
            </View>
        );
    }

    return (
        <View
            style={[
                styles.avatarInitials,
                {
                    width: R * 2,
                    height: R * 2,
                    borderRadius: R,
                    backgroundColor: friend.color,
                    shadowColor: friend.color,
                },
            ]}
        >
            <Text style={styles.avatarInitialsText}>{initials(friend.name)}</Text>
        </View>
    );
}

// ─── FriendProfileSheet ───────────────────────────────────────────────────────

export default function FriendProfileSheet({ visible, onClose, friend }: FriendProfileSheetProps) {
    if (!friend) return null;

    const statusCfg = STATUS_CONFIG[friend.status.kind];
    const statusLabel = statusCfg.label(friend.status);
    const isActive = friend.status.kind === "playing" || friend.status.kind === "online";
    const isPlaying = friend.status.kind === "playing";

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            {/* Backdrop */}
            <Pressable style={styles.overlay} onPress={onClose}>
                {/* Sheet — inner Pressable swallows taps so backdrop close still works */}
                <Pressable style={styles.sheet} onPress={() => {}}>
                    {/* Drag handle */}
                    <View style={styles.handle} />

                    {/* Avatar + status dot */}
                    <View style={styles.avatarRow}>
                        <AvatarBubble friend={friend} />
                        <View style={styles.statusDotAbsolute}>
                            <StatusDot color={statusCfg.dot} pulse={isActive} />
                        </View>
                    </View>

                    {/* Username */}
                    <Text style={styles.username}>{friend.name}</Text>

                    {/* Status pill */}
                    <View style={[styles.statusPill, isPlaying && styles.statusPillPlaying]}>
                        <View style={[styles.pillDot, { backgroundColor: statusCfg.dot }]} />
                        <Text style={[styles.statusText, isPlaying && styles.statusTextPlaying]} numberOfLines={1}>
                            {statusLabel}
                        </Text>
                    </View>

                    {/* Divider */}
                    <View style={styles.divider} />

                    {/* Close button */}
                    <Pressable style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>Close</Text>
                    </Pressable>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: "flex-end",
    },
    sheet: {
        backgroundColor: "#13131C",
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 12,
        paddingBottom: Platform.OS === "ios" ? 42 : 28,
        paddingHorizontal: 28,
        alignItems: "center",
        borderWidth: 0.5,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        borderColor: "rgba(255,255,255,0.1)",
        // subtle inner shadow via shadow
        shadowColor: "#000",
        shadowOpacity: 0.6,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: -4 },
        elevation: 16,
        marginBottom: "60%",
    },

    // Handle
    handle: {
        width: 38,
        height: 4,
        borderRadius: 2,
        backgroundColor: "rgba(255,255,255,0.15)",
        marginBottom: 28,
    },

    // Avatar
    avatarRow: {
        position: "relative",
        marginBottom: 16,
    },
    avatarContainer: {
        borderWidth: 2,
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    avatarInitials: {
        alignItems: "center",
        justifyContent: "center",
        shadowOpacity: 0.5,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 0 },
        elevation: 10,
    },
    avatarInitialsText: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "600",
        letterSpacing: 1,
    },

    // Status dot (overlaid on avatar, bottom-right)
    statusDotAbsolute: {
        position: "absolute",
        bottom: 2,
        right: 2,
    },
    dotWrapper: {
        width: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: "#13131C",
    },
    dotRing: {
        position: "absolute",
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1.5,
        opacity: 0.5,
    },

    // Name
    username: {
        color: "#fff",
        fontSize: 22,
        fontWeight: "600",
        letterSpacing: -0.3,
        marginBottom: 12,
    },

    // Status pill
    statusPill: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 20,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.12)",
        gap: 8,
        maxWidth: SW * 0.72,
    },
    statusPillPlaying: {
        backgroundColor: "rgba(29,158,117,0.12)",
        borderColor: "rgba(29,158,117,0.3)",
    },
    pillDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 14,
        flexShrink: 1,
    },
    statusTextPlaying: {
        color: "rgba(29,158,117,0.95)",
        fontWeight: "500",
    },

    // Divider
    divider: {
        width: "100%",
        height: 0.5,
        backgroundColor: "rgba(255,255,255,0.07)",
        marginTop: 28,
        marginBottom: 20,
    },

    // Close
    closeBtn: {
        width: "100%",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: "center",
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.12)",
    },
    closeBtnText: {
        color: "rgba(255,255,255,0.55)",
        fontSize: 15,
        fontWeight: "500",
    },
});
