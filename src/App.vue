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
      moveFreeCellToTableau(selectedSource.value, columnIndex)
      return
    }

    selectedSource.value = {
      area: 'tableau',
      card,
      columnIndex,
      cardIndex
    }
    console.log('點到 tableau 牌:', selectedSource.value)
  }

  function moveFreeCellToTableau(source, targetCloumnIndex) {
    const moveCard = gameState.freeCells[source.cellIndex]
    if (!moveCard) return
    if (!source) return
    gameState.tableau[targetCloumnIndex].push(moveCard)
    gameState.freeCells[source.cellIndex] = null
    selectedSource.value = null
    console.log('freecell 移到 tableau', moveCard, targetCloumnIndex)
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
      return
    }
    
    const source = selectedSource.value
    // todo
    if (source.area !== 'tableau') return
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
