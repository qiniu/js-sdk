import * as React from 'react'

import classnames from './style.less'

interface IProps {
  onChange(v: string): void
  value: string

  placeholder?: string
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
