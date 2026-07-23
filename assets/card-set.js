/* Catálogo de muestra: doce piezas reales del álbum de la app (50 casillas).
   Textos, familias, rarezas y números de colección salen de
   PacePal/Models/CollectedCard.swift y de Localized.swift. */
(function (global) {
'use strict';

const O = t => '<b>' + t + '</b>';   // los tramos naranjas de los hitos

const CARD_SET = [
  {
    id: 'm66', family: 'milestone', level: 66, day: 66, rarity: 4, holo: true, legendary: true,
    seed: 660066, number: 23, captionTag: 'Gran final', typeLabel: 'Hito',
    petName: 'Nube', pet: 'nube', pose: 'trophyRaise',
    km: '8.42', unit: 'KM', pace: '5:38', date: '12 SEP 2026',
    wallpaper: 'assets/background_23.jpg',
    label: 'Día 66', sub: 'La pieza que cierra el reto',
    detail: O('66 días. ') + 'Elegiste salir cuando todo decía quedarte. Corriste cuando pensabas que no podías. ' +
            O('Rompiste la meta ') + 'y lo construiste. ' + O('Ahora sigue corriendo.')
  },
  {
    id: 'c10', family: 'challenge', level: 10, day: 61, rarity: 4, holo: true, legendary: true,
    seed: 101010, number: 50, captionTag: 'Leyenda 21.1K SUB 2:15', typeLabel: 'Reto',
    petName: 'Chili', pet: 'chili', pose: 'sprint',
    km: '21.14', unit: 'KM', pace: '6:12', date: '7 SEP 2026',
    label: '21.1K sub 2:15', sub: 'Media maratón contra el reloj',
    detail: 'Media maratón bajo 2:15. La pieza más difícil de toda la colección.'
  },
  {
    id: 't9', family: 'totalKm', level: 9, day: 58, rarity: 4, holo: true, legendary: true,
    seed: 909090, number: 40, captionTag: 'Leyenda 100K', typeLabel: 'Acumulado',
    petName: 'Bruno', pet: 'bruno', pose: 'flex',
    km: '100.4', unit: 'KM', pace: '6:02', date: '4 SEP 2026',
    label: '100K acumulados', sub: 'La familia larga del álbum',
    detail: 'Cien kilómetros. Empezaste sin poder correr una cuadra y mira dónde estás.'
  },
  {
    id: 'd4', family: 'distance', level: 4, day: 47, rarity: 4, holo: true,
    seed: 404404, number: 27, captionTag: 'Distancia 20K', typeLabel: 'Distancia',
    petName: 'Mora', pet: 'mora', pose: 'star',
    km: '20.06', unit: 'KM', pace: '6:31', date: '24 AGO 2026',
    label: '20K de una sentada', sub: 'Distancia en una sola salida',
    detail: 'Distancia de media maratón. Muy poca gente en el mundo llega hasta aquí.'
  },
  {
    id: 's4', family: 'streak', level: 4, day: 20, rarity: 4, holo: true,
    seed: 202020, number: 31, captionTag: 'Racha 20 DÍAS', typeLabel: 'Racha',
    petName: 'Cereza', pet: 'cereza', pose: 'victory',
    km: '5.20', unit: 'KM', pace: '5:54', date: '28 JUL 2026',
    label: '20 días seguidos', sub: 'Racha sin fallar un solo día',
    detail: 'Veinte días seguidos. Ya no necesitas motivación, tienes hábito.'
  },
  {
    id: 'c6', family: 'challenge', level: 6, day: 25, rarity: 3, holo: true,
    seed: 606606, number: 46, captionTag: 'Reto 60 MIN', typeLabel: 'Reto',
    petName: 'Bruno', pet: 'bruno', pose: 'meditate',
    km: '6.40', unit: 'KM', pace: '9:22', date: '2 AGO 2026',
    label: '60 minutos en pie', sub: 'Reto de tiempo, no de velocidad',
    detail: 'Una hora entera en movimiento. Tu cuerpo aprendió a durar.'
  },
  {
    id: 't4', family: 'totalKm', level: 4, day: 30, rarity: 2, holo: true,
    seed: 505505, number: 35, captionTag: 'Acumulado 50K', typeLabel: 'Acumulado',
    petName: 'Nube', pet: 'nube', pose: 'cheer',
    km: '50.31', unit: 'KM', pace: '6:20', date: '8 AGO 2026',
    label: '50K acumulados', sub: 'Suma de todo el reto',
    detail: 'Toda esta distancia salió de decidir salir, un día a la vez.'
  },
  {
    id: 'd2', family: 'distance', level: 2, day: 19, rarity: 2, holo: true,
    seed: 220220, number: 25, captionTag: 'Distancia 10K', typeLabel: 'Distancia',
    petName: 'Chili', pet: 'chili', pose: 'podium',
    km: '10.02', unit: 'KM', pace: '6:08', date: '27 JUL 2026',
    label: 'Tu primer 10K', sub: 'Distancia en una sola salida',
    detail: 'El doble dígito. Aquí empieza el territorio de los corredores de fondo.'
  },
  {
    id: 's2', family: 'streak', level: 2, day: 10, rarity: 2, holo: true,
    seed: 110110, number: 29, captionTag: 'Racha 10 DÍAS', typeLabel: 'Racha',
    petName: 'Mora', pet: 'mora', pose: 'warmup',
    km: '4.10', unit: 'KM', pace: '6:44', date: '18 JUL 2026',
    label: '10 días seguidos', sub: 'La racha que ya se siente hábito',
    detail: 'Diez días sin fallar. Tu cuerpo ya espera salir a correr.'
  },
  {
    id: 'c1', family: 'challenge', level: 1, day: 12, rarity: 1, holo: true,
    seed: 121121, number: 41, captionTag: 'Reto 5K SUB 30', typeLabel: 'Reto',
    petName: 'Tinto', pet: 'tinto', pose: 'thumbsUp',
    km: '5.03', unit: 'KM', pace: '5:46', date: '20 JUL 2026',
    label: '5K bajo 30 minutos', sub: 'El primer reto de ritmo',
    detail: 'Cinco mil metros por debajo de la media hora. El primer número que un corredor presume.'
  },
  {
    id: 'm34', family: 'milestone', level: 34, day: 34, rarity: 1, holo: false,
    seed: 343434, number: 12, captionTag: 'Hito', typeLabel: 'Hito',
    petName: 'Cereza', pet: 'cereza', pose: 'cheer',
    km: '6.15', unit: 'KM', pace: '6:26', date: '11 AGO 2026',
    wallpaper: 'assets/background_12.jpg',
    label: 'Día 34', sub: 'Uno de los 23 hitos del reto',
    detail: O('34 días. ') + 'La mayoría ya se rindió hace tiempo. ' + O('Tú sigues corriendo.')
  },
  {
    id: 'm13', family: 'milestone', level: 13, day: 13, rarity: 1, holo: false,
    seed: 131313, number: 5, captionTag: 'Hito', typeLabel: 'Hito',
    petName: 'Tinto', pet: 'tinto', pose: 'happy',
    km: '3.80', unit: 'KM', pace: '6:52', date: '21 JUL 2026',
    wallpaper: 'assets/background_05.jpg',
    label: 'Día 13', sub: 'Uno de los 23 hitos del reto',
    detail: O('13 días. ') + 'Casi dos semanas de ' + O('movimiento real y constante.')
  }
];

/* Las cinco familias del álbum, con lo que pide cada casilla. */
const ALBUM = [
  { key: 'milestone', name: 'Hitos del reto', count: 23, tint: '#FFC46B',
    how: 'Una por cada hito de los 66 días. Llevan el fondo que se desbloquea ese día.' },
  { key: 'distance', name: 'Distancia en una salida', count: 4, tint: '#FF7DB0',
    how: '5K · 10K · 15K · 20K en una sola salida (3 / 6 / 9 / 13.1 mi si corres en millas).' },
  { key: 'streak', name: 'Días seguidos', count: 4, tint: '#FF9A4D',
    how: '5, 10, 15 y 20 días corriendo sin fallar uno solo.' },
  { key: 'totalKm', name: 'Distancia acumulada', count: 9, tint: '#6BC5FF',
    how: 'De los primeros 10K a los 100K sumados durante el reto.' },
  { key: 'challenge', name: 'Retos de rendimiento', count: 10, tint: '#6BE3B8',
    how: '5K sub 30, ritmo 4:30/km, 10K en la hora, 60 minutos en pie, media maratón sub 2:15…' }
];

global.CARD_SET = CARD_SET;
global.ALBUM = ALBUM;

})(window);
