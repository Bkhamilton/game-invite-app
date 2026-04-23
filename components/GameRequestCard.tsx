/**
 * GameRequestCard.tsx
 *
 * A card that displays a single game request made by the user.
 * The game image fills most of the card background.
 * At the bottom: time requested, friend avatar bubbles with
 * a per-friend status icon (✓ accepted · ✗ rejected · ⏰ pending).
 */

import React from "react";
import { Dimensions, Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RequestStatus = "accepted" | "rejected" | "pending";

export interface RequestedFriend {
    id: string;
    name: string;
    /** Accent color used for the avatar bubble */
    color: string;
    avatarUri?: string;
    status: RequestStatus;
}

export interface GameRequest {
    id: string;
    gameName: string;
    gameImage: ImageSourcePropType;
    requestedAt: string; // human-readable, e.g. "2 hours ago"
    friends: RequestedFriend[];
}

interface GameRequestCardProps {
    request: GameRequest;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SW } = Dimensions.get("window");
const CARD_WIDTH = SW - 32; // 16 px margin each side
const CARD_HEIGHT = CARD_WIDTH * 0.62;

const STATUS_ICONS: Record<RequestStatus, { symbol: string; color: string }> = {
    accepted: { symbol: "✓", color: "#1D9E75" },
    rejected: { symbol: "✗", color: "#E24B4A" },
    pending:  { symbol: "⏰", color: "#D4A017" },
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

// ─── FriendBadge ──────────────────────────────────────────────────────────────

function FriendBadge({ friend }: { friend: RequestedFriend }) {
    const icon = STATUS_ICONS[friend.status];

    return (
        <View style={styles.badgeWrapper}>
            {/* Avatar bubble */}
            <View style={[styles.avatarBubble, { backgroundColor: friend.color }]}>
                {friend.avatarUri ? (
                    <Image source={{ uri: friend.avatarUri }} style={styles.avatarImage} />
                ) : (
                    <Text style={styles.avatarInitials}>{initials(friend.name)}</Text>
                )}
            </View>

            {/* Status icon chip */}
            <View style={[styles.statusChip, { backgroundColor: icon.color + "33", borderColor: icon.color + "88" }]}>
                <Text style={[styles.statusIcon, { color: icon.color }]}>{icon.symbol}</Text>
            </View>
        </View>
    );
}

// ─── GameRequestCard ──────────────────────────────────────────────────────────

export default function GameRequestCard({ request }: GameRequestCardProps) {
    return (
        <View style={styles.card}>
            {/* Game image — fills the card */}
            <Image source={request.gameImage} style={styles.gameImage} resizeMode="cover" />

            {/* Gradient-like dark overlay at the bottom */}
            <View style={styles.overlay} />

            {/* Content row pinned to the bottom */}
            <View style={styles.bottomRow}>
                {/* Left: game name + time */}
                <View style={styles.textBlock}>
                    <Text style={styles.gameName} numberOfLines={1}>
                        {request.gameName}
                    </Text>
                    <Text style={styles.timeLabel}>{request.requestedAt}</Text>
                </View>

                {/* Right: friend badges */}
                <View style={styles.friendsRow}>
                    {request.friends.slice(0, 4).map((f) => (
                        <FriendBadge key={f.id} friend={f} />
                    ))}
                    {request.friends.length > 4 && (
                        <View style={styles.moreBadge}>
                            <Text style={styles.moreText}>+{request.friends.length - 4}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#1A1A28",
        marginBottom: 16,
        // card shadow
        shadowColor: "#000",
        shadowOpacity: 0.5,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    },
    gameImage: {
        ...StyleSheet.absoluteFillObject,
    },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        // dark gradient-like scrim — stronger at the bottom
        backgroundColor: "transparent",
        // We simulate a gradient with a layered approach:
        // bottom half is opaque-ish, top is transparent.
        // React Native doesn't natively support gradients, so we use a
        // semi-transparent black that covers the full card.
        background: "linear-gradient(to top, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.0) 55%)",
    } as any,
    bottomRow: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingBottom: 14,
        paddingTop: 40,
        // Mimic gradient with a background that fades from transparent at top
        // to a dark color at bottom.
        backgroundColor: "rgba(0,0,0,0.55)",
    },

    // Text block
    textBlock: {
        flex: 1,
        marginRight: 12,
    },
    gameName: {
        color: "#fff",
        fontSize: 17,
        fontWeight: "700",
        letterSpacing: -0.2,
        textShadowColor: "rgba(0,0,0,0.8)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    timeLabel: {
        color: "rgba(255,255,255,0.6)",
        fontSize: 12,
        marginTop: 2,
        textShadowColor: "rgba(0,0,0,0.7)",
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },

    // Friend badges
    friendsRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    badgeWrapper: {
        alignItems: "center",
        gap: 4,
    },
    avatarBubble: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.25)",
    },
    avatarImage: {
        width: 36,
        height: 36,
        borderRadius: 18,
    },
    avatarInitials: {
        color: "#fff",
        fontSize: 13,
        fontWeight: "600",
    },
    statusChip: {
        borderRadius: 8,
        paddingHorizontal: 5,
        paddingVertical: 1,
        borderWidth: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    statusIcon: {
        fontSize: 10,
        fontWeight: "700",
    },

    // "more friends" badge
    moreBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "rgba(255,255,255,0.15)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: "rgba(255,255,255,0.25)",
    },
    moreText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "600",
    },
});
