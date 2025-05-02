export const getRedisConfig = (host: string | undefined, port: number | undefined, db: number | undefined) => {
  return {
    host: host || 'localhost',
    port: port || 6379,
    db: db || 0,
  }
}
