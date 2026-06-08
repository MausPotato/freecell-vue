import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

export function useBoardLayout() {
  const foundationSlots = ['s0.png', 'h0.png', 'd0.png', 'c0.png']
  const viewportHeight = ref(window.innerHeight)

  const boardStyle = computed(() => {
    return {
      backgroundImage: `url(${assetUrl('img/freecell_bg.png')})`,
      '--empty-cell-image': `url(${assetUrl('card/p.png')})`,
      '--empty-column-image': `url(${assetUrl('card/c0.png')})`,
      '--hint-image': `url(${assetUrl('img/hint.png')})`
    }
  })

  function foundationSlotStyle(foundationIndex) {
    return {
      backgroundImage: `url(${assetUrl(`card/${foundationSlots[foundationIndex]}`)})`
    }
  }

  function assetUrl(path) {
    return `${import.meta.env.BASE_URL}${path}`
  }

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
  })

  return {
    boardStyle,
    foundationSlotStyle,
    getColumnStyle,
    getColumnCardStep
  }
}
