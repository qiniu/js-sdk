import React from 'react'
import { StyleSheet, View } from 'react-native'

interface IProps {
  level: 1 | 2 | 3 | 4
  children: React.ReactChild
}

export function ShadowBox(props: IProps) {
  const children = props.children

  const style = React.useMemo(() => StyleSheet.create({
    shadow: {
      elevation: props.level,
      shadowColor: 'rgba(0,0,0,0.2)',
      shadowRadius: 5 * props.level,
      shadowOpacity: 1 - (0.1 * (5 - props.level)),
      shadowOffset: { height: 4 * props.level, width: 0 },
    }
  }), [props.level])


  return (
    <View style={style.shadow}>
      {children}
    </View>
  )
}
