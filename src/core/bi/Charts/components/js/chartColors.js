export const PALETTE = [
  '#41b883', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
  '#ffff33', '#a65628', '#f781bf', '#999999', '#66c2a5',
  '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f',
  '#e5c494', '#b3b3b3', '#e41a1c', '#00D8FF', '#DD1B16',
  '#f4b942', '#e35bcb', '#9288f8', '#f88d51', '#34a853',
  '#ea4335', '#1f77b4', '#2ca02c', '#9467bd', '#8c564b',
  '#e377c2', '#bcbd22', '#17becf', '#a0522d', '#6a3d9a',
  '#fdbf6f', '#b15928', '#fb9a99', '#cab2d6', '#ffed6f',
  '#80b1d3', '#fdb462', '#b3de69', '#bc80bd', '#ccebc5',
  '#d95f02', '#7570b3', '#e7298a', '#66a61e', '#e6ab02',
  '#a6761d', '#1b9e77', '#7fc97f', '#beaed4', '#fdc086',
  '#ffff99', '#386cb0', '#f0027f', '#bf5b17', '#8dd3c7',
  '#bebada', '#fb8072', '#fccde5', '#d9d9d9', '#8c510a'
];

/**
 * Возвращает map: уникальное значение поля → цвет
 */
export function getColorMap(dataset, colorFieldName, palette = PALETTE) {
  if (!dataset?.length || !colorFieldName) return {};
  const uniqVals = Array.from(new Set(dataset.map(row => row?.[colorFieldName])));
  return Object.fromEntries(
    uniqVals.map((val, idx) => [val, palette[idx % palette.length]])
  );
}

/**
 * Массив цветов для каждой строки/группы (по выбранному полю)
 */
export function getRowColors(dataset, colorFieldName, palette = PALETTE) {
  const colorMap = getColorMap(dataset, colorFieldName, palette);
  return dataset.map(row => colorMap[row?.[colorFieldName]] || palette[0]);
}