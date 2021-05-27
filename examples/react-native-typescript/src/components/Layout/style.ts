import { StyleSheet } from 'react-native'

export const styles = StyleSheet.create({
  main: {
    display: 'flex',
    minHeight: '100%',
    alignItems: 'center',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,.1)'
  },

  list: {
    flex: 1,
    width: '100%'
  },

  select: {
    top: -80,
    position: 'relative'
  }
})
