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
  const dragSource = ref(null)
  const gameBoardRef = ref(null)

  watch(isGameWon, (hasWon) => {
    if (!hasWon) return
    stopTimer()
    selectedSource.value = null
    showWinDialog.value = true
  })

  function clearHint() {
    hintMove.value = null
  }

  function handleDragStart(source) {
    clearHint()
    selectedSource.value = null
    dragSource.value = source
  }

  function handleDrop({ to, settle }) {
    clearHint()
    const source = dragSource.value
    dragSource.value = null
    selectedSource.value = null
    if (!source) {
      settle?.(false)
      return
    }

    const moved = moveSourceToDestination(source, to)
    settle?.(moved)
  }

  function handleDragEnd() {
    dragSource.value = null
  }

  function handleAutoMove(payload) {
    const source = payload.source ?? payload
    const animate = payload.animate
    clearHint()
    selectedSource.value = null

    const destination = findAutoMoveDestination(source)
    if (!destination) return

    const commit = () => {
      moveSourceToDestination(source, destination)
    }

    if (animate) {
      animate(destination, commit)
      return
    }

    commit()
  }

  function findAutoMoveDestination(source) {
    return (
      findAutoMoveFoundationDestination(source) ||
      findAutoMoveTableauDestination(source) ||
      findAutoMoveFreeCellDestination(source)
    )
  }

  function findAutoMoveFoundationDestination(source) {
    if (source.area === 'foundation') return null

    const foundationIndex = getFoundationIndex(source.card)
    const foundationPile = gameState.foundations[foundationIndex]

    if (canMoveSourceToFoundation(source, foundationPile, foundationIndex)) {
      return { area: 'foundation', foundationIndex }
    }

    return null
  }

  function findAutoMoveTableauDestination(source) {
    for (let columnIndex = 0; columnIndex < gameState.tableau.length; columnIndex++) {
      if (source.area === 'tableau' && source.columnIndex === columnIndex) continue

      if (canMoveSourceToTableau(source, columnIndex)) {
        return { area: 'tableau', columnIndex }
      }
    }

    return null
  }

  function findAutoMoveFreeCellDestination(source) {
    if (source.area === 'freeCell') return null

    for (let cellIndex = 0; cellIndex < gameState.freeCells.length; cellIndex++) {
      if (!gameState.freeCells[cellIndex] && canMoveSourceToFreeCell(source)) {
        return { area: 'freeCell', cellIndex }
      }
    }

    return null
  }

  function canMoveSourceToTableau(source, columnIndex) {
    const targetColumn = gameState.tableau[columnIndex]

    if (source.area === 'tableau') {
      const sourceColumn = gameState.tableau[source.columnIndex]
      const movingCards = sourceColumn.slice(source.cardIndex)
      const movableStackLimit = getMovableStackLimit(gameState, source.columnIndex, columnIndex)

      return (
        source.columnIndex !== columnIndex &&
        movingCards.length <= movableStackLimit &&
        isValidTableauStack(movingCards) &&
        canMoveToTableau(movingCards[0], targetColumn)
      )
    }

    if (source.area === 'freeCell') {
      return canMoveToTableau(gameState.freeCells[source.cellIndex], targetColumn)
    }

    if (source.area === 'foundation') {
      const foundationPile = gameState.foundations[source.foundationIndex]
      return canMoveToTableau(foundationPile[foundationPile.length - 1], targetColumn)
    }

    return false
  }

  function canMoveSourceToFreeCell(source) {
    if (source.area === 'foundation') {
      return Boolean(gameState.foundations[source.foundationIndex].length)
    }

    if (source.area !== 'tableau') return false

    const sourceColumn = gameState.tableau[source.columnIndex]
    return source.cardIndex === sourceColumn.length - 1
  }

  function canMoveSourceToFoundation(source, foundationPile, foundationIndex) {
    let movingCard = null

    if (source.area === 'tableau') {
      const sourceColumn = gameState.tableau[source.columnIndex]
      if (source.cardIndex !== sourceColumn.length - 1) return false
      movingCard = sourceColumn[source.cardIndex]
    }

    if (source.area === 'freeCell') {
      movingCard = gameState.freeCells[source.cellIndex]
    }

    if (!movingCard) return false

    return (
      foundationIndex === getFoundationIndex(movingCard) &&
      canMoveToFoundation(movingCard, foundationPile)
    )
  }

  function moveSourceToDestination(source, to) {
    if (to.area === 'tableau') {
      if (source.area === 'tableau') {
        return moveTableauStackToTableau(source, to.columnIndex)
      }
      if (source.area === 'freeCell') {
        return moveFreeCellToTableau(source.cellIndex, to.columnIndex)
      }
      if (source.area === 'foundation') {
        return moveFoundationToTableau(source.foundationIndex, to.columnIndex)
      }
      return false
    }

    if (to.area === 'freeCell') {
      if (source.area === 'tableau') {
        return moveTableauTopCardToFreeCell(source, to.cellIndex)
      }
      if (source.area === 'freeCell') {
        return moveFreeCellToFreeCell(source.cellIndex, to.cellIndex)
      }
      if (source.area === 'foundation') {
        return moveFoundationToFreeCell(source.foundationIndex, to.cellIndex)
      }
      return false
    }

    if (to.area === 'foundation') {
      return moveSourceToFoundation(source, to.foundationIndex)
    }

    return false
  }

  function handleClick({ card, columnIndex, cardIndex }) {
    clearHint()
    if (!selectedSource.value && !card) return
    if (selectedSource.value) {
      moveSourceToDestination(selectedSource.value, { area: 'tableau', columnIndex })
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
    if (!source) return false
    if (source.columnIndex === targetColumnIndex) return false
    const sourceColumn = gameState.tableau[source.columnIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCards = sourceColumn.slice(source.cardIndex)
    const movableStackLimit = getMovableStackLimit(gameState, source.columnIndex, targetColumnIndex)
    if (movingCards.length > movableStackLimit) {
      return false
    }
    if (isValidTableauStack(movingCards) && canMoveToTableau(movingCards[0], targetColumn)) {
      saveHistory()
      sourceColumn.splice(source.cardIndex)
      targetColumn.push(...movingCards)
      return true
    }
    return false
  }

  function moveFreeCellToTableau(cellIndex, targetColumnIndex) {
    const card = gameState.freeCells[cellIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    if (!card) return false
    if (!canMoveToTableau(card, targetColumn)) return false
    saveHistory()
    targetColumn.push(card)
    gameState.freeCells[cellIndex] = null
    return true
  }

  function moveFoundationToTableau(foundationIndex, targetColumnIndex) {
    const foundationPile = gameState.foundations[foundationIndex]
    const targetColumn = gameState.tableau[targetColumnIndex]
    const movingCard = foundationPile[foundationPile.length - 1]

    if (!movingCard) return false
    if (!canMoveToTableau(movingCard, targetColumn)) {
      return false
    }
    saveHistory()
    foundationPile.pop()
    targetColumn.push(movingCard)
    return true
  }

  function moveTableauTopCardToFreeCell(source, cellIndex) {
    if (gameState.freeCells[cellIndex]) return false
    const sourceColumn = gameState.tableau[source.columnIndex]
    const isLastCard = source.cardIndex === sourceColumn.length - 1
    if (!isLastCard) return false

    saveHistory()
    gameState.freeCells[cellIndex] = sourceColumn.pop()
    return true
  }

  function moveFreeCellToFreeCell(sourceCellIndex, targetCellIndex) {
    if (sourceCellIndex === targetCellIndex) return false
    if (gameState.freeCells[targetCellIndex]) return false

    saveHistory()
    gameState.freeCells[targetCellIndex] = gameState.freeCells[sourceCellIndex]
    gameState.freeCells[sourceCellIndex] = null
    return true
  }

  function moveFoundationToFreeCell(foundationIndex, cellIndex) {
    if (gameState.freeCells[cellIndex]) return false
    const foundationPile = gameState.foundations[foundationIndex]
    const movingCard = foundationPile[foundationPile.length - 1]
    if (!movingCard) return false

    saveHistory()
    gameState.freeCells[cellIndex] = foundationPile.pop()
    return true
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
    
    moveSourceToDestination(selectedSource.value, { area: 'freeCell', cellIndex })
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
    moveSourceToFoundation(selectedSource.value, foundationIndex)
    selectedSource.value = null
  }

  function moveSourceToFoundation(source, foundationIndex) {
    const foundationPile = gameState.foundations[foundationIndex]
    let movingCard = null
    let removeFromSource = null

    if (source.area === 'tableau') {
      const sourceColumn = gameState.tableau[source.columnIndex]
      const isLastCard = source.cardIndex === sourceColumn.length - 1
      if (!isLastCard) return false

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

    if (!movingCard || !removeFromSource) return false
    if (foundationIndex !== getFoundationIndex(movingCard)) return false
    if (!canMoveToFoundation(movingCard, foundationPile)) return false

    saveHistory()
    removeFromSource()
    foundationPile.push(movingCard)
    return true
  }

  function getFoundationIndex(card) {
    return card.suit - 1
  }

  function handleUndo() {
    clearHint()
    const previousState = history.value.pop()
    if (!previousState) return
    selectedSource.value = null

    const currentState = cloneGameState(gameState)
    const commit = () => {
      restoreGameState(previousState)
    }

    if (gameBoardRef.value?.animateUndo) {
      gameBoardRef.value.animateUndo(currentState, previousState, commit)
      return
    }

    commit()
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
      ref="gameBoardRef"
      :game-state="gameState"
      :selected-source="selectedSource"
      :hint-move="hintMove"
      @tableau-click="handleClick"
      @free-cell-click="handleFreeCellClick"
      @foundation-click="handleFoundationClick"
      @drag-start="handleDragStart"
      @card-drop="handleDrop"
      @drag-end="handleDragEnd"
      @card-double-click="handleAutoMove"
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
