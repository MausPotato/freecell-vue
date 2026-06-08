<script setup>
import { onBeforeUnmount } from 'vue'
import Card from './Card.vue'
import { useBoardHighlights } from '../composables/useBoardHighlights'
import { useBoardLayout } from '../composables/useBoardLayout'
import { useGameBoardMotion } from '../composables/useGameBoardMotion'

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

const {
  boardStyle,
  foundationSlotStyle,
  getColumnStyle,
  getColumnCardStep
} = useBoardLayout()

const {
  isSelectedTableauCard,
  isSelectedFreeCell,
  isSelectedFoundation,
  isHintFromFreeCell,
  isHintFromTableauCard,
  isHintToTableauCard
} = useBoardHighlights(props)

const {
  dragPreview,
  autoMovePreview,
  undoPreview,
  suppressClick,
  handleDragStart,
  finishAutoMoveAnimation,
  clearTransientAnimations,
  animateUndo,
  animateAutoFoundationMove,
  isDraggingTableauCard,
  isAutoMovingTableauCard,
  isDraggingFreeCell,
  isAutoMovingFreeCell,
  isUndoAnimatingCard,
  isDraggableTableauStack,
  isDraggingFoundationCard,
  isAutoMovingFoundationCard,
  dragPreviewCardStyle,
  autoMovePreviewCardStyle,
  undoPreviewCardStyle,
  finishReturnAnimation
} = useGameBoardMotion({
  props,
  emit,
  getColumnCardStep
})

defineExpose({
  animateUndo,
  animateAutoFoundationMove,
  clearTransientAnimations
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

onBeforeUnmount(() => {
  clearTransientAnimations()
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
      :class="{ moving: autoMovePreview.isMoving }"
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
  background-image: var(--empty-cell-image);
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
  background-image: var(--empty-column-image);
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
  will-change: transform;
}

.auto-move-preview-card {
  transition: none;
}

.auto-move-preview.moving .auto-move-preview-card {
  transition: transform .34s ease-in-out;
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
  background-image: var(--hint-image);
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
