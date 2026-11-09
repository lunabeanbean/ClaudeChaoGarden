// The garden band's invisible touch layer: it lies over the band's pictures and tells the hooks where a click
// landed (the column), so the chao there gets its card in the side window. It draws nothing you can see. A drag
// is not a click. Runs in the app's window, not the hooks, so: no imports, no type annotations, no timer.
export default function Touch(props, surface) {
  const { Box, Text } = surface.elements
  if (surface.state === undefined) {
    surface.onPointer(ev => {
      if (ev.type === 'down' && (!ev.button || ev.button === 'left')) {
        surface.setState({ held: true, x: ev.x })
        return
      }
      if (ev.type === 'up') {
        const s = surface.state
        if (s && s.held && Math.abs(ev.x - s.x) <= 3 && ev.y >= 0 && ev.y < (props.rows || 3)) surface.post({ kind: 'tap', x: ev.x })
        surface.setState({ held: false, x: 0 })
      }
    })
    surface.setState({ held: false, x: 0 })
  }
  return (
    <Box width={surface.columns || 1} height={props.rows || 3}>
      <Text> </Text>
    </Box>
  )
}
