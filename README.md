# Hilo

Todos tus pedidos por encargo, organizados en un solo lugar.

Hilo es una aplicación web para pequeños negocios que fabrican o preparan productos bajo pedido: clientes, especificaciones, fechas de entrega, anticipos, pagos pendientes y estado de producción.

> **Estado actual: Etapa 3 completada.**
> Funcionan: Inicio (métricas, pedidos que requieren atención, próximas entregas), datos de ejemplo ("Taller de Ejemplo", se cargan y se quitan sin tocar tus datos), clientes, pedidos (crear, editar, filtrar, detalle con pagos parciales, estados, cancelación e historial).
> Pendiente: Calendario, Reportes y Configuración (Etapa 4) y el control de calidad final (Etapa 5). Esas secciones muestran un aviso de "sección aún no construida".
> **Inicio de sesión con correo y contraseña ya funciona** (Supabase): pantalla de login, consentimiento de avisos, cierre de sesión y avisos legales. No hay registro libre: las cuentas las crea el administrador.
> **Importante:** los pedidos y clientes todavía se guardan solo en el navegador (IndexedDB), no en Supabase. Mientras no se migren, no uses Hilo con datos reales de varios usuarios en la misma computadora. Pendiente: panel de administrador, migración de datos a Supabase, formulario público con QR y login con Google.

## Requisitos

- Node.js 20 o superior (probado con Node 22)
- npm 10 o superior

## Cómo ejecutarla

```bash
npm install        # instala dependencias (solo la primera vez)
npm run dev        # servidor de desarrollo en http://localhost:5173
```

Otros comandos:

```bash
npm run build      # revisa tipos y genera la versión de producción en dist/
npm run preview    # sirve la versión de producción
npm test           # ejecuta las pruebas automatizadas
npm run lint       # revisa el código
```

## Estructura

```
src/
  domain/        Reglas de negocio puras (sin React ni base de datos)
    types.ts       Modelos: Order, OrderItem, Customer, Payment, ActivityEvent, BusinessSettings
    orders.ts      Totales, pagos, saldo, atrasos, filtros, métricas, transiciones de estado
    money.ts       Pesos ↔ centavos y formato monetario mexicano
    dates.ts       Fechas AAAA-MM-DD, "hoy" según zona horaria, formato DD/MM/AAAA
  data/          Persistencia local
    db.ts          Base de datos IndexedDB (Dexie)
    repository.ts  Única puerta de entrada para leer/escribir datos de negocio
    demo.ts        Datos del "Taller de Ejemplo" (todo marcado isDemo, fechas relativas a hoy)
  components/    Piezas visuales reutilizables (layout, ui)
  pages/         Pantallas de cada ruta
```

## Decisiones técnicas

- **Importes en centavos (enteros):** evita errores de redondeo con decimales. La interfaz convierte de y hacia pesos.
- **Fechas como texto `AAAA-MM-DD`:** una fecha de entrega no cambia por zona horaria.
- **Nada financiero se guarda duplicado:** total, pagado y saldo siempre se calculan desde los conceptos y los pagos (`domain/orders.ts`).
- **Capa de repositorio:** la interfaz no habla directamente con la base de datos para escrituras. Si en el futuro hay backend, se reemplaza `repository.ts` por llamadas a una API.
- **Sin backend:** los datos viven solo en este navegador y no se sincronizan entre dispositivos. Haz respaldos exportando tus datos (disponible en una etapa posterior).

## Paleta

Los colores están en variables CSS al inicio de `src/index.css` (`--hilo-*`); cámbialos ahí.
