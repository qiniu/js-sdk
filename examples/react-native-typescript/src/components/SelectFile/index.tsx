import * as React from 'react'
import ImagePicker from 'react-native-image-crop-picker'
import { GestureResponderEvent, Pressable, Text, View } from 'react-native'

interface IProps {
  onFile(file: any): void
}

enum State {
  Drop,
  Over,
  Leave
}

export function SelectFile(props: IProps): React.ReactElement {
  const [state, setState] = React.useState<State | null>(null)
  const inputRef = React.useRef<HTMLInputElement | null>(null)

  const onPress = (event: GestureResponderEvent) => {
    console.log(new Blob(['test']))
    ImagePicker.openPicker({}).then(console.log)
  }

  return (
    <Pressable onPress={onPress}>
      <View >
        <Text>选择文件</Text>
      </View>
    </Pressable>
  )
}
