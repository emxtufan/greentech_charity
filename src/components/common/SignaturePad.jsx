import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

const HEIGHT = 200
const LINE_WIDTH = 2.5
const LINE_COLOR = '#14322a'
const BACKGROUND = '#ffffff'

const canvasStyle = {
  display: 'block',
  width: '100%',
  height: `${HEIGHT}px`,
  background: BACKGROUND,
  border: '2px dashed #9fd8c5',
  borderRadius: 12,
  touchAction: 'none',
  cursor: 'crosshair',
}

const SignaturePad = forwardRef(function SignaturePad({ onChange }, ref) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const drawnRef = useRef(false)
  const lastPointRef = useRef(null)

  // canvasul se scalează după devicePixelRatio ca linia să rămână clară
  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ratio = window.devicePixelRatio || 1
    const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 0

    canvas.width = Math.max(1, Math.round(width * ratio))
    canvas.height = Math.max(1, Math.round(HEIGHT * ratio))

    const context = canvas.getContext('2d')
    if (!context) return

    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.fillStyle = BACKGROUND
    context.fillRect(0, 0, width, HEIGHT)
    context.lineWidth = LINE_WIDTH
    context.lineCap = 'round'
    context.lineJoin = 'round'
    context.strokeStyle = LINE_COLOR
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    setupCanvas()

    // la schimbarea lățimii, canvasul se reinițializează și desenul se repune la scară
    const observer = new ResizeObserver(() => {
      const dataUrl = drawnRef.current ? canvas.toDataURL('image/png') : ''
      setupCanvas()

      if (!dataUrl) return

      const image = new Image()
      image.onload = () => {
        const context = canvas.getContext('2d')
        if (!context) return
        context.drawImage(image, 0, 0, canvas.clientWidth, HEIGHT)
      }
      image.src = dataUrl
    })

    observer.observe(canvas)

    return () => observer.disconnect()
  }, [setupCanvas])

  const pointFrom = (event) => {
    const rect = canvasRef.current.getBoundingClientRect()

    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }

  const emitChange = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    onChange?.(drawnRef.current ? canvas.toDataURL('image/png') : null)
  }, [onChange])

  const clear = useCallback(() => {
    setupCanvas()
    drawingRef.current = false
    drawnRef.current = false
    lastPointRef.current = null
    onChange?.(null)
  }, [setupCanvas, onChange])

  useImperativeHandle(
    ref,
    () => ({
      clear,
      isEmpty: () => !drawnRef.current,
    }),
    [clear]
  )

  const handlePointerDown = (event) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    event.preventDefault()
    canvas.setPointerCapture?.(event.pointerId)

    const point = pointFrom(event)
    drawingRef.current = true
    drawnRef.current = true
    lastPointRef.current = point

    // punctul de pornire, ca o simplă atingere să lase o urmă
    context.beginPath()
    context.arc(point.x, point.y, LINE_WIDTH / 2, 0, Math.PI * 2)
    context.fillStyle = LINE_COLOR
    context.fill()
  }

  const handlePointerMove = (event) => {
    const last = lastPointRef.current
    if (!drawingRef.current || !last) return

    const context = canvasRef.current?.getContext('2d')
    if (!context) return

    event.preventDefault()

    const point = pointFrom(event)
    context.beginPath()
    context.moveTo(last.x, last.y)
    context.lineTo(point.x, point.y)
    context.stroke()
    lastPointRef.current = point
  }

  const handlePointerUp = (event) => {
    if (!drawingRef.current) return

    const canvas = canvasRef.current
    drawingRef.current = false
    lastPointRef.current = null

    if (canvas?.hasPointerCapture?.(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }

    emitChange()
  }

  return (
    <canvas
      ref={canvasRef}
      style={canvasStyle}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  )
})

export default SignaturePad
