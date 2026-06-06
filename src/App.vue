<script setup>
  import { ref, reactive } from 'vue'
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

  function isValidTableauStack(cards) {
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

  function getCardColor(card) {
    const blackSuits = [1, 4]
    const redSuits = [2, 3]
    if (blackSuits.includes(card.suit)) return 'black'
    if (redSuits.includes(card.suit)) return 'red'
    return null
  }
  
  function moveTableauStackToTableau(source, targetColumnIndex) {
    if (!source) return
    if (source.columnIndex === targetColumnIndex) return
    const sourceColumn = gameState.tableau[source.columnIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCards = sourceColumn.slice(source.cardIndex)
    if (!isValidTableauStack(movingCards)) return
    if (!canMoveToTableau(movingCards[0], targetColumn)) return

    sourceColumn.splice(source.cardIndex)
    targetColumn.push(...movingCards)
  }

  function canMoveToTableau(card, targetColumn) {
    if (!card) return
    const targetCard = targetColumn[targetColumn.length - 1]
    if (!targetCard) return true
    const isDecreasingByOne = targetCard.point - card.point === 1
    const isDifferentColor = getCardColor(card) !== getCardColor(targetCard)
    return isDecreasingByOne && isDifferentColor
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


  function handleFoundationClick({ foundation, foundationIndex }) {
    console.log('點到 foundation', {
      foundation,
      foundationIndex,
      selectedSource: selectedSource.value
    })
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
