export const corsConfig = {
  origin: '*', // Permitir todas las solicitudes de origen
  methods: ['GET'], // Métodos HTTP permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
  credentials: true, // Permitir credenciales (cookies, autenticación HTTP)
}
