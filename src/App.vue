<script setup>
  import { ref, reactive } from 'vue'
  import { isValidTableauStack, canMoveToTableau, canMoveToFoundation, getMovableStackLimit } from './utils/gameRules'
  import GameBoard from './components/GameBoard.vue'

  const selectedSource = ref(null)
  const cards = []
  for (let i = 0; i < 52; i++) {
    cards.push({
      id: i + 1,
      suit: Math.ceil((i + 1) / 13),
      point: (i % 13) + 1,
    })
  }
  const gameState = reactive({
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau: [[], [], [], [], [], [], [], []]
  })
  cards.forEach((card, index) => {
    gameState.tableau[index % 8].push(card)
  })

  function handleClick({ card, columnIndex, cardIndex }) {
    if (selectedSource.value?.area === 'freeCell') {
      moveFreeCellToTableau(selectedSource.value.cellIndex, columnIndex)
      selectedSource.value = null
      return
    }

    if (selectedSource.value?.area === 'tableau') {
      moveTableauStackToTableau(selectedSource.value, columnIndex)
      selectedSource.value = null
      return
    }

    if (!card) return

    selectedSource.value = {
      area: 'tableau',
      card,
      columnIndex,
      cardIndex
    }
    console.log('點到 tableau 牌:', selectedSource.value)
  }

  function moveTableauStackToTableau(source, targetColumnIndex) {
    if (!source) return
    if (source.columnIndex === targetColumnIndex) return
    const sourceColumn = gameState.tableau[source.columnIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCards = sourceColumn.slice(source.cardIndex)
    const movableStackLimit = getMovableStackLimit(gameState)
    if (movingCards.length > movableStackLimit) {
      console.log('超過可移動張數')
      return
    }
    if (isValidTableauStack(movingCards) && canMoveToTableau(movingCards[0], targetColumn)) {
      sourceColumn.splice(source.cardIndex)
      targetColumn.push(...movingCards)
    }

  }

  function moveFreeCellToTableau(cellIndex, targetColumnIndex) {
    const card = gameState.freeCells[cellIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    if (!card) return
    if (!canMoveToTableau(card, targetColumn)) return
    targetColumn.push(card)
    gameState.freeCells[cellIndex] = null
    console.log('freecell 移到 tableau', card, targetColumnIndex)
  }

  function handleFreeCellClick({ card, cellIndex }) {
    if (!selectedSource.value && card) {
      selectedSource.value = {
        area: 'freeCell',
        card,
        cellIndex
      }
      console.log('選到freeCell牌', selectedSource.value)
      return
    }
    if (!selectedSource.value) return
    if (card) {
      console.log('這裡已經有牌了!')
      selectedSource.value = null
      return
    }
    
    const source = selectedSource.value
    // todo
    if (source.area !== 'tableau') {
      selectedSource.value = null
      return
    }
    const sourceColumn = gameState.tableau[source.columnIndex]
    const isLastCard = source.cardIndex === sourceColumn.length - 1
    if (!isLastCard) {
      console.log('只能移動一張!')
      return
    }
    const moveCard = sourceColumn.pop()
    gameState.freeCells[cellIndex] = moveCard
    selectedSource.value = null
    console.log('移到 free cell:', moveCard, cellIndex)
  }


  function handleFoundationClick({ foundationIndex }) {
    if (!selectedSource.value) return
    const source = selectedSource.value
    const foundationPile = gameState.foundations[foundationIndex]
    let movingCard = null
    let removeFromSource = null
    if (source.area === 'tableau') {
      const sourceColumn = gameState.tableau[source.columnIndex]
      const isLastCard = source.cardIndex === sourceColumn.length - 1
      if (!isLastCard) {
        selectedSource.value = null
        return
      }
      movingCard = sourceColumn[source.cardIndex]
      removeFromSource = () => {
        sourceColumn.pop()
      }
    }
    if (source.area === 'freeCell') {
      movingCard = gameState.freeCells[source.cellIndex]
      removeFromSource = () => {
        gameState.freeCells[source.cellIndex] = null
      }
    }
    if (!movingCard || !removeFromSource) {
        selectedSource.value = null
        return
    }
    if (!canMoveToFoundation(movingCard, foundationPile)) {
      console.log('不能移到 foundation')
      selectedSource.value = null
      return
    }
    removeFromSource()
    foundationPile.push(movingCard)
    selectedSource.value = null
  }

</script>

<template>
  <GameBoard
    :game-state="gameState"
    @card-click="handleClick"
    @free-cell-click="handleFreeCellClick"
    @foundation-click="handleFoundationClick"
     />
</template>

<style scoped>
</style>
