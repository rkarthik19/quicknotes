import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { theme } from './src/theme';

import NotesScreen from './src/screens/NotesScreen';
import EditNoteScreen from './src/screens/EditNoteScreen';
import NoteDetailScreen from './src/screens/NoteDetailScreen';

const Stack = createNativeStackNavigator();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    Notifications.requestPermissionsAsync();
  }, []);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: theme.surface },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen
          name="Notes"
          component={NotesScreen}
          options={{ title: '⚡ QuickNotes' }}
        />
        <Stack.Screen name="EditNote" component={EditNoteScreen} />
        <Stack.Screen name="NoteDetail" component={NoteDetailScreen} options={{ title: 'Note' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
