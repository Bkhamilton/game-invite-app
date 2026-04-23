/**
 * send.tsx
 *
 * Send / Direct Messages screen.
 * Displays 1:1 DMs and group chats in a list, similar to Instagram / TikTok DMs.
 * All data is hardcoded for now.
 */

import FontAwesome from "@expo/vector-icons/FontAwesome";
import React, { useState } from "react";
import {
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
    id: string;
    name: string;
    /** Accent color used for the avatar bubble */
    color: string;
    avatarUri?: string;
}

interface Conversation {
    id: string;
    /** "dm" = 1:1, "group" = multiple participants */
    type: "dm" | "group";
    /** Display name — free-form for groups, auto-derived for DMs */
    name: string;
    participants: Participant[];
    lastMessage: string;
    /** Short human-readable timestamp, e.g. "2m", "Yesterday" */
    timestamp: string;
    unread: boolean;
    unreadCount?: number;
}

// ─── Hardcoded data ───────────────────────────────────────────────────────────

const CONVERSATIONS: Conversation[] = [
    {
        id: "1",
        type: "dm",
        name: "Alex Rivera",
        participants: [{ id: "p1", name: "Alex Rivera", color: "#7F77DD" }],
        lastMessage: "Are you down to play tonight? 🎮",
        timestamp: "2m",
        unread: true,
        unreadCount: 3,
    },
    {
        id: "2",
        type: "group",
        name: "Valorant Squad",
        participants: [
            { id: "p2", name: "Jordan", color: "#1D9E75" },
            { id: "p3", name: "Sam", color: "#D4537E" },
            { id: "p4", name: "Casey", color: "#D85A30" },
        ],
        lastMessage: "Jordan: gg wp, rematch? 🔥",
        timestamp: "15m",
        unread: true,
        unreadCount: 7,
    },
    {
        id: "3",
        type: "dm",
        name: "Morgan Lee",
        participants: [{ id: "p5", name: "Morgan Lee", color: "#D4A017" }],
        lastMessage: "I just unlocked that new skin 👀",
        timestamp: "1h",
        unread: false,
    },
    {
        id: "4",
        type: "group",
        name: "Rocket League Bros",
        participants: [
            { id: "p6", name: "Riley", color: "#378ADD" },
            { id: "p7", name: "Drew", color: "#9B59B6" },
            { id: "p8", name: "Jamie", color: "#E67E22" },
            { id: "p9", name: "Quinn", color: "#27AE60" },
        ],
        lastMessage: "Drew: anyone up for ranked?",
        timestamp: "3h",
        unread: true,
        unreadCount: 2,
    },
    {
        id: "5",
        type: "dm",
        name: "Taylor Kim",
        participants: [{ id: "p10", name: "Taylor Kim", color: "#E74C3C" }],
        lastMessage: "Good game earlier! 🏆",
        timestamp: "Yesterday",
        unread: false,
    },
    {
        id: "6",
        type: "group",
        name: "Friday Night Crew",
        participants: [
            { id: "p11", name: "Avery", color: "#1ABC9C" },
            { id: "p12", name: "Blake", color: "#F39C12" },
        ],
        lastMessage: "Avery: Same time this Friday?",
        timestamp: "Yesterday",
        unread: false,
    },
    {
        id: "7",
        type: "dm",
        name: "Jordan Park",
        participants: [{ id: "p13", name: "Jordan Park", color: "#1D9E75" }],
        lastMessage: "You: Let's run it back tomorrow",
        timestamp: "2d",
        unread: false,
    },
    {
        id: "8",
        type: "group",
        name: "CoD Warzone Team",
        participants: [
            { id: "p14", name: "Chris", color: "#C0392B" },
            { id: "p15", name: "Dana", color: "#8E44AD" },
            { id: "p16", name: "Evan", color: "#2980B9" },
        ],
        lastMessage: "Chris: Drop at Downtown, no discussion 😤",
        timestamp: "3d",
        unread: false,
    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
    return name
        .trim()
        .split(/\s+/)
        .map((w) => w[0]?.toUpperCase() ?? "")
        .slice(0, 2)
        .join("");
}

// ─── AvatarBubble ─────────────────────────────────────────────────────────────

function AvatarBubble({
    participant,
    size = 52,
    style,
}: {
    participant: Participant;
    size?: number;
    style?: object;
}) {
    return (
        <View
            style={[
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: participant.color,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 2,
                    borderColor: "#0D0D16",
                },
                style,
            ]}
        >
            <Text style={{ color: "#fff", fontSize: size * 0.33, fontWeight: "600" }}>
                {initials(participant.name)}
            </Text>
        </View>
    );
}

// ─── GroupAvatarStack ─────────────────────────────────────────────────────────

/** Shows up to 3 overlapping bubbles for a group chat */
function GroupAvatarStack({ participants }: { participants: Participant[] }) {
    const visible = participants.slice(0, 3);
    const BUBBLE = 34;
    const OVERLAP = 10;
    const totalWidth = BUBBLE + (visible.length - 1) * (BUBBLE - OVERLAP);

    return (
        <View style={{ width: totalWidth, height: BUBBLE }}>
            {visible.map((p, i) => (
                <AvatarBubble
                    key={p.id}
                    participant={p}
                    size={BUBBLE}
                    style={{
                        position: "absolute",
                        left: i * (BUBBLE - OVERLAP),
                        zIndex: visible.length - i,
                    }}
                />
            ))}
        </View>
    );
}

// ─── UnreadBadge ──────────────────────────────────────────────────────────────

function UnreadBadge({ count }: { count: number }) {
    const label = count > 99 ? "99+" : String(count);
    return (
        <View style={styles.badge}>
            <Text style={styles.badgeText}>{label}</Text>
        </View>
    );
}

// ─── ConversationRow ──────────────────────────────────────────────────────────

function ConversationRow({ conversation: c }: { conversation: Conversation }) {
    return (
        <Pressable
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            android_ripple={{ color: "rgba(255,255,255,0.05)" }}
        >
            {/* Avatar area */}
            <View style={styles.avatarArea}>
                {c.type === "dm" ? (
                    <AvatarBubble participant={c.participants[0]} size={52} />
                ) : (
                    <GroupAvatarStack participants={c.participants} />
                )}
                {/* Online dot for DMs — shown only when unread to keep it simple */}
                {c.type === "dm" && c.unread && <View style={styles.onlineDot} />}
            </View>

            {/* Text content */}
            <View style={styles.textArea}>
                <View style={styles.nameRow}>
                    {c.type === "group" && (
                        <FontAwesome
                            name="users"
                            size={11}
                            color="rgba(255,255,255,0.4)"
                            style={{ marginRight: 5 }}
                        />
                    )}
                    <Text
                        style={[styles.nameText, c.unread && styles.nameTextUnread]}
                        numberOfLines={1}
                    >
                        {c.name}
                    </Text>
                </View>
                <Text
                    style={[styles.lastMessage, c.unread && styles.lastMessageUnread]}
                    numberOfLines={1}
                >
                    {c.lastMessage}
                </Text>
            </View>

            {/* Right side: timestamp + unread badge */}
            <View style={styles.rightArea}>
                <Text style={[styles.timestamp, c.unread && styles.timestampUnread]}>
                    {c.timestamp}
                </Text>
                {c.unread && c.unreadCount != null && c.unreadCount > 0 && (
                    <UnreadBadge count={c.unreadCount} />
                )}
            </View>
        </Pressable>
    );
}

// ─── SendScreen ───────────────────────────────────────────────────────────────

export default function SendScreen() {
    const [searchQuery, setSearchQuery] = useState("");

    const filtered = CONVERSATIONS.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const unreadTotal = CONVERSATIONS.reduce((n, c) => n + (c.unreadCount ?? 0), 0);

    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />

            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.screenTitle}>Messages</Text>
                    {unreadTotal > 0 && (
                        <Text style={styles.unreadSummary}>{unreadTotal} unread</Text>
                    )}
                </View>
                <Pressable
                    style={({ pressed }) => [styles.composeBtn, pressed && { opacity: 0.7 }]}
                    hitSlop={8}
                >
                    <FontAwesome name="edit" size={20} color="#fff" />
                </Pressable>
            </View>

            {/* ── Search ── */}
            <View style={styles.searchWrapper}>
                <FontAwesome
                    name="search"
                    size={14}
                    color="rgba(255,255,255,0.35)"
                    style={styles.searchIcon}
                />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search messages…"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    returnKeyType="search"
                    autoCapitalize="none"
                    autoCorrect={false}
                />
                {searchQuery.length > 0 && (
                    <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                        <FontAwesome name="times-circle" size={14} color="rgba(255,255,255,0.35)" />
                    </Pressable>
                )}
            </View>

            {/* ── Conversation list ── */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
            >
                {filtered.length === 0 ? (
                    <View style={styles.emptyState}>
                        <FontAwesome name="inbox" size={40} color="rgba(255,255,255,0.15)" />
                        <Text style={styles.emptyText}>No conversations found</Text>
                    </View>
                ) : (
                    filtered.map((c) => <ConversationRow key={c.id} conversation={c} />)
                )}
            </ScrollView>
        </View>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: "#0D0D16",
    },

    // Header
    header: {
        paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 24) + 16,
        paddingHorizontal: 20,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
    },
    screenTitle: {
        color: "#fff",
        fontSize: 30,
        fontWeight: "700",
        letterSpacing: -0.5,
    },
    unreadSummary: {
        color: "#7F77DD",
        fontSize: 13,
        fontWeight: "500",
        marginTop: 2,
    },
    composeBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.08)",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.12)",
    },

    // Search
    searchWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.07)",
        borderRadius: 14,
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderWidth: 0.5,
        borderColor: "rgba(255,255,255,0.1)",
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        color: "#fff",
        fontSize: 15,
        padding: 0,
    },

    // List
    listContent: {
        paddingTop: 4,
        paddingBottom: 32,
    },

    // Row
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    rowPressed: {
        backgroundColor: "rgba(255,255,255,0.04)",
    },
    avatarArea: {
        position: "relative",
        marginRight: 14,
        width: 58,
        alignItems: "flex-start",
        justifyContent: "center",
    },
    onlineDot: {
        position: "absolute",
        bottom: 1,
        right: 1,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: "#1D9E75",
        borderWidth: 2,
        borderColor: "#0D0D16",
    },
    textArea: {
        flex: 1,
        marginRight: 8,
    },
    nameRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 3,
    },
    nameText: {
        color: "rgba(255,255,255,0.75)",
        fontSize: 15,
        fontWeight: "500",
        flexShrink: 1,
    },
    nameTextUnread: {
        color: "#fff",
        fontWeight: "700",
    },
    lastMessage: {
        color: "rgba(255,255,255,0.38)",
        fontSize: 13,
    },
    lastMessageUnread: {
        color: "rgba(255,255,255,0.65)",
        fontWeight: "500",
    },
    rightArea: {
        alignItems: "flex-end",
        gap: 6,
        minWidth: 44,
    },
    timestamp: {
        color: "rgba(255,255,255,0.35)",
        fontSize: 12,
    },
    timestampUnread: {
        color: "#7F77DD",
        fontWeight: "600",
    },

    // Unread badge
    badge: {
        backgroundColor: "#7F77DD",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 5,
    },
    badgeText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },

    // Empty state
    emptyState: {
        alignItems: "center",
        marginTop: 80,
        gap: 14,
    },
    emptyText: {
        color: "rgba(255,255,255,0.25)",
        fontSize: 15,
    },
});
