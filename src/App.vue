<script setup>
  import { ref, reactive, computed, watch } from 'vue'
  import { isValidTableauStack, canMoveToTableau, canMoveToFoundation, getMovableStackLimit } from './utils/gameRules'
  import { createGameState } from './utils/gameSetup'
  import GameBoard from './components/GameBoard.vue'
  import GameControls from './components/GameControls.vue'
  import ConfirmDialog from './components/ConfirmDialog.vue'
  import GameTimer from './components/GameTimer.vue'

  const gameState = reactive(createGameState())
  const selectedSource = ref(null)
  const history = ref([])
  const showNewGameConfirm = ref(false)
  const seconds = ref(0)
  const timerId = ref(null)
  const wasTimerRunningBeforeDialog = ref(false)
  const formattedTime = computed(() => {
    const minutes = Math.floor(seconds.value / 60)
    const remainingSeconds = seconds.value % 60

    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`
  })
  const isGameWon = computed(() => {
    return gameState.foundations.every(foundation => foundation.length === 13)
  })
  const showWinDialog = ref(false)
  const hintMove = ref(null)

  watch(isGameWon, (hasWon) => {
    if (!hasWon) return
    stopTimer()
    selectedSource.value = null
    showWinDialog.value = true
  })

  function clearHint() {
    hintMove.value = null
  }

  function handleClick({ card, columnIndex, cardIndex }) {
    clearHint()
    if (!selectedSource.value && !card) return
    if (selectedSource.value?.area === 'freeCell') {
      moveFreeCellToTableau(selectedSource.value.cellIndex, columnIndex)
      selectedSource.value = null
      return
    }

    if (selectedSource.value?.area === 'foundation') {
      moveFoundationToTableau(selectedSource.value.foundationIndex, columnIndex)
      selectedSource.value = null
      return
    }

    if (selectedSource.value?.area === 'tableau') {
      moveTableauStackToTableau(selectedSource.value, columnIndex)
      selectedSource.value = null
      return
    }

    selectedSource.value = {
      area: 'tableau',
      card,
      columnIndex,
      cardIndex
    }
  }

  function moveTableauStackToTableau(source, targetColumnIndex) {
    if (!source) return
    if (source.columnIndex === targetColumnIndex) return
    const sourceColumn = gameState.tableau[source.columnIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCards = sourceColumn.slice(source.cardIndex)
    const movableStackLimit = getMovableStackLimit(gameState, source.columnIndex, targetColumnIndex)
    if (movingCards.length > movableStackLimit) {
      return
    }
    if (isValidTableauStack(movingCards) && canMoveToTableau(movingCards[0], targetColumn)) {
      saveHistory()
      sourceColumn.splice(source.cardIndex)
      targetColumn.push(...movingCards)
    }
  }

  function moveFreeCellToTableau(cellIndex, targetColumnIndex) {
    const card = gameState.freeCells[cellIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    if (!card) return
    if (!canMoveToTableau(card, targetColumn)) return
    saveHistory()
    targetColumn.push(card)
    gameState.freeCells[cellIndex] = null
  }

  function moveFoundationToTableau(foundationIndex, targetColumnIndex) {
    const foundationPile = gameState.foundations[foundationIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCard = foundationPile[foundationPile.length - 1]

    if (!movingCard) return
    if (!canMoveToTableau(movingCard, targetColumn)) {
      return
    }
    saveHistory()
    foundationPile.pop()
    targetColumn.push(movingCard)
  }

  function handleFreeCellClick({ card, cellIndex }) {
    clearHint()
    if (!selectedSource.value && card) {
      selectedSource.value = {
        area: 'freeCell',
        card,
        cellIndex
      }
      return
    }
    if (!selectedSource.value) return
    if (card) {
      selectedSource.value = null
      return
    }
    
    const source = selectedSource.value
    if (source.area === 'freeCell') {
      saveHistory()
      const moveCard = gameState.freeCells[source.cellIndex]
      gameState.freeCells[source.cellIndex] = null
      gameState.freeCells[cellIndex] = moveCard
      selectedSource.value = null
      return
    }
    if (source.area !== 'tableau') {
      selectedSource.value = null
      return
    }
    const sourceColumn = gameState.tableau[source.columnIndex]
    const isLastCard = source.cardIndex === sourceColumn.length - 1
    if (!isLastCard) {
      selectedSource.value = null
      return
    }
    saveHistory()
    const moveCard = sourceColumn.pop()
    gameState.freeCells[cellIndex] = moveCard
    selectedSource.value = null
  }

  function handleFoundationClick({ foundationIndex }) {
    clearHint()
    const foundationPile = gameState.foundations[foundationIndex]
    if (!selectedSource.value) {
      if (!foundationPile.length) return
      selectedSource.value = {
        area: 'foundation',
        card: foundationPile[foundationPile.length - 1],
        foundationIndex
      }
      return
    }
    const source = selectedSource.value
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

    const correctFoundationIndex = getFoundationIndex(movingCard)
    if (foundationIndex !== correctFoundationIndex) {
      selectedSource.value = null
      return
    }

    if (!canMoveToFoundation(movingCard, foundationPile)) {
      selectedSource.value = null
      return
    }
    saveHistory()
    removeFromSource()
    foundationPile.push(movingCard)
    selectedSource.value = null
  }

  function getFoundationIndex(card) {
    return card.suit - 1
  }

  function handleUndo() {
    clearHint()
    const previousState = history.value.pop()
    if (!previousState) return
    restoreGameState(previousState)
    selectedSource.value = null
  }

  function saveHistory() {
    startTimer()
    history.value.push(cloneGameState(gameState))
  }

  function cloneGameState(state) {
    return {
      freeCells: state.freeCells.map(card => card ? { ...card } : null),
      foundations: state.foundations.map(foundations => foundations.map(card => ({...card}))),
      tableau: state.tableau.map(column => column.map(card => ({...card})))
    }
  }

  function restoreGameState(state) {
    gameState.freeCells = state.freeCells
    gameState.foundations = state.foundations
    gameState.tableau = state.tableau
  }

  function handleHint() {
    const hint = findHint()
    if (!hint) {
      hintMove.value = null
      return
    }
    hintMove.value = hint
  }

  function findHint() {
  // 1. freeCell → tableau
  for (let cellIndex = 0; cellIndex < gameState.freeCells.length; cellIndex++) {
    const card = gameState.freeCells[cellIndex]

    if (!card) continue

    for (let columnIndex = 0; columnIndex < gameState.tableau.length; columnIndex++) {
      const targetColumn = gameState.tableau[columnIndex]
      const canMove = canMoveToTableau(card, targetColumn)

      if (canMove) {
        return {
          from: {
            area: 'freeCell',
            cellIndex,
            card
          },
          to: {
            area: 'tableau',
            columnIndex
          },
          message: 'freeCell 可以移到 tableau'
        }
      }
    }
  }

  // 2. tableau top card → tableau
  for (let sourceColumnIndex = 0; sourceColumnIndex < gameState.tableau.length; sourceColumnIndex++) {
    const sourceColumn = gameState.tableau[sourceColumnIndex]
    const sourceCardIndex = sourceColumn.length - 1
    const card = sourceColumn[sourceCardIndex]

    if (!card) continue

    for (let targetColumnIndex = 0; targetColumnIndex < gameState.tableau.length; targetColumnIndex++) {
      if (sourceColumnIndex === targetColumnIndex) continue

      const targetColumn = gameState.tableau[targetColumnIndex]
      const canMove = canMoveToTableau(card, targetColumn)

      if (canMove) {
        return {
          from: {
            area: 'tableau',
            columnIndex: sourceColumnIndex,
            cardIndex: sourceCardIndex,
            card
          },
          to: {
            area: 'tableau',
            columnIndex: targetColumnIndex
          },
          message: 'tableau 最上面的牌可以移到 tableau'
        }
      }
    }
  }

  return null
}

  function handleNewGame() {
    clearHint()
    wasTimerRunningBeforeDialog.value = timerId.value !== null
    stopTimer()
    showNewGameConfirm.value = true
  }

  function confirmNewGame() {
    clearHint()
    const newState = createGameState()
    restoreGameState(newState)
    // gameState.freeCells = newState.freeCells
    // gameState.foundations = newState.foundations
    // gameState.tableau = newState.tableau
    selectedSource.value = null
    history.value = []
    resetTimer()
    showNewGameConfirm.value = false
    wasTimerRunningBeforeDialog.value = false
  }

  function cancelNewGame() {
    showNewGameConfirm.value = false
    if (wasTimerRunningBeforeDialog.value) {
      startTimer()
    }
    wasTimerRunningBeforeDialog.value = false
  }

  function startTimer() {
    if (timerId.value) return
    timerId.value = setInterval(() => {
      seconds.value++
    }, 1000)
  }

  function stopTimer() {
    clearInterval(timerId.value)
    timerId.value = null
  }

  function resetTimer() {
    stopTimer()
    seconds.value = 0
  }
</script>

<template>
  <div class="game-board-area">
    <GameBoard
      :game-state="gameState"
      :selected-source="selectedSource"
      :hint-move="hintMove"
      @tableau-click="handleClick"
      @free-cell-click="handleFreeCellClick"
      @foundation-click="handleFoundationClick"
      />

    <GameTimer
      :seconds="seconds"
      />

    <GameControls
      @undo="handleUndo"
      @hint="handleHint"
      @new-game="handleNewGame"
      />

    <ConfirmDialog
      v-if="showNewGameConfirm"
      message="START A NEW GAME?"
      :show-cancel="true"
      @cancel="cancelNewGame"
      @confirm="confirmNewGame"
      />
    
    <ConfirmDialog
      v-if="showWinDialog"
      message="YOU WIN!"
      :sub-message="`TIME ${formattedTime}`"
      confirm-text="NEW GAME"
      :show-cancel="false"
      @confirm="confirmNewGame"
     />
  </div>
</template>

<style scoped>
.game-board-area {
  position: relative;
  width: 100%;
  height: 100vh;
}

.game-controls {
  position: absolute;
  right: 0;
  bottom: 0;
}
</style>
