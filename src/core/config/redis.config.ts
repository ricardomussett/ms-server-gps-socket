export const getRedisConfig = (host: string, port: number, db: number) => {
  return {
    host: host || 'localhost',
    port: port || 6379,
    db: db || 0,
  }
}
