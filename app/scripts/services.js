/* global app */

/**
 * Email Data API Sync Model
 */
app.service('Email', ['$resource', function ($resource) {
  return $resource('email/:id', { id: '' }, {
    update: {
      method: 'PUT',
      params: {}
    }
  })
}])

/**
 * Custom FsMail Dynamic Unread Favicon Controller
 * Mapping Standard Anchor: icon.png 
 */
.service('Favicon', [function () {
  const favicon = document.getElementById('favicon')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  const bufferImage = new window.Image()

  let lastUnreadCount = 0
  const faviconSize = 16
  const pos = {
    x: faviconSize - faviconSize / 3,
    y: faviconSize - faviconSize / 3
  }

  // Strictly configured to map your standalone file spec definition
  bufferImage.src = './icon.png'
  
  bufferImage.onload = function () {
    setUnreadCount(lastUnreadCount)
  }

  canvas.width = canvas.height = faviconSize

  // Draws a modern sleek notification dot indicator matching white theme spec
  const drawCircle = function (ctx, pos) {
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, faviconSize / 2.4, 0, 2 * Math.PI)
    ctx.fillStyle = '#ef4444' // Crimson alert aesthetic
    ctx.fill()
    
    // Clean metallic gray subtle separator borders
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1
    ctx.stroke()
  }

  const drawText = function (ctx, pos, text) {
    ctx.font = 'bold 8px "Plus Jakarta Sans", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#FFFFFF'
    ctx.fillText(text, pos.x, pos.y)
  }

  const setUnreadCount = function (unreadCount) {
    lastUnreadCount = unreadCount
    
    if (!favicon) return

    if (unreadCount === 0) {
      favicon.href = bufferImage.src
      return
    }

    // Re-render layout frames onto canvas context safely
    context.clearRect(0, 0, faviconSize, faviconSize)
    context.drawImage(bufferImage, 0, 0, faviconSize, faviconSize)
    
    drawCircle(context, pos)
    drawText(context, pos, unreadCount)

    favicon.href = canvas.toDataURL('image/png')
  }

  return {
    setUnreadCount
  }
}])
