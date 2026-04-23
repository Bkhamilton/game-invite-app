import { GestureHandlerRootView } from "react-native-gesture-handler";
import FriendsBubbles from "@/components/FriendsBubbles";

export default function FriendsScreen() {
    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <FriendsBubbles />
        </GestureHandlerRootView>
    );
}
