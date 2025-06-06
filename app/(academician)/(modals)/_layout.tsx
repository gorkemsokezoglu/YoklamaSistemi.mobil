import { Stack } from 'expo-router';
import { StyleSheet } from 'react-native';

export default function ModalsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                presentation: 'modal',
                headerStyle: {
                    backgroundColor: '#fff'
                },
            }}
        >
            <Stack.Screen
                name="course-detail"
            />
        </Stack>
    );
}

const styles = StyleSheet.create({}); 