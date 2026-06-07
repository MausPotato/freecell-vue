<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Card from './Card.vue'
import { isValidTableauStack } from '../utils/gameRules'

const props = defineProps({
  gameState: {
    type: Object,
    required: true
  },
  selectedSource: {
    type: Object,
    default: null
  },
  hintMove: {
    type: Object,
    default: null
  }
})

const emit = defineEmits([
  'tableau-click',
  'free-cell-click',
  'foundation-click',
  'card-double-click',
  'drag-start',
  'card-drop',
  'drag-end'
])

const foundationSlots = ['s0.png', 'h0.png', 'd0.png', 'c0.png']
const dragPreview = ref(null)
const autoMovePreview = ref(null)
const undoPreview = ref(null)
const suppressClick = ref(false)
const dragThreshold = 6
const doubleClickDelay = 320
const viewportHeight = ref(window.innerHeight)
let lastTap = null
let dragAnimationFrame = null
let undoAnimationTimer = null

defineExpose({
  animateUndo
})

function handleCardClick(card, columnIndex, cardIndex) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('tableau-click', {
    card,
    columnIndex,
    cardIndex
  })
}

function handleColumnClick(columnIndex) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('tableau-click', {
    card: null,
    columnIndex,
    cardIndex: null
  })
}

function handleFreeCellClick(card, cellIndex) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('free-cell-click', {
    card,
    cellIndex
  })
}

function handleFoundationClick(foundation, foundationIndex) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  emit('foundation-click', {
    foundation,
    foundationIndex
  })
}

function handleDragStart(event, source) {
  if (event.button !== 0) return
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const cards = getDragCards(source)

  if (!canDragSource(source, cards)) return

  event.preventDefault()

  if (isDoubleTap(source)) {
    suppressClick.value = true
    lastTap = null
    emit('card-double-click', {
      source,
      animate: (to, commit) => animateAutoMove(source, to, rect, commit)
    })
    return
  }

  lastTap = {
    key: getSourceKey(source),
    time: performance.now()
  }

  const cardStep = getPreviewCardStep(target, source)

  target.setPointerCapture?.(event.pointerId)

  dragPreview.value = {
    source,
    cards,
    target,
    pointerId: event.pointerId,
    hasMoved: false,
    isReturning: false,
    startX: event.clientX,
    startY: event.clientY,
    x: event.clientX,
    y: event.clientY,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
    cardStep,
    trail: cards.map((card, index) => ({
      id: card.id,
      x: rect.left,
      y: rect.top + cardStep * index
    }))
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerUp, { once: true })
  window.addEventListener('pointercancel', handlePointerCancel, { once: true })
  window.addEventListener('blur', handlePointerCancel, { once: true })
}

function isDoubleTap(source) {
  if (!lastTap) return false

  const isSameSource = lastTap.key === getSourceKey(source)
  const isFastEnough = performance.now() - lastTap.time <= doubleClickDelay

  return isSameSource && isFastEnough
}

function getSourceKey(source) {
  if (source.area === 'tableau') return `tableau:${source.columnIndex}:${source.cardIndex}`
  if (source.area === 'freeCell') return `freeCell:${source.cellIndex}`
  if (source.area === 'foundation') return `foundation:${source.foundationIndex}`

  return source.area
}

function handleDrop(to) {
  emit('card-drop', { to })
}

function handlePointerMove(event) {
  if (!dragPreview.value) return

  const deltaX = event.clientX - dragPreview.value.startX
  const deltaY = event.clientY - dragPreview.value.startY
  const distance = Math.hypot(deltaX, deltaY)

  dragPreview.value.x = event.clientX
  dragPreview.value.y = event.clientY

  if (!dragPreview.value.hasMoved && distance >= dragThreshold) {
    dragPreview.value.hasMoved = true
    suppressClick.value = true
    emit('drag-start', dragPreview.value.source)
    startDragAnimation()
  }
}

function handlePointerUp(event) {
  cleanupPointerDrag()

  const preview = dragPreview.value

  if (!preview?.hasMoved) {
    dragPreview.value = null
    return
  }

  const dropTarget = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest('[data-drop-area]')

  if (dropTarget) {
    emit('card-drop', {
      to: {
        area: dropTarget.dataset.dropArea,
        columnIndex: parseOptionalNumber(dropTarget.dataset.columnIndex),
        cellIndex: parseOptionalNumber(dropTarget.dataset.cellIndex),
        foundationIndex: parseOptionalNumber(dropTarget.dataset.foundationIndex)
      },
      settle: settleDrag
    })
    return
  }

  settleDrag(false)
}

function handlePointerCancel() {
  cleanupPointerDrag()
  dragPreview.value = null
  stopDragAnimation()
  emit('drag-end')
}

function cleanupPointerDrag() {
  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointercancel', handlePointerCancel)
  window.removeEventListener('blur', handlePointerCancel)

  if (dragPreview.value?.target && dragPreview.value.pointerId !== undefined) {
    dragPreview.value.target.releasePointerCapture?.(dragPreview.value.pointerId)
  }
}

function parseOptionalNumber(value) {
  if (value === undefined) return undefined
  return Number(value)
}

function getPreviewCardStep(target, source) {
  if (source.area !== 'tableau') return 0

  const nextCard = target.nextElementSibling
  if (!nextCard) return 0

  const currentRect = target.getBoundingClientRect()
  const nextRect = nextCard.getBoundingClientRect()

  return nextRect.top - currentRect.top
}

function getDragCards(source) {
  if (source.area === 'tableau') {
    return props.gameState.tableau[source.columnIndex].slice(source.cardIndex)
  }

  return source.card ? [source.card] : []
}

function canDragSource(source, cards = getDragCards(source)) {
  if (!cards.length) return false
  if (source.area !== 'tableau') return true

  return isValidTableauStack(cards)
}

function animateAutoMove(source, to, sourceRect, commit) {
  const cards = getDragCards(source)
  const targetRect = getDropTargetRect(to, cards.length)

  if (!targetRect) {
    commit()
    return
  }

  const cardStep =
    to.area === 'tableau'
      ? targetRect.cardStep
      : getPreviewCardStepFromSource(source)
  autoMovePreview.value = {
    source,
    cards,
    cardStep,
    x: sourceRect.left,
    y: sourceRect.top,
    commit
  }

  requestAnimationFrame(() => {
    if (!autoMovePreview.value) return

    autoMovePreview.value.x = targetRect.left
    autoMovePreview.value.y = targetRect.top
  })
}

function getDropTargetRect(to, movingCardCount = 1) {
  let selector = ''

  if (to.area === 'tableau') {
    const column = document.querySelector(
      `[data-drop-area="tableau"][data-column-index="${to.columnIndex}"]`
    )
    const columnRect = column?.getBoundingClientRect()

    if (!columnRect) return null

    const targetColumn = props.gameState.tableau[to.columnIndex]
    const targetCardIndex = targetColumn.length
    const cardStep = getColumnCardStep(targetColumn.length + movingCardCount)
    const targetTop = columnRect.top + cardStep * targetCardIndex

    return {
      left: columnRect.left,
      top: targetTop,
      right: columnRect.right,
      bottom: targetTop + columnRect.height,
      width: columnRect.width,
      height: columnRect.height,
      x: columnRect.left,
      y: targetTop,
      cardStep
    }
  }
  if (to.area === 'freeCell') {
    selector = `[data-drop-area="freeCell"][data-cell-index="${to.cellIndex}"]`
  }
  if (to.area === 'foundation') {
    selector = `[data-drop-area="foundation"][data-foundation-index="${to.foundationIndex}"]`
  }

  return document.querySelector(selector)?.getBoundingClientRect()
}

function getUndoTargetRect(to, previousState) {
  if (to.area === 'tableau') {
    const column = document.querySelector(
      `[data-drop-area="tableau"][data-column-index="${to.columnIndex}"]`
    )
    const columnRect = column?.getBoundingClientRect()

    if (!columnRect) return null

    const targetColumn = previousState.tableau[to.columnIndex]
    const cardStep = getColumnCardStep(targetColumn.length)
    const targetTop = columnRect.top + cardStep * to.cardIndex

    return {
      left: columnRect.left,
      top: targetTop,
      right: columnRect.right,
      bottom: targetTop + columnRect.height,
      width: columnRect.width,
      height: columnRect.height,
      x: columnRect.left,
      y: targetTop
    }
  }

  if (to.area === 'freeCell') {
    return document
      .querySelector(`[data-drop-area="freeCell"][data-cell-index="${to.cellIndex}"]`)
      ?.getBoundingClientRect()
  }

  if (to.area === 'foundation') {
    return document
      .querySelector(`[data-drop-area="foundation"][data-foundation-index="${to.foundationIndex}"]`)
      ?.getBoundingClientRect()
  }

  return null
}

function getPreviewCardStepFromSource(source) {
  if (source.area !== 'tableau') return 0

  const sourceCard = document
    .querySelector(`[data-card-id="${source.card.id}"]`)
    ?.closest('.card-wrapper')

  if (!sourceCard) return 0

  return getPreviewCardStep(sourceCard, source)
}

function autoMovePreviewCardStyle(index) {
  if (!autoMovePreview.value) return {}

  return {
    '--preview-x': `${autoMovePreview.value.x}px`,
    '--preview-y': `${autoMovePreview.value.y + autoMovePreview.value.cardStep * index}px`,
    '--drag-card-x': `${index * 5}px`,
    '--drag-card-rotate': `${Math.min(index * 1.4, 5)}deg`
  }
}

function getCurrentCardStep() {
  const styles = getComputedStyle(document.documentElement)
  const rootStep = styles.getPropertyValue('--tableau-card-step')
  const parsedRootStep = Number.parseFloat(rootStep)

  if (Number.isFinite(parsedRootStep)) return parsedRootStep

  const board = document.getElementById('game-board')
  if (!board) return 0

  const boardStep = getComputedStyle(board).getPropertyValue('--tableau-card-step')
  const parsedBoardStep = Number.parseFloat(boardStep)

  return Number.isFinite(parsedBoardStep) ? parsedBoardStep : 0
}

function finishAutoMoveAnimation() {
  if (!autoMovePreview.value) return

  const commit = autoMovePreview.value.commit
  autoMovePreview.value = null
  commit()
}

function animateUndo(currentState, previousState, commit) {
  const movedCards = getUndoMovedCards(currentState, previousState)

  if (!movedCards.length) {
    commit()
    return
  }

  const cards = movedCards
    .map((move, index) => {
      const sourceRect = getCardRect(move.card.id)
      const targetRect = getUndoTargetRect(move.to, previousState)

      if (!sourceRect || !targetRect) return null

      return {
        ...move,
        x: sourceRect.left,
        y: sourceRect.top,
        targetX: targetRect.left,
        targetY: targetRect.top,
        delay: index * 16
      }
    })
    .filter(Boolean)

  if (!cards.length) {
    commit()
    return
  }

  undoPreview.value = {
    cards,
    hiddenCardIds: new Set(cards.map(card => card.card.id)),
    commit
  }

  requestAnimationFrame(() => {
    if (!undoPreview.value) return

    undoPreview.value.cards = undoPreview.value.cards.map(card => ({
      ...card,
      x: card.targetX,
      y: card.targetY
    }))
  })

  undoAnimationTimer = window.setTimeout(finishUndoAnimation, cards.length * 16 + 300)
}

function getUndoMovedCards(currentState, previousState) {
  const currentLocations = getCardLocationMap(currentState)
  const previousLocations = getCardLocationMap(previousState)
  const movedCards = []

  previousLocations.forEach((previousLocation, cardId) => {
    const currentLocation = currentLocations.get(cardId)

    if (!currentLocation || isSameLocation(currentLocation, previousLocation)) return

    movedCards.push({
      card: currentLocation.card,
      from: currentLocation,
      to: previousLocation
    })
  })

  return movedCards.sort((first, second) => first.from.order - second.from.order)
}

function getCardLocationMap(state) {
  const locations = new Map()

  state.freeCells.forEach((card, cellIndex) => {
    if (!card) return

    locations.set(card.id, {
      area: 'freeCell',
      cellIndex,
      card,
      order: 0
    })
  })

  state.foundations.forEach((foundationPile, foundationIndex) => {
    foundationPile.forEach((card, cardIndex) => {
      locations.set(card.id, {
        area: 'foundation',
        foundationIndex,
        cardIndex,
        card,
        order: cardIndex
      })
    })
  })

  state.tableau.forEach((column, columnIndex) => {
    column.forEach((card, cardIndex) => {
      locations.set(card.id, {
        area: 'tableau',
        columnIndex,
        cardIndex,
        card,
        order: cardIndex
      })
    })
  })

  return locations
}

function isSameLocation(currentLocation, previousLocation) {
  if (currentLocation.area !== previousLocation.area) return false

  if (currentLocation.area === 'tableau') {
    return (
      currentLocation.columnIndex === previousLocation.columnIndex &&
      currentLocation.cardIndex === previousLocation.cardIndex
    )
  }

  if (currentLocation.area === 'freeCell') {
    return currentLocation.cellIndex === previousLocation.cellIndex
  }

  if (currentLocation.area === 'foundation') {
    return (
      currentLocation.foundationIndex === previousLocation.foundationIndex &&
      currentLocation.cardIndex === previousLocation.cardIndex
    )
  }

  return false
}

function getCardRect(cardId) {
  return document.querySelector(`[data-card-id="${cardId}"]`)?.getBoundingClientRect()
}

function undoPreviewCardStyle(card) {
  return {
    '--preview-x': `${card.x}px`,
    '--preview-y': `${card.y}px`,
    '--undo-card-delay': `${card.delay}ms`,
    '--drag-card-x': `${Math.min(card.delay / 16 * 5, 18)}px`,
    '--drag-card-rotate': `${Math.min(card.delay / 16 * 1.2, 4)}deg`
  }
}

function finishUndoAnimation() {
  if (!undoPreview.value) return

  if (undoAnimationTimer) {
    window.clearTimeout(undoAnimationTimer)
    undoAnimationTimer = null
  }

  const commit = undoPreview.value.commit
  undoPreview.value = null
  commit()
}

function isDraggingTableauCard(columnIndex, cardIndex) {
  const source = dragPreview.value?.source
  if (!dragPreview.value?.hasMoved || source?.area !== 'tableau') return false
  if (source.columnIndex !== columnIndex) return false

  return cardIndex >= source.cardIndex
}

function isAutoMovingTableauCard(columnIndex, cardIndex) {
  const source = autoMovePreview.value?.source
  if (source?.area !== 'tableau') return false
  if (source.columnIndex !== columnIndex) return false

  return cardIndex >= source.cardIndex
}

function isDraggingFreeCell(cellIndex) {
  const source = dragPreview.value?.source
  return dragPreview.value?.hasMoved && source?.area === 'freeCell' && source.cellIndex === cellIndex
}

function isAutoMovingFreeCell(cellIndex) {
  const source = autoMovePreview.value?.source
  return source?.area === 'freeCell' && source.cellIndex === cellIndex
}

function isDraggingFoundation(foundationIndex) {
  const source = dragPreview.value?.source
  return (
    dragPreview.value?.hasMoved &&
    source?.area === 'foundation' &&
    source.foundationIndex === foundationIndex
  )
}

function isAutoMovingFoundation(foundationIndex) {
  const source = autoMovePreview.value?.source
  return source?.area === 'foundation' && source.foundationIndex === foundationIndex
}

function isUndoAnimatingCard(cardId) {
  return undoPreview.value?.hiddenCardIds.has(cardId) ?? false
}

function isDraggableTableauStack(columnIndex, cardIndex) {
  return canDragSource({
    area: 'tableau',
    columnIndex,
    cardIndex
  })
}

function getFoundationVisibleCard(foundationPile) {
  const topCard = foundationPile[foundationPile.length - 1]

  if (!topCard) return null

  const isTopCardLifted =
    isDraggingFoundationCard(topCard.id) ||
    isAutoMovingFoundationCard(topCard.id) ||
    isUndoAnimatingCard(topCard.id)

  if (!isTopCardLifted) return topCard

  if (foundationPile.length > 1) {
    return foundationPile[foundationPile.length - 2]
  }

  return null
}

function isDraggingFoundationCard(cardId) {
  const source = dragPreview.value?.source

  return (
    dragPreview.value?.hasMoved &&
    source?.area === 'foundation' &&
    source.card?.id === cardId
  )
}

function isAutoMovingFoundationCard(cardId) {
  const source = autoMovePreview.value?.source

  return source?.area === 'foundation' && source.card?.id === cardId
}

function foundationSlotStyle(foundationIndex) {
  return {
    backgroundImage: `url(/card/${foundationSlots[foundationIndex]})`
  }
}

function dragPreviewCardStyle(index) {
  const cardPosition = dragPreview.value?.trail[index]
  if (!cardPosition) return {}

  return {
    '--preview-x': `${cardPosition.x}px`,
    '--preview-y': `${cardPosition.y}px`,
    '--drag-card-delay': `${index * 18}ms`,
    '--drag-card-x': `${index * 5}px`,
    '--drag-card-rotate': `${Math.min(index * 1.4, 5)}deg`
  }
}

function startDragAnimation() {
  if (dragAnimationFrame) return

  const animate = () => {
    if (!dragPreview.value?.hasMoved || dragPreview.value.isReturning) {
      dragAnimationFrame = null
      return
    }

    updateDragTrail()
    dragAnimationFrame = requestAnimationFrame(animate)
  }

  dragAnimationFrame = requestAnimationFrame(animate)
}

function stopDragAnimation() {
  if (!dragAnimationFrame) return

  cancelAnimationFrame(dragAnimationFrame)
  dragAnimationFrame = null
}

function updateDragTrail() {
  const preview = dragPreview.value
  if (!preview) return

  const targetX = preview.x - preview.offsetX
  const targetY = preview.y - preview.offsetY
  const nextTrail = []

  preview.trail.forEach((position, index) => {
    if (index === 0) {
      nextTrail.push({
        ...position,
        x: targetX,
        y: targetY
      })
      return
    }

    const leader = nextTrail[index - 1]
    const followX = leader.x
    const followY = leader.y + preview.cardStep
    const easing = Math.max(.12, .3 - index * .035)

    nextTrail.push({
      ...position,
      x: position.x + (followX - position.x) * easing,
      y: position.y + (followY - position.y) * easing
    })
  })

  preview.trail = nextTrail
}

function settleDrag(success) {
  if (success) {
    dragPreview.value = null
    stopDragAnimation()
    emit('drag-end')
    return
  }

  if (!dragPreview.value) {
    emit('drag-end')
    return
  }

  dragPreview.value.isReturning = true
  stopDragAnimation()
  dragPreview.value.trail = dragPreview.value.trail.map((position, index) => ({
    ...position,
    x: dragPreview.value.startX - dragPreview.value.offsetX,
    y: dragPreview.value.startY - dragPreview.value.offsetY + dragPreview.value.cardStep * index
  }))
}

function finishReturnAnimation() {
  if (!dragPreview.value?.isReturning) return

  dragPreview.value = null
  emit('drag-end')
}

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

const boardStyle = computed(() => {
  return {}
})

function getColumnStyle(column) {
  return {
    '--tableau-card-step': `${getColumnCardStep(column.length)}px`
  }
}

function getColumnCardStep(cardCount) {
  const cardWidth = Math.max(window.innerWidth * .08, 1)
  const cardHeight = cardWidth * 21 / 16
  const topAreaHeight = cardHeight
  const verticalPadding = window.innerWidth * .04
  const tableauGap = window.innerWidth * .05
  const bottomReserve = Math.max(window.innerHeight * .035, 16)
  const availableTableauHeight = Math.max(
    cardHeight,
    viewportHeight.value - verticalPadding - topAreaHeight - tableauGap - bottomReserve
  )
  const naturalStep = cardWidth * .3125
  const compressedStep =
    cardCount > 1
      ? (availableTableauHeight - cardHeight) / (cardCount - 1)
      : naturalStep

  return Math.max(cardWidth * .11, Math.min(naturalStep, compressedStep))
}

function updateViewportHeight() {
  viewportHeight.value = window.innerHeight
}

onMounted(() => {
  window.addEventListener('resize', updateViewportHeight)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportHeight)
  if (undoAnimationTimer) {
    window.clearTimeout(undoAnimationTimer)
  }
})
</script>

<template>
  <div
    id="game-board"
    :style="boardStyle"
    @contextmenu.prevent
    @dragstart.prevent
  >
    <div class="top-area">
      <div class="free-cells">
        <div
          class="cell-slot"
          v-for="(cell, cellIndex) in gameState.freeCells"
          :key="`free-cell-${cellIndex}`"
          :class="{
            selected: isSelectedFreeCell(cellIndex),
            hint: isHintFromFreeCell(cellIndex),
            dragging:
              isDraggingFreeCell(cellIndex) ||
              isAutoMovingFreeCell(cellIndex) ||
              isUndoAnimatingCard(cell?.id)
          }"
          data-drop-area="freeCell"
          :data-cell-index="cellIndex"
          @click="handleFreeCellClick(cell, cellIndex)"
        >
          <div
            v-if="cell"
            class="draggable-card"
            :data-card-id="cell.id"
            @pointerdown.stop="handleDragStart($event, { area: 'freeCell', card: cell, cellIndex })"
          >
            <Card :card="cell" />
          </div>
        </div>
      </div>

      <div class="foundations">
        <div
          class="cell-slot"
          v-for="(foundationPile, foundationIndex) in gameState.foundations"
          :key="`foundation-${foundationIndex}`"
          :class="{
            selected: isSelectedFoundation(foundationIndex)
          }"
          data-drop-area="foundation"
          :data-foundation-index="foundationIndex"
          :style="foundationSlotStyle(foundationIndex)"
          @click="handleFoundationClick(foundationPile, foundationIndex)"
        >
          <div
            v-if="getFoundationVisibleCard(foundationPile)"
            class="draggable-card"
            :data-card-id="getFoundationVisibleCard(foundationPile).id"
            @pointerdown.stop="
              handleDragStart($event, {
                area: 'foundation',
                card: getFoundationVisibleCard(foundationPile),
                foundationIndex
              })
            "
          >
            <Card :card="getFoundationVisibleCard(foundationPile)" />
          </div>
        </div>
      </div>
    </div>

    <div class="tableau">
      <div
        class="column"
        v-for="(column, columnIndex) in gameState.tableau"
        :key="`column-${columnIndex}`"
        :style="getColumnStyle(column)"
        data-drop-area="tableau"
        :data-column-index="columnIndex"
        @click="handleColumnClick(columnIndex)"
      >
        <div
          class="card-wrapper"
          v-for="(card, cardIndex) in column"
          :key="card.id"
          :data-card-id="card.id"
          :class="{
            movable: isDraggableTableauStack(columnIndex, cardIndex),
            selected: isSelectedTableauCard(columnIndex, cardIndex),
            dragging:
              isDraggingTableauCard(columnIndex, cardIndex) ||
              isAutoMovingTableauCard(columnIndex, cardIndex) ||
              isUndoAnimatingCard(card.id),
            hint:
              isHintFromTableauCard(columnIndex, cardIndex) ||
              isHintToTableauCard(columnIndex, cardIndex, column)
          }"
          @pointerdown.stop="
            handleDragStart($event, { area: 'tableau', card, columnIndex, cardIndex })
          "
          @click.stop
        >
          <Card
            :card="card"
            @card-click="handleCardClick(card, columnIndex, cardIndex)"
          />
        </div>
      </div>
    </div>

    <div
      v-if="dragPreview?.hasMoved"
      class="drag-preview"
      :class="{ returning: dragPreview.isReturning }"
      @transitionend="finishReturnAnimation"
    >
      <div
        class="drag-preview-card"
        v-for="(card, index) in dragPreview.cards"
        :key="`drag-${card.id}`"
        :style="dragPreviewCardStyle(index)"
      >
        <Card :card="card" />
      </div>
    </div>

    <div
      v-if="autoMovePreview"
      class="auto-move-preview"
      @transitionend="finishAutoMoveAnimation"
    >
      <div
        class="auto-move-preview-card"
        v-for="(card, index) in autoMovePreview.cards"
        :key="`auto-${card.id}`"
        :style="autoMovePreviewCardStyle(index)"
      >
        <Card :card="card" />
      </div>
    </div>

    <div
      v-if="undoPreview"
      class="undo-preview"
    >
      <div
        class="undo-preview-card"
        v-for="card in undoPreview.cards"
        :key="`undo-${card.card.id}`"
        :style="undoPreviewCardStyle(card)"
      >
        <Card :card="card.card" />
      </div>
    </div>
  </div>
</template>

<style scoped>
#game-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  height: 100vh;
  box-sizing: border-box;
  overflow: hidden;
  background-image: url(/img/freecell_bg.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 2vw;
  --card-width: 8vw;
  --card-height: calc(var(--card-width) * 21 / 16);
  --tableau-card-step: calc(var(--card-width) * .3125);
}

.top-area {
  display: flex;
  justify-content: space-between;
  width: 90%;
  margin-bottom: 5vw;
}

.free-cells,
.foundations {
  display: flex;
  gap: 1vw;
}

.cell-slot {
  width: var(--card-width);
  aspect-ratio: 16 / 21;
  background-image: url(/card/p.png);
  background-size: contain;
  background-position: center;
  background-repeat: no-repeat;
  display: flex;
  align-items: center;
  justify-content: center;
}

.tableau {
  display: flex;
  align-items: flex-start;
  justify-content: space-evenly;
  width: 80%;
  gap: 1vw;
}

.column {
  display: flex;
  flex-direction: column;
  width: var(--card-width);
  min-height: var(--card-height, 10.5vw);
  background-image: url(/card/c0.png);
  background-size: contain;
  background-position: top center;
  background-repeat: no-repeat;
}

.card-wrapper:not(:first-child) {
  margin-top: calc(var(--tableau-card-step) - var(--card-height));
}

.card-wrapper,
.draggable-card {
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.card-wrapper {
  transition: margin-top .18s ease-out;
}

.card-wrapper.movable,
.draggable-card {
  cursor: grab;
}

.card-wrapper.movable:active,
.draggable-card:active {
  cursor: grabbing;
}

.card-wrapper.dragging,
.cell-slot.dragging :deep(.card) {
  visibility: hidden;
}

.drag-preview {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.auto-move-preview,
.undo-preview {
  position: fixed;
  inset: 0;
  z-index: 190;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.drag-preview-card {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--card-width);
  transform:
    translate3d(var(--preview-x, 0), var(--preview-y, 0), 0)
    translateX(var(--drag-card-x, 0))
    rotate(var(--drag-card-rotate, 0deg));
  transform-origin: 50% 12%;
  backface-visibility: hidden;
  transition: none;
  will-change: transform;
}

.auto-move-preview-card,
.undo-preview-card {
  position: fixed;
  left: 0;
  top: 0;
  width: var(--card-width);
  transform:
    translate3d(var(--preview-x, 0), var(--preview-y, 0), 0)
    translateX(var(--drag-card-x, 0))
    rotate(var(--drag-card-rotate, 0deg));
  transform-origin: 50% 12%;
  backface-visibility: hidden;
  transition: transform .24s ease-in-out;
  will-change: transform;
}

.undo-preview-card {
  transition: transform .26s ease-in-out var(--undo-card-delay, 0ms);
}

.drag-preview.returning .drag-preview-card {
  transition: transform .18s ease-out;
}

.card-wrapper.selected :deep(.card),
.cell-slot.selected :deep(.card) {
  filter: drop-shadow(3px 3px 5px rgb(253, 228, 5));
}

.hint {
  position: relative;
}

.hint::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--card-width);
  aspect-ratio: 16 / 21;
  background-image: url(/img/hint.png);
  background-position: 50% 70%;
  background-repeat: no-repeat;
  background-size: 70%;
  border: calc(var(--card-width) * .055) solid #fafad7;
  border-radius: calc(var(--card-width) * .11);
  box-sizing: border-box;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 10;
}
</style>
