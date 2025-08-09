import React from "react"
import { ScreenshotItem } from "../../layout"
import { Theme, useTheme } from "../../../contexts"

interface Screenshot {
  path: string
  preview: string
}

interface ScreenshotQueueProps {
  isLoading: boolean
  screenshots: Screenshot[]
  onDeleteScreenshot: (index: number) => void
  theme?: Theme
}
const ScreenshotQueue: React.FC<ScreenshotQueueProps> = ({
  isLoading,
  screenshots,
  onDeleteScreenshot,
  theme
}) => {
  if (screenshots.length === 0) {
    return <></>
  }

  const displayScreenshots = screenshots.slice(0, 5)

  return (
    <div className={`grid grid-cols-5 gap-1 ${theme === "osrs" ? "osrs-container" : ""}`}>
      {displayScreenshots.map((screenshot, index) => (
        <ScreenshotItem
          key={screenshot.path}
          isLoading={isLoading}
          screenshot={screenshot}
          index={index}
          onDelete={onDeleteScreenshot}
        />
      ))}
    </div>
  )
}

export default ScreenshotQueue
