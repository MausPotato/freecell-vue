<script setup>
  import { computed } from 'vue'

  const props = defineProps({
    seconds: {
      type: Number,
      required: true
    }
  })

  const formattedTime = computed(() => {
    const minutes = Math.floor(props.seconds / 60)
    const seconds = props.seconds % 60

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  })
</script>
<template>
  <div class="game-timer">
    <div class="timer-label">TIME</div>
    <div class="timer-clock">{{ formattedTime }}</div>
  </div>
</template>
<style scoped>
.game-timer {
  position: absolute;
  top: 4vh;
  left: 50%;
  z-index: 5;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 16vh;
  height: 18vh;
  color: #5E2F2E;
  font-family: HaettenschweilerRegular, Impact, 'Arial Narrow', sans-serif;
  font-weight: 900;
  line-height: .82;
  text-align: center;
  letter-spacing: 0;
  transform: translateX(-50%);
  pointer-events: none;
  -webkit-font-smoothing: antialiased;
}

.timer-label {
  width: 100%;
  padding-top: 2.1vh;
  font-size: 7.2vh;
  font-weight: 900;
}

.timer-clock {
  width: 100%;
  padding-bottom: 3vh;
  font-size: 8.4vh;
  font-weight: 900;
}

@media (max-aspect-ratio: 1000 / 625) {
  .game-timer {
    top: 2.5vw;
    width: 10vw;
    height: 11.25vw;
  }

  .timer-label {
    padding-top: 1.5vw;
    font-size: 4.25vw;
  }

  .timer-clock {
    padding-bottom: 2vw;
    font-size: 5vw;
  }
}
</style>
