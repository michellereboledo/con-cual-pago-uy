# ¿Con Cuál Pago? — PrecioReal UY 🇺🇾

PWA mobile-first que te dice en menos de 3 segundos **con qué tarjeta de tu billetera conviene pagar** en cada comercio de Montevideo, y cuánto pagás realmente después de topes de devolución y la Ley 19.210.

## Funcionalidades

- **Motor "Tarjeta Ganadora"** ([`engine.ts`](src/lib/engine.ts)): cruza las promos activas del día con tu billetera (persistida en `localStorage`). Ordena por % → *En el acto* → mayor tope.
- **Reglas con fecha real**: cada día se mapea a una fecha concreta de esta semana. Así se respetan promos como *2do y 4to miércoles* (`weekOfMonth`) y vigencias (`validFrom` / `validUntil`).
- **Calculadora Precio Real**: arma un ranking de **todas** las promos según el ahorro real para el monto ingresado (un 20% sin tope puede ganarle a un 25% con tope de $350). Incluye:
  - Ley 19.210: -9 pts de IVA en gastronomía y -2 pts pagando con débito o prepaga. Se aplica primero, y el % del banco se calcula sobre el neto.
  - Tope por compra / día / mes, con la opción de cargar cuánto del tope ya usaste.
  - Lo que pagás en caja separado de lo que te devuelven en el estado de cuenta, y las cuotas sin recargo.
  - Botón para compartir (Web Share o portapapeles).
- **FOMO / Afiliados**: si otra tarjeta te ganaría por ≥5 puntos (o si no tenés ninguna promo ese día), aparece un upsell. El modal muestra qué comercios desbloquea esa tarjeta y abre el sitio oficial con parámetros UTM.
- **Alertas Pro ($100/mes)**: incluye una lista de próximos Super-Días que se calcula a partir del dataset, y valida el celular uruguayo (09X XXX XXX).
- Favoritos, filtro "Solo mis tarjetas", búsqueda sin acentos y por banco ("itau", "brou"), patrocinado por categoría, y funciona offline (service worker).

## Dataset

- **13 emisores, 26 tarjetas**: Itaú, Santander, BROU, Scotiabank, BBVA, HSBC, Heritage, Prex, Mercado Pago, MiDinero, Oca, Creditel y ANDA.
- **47 comercios en 8 rubros**: Gastronomía, Farmacias, Supermercados, Combustible, Shopping/Ropa, Hogar/Tecnología, Entretenimiento, Viajes/Transporte.

> ⚠️ Las promociones son **ilustrativas**. Antes de publicar, hay que reemplazar `src/data/merchantsData.ts` por datos verificados con cada banco y actualizar `DATA_LAST_UPDATED`.

## Estructura

```
src/
  types/discount.ts        Tipos del dominio
  data/cards.ts            Emisores, tarjetas y grupos
  data/merchantsData.ts    Comercios y reglas
  lib/dates.ts             Día ↔ fecha, semana del mes
  lib/engine.ts            Ranking, cálculo, búsqueda, Super-Días
  hooks/usePersistentState.ts
  components/              MerchantCard, CalculatorSheet, WalletSheet, AffiliateSheet, ProSheet, Sheet
  App.tsx
public/ manifest.json, sw.js, icon.svg
```

## Correr local

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción (tsc + vite)
```
