import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AcademicianLayout() {
    const theme = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#11263E',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 60 + insets.bottom,
                    paddingBottom: 8 + insets.bottom,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: '#D4AF37',
                tabBarInactiveTintColor: '#FFFFFF',
                tabBarLabelStyle: {
                    fontSize: 12,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: 'Ana Sayfa',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="my-courses"
                options={{
                    title: 'Derslerim',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="book-education" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="course-selection"
                options={{
                    title: 'Ders Seç',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="plus-box" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="notifications"
                options={{
                    title: 'Bildirimler',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="bell" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profil',
                    tabBarIcon: ({ color, size }) => (
                        <MaterialCommunityIcons name="account" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="(modals)"
                options={{
                    tabBarStyle: { display: 'none' },
                    tabBarItemStyle: { display: 'none' }
                }}
            />
        </Tabs>
    );
} 