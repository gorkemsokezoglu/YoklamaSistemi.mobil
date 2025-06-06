import { Stack } from 'expo-router';

export default function ModalsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                presentation: 'modal',
            }}
        >
            <Stack.Screen
                name="course-detail"
                options={{
                    title: 'Ders Detayı',
                }}
            />
        </Stack>
    );
} 