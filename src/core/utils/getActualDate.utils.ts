export function timeStampDateTime(): Date {
  return new Date(
    new Date().toLocaleString('en-ES', {
      timeZone: 'america/Caracas',
    }),
  )
}
