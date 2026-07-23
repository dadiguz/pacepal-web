# pacepal-web

Landing de Pacepal. Sitio estático: no hay build ni dependencias que instalar —
se abre `index.html` o se sirve la carpeta tal cual.

```
python3 -m http.server 8899     # y abrir http://localhost:8899
```

## Estructura

| Archivo | Qué es |
|---|---|
| `index.html` | La landing completa: markup, estilos de página y el JS del camino de 66 días. |
| `assets/pet.js` | Motor de sprites pixel-art, portado de `PacePal/Engine/PetGridBuilder.swift`. Construye la rejilla 24×24 del mono por pose y cuadro, con orejas por especie y las paletas reales de la app. |
| `assets/cards.js` | Motor de tarjetas coleccionables: RNG determinista, ruido de valor, paleta HSB por familia y los siete generadores de arte (`GenerativeCardArt.swift`), más el foil y el trazo de ruta. |
| `assets/card-set.js` | Datos de las doce tarjetas que se muestran en la web (textos, familia, rareza y número de colección tomados de la app). |
| `assets/cards.css` | Anatomía de la tarjeta (320×460 escalada al hueco), foil holográfico, vitrina y álbum. |
| `privacy.html`, `terms.html` | Legales. La política de privacidad describe la copia en la nube (Firebase), la analítica (PostHog) y el uso de GPS de la versión 2.1. |

## Tarjetas

Las tarjetas de la web son las mismas de la app, redibujadas en DOM + canvas:
mismo layout (cabecera con distancia, ventana de arte, ficha de día/familia/fecha,
fila de ritmo, texto y número de colección), mismas familias y mismas rarezas.
Para añadir o cambiar una se edita `assets/card-set.js`; el arte se deriva de
`family`, `level` y `seed`, así que basta cambiar la semilla para tener otra pieza.

Los hitos usan los wallpapers reales (`assets/background_XX.jpg`, donde el índice
es el del hito, no el día: día 66 → `background_23.jpg`).
