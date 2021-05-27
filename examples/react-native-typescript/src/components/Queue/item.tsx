import React from 'react'
import { Text, View } from 'react-native'
import { ShadowBox } from '../ShadowBox'
import { styles } from './style'

interface IProps {
  file: any
}

export function Item(props: IProps) {
  return (
    <ShadowBox level={1}>
      <View style={styles.item}>
        <Text>
          {JSON.stringify(props.file)}
        </Text>
      </View>
    </ShadowBox>
  )
}
