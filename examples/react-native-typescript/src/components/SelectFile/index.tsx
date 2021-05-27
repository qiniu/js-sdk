import * as React from 'react'
import ImagePicker from 'react-native-image-crop-picker'
import { GestureResponderEvent, Pressable, Text, View } from 'react-native'
import { ShadowBox } from '../ShadowBox'
import { styles } from './style'


interface File {
  key: string
  name: string
  blob: Blob
}

interface IProps {
  onFile(file: File): void
}

enum State {
  Drop,
  Over,
  Leave
}

const shadowOpt = {
  x: 0,
  y: 3,
  border: 2,
  radius: 3,
  width: 100,
  height: 100,
  opacity: 0.2,
  color: "#000",
  style: { marginVertical: 5 }
}

export function SelectFile(props: IProps): React.ReactElement {
  const onPress = (_event: GestureResponderEvent) => {
    console.log(new Blob(['test']))
    ImagePicker.openPicker({ mediaType: "photo", includeBase64: true }).then(file => {
      if (file != null && file.data != null && file.filename != null) {
        props.onFile({
          name: file.filename,
          key: String(Date.now()),
          blob: new Blob([file.data])
        })
      }
    })
  }

  return (
    <Pressable onPress={onPress}>
      <ShadowBox level={4}>
        <View style={styles.selectButton}>
        <Text>选择文件</Text>
      </View>
      </ShadowBox>
    </Pressable>
  )
}
