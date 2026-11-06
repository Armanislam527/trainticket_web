import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RailwaySessionBridge } from '@/components/RailwaySessionBridge';
import { useRailwaySession } from '@/lib/railwaySession';

function PortalHost() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const session = useRailwaySession();
  const visible = pathname.includes('ticket-booking');

  return (
    <View
      collapsable={false}
      pointerEvents={visible ? 'auto' : 'none'}
      style={
        visible
          ? [styles.portal, { top: insets.top + 56, bottom: insets.bottom + 72 }]
          : styles.hiddenPortal
      }
    >
      {visible ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            {session.hasAuthorization
              ? 'Session captured. You can search seats from the other tabs.'
              : 'Log in if needed, then run one search on this page so the app can reuse the site session.'}
          </Text>
        </View>
      ) : null}
      <RailwaySessionBridge />
    </View>
  );
}

export default function RootLayout() {
  return (
    <View style={styles.root}>
    <StatusBar style="light" />
    <Tabs
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1b4332',
        },
        headerTintColor: '#f4fff8',
        headerTitleStyle: {
          fontWeight: '700',
          color: '#f4fff8',
        },
        headerShadowVisible: false,
        tabBarActiveTintColor: '#ffe8a3',
        tabBarInactiveTintColor: '#95d5b2',
        tabBarStyle: {
          backgroundColor: '#0d2818',
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="availability"
        options={{
          title: 'Seats',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="trains"
        options={{
          title: 'Trains',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="train" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ticket-booking"
        options={{
          title: 'Portal',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="train/[number]"
        options={{
          href: null,
          title: 'Train schedule',
        }}
      />
    </Tabs>
    <PortalHost />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  portal: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: '#ffffff',
  },
  hiddenPortal: {
    position: 'absolute',
    width: 420,
    height: 800,
    left: -2400,
    top: 0,
    opacity: 0.02,
  },
  banner: {
    backgroundColor: '#d8f3dc',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#b7e4c7',
  },
  bannerText: {
    fontSize: 12,
    color: '#1b4332',
    fontWeight: '600',
    textAlign: 'center',
  },
});