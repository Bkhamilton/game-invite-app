import React from "react";
import { Platform, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";
import GameRequestCard, { GameRequest } from "@/components/GameRequestCard";

// ─── Mock data ────────────────────────────────────────────────────────────────
// Replace with real data from your backend / state management layer.

const RECENT_REQUESTS: GameRequest[] = [
    {
        id: "1",
        gameName: "Valorant",
        // Placeholder image – swap for a real game cover URI or local asset.
        gameImage: { uri: "https://placehold.co/600x400/7F77DD/FFFFFF?text=Valorant" },
        requestedAt: "2 hours ago",
        friends: [
            { id: "f1", name: "Alex", color: "#7F77DD", status: "accepted" },
            { id: "f2", name: "Jordan", color: "#1D9E75", status: "pending" },
            { id: "f3", name: "Sam", color: "#D4537E", status: "rejected" },
        ],
    },
    {
        id: "2",
        gameName: "Rocket League",
        gameImage: { uri: "https://placehold.co/600x400/378ADD/FFFFFF?text=Rocket+League" },
        requestedAt: "Yesterday",
        friends: [
            { id: "f4", name: "Morgan", color: "#D85A30", status: "accepted" },
            { id: "f5", name: "Casey", color: "#639922", status: "accepted" },
        ],
    },
];

// ─── HomeScreen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
    return (
        <View style={styles.root}>
            <StatusBar barStyle="light-content" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Header ── */}
                <Text style={styles.screenTitle}>Home</Text>

                {/* ── Recent Requests ── */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Requests</Text>
                    <Text style={styles.sectionSubtitle}>Your last 2 game invites</Text>

                    {RECENT_REQUESTS.map((req) => (
                        <GameRequestCard key={req.id} request={req} />
                    ))}
                </View>

                {/* More dashboard sections will go here */}
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
    scrollContent: {
        paddingTop: Platform.OS === "ios" ? 60 : (StatusBar.currentHeight ?? 24) + 16,
        paddingHorizontal: 16,
        paddingBottom: 32,
    },
    screenTitle: {
        color: "#fff",
        fontSize: 30,
        fontWeight: "700",
        letterSpacing: -0.5,
        marginBottom: 28,
    },

    // Section
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        color: "#fff",
        fontSize: 20,
        fontWeight: "600",
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    sectionSubtitle: {
        color: "rgba(255,255,255,0.45)",
        fontSize: 13,
        marginBottom: 16,
    },
});

