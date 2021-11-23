import * as React from 'react'

import classnames from './style.less'

interface IProps {
  value: string
  onChange(v: string): void

  placeholder?: string | undefined
}

export function Input(props: IProps) {
  return (
    <input
      type="text"
      value={props.value}
      className={classnames.input}
      placeholder={props.placeholder}
      onChange={e => props.onChange(e.target.value)} />
  )
}
