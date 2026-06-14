export const DEFAULT_BACKGROUND = { type: 'solid', color: '#ffffff' }

const DENSITY_COUNTS = {
  low: 50,
  medium: 150,
  high: 400
}

function resolveDirection(direction, width, height) {
  switch (direction) {
    case 'to-left': return { x0: width, y0: 0, x1: 0, y1: 0 }
    case 'to-top': return { x0: 0, y0: height, x1: 0, y1: 0 }
    case 'to-bottom': return { x0: 0, y0: 0, x1: 0, y1: height }
    case 'to-top-left': return { x0: width, y0: height, x1: 0, y1: 0 }
    case 'to-top-right': return { x0: 0, y0: height, x1: width, y1: 0 }
    case 'to-bottom-left': return { x0: width, y0: 0, x1: 0, y1: height }
    case 'to-bottom-right': return { x0: 0, y0: 0, x1: width, y1: height }
    case 'to-right':
    default: return { x0: 0, y0: 0, x1: width, y1: 0 }
  }
}

function renderSolid(ctx, width, height, background) {
  ctx.fillStyle = background.color || '#ffffff'
  ctx.fillRect(0, 0, width, height)
}

function renderGradient(ctx, width, height, background) {
  const { subtype, color, color2, direction } = background
  let gradient
  if (subtype === 'radial') {
    const cx = width / 2
    const cy = height / 2
    const r = Math.max(width, height) / 2
    gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
  } else {
    const { x0, y0, x1, y1 } = resolveDirection(direction, width, height)
    gradient = ctx.createLinearGradient(x0, y0, x1, y1)
  }
  gradient.addColorStop(0, color || '#3b82f6')
  gradient.addColorStop(1, color2 || '#ffffff')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
}

function renderPattern(ctx, width, height, background) {
  const { subtype, color, color2 } = background
  const c1 = color || '#000000'
  const c2 = color2 || '#ffffff'
  renderSolid(ctx, width, height, { color: c1 })

  ctx.fillStyle = c2
  if (subtype === 'stripes') {
    const step = 40
    for (let x = 0; x < width; x += step * 2) {
      ctx.fillRect(x, 0, step, height)
    }
  } else if (subtype === 'checkerboard') {
    const step = 40
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        if ((x / step + y / step) % 2 === 1) {
          ctx.fillRect(x, y, step, step)
        }
      }
    }
  } else if (subtype === 'dots') {
    const step = 40
    ctx.beginPath()
    for (let y = step / 2; y < height; y += step) {
      for (let x = step / 2; x < width; x += step) {
        ctx.moveTo(x, y)
        ctx.arc(x, y, 4, 0, Math.PI * 2)
      }
    }
    ctx.fill()
  }
}

function renderTexture(ctx, width, height, background) {
  const { subtype, color, density } = background
  renderSolid(ctx, width, height, { color: color || '#000000' })

  const count = DENSITY_COUNTS[density] || DENSITY_COUNTS.medium

  if (subtype === 'starry') {
    ctx.fillStyle = '#ffffff'
    for (let i = 0; i < count; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const r = Math.random() * 1.5 + 0.5
      ctx.globalAlpha = Math.random() * 0.8 + 0.2
      ctx.beginPath()
      ctx.arc(x, y, r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  } else if (subtype === 'noise') {
    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data
    for (let i = 0; i < data.length; i += 4) {
      const offset = (Math.random() - 0.5) * 60
      data[i] = Math.min(255, Math.max(0, data[i] + offset))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + offset))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + offset))
      data[i + 3] = 255
    }
    ctx.putImageData(imageData, 0, 0)
  }
}

export function renderBackground(ctx, width, height, background) {
  const config = background || DEFAULT_BACKGROUND
  ctx.save()
  switch (config.type) {
    case 'gradient':
      renderGradient(ctx, width, height, config)
      break
    case 'pattern':
      renderPattern(ctx, width, height, config)
      break
    case 'texture':
      renderTexture(ctx, width, height, config)
      break
    case 'solid':
    default:
      renderSolid(ctx, width, height, config)
      break
  }
  ctx.restore()
}
