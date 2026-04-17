import { StyleSheet } from "react-native";
import FriendsBubbles from "@/components/FriendsBubbles";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function HomeScreen() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <FriendsBubbles />
        </GestureHandlerRootView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
    },
});
