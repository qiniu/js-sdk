import React from 'react'
import { View } from 'react-native'
import { Colors } from 'react-native/Libraries/NewAppScreen'
import { SafeAreaView, StatusBar } from 'react-native'
import { SelectFile } from '../SelectFile'
import { styles } from './style'
import { Queue } from '../Queue'

export function Layout() {
  return (
    <SafeAreaView style={Colors.darker}>
      {/* <StatusBar barStyle="dark-content" /> */}
      <View style={styles.main}>
        <View style={styles.list}>
          <Queue />
        </View>
        <View style={styles.select}>
          <SelectFile onFile={console.log} />
        </View>
      </View>
    </SafeAreaView>
  )
}
