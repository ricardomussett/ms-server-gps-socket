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
 
#api-key de acceso al servicio (encriptado)
API_KEY=1234567891234567891345

#password de encriptacion
ENCRYPT_PASSWORD=asd12345678913456789asd
ENCRYPT_IV=1234567890123456

```

### Variables de Entorno

- `PORT`: Puerto donde se ejecutará la aplicación (por defecto: 3000)
- `REDIS_HOST`: Host de Redis (por defecto: redis)
- `REDIS_PORT`: Puerto de Redis (por defecto: 6379)
- `REDIS_DB`: Base de datos de Redis a utilizar (por defecto: 0)
- `REDIS_KEY_PREFIX`: Prefijo para las claves de Redis (por defecto: gps_)
- `API_KEY`: Key para acceso al servicio debe contener adicionalmente .date_now (e61513a3-ceb3-4869-be5e-67e6b554182f.2025-04-29)
- `ENCRYPT_PASSWORD`: Clave secreta para el cifrado AES-256-CBC
- `ENCRYPT_IV`: Vector de inicialización para el cifrado AES
  
## Protocolo de Autenticación

### Especificación de la Cabecera
Los clientes deben incluir una cabecera `x-api-key` con el siguiente formato:

```
x-api-key = ENCRIPTADO(API_KEY + '.AAAA-MM-DD')
```

### Proceso de Encriptación
1. **Construir el payload**:
   ```javascript
   const today = new Date().toISOString().split('T')[0]; // AAAA-MM-DD
   const payload = `${process.env.API_KEY}.${today}`;
   ```

2. **Encriptar usando AES-256-CBC**:
   ```javascript
   const crypto = require('crypto');
   
   function encryptAPIKey(payload) {
     const cipher = crypto.createCipheriv(
       'aes-256-cbc',
       Buffer.from(process.env.ENCRYPT_PASSWORD, 'hex'),
       Buffer.from(process.env.ENCRYPT_IV, 'hex')
     );
     
     let encrypted = cipher.update(payload, 'utf8', 'hex');
     encrypted += cipher.final('hex');
     return encrypted;
   }
   ```

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
ms-server-gps-socket/
│
├── src/
│   ├── app/
│   │   └── websocket/
│   │       ├── application/
│   │       │   ├── dto/
│   │       │   │   └── filter.dto.ts
│   │       │   └── service/
│   │       │       └── websocket.service.ts
│   │       └── presentation/
│   │           └── gateway/
│   │               └── websocket.gateway.ts
│   ├── core/
│   │   ├── guards/
│   │   │   └── api-key.guard.ts
│   │   └── redis/
│   │       └── service/
│   │           └── redis.service.ts
│   ├── main.ts
│   └── main.module.ts
│
├── package.json
├── README.md
└── ...otros archivos de configuración (por ejemplo, .env, tsconfig.json, etc.)
```

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
ACTUAL
```
const io = require('socket.io-client');
const crypto = require('crypto');

// Configuración de encriptación
const ENCRYPT_PASSWORD = 'asd12345678913456789asd'; // Debe coincidir con el servidor
const ENCRYPT_IV = '1234567890123456'; // 16 caracteres, Debe coincidir con el servidor

// Función para encriptar la API key
function encryptAPIKey(apiKey) {
  const cipher = crypto.createCipheriv(
    'aes-256-cbc',
    Buffer.from(ENCRYPT_PASSWORD, 'hex'),
    Buffer.from(ENCRYPT_IV, 'hex')
  );
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

// Función para obtener timestamp en la zona horaria correcta
function timeStampDateTime() {
  return new Date(
    new Date().toLocaleString('en-ES', {
      timeZone: 'America/Caracas',
    }),
  );
}

const SOCKET_URL = 'http://localhost:90'; // Ajusta según tu configuración
const date = timeStampDateTime().toISOString();
const rawApiKey = '1234567891234567891345'; // Debe coincidir con el servidor
const apiKeyWithDate = rawApiKey + '.' + date.split('T')[0];
const encryptedApiKey = encryptAPIKey(apiKeyWithDate);

// Conectar al servidor WebSocket con opciones
const socket = io(SOCKET_URL, {
  extraHeaders: {
    'x-api-key': encryptedApiKey
  },
  withCredentials: true
});

// Función para solicitar datos con filtros
function requestData(filters = {}) {
  const payload = {
    pseudoIPs: filters.pseudoIPs || [], // Ahora acepta una lista de pseudoIPs
  };
  console.log('Enviando solicitud con filtros:', payload);
  socket.emit('request-data', payload);
}

// Manejadores de eventos de conexión
socket.on('connect', () => {
  console.log('Conexión establecida con el servidor WebSocket');
  
  // Ejemplo de uso de requestData con múltiples pseudoIPs
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

// Escuchar respuesta de datos
socket.on('data-response', (data) => {
  console.log('\nDatos recibidos:');
  console.log(JSON.stringify(data, null, 2));
});

// Escuchar posiciones actuales
socket.on('initial-positions', (data) => {
  console.log('\nPosiciones actuales:');
  console.log(JSON.stringify(data, null, 2));
});

// Escuchar actualizaciones de posición
socket.on('positions', (positions) => {
  console.log('\nActualización de posiciones:');
  console.log(JSON.stringify(positions, null, 2));
});

// Manejadores de errores
socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error.message);
  if (error.response) {
    console.error('Detalles del error:', error.response.data);
  }
});

socket.on('error', (error) => {
  console.error('Error general:', error);
});

// Manejador de desconexión
socket.on('disconnect', (reason) => {
  console.log('Desconectado del servidor:', reason);
  if (reason === 'io server disconnect') {
    console.log('El servidor ha cerrado la conexión');
  }
});

// Mantener el proceso en ejecución
process.on('SIGINT', () => {
  console.log('\nCerrando cliente...');
  socket.disconnect();
  process.exit();
});
```

DEPREADO!!!
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
