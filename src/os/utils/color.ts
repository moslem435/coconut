
/**
 * 计算图片的平均亮度
 * @param src 图片地址
 * @returns 亮度值 (0-255)
 */
export const getImageBrightness = (src: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = src

    img.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(128) // Default
        return
      }

      // Resize for performance (50x50 is enough for average)
      canvas.width = 50
      canvas.height = 50

      ctx.drawImage(img, 0, 0, 50, 50)
      
      try {
        const imageData = ctx.getImageData(0, 0, 50, 50)
        const data = imageData.data
        let r, g, b, avg
        let colorSum = 0

        for (let x = 0, len = data.length; x < len; x += 4) {
          r = data[x]
          g = data[x + 1]
          b = data[x + 2]

          // 使用感知亮度公式 (Perceived brightness)
          // weights: R=0.299, G=0.587, B=0.114
          avg = Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
          colorSum += avg
        }

        const brightness = Math.floor(colorSum / (50 * 50))
        resolve(brightness)
      } catch (e) {
        // Cross-origin issues might prevent reading image data
        console.warn('Cannot access image data for brightness calculation', e)
        resolve(128)
      }
    }

    img.onerror = () => {
      resolve(128)
    }
  })
}

/**
 * 判断亮度是否为暗色
 * @param brightness 亮度 (0-255)
 * @returns boolean
 */
export const isDarkBrightness = (brightness: number): boolean => {
  // 提高阈值：只有非常亮的背景才使用黑色文字
  // 普通风景照即使天空很亮，平均亮度通常也在 150-180 之间
  // 我们希望大部分情况下都使用白色文字（带阴影），因为白色文字适应性更强
  return brightness < 200
}

/**
 * 从 CSS 颜色字符串获取亮度 (简单支持 hex/rgb)
 * @param color CSS颜色字符串
 */
export const getColorBrightness = (color: string): number => {
  // Create a temporary element to let browser parse the color
  const div = document.createElement('div')
  div.style.backgroundColor = color
  document.body.appendChild(div)
  const style = window.getComputedStyle(div)
  const rgb = style.backgroundColor // "rgb(r, g, b)"
  document.body.removeChild(div)

  const match = rgb.match(/\d+/g)
  if (!match || match.length < 3) return 128

  const [r, g, b] = match.map(Number)
  // Perceived brightness
  return Math.floor(0.299 * r + 0.587 * g + 0.114 * b)
}
