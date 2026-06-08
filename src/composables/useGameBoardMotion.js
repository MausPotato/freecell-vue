import { ref } from 'vue'
import { isValidTableauStack } from '../utils/gameRules'

export function useGameBoardMotion({ props, emit, getColumnCardStep }) {
  const dragPreview = ref(null)
  const autoMovePreview = ref(null)
  const undoPreview = ref(null)
  const suppressClick = ref(false)
  const dragThreshold = 6
  const doubleClickDelay = 320
  let lastTap = null
  let dragAnimationFrame = null
  let undoAnimationTimer = null
  let autoMoveAnimationTimer = null

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
      requestAnimationFrame(() => {
        if (!autoMovePreview.value) return

        autoMovePreview.value.x = targetRect.left
        autoMovePreview.value.y = targetRect.top
      })
    })
  }

  function animateAutoFoundationMove(source, to, commit) {
    const sourceRect = getCardRect(source.card.id)

    if (!sourceRect) {
      commit()
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      animateAutoMove(source, to, sourceRect, () => {
        clearAutoMoveAnimationTimer()
        commit()
        resolve()
      })

      autoMoveAnimationTimer = window.setTimeout(() => {
        if (!autoMovePreview.value) return
        finishAutoMoveAnimation()
      }, 520)
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

  function finishAutoMoveAnimation() {
    if (!autoMovePreview.value) return

    clearAutoMoveAnimationTimer()
    const commit = autoMovePreview.value.commit
    autoMovePreview.value = null
    commit()
  }

  function clearAutoMoveAnimationTimer() {
    if (!autoMoveAnimationTimer) return

    window.clearTimeout(autoMoveAnimationTimer)
    autoMoveAnimationTimer = null
  }

  function clearTransientAnimations(options = {}) {
    clearAutoMoveAnimationTimer()
    autoMovePreview.value = null
    undoPreview.value = null

    if (!options.keepDrag) {
      stopDragAnimation()
      dragPreview.value = null
    }

    if (undoAnimationTimer) {
      window.clearTimeout(undoAnimationTimer)
      undoAnimationTimer = null
    }
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

  return {
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
  }
}
