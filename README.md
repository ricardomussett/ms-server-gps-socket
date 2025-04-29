# Servidor GPS con WebSocket

Servidor NestJS para manejo de posiciones GPS en tiempo real utilizando WebSocket y Redis.

## Características

- Servidor WebSocket para comunicación en tiempo real
- Integración con Redis para almacenamiento y pub/sub
- API REST para consulta de posiciones
- Filtrado de posiciones en tiempo real
- Escalable y de alto rendimiento

## Requisitos Previos

- Docker y Docker Compose
- Node.js 22 o superior
- pnpm como gestor de paquetes

## Configuración del Entorno

1. Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
# Configuración del servidor
PORT=3001
WS_PORT=90
 
# Configuración dpara redis
REDIS_HOST='localhost'
REDIS_PORT='6379'
REDIS_DB='1'
 
#prefijo de la base de datos
REDIS_KEY_PREFIX='truck'
 
#api-key de acceso al servicio
API_KEY='e61513a3-ceb3-4869-be5e-67e6b554182f'
```

### Variables de Entorno

- `PORT`: Puerto donde se ejecutará la aplicación (por defecto: 3000)
- `REDIS_HOST`: Host de Redis (por defecto: redis)
- `REDIS_PORT`: Puerto de Redis (por defecto: 6379)
- `REDIS_DB`: Base de datos de Redis a utilizar (por defecto: 0)
- `REDIS_KEY_PREFIX`: Prefijo para las claves de Redis (por defecto: gps_)
- `API_KEY`: Key para acceso al servicio debe contener adicionalmente .date_now (e61513a3-ceb3-4869-be5e-67e6b554182f.2025-04-29)

## Despliegue con Docker Compose

1. Construir las imágenes:

```bash
docker-compose build
```

2. Iniciar los servicios:

```bash
docker-compose up -d
```

3. Verificar los logs:

```bash
docker-compose logs -f
```

4. Detener los servicios:

```bash
docker-compose down
```

## Estructura del Proyecto

```
src/
├── websocket/           # Módulo de WebSocket
│   ├── redis.service.ts # Servicio de Redis
│   └── websocket.gateway.ts # Gateway de WebSocket
├── main.ts             # Punto de entrada
└── app.module.ts       # Módulo principal
```

## Uso de la API



### REST API

- `GET /positions`: Obtener todas las posiciones
- `GET /positions/filtered`: Obtener posiciones filtradas
- `POST /positions`: Actualizar posición

### Canales WebSocket Disponibles

El servidor WebSocket proporciona los siguientes canales y eventos:

#### Eventos del Cliente
- `request-data`: Solicitar datos iniciales con filtros
  ```javascript
  socket.emit('request-data', {
    pseudoIPs: ['IP1', 'IP2'] // Array de pseudoIPs a filtrar
  });
  ```

#### Eventos del Servidor
- `initial-positions`: Recibe las posiciones iniciales filtradas
  ```javascript
  socket.on('initial-positions', (data) => {
    console.log('Posiciones iniciales:', data);
  });
  ```

- `positions`: Recibe actualizaciones de posición en tiempo real
  ```javascript
  socket.on('positions', (data) => {
    console.log('Actualización de posición:', data);
  });
  ```

#### Estado del Servidor
- `GET /status/websocket`: Verifica el estado del servidor WebSocket
  ```javascript
  // Retorna:
  {
    status: 'online' | 'offline',
    port: number,
    connectedClients: number
  }
  ```

## Desarrollo Local

1. Instalar dependencias:
```bash
pnpm install
```

2. Iniciar en modo desarrollo:
```bash
pnpm run start:dev
```

3. Construir para producción:
```bash
pnpm run build
```
## Código de ejemplo de conexion

```
const io = require('socket.io-client');

// Configuration
function timeStampDateTime() {
   return new Date(
     new Date().toLocaleString('en-ES', {
       timeZone: 'america/Caracas',
     }),
   )
 }
 const SOCKET_URL = 'http://localhost:90'; // Adjust to your configuration
 const date = timeStampDateTime().toISOString()
 const API_KEY = 'e61513a3-ceb3-4869-be5e-67e6b554182f'+ '.' + date.split('T')[0];


// Connect to WebSocket server with options
const socket = io(SOCKET_URL, {
    extraHeaders: {
        'x-api-key': API_KEY
    },
    withCredentials: true
});

// Function to request data with filters
function requestData(filters = {}) {
    const payload = {
        pseudoIPs: filters.pseudoIPs || [], // Now accepts a list of pseudoIPs
    };
    console.log(payload)
    socket.emit('request-data', payload);
}

// handle connection events
socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    
    // Example of using requestData with multiple pseudoIPs
    requestData({
        pseudoIPs: [
            '98.4.201.36',
            '98.4.199.36',
            '98.4.199.37',
            '98.4.199.38',
            '98.4.199.39'
        ],
    });
});

// Listen data-response
socket.on('data-response', (data) => {
    console.log('\nDatos recibidos:');
    console.log(JSON.stringify(data, null, 2));
});

//---------------------------------------------------------------

// Listen Actual Positions
socket.on('initial-positions', (data) => {
    console.log('\nActual Positions:');
    console.log(JSON.stringify(data, null, 2));
});

// Listen Update Positions
socket.on('positions', (positions) => {
    console.log('\nUpdate Positions:');
    console.log(JSON.stringify(positions, null, 2));
});

//---------------------------------------------------------------

// handle errors
socket.on('connect_error', (error) => {
    console.error('Error de conexión:', error);
});

socket.on('error', (error) => {
    console.error('Error:', error);
});

// handle disconnect
socket.on('disconnect', (reason) => {
    console.log('Desconectado del servidor:', reason);
});

// keep the process running
process.on('SIGINT', () => {
    console.log('Closing client...');
    socket.disconnect();
    process.exit();
});
```
