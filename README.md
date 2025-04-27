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
PORT=3069
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=1
REDIS_KEY_PREFIX=truck
```

### Variables de Entorno

- `PORT`: Puerto donde se ejecutará la aplicación (por defecto: 3000)
- `REDIS_HOST`: Host de Redis (por defecto: redis)
- `REDIS_PORT`: Puerto de Redis (por defecto: 6379)
- `REDIS_DB`: Base de datos de Redis a utilizar (por defecto: 0)
- `REDIS_KEY_PREFIX`: Prefijo para las claves de Redis (por defecto: gps_)

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

### WebSocket

Conectarse al WebSocket:
```javascript
const socket = io('http://localhost:3000');

// Escuchar actualizaciones de posición
socket.on('position-update', (data) => {
  console.log('Nueva posición:', data);
});
```

### REST API

- `GET /positions`: Obtener todas las posiciones
- `GET /positions/filtered`: Obtener posiciones filtradas
- `POST /positions`: Actualizar posición

### Canales WebSocket Disponibles

El servidor WebSocket proporciona los siguientes canales y eventos:

#### Conexión
```javascript
const socket = io('http://localhost:3069');
```

#### Eventos del Cliente
- `request-data`: Solicitar datos iniciales con filtros
  ```javascript
  socket.emit('request-data', {
    pseudoIPs: ['IP1', 'IP2'] // Array de pseudoIPs a filtrar
  });
  ```

#### Eventos del Servidor
- `positions`: Recibe las posiciones iniciales filtradas
  ```javascript
  socket.on('positions', (data) => {
    console.log('Posiciones iniciales:', data);
  });
  ```

- `update-positions`: Recibe actualizaciones de posición en tiempo real
  ```javascript
  socket.on('update-positions', (data) => {
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

const SOCKET_URL = 'http://localhost:3069'; // Adjust to your configuration

// Connect to WebSocket server
const socket = io(SOCKET_URL);

// Function to request data with filters
function requestData(filters = {}) {
    const payload = {
        pseudoIPs: filters.pseudoIPs || [], // Now accepts a list of pseudoIPs
    };
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
socket.on('positions', (data) => {
    console.log('\nActual Positions:');
    console.log(JSON.stringify(data, null, 2));
});

// Listen Update Positions
socket.on('update-positions', (positions) => {
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
