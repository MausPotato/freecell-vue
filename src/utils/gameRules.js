export function isValidTableauStack(cards) {
  if (!cards.length) return false
  const isDecreasingByOne = cards.every((card, index , arr) => {
    if (index === 0) return true
    const previousCard = arr[index - 1]
    return previousCard.point - card.point === 1
  })
  const isDifferentColor = cards.every((card, index, arr) => {
    if (index === 0) return true
    const previousCard = arr[index - 1]
    return getCardColor(previousCard) !== getCardColor(card)
  })
  return isDecreasingByOne && isDifferentColor
}

export function getCardColor(card) {
  const blackSuits = [1, 4]
  const redSuits = [2, 3]
  if (blackSuits.includes(card.suit)) return 'black'
  if (redSuits.includes(card.suit)) return 'red'
  return null
}

export function canMoveToTableau(card, targetColumn) {
  if (!card) return
  const targetCard = targetColumn[targetColumn.length - 1]
  if (!targetCard) return true
  const isDecreasingByOne = targetCard.point - card.point === 1
  const isDifferentColor = getCardColor(card) !== getCardColor(targetCard)
  return isDecreasingByOne && isDifferentColor
}