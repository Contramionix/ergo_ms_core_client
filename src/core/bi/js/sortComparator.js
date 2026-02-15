/**
 * Компаратор для сортировки строк по полю с учётом числового/строкового сравнения и направления.
 * @param {string} fieldName - имя поля в объекте строки
 * @param {boolean} desc - true = по убыванию
 * @returns {(a: object, b: object) => number}
 */
export function makeSortComparator(fieldName, desc) {
  return (a, b) => {
    const A = a[fieldName]
    const B = b[fieldName]
    if (A === B) return 0
    const numA = Number(A)
    const numB = Number(B)
    const useNum = Number.isFinite(numA) && Number.isFinite(numB)
    const cmp = useNum ? (numA > numB ? 1 : -1) : (String(A) > String(B) ? 1 : -1)
    return desc ? -cmp : cmp
  }
}
