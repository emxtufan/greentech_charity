export default function GreencubeFrame() {
  return (
    <iframe
      src="/greencube/index.html"
      title="GreenCube"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        border: 0,
      }}
    />
  )
}
