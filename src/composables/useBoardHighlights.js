export function useBoardHighlights(props) {
  function isSelectedTableauCard(columnIndex, cardIndex) {
    if (props.selectedSource?.area !== 'tableau') return false
    if (props.selectedSource.columnIndex !== columnIndex) return false

    return cardIndex >= props.selectedSource.cardIndex
  }

  function isSelectedFreeCell(cellIndex) {
    return (
      props.selectedSource?.area === 'freeCell' && props.selectedSource.cellIndex === cellIndex
    )
  }

  function isSelectedFoundation(foundationIndex) {
    return (
      props.selectedSource?.area === 'foundation' && props.selectedSource.foundationIndex === foundationIndex
    )
  }

  function isHintFromFreeCell(cellIndex) {
    return (
      props.hintMove?.from.area === 'freeCell' && props.hintMove.from.cellIndex === cellIndex
    )
  }

  function isHintFromTableauCard(columnIndex, cardIndex) {
    return (
      props.hintMove?.from.area === 'tableau' &&
      props.hintMove.from.columnIndex === columnIndex &&
      props.hintMove.from.cardIndex === cardIndex
    )
  }

  function isHintToTableauColumn(columnIndex) {
    return (
      props.hintMove?.to.area === 'tableau' && props.hintMove.to.columnIndex === columnIndex
    )
  }

  function isHintToTableauCard(columnIndex, cardIndex, column) {
    return isHintToTableauColumn(columnIndex) && cardIndex === column.length - 1
  }

  return {
    isSelectedTableauCard,
    isSelectedFreeCell,
    isSelectedFoundation,
    isHintFromFreeCell,
    isHintFromTableauCard,
    isHintToTableauColumn,
    isHintToTableauCard
  }
}
