import { BaseSyntheticEvent, ReactElement, useCallback } from 'react'

import AutoFixHighRoundedIcon from '@mui/icons-material/AutoFixHighRounded'

import { terms } from '../constants'
import { magicExplain, PromptType } from './magicExplain'

interface MagicToolboxProps {
  className?: string
  children: ReactElement | ReactElement[]
  zoom: number
}
export const MagicToolbox = ({
  className,
  children,
  zoom,
}: MagicToolboxProps) => {
  return (
    <div
      className={`magic-toolbox${className ? ` ${className}` : ''}`}
      style={{
        transform: `scale(${1 / zoom})`,
      }}
      onClick={e => {
        e.stopPropagation()
      }}
    >
      {children}
    </div>
  )
}

interface MagicToolboxItemProps {
  title?: string
  children: ReactElement
}
export const MagicToolboxItem = ({
  title,
  children,
}: MagicToolboxItemProps) => {
  return (
    <div className="magic-toolbox-item">
      {title && <span className="magic-toolbox-item-title">{title}</span>}
      {/* <div className="magic-toolbox-item-content">{children}</div> */}
      {children}
    </div>
  )
}

interface MagicToolboxButtonProps {
  content: ReactElement | string
  onClick?: () => void
  preventDefault?: boolean
}
export const MagicToolboxButton = ({
  content,
  onClick,
  preventDefault = true,
}: MagicToolboxButtonProps) => {
  // handle click
  const handleOnClick = useCallback(
    (e: BaseSyntheticEvent) => {
      if (preventDefault) {
        e.preventDefault()
        e.stopPropagation()
      }
      onClick && onClick()
    },
    [onClick, preventDefault]
  )

  return (
    <button className="magic-toolbox-button" onClick={handleOnClick}>
      {content}
    </button>
  )
}

interface MagicAskItemProps {
  prompt: PromptType
}
export const MagicAskItem = ({ prompt }: MagicAskItemProps) => {
  return (
    <MagicToolboxItem title={`ask ${terms.gpt}`}>
      <MagicToolboxButton
        content={
          <>
            <AutoFixHighRoundedIcon />
            <span>explain</span>
          </>
        }
        onClick={() => {
          magicExplain(prompt)
        }}
      />
    </MagicToolboxItem>
  )
}
