import React from 'react'
import { Colors } from 'react-native/Libraries/NewAppScreen'
import { SafeAreaView, ScrollView, StatusBar } from 'react-native'
import { SelectFile } from './components/SelectFile'

export const App = () => {
  return (
    <SafeAreaView style={Colors.darker}>
      <StatusBar barStyle="dark-content" />
      <ScrollView style={Colors.darker}>
        <SelectFile onFile={console.log} />
      </ScrollView>
    </SafeAreaView>
  )
}
