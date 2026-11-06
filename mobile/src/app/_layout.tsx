import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#1b4d3e',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: '#f5f7f8',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Railway Dashboard',
          }}
        />
        <Stack.Screen
          name="ticket-booking"
          options={{
            title: 'Railway Session Portal',
          }}
        />
        <Stack.Screen
          name="availability"
          options={{
            title: 'Seat Availability',
          }}
        />
        <Stack.Screen
          name="train/[number]"
          options={{
            title: 'Train Details',
          }}
        />
      </Stack>
    </>
  );
}