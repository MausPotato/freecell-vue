export function createDeck() {
  const deck = []
  for (let i = 0; i < 52; i++) {
    deck.push({
      id: i + 1,
      suit: Math.ceil((i + 1) / 13),
      point: (i % 13) + 1
    })
  }

  return deck
}

export function shuffleDeck(deck) {
  const shuffledDeck = [...deck]
  for (let i = shuffledDeck.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1))
    const temp = shuffledDeck[i]
    shuffledDeck[i] = shuffledDeck[randomIndex]
    shuffledDeck[randomIndex] = temp
  }

  return shuffledDeck
}

export function dealToTableau(deck) {
  const tableau = Array.from({ length: 8 }, () => [])
  deck.forEach((card, index) => {
    const columnIndex = index % 8
    tableau[columnIndex].push(card)
  });

  return tableau
}

export function createGameState() {
  const deck = createDeck()
  const shuffledDeck = shuffleDeck(deck)

  return {
    freeCells: [null, null, null, null],
    foundations: [[], [], [], []],
    tableau: dealToTableau(shuffledDeck)
  }
}
