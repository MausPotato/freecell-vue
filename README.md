# FreeCell Vue

A FreeCell solitaire game rebuilt with Vue 3 and Vite.

This project is a Vue version of the original `FreeCell` implementation in this repository, with updated component structure, card movement animations, drag interactions, and deployment support.

## Features

- FreeCell card movement rules
- Drag card movement
- Multi-card tableau moves
- Double-click auto move
- Automatic moves to foundations
- Undo
- Hint
- Game timer
- New game confirmation dialog
- Win dialog
- Responsive tableau spacing

## Controls

- Drag a card or a valid tableau stack to move it.
- Double-click a card to auto move it to a valid destination.
- Use the right-side buttons for undo, hint, and new game.

## Tech Stack

- Vue 3
- Vite
- JavaScript
- CSS

## Project Structure

```txt
src/
  components/   Vue components for the board, cards, timer, controls, and dialogs
  composables/  Board interaction, layout, and highlight logic
  utils/        Game setup and FreeCell rule helpers
public/
  card/         Card and slot images
  img/          Board background, hint, logo, and control icons
```
