import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import LibraryScreen from './src/screens/LibraryScreen';
import ReaderScreen from './src/screens/ReaderScreen';

export type RootStackParamList = {
  Library: undefined;
  Reader: { docId: string; title: string };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#1a1a24' },
          headerTintColor: '#e2e2f0',
          headerTitleStyle: { fontWeight: '700', fontSize: 16 },
          cardStyle: { backgroundColor: '#0f0f13' },
        }}
      >
        <Stack.Screen
          name="Library"
          component={LibraryScreen}
          options={{
            title: '👑 CrownLibrary',
            headerTitleStyle: { fontSize: 18, fontWeight: '800' },
          }}
        />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
