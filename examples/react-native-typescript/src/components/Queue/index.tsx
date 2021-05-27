import React from 'react'
import { ScrollView, Text } from 'react-native'
import { Item } from './item'

import { styles } from './style'

export function Queue() {
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {Array(100).fill(0).map((_, index) => {
        return <Item key={index} file={index} />
      })}
    </ScrollView>
  )
}
