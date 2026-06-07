<script setup>
import { computed, ref } from 'vue'
import Card from './Card.vue'

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
  'drag-start',
  'card-drop',
  'drag-end'
])

const foundationSlots = ['s0.png', 'h0.png', 'd0.png', 'c0.png']
const dragPreview = ref(null)
const suppressClick = ref(false)
const dragThreshold = 6
let dragAnimationFrame = null

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
  emit('tableau-click', {
    card: null,
    columnIndex,
    cardIndex: null
  })
}

function handleFreeCellClick(card, cellIndex) {
  emit('free-cell-click', {
    card,
    cellIndex
  })
}

function handleFoundationClick(foundation, foundationIndex) {
  emit('foundation-click', {
    foundation,
    foundationIndex
  })
}

function handleDragStart(event, source) {
  if (event.button !== 0) return
  event.preventDefault()
  const target = event.currentTarget
  const rect = target.getBoundingClientRect()
  const cards = getDragCards(source)
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

function isDraggingTableauCard(columnIndex, cardIndex) {
  const source = dragPreview.value?.source
  if (!dragPreview.value?.hasMoved || source?.area !== 'tableau') return false
  if (source.columnIndex !== columnIndex) return false

  return cardIndex >= source.cardIndex
}

function isDraggingFreeCell(cellIndex) {
  const source = dragPreview.value?.source
  return dragPreview.value?.hasMoved && source?.area === 'freeCell' && source.cellIndex === cellIndex
}

function isDraggingFoundation(foundationIndex) {
  const source = dragPreview.value?.source
  return (
    dragPreview.value?.hasMoved &&
    source?.area === 'foundation' &&
    source.foundationIndex === foundationIndex
  )
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
    left: `${cardPosition.x}px`,
    top: `${cardPosition.y}px`,
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
</script>

<template>
  <div
    id="game-board"
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
            dragging: isDraggingFreeCell(cellIndex)
          }"
          data-drop-area="freeCell"
          :data-cell-index="cellIndex"
          @click="handleFreeCellClick(cell, cellIndex)"
        >
          <div
            v-if="cell"
            class="draggable-card"
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
            selected: isSelectedFoundation(foundationIndex),
            dragging: isDraggingFoundation(foundationIndex)
          }"
          data-drop-area="foundation"
          :data-foundation-index="foundationIndex"
          :style="foundationSlotStyle(foundationIndex)"
          @click="handleFoundationClick(foundationPile, foundationIndex)"
        >
          <div
            v-if="foundationPile.length"
            class="draggable-card"
            @pointerdown.stop="
              handleDragStart($event, {
                area: 'foundation',
                card: foundationPile[foundationPile.length - 1],
                foundationIndex
              })
            "
          >
            <Card :card="foundationPile[foundationPile.length - 1]" />
          </div>
        </div>
      </div>
    </div>

    <div class="tableau">
      <div
        class="column"
        v-for="(column, columnIndex) in gameState.tableau"
        :key="`column-${columnIndex}`"
        data-drop-area="tableau"
        :data-column-index="columnIndex"
        @click="handleColumnClick(columnIndex)"
      >
        <div
          class="card-wrapper"
          v-for="(card, cardIndex) in column"
          :key="card.id"
          :class="{
            selected: isSelectedTableauCard(columnIndex, cardIndex),
            dragging: isDraggingTableauCard(columnIndex, cardIndex),
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
  </div>
</template>

<style scoped>
#game-board {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100vw;
  min-height: 100vh;
  background-image: url(/img/freecell_bg.png);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  padding: 2vw;
  --card-width: 8vw;
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
  margin-top: -8vw;
}

.card-wrapper,
.draggable-card {
  position: relative;
  touch-action: none;
  user-select: none;
  -webkit-user-drag: none;
}

.card-wrapper,
.draggable-card {
  cursor: grab;
}

.card-wrapper:active,
.draggable-card:active {
  cursor: grabbing;
}

.card-wrapper.dragging,
.cell-slot.dragging :deep(.card) {
  opacity: 0;
}

.drag-preview {
  position: fixed;
  inset: 0;
  z-index: 200;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.drag-preview-card {
  position: fixed;
  width: var(--card-width);
  transform: translateX(var(--drag-card-x, 0)) rotate(var(--drag-card-rotate, 0deg));
  transform-origin: 50% 12%;
  transition: transform .14s ease-out var(--drag-card-delay, 0ms);
}

.drag-preview.returning .drag-preview-card {
  transition:
    left .18s ease-out,
    top .18s ease-out,
    transform .18s ease-out;
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
