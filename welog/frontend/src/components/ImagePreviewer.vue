<template>
  <div v-if="visible" class="image-preview-overlay" @click.self="emitClose">
    <div
      ref="frameRef"
      class="image-preview-frame"
      @wheel.prevent="handleWheel"
      @dblclick="toggleZoom"
      @touchstart="handleTouchStart"
      @touchmove.prevent="handleTouchMove"
      @touchend="handleTouchEnd"
      @touchcancel="handleTouchEnd"
      @mousedown.prevent="handleMouseDown"
      @mousemove.prevent="handleMouseMove"
      @mouseup.prevent="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <button class="image-preview-close" type="button" @click="emitClose">X</button>
      <div v-if="isLoading" class="image-preview-loading"></div>
      <img
        v-if="currentSrc"
        ref="imageRef"
        :src="currentSrc"
        alt="预览图片"
        class="image-preview"
        :class="{ 'is-loading': isLoading }"
        :style="imageStyle"
        draggable="false"
        @load="markLoaded"
        @error="markLoaded"
      />
      <div v-if="images.length > 1" class="image-preview-count">
        {{ currentIndex + 1 }}/{{ images.length }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from "vue";

const props = defineProps({
  images: {
    type: Array,
    default: () => [],
  },
  startIndex: {
    type: Number,
    default: 0,
  },
  visible: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(["close"]);

const frameRef = ref(null);
const imageRef = ref(null);
const currentIndex = ref(0);
const scale = ref(1);
const translate = ref({ x: 0, y: 0 });
const frameSize = ref({ width: 0, height: 0 });
const imageBaseSize = ref({ width: 0, height: 0 });
const loadedMap = ref({});
const isInteracting = ref(false);

let isMouseDown = false;
let startX = 0;
let startY = 0;
let startTranslateX = 0;
let startTranslateY = 0;
let swipeDeltaX = 0;
let swipeDeltaY = 0;
let isPinching = false;
let pinchStartDistance = 0;
let pinchStartScale = 1;

const minScale = 1;
const maxScale = 3;

const currentSrc = computed(() => props.images[currentIndex.value] || "");

const isLoading = computed(() => !loadedMap.value[currentIndex.value]);

const imageStyle = computed(() => ({
  transform: `translate3d(${translate.value.x}px, ${translate.value.y}px, 0) scale(${scale.value})`,
  transition: isInteracting.value ? "none" : undefined,
}));

const emitClose = () => {
  emit("close");
};

const clamp = (value, minValue, maxValue) => Math.min(maxValue, Math.max(minValue, value));

const measureFrame = () => {
  const rect = frameRef.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  frameSize.value = { width: rect.width, height: rect.height };
  updateImageMetrics();
  clampTranslate();
};

const clampTranslate = () => {
  const { width, height } = frameSize.value;
  const baseWidth = imageBaseSize.value.width || width;
  const baseHeight = imageBaseSize.value.height || height;
  const maxX = Math.max(0, (baseWidth * scale.value - width) * 0.5);
  const maxY = Math.max(0, (baseHeight * scale.value - height) * 0.5);
  translate.value = {
    x: clamp(translate.value.x, -maxX, maxX),
    y: clamp(translate.value.y, -maxY, maxY),
  };
};

const resetTransform = () => {
  scale.value = 1;
  translate.value = { x: 0, y: 0 };
  isInteracting.value = false;
  swipeDeltaX = 0;
  swipeDeltaY = 0;
};

const setScale = (value) => {
  const nextScale = clamp(value, minScale, maxScale);
  scale.value = nextScale;
  if (nextScale === 1) {
    translate.value = { x: 0, y: 0 };
  } else {
    clampTranslate();
  }
};

const updateImageMetrics = () => {
  const img = imageRef.value;
  const { width: frameWidth, height: frameHeight } = frameSize.value;
  if (!img || !frameWidth || !frameHeight || !img.naturalWidth || !img.naturalHeight) {
    return;
  }
  const ratio = Math.min(frameWidth / img.naturalWidth, frameHeight / img.naturalHeight);
  imageBaseSize.value = {
    width: img.naturalWidth * ratio,
    height: img.naturalHeight * ratio,
  };
};

const markLoaded = () => {
  loadedMap.value[currentIndex.value] = true;
  updateImageMetrics();
  clampTranslate();
};

const goNext = () => {
  if (currentIndex.value < props.images.length - 1) {
    currentIndex.value += 1;
  }
};

const goPrev = () => {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1;
  }
};

const handleWheel = (event) => {
  if (!props.visible) {
    return;
  }
  const delta = event.deltaY > 0 ? -0.12 : 0.12;
  setScale(scale.value + delta);
};

const handleTouchStart = (event) => {
  if (!props.visible) {
    return;
  }
  if (event.touches.length === 2) {
    isPinching = true;
    const [first, second] = event.touches;
    pinchStartDistance = Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
    pinchStartScale = scale.value;
    isInteracting.value = true;
    return;
  }
  if (event.touches.length === 1) {
    const touch = event.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTranslateX = translate.value.x;
    startTranslateY = translate.value.y;
    swipeDeltaX = 0;
    swipeDeltaY = 0;
    isInteracting.value = scale.value > 1;
  }
};

const handleTouchMove = (event) => {
  if (!props.visible) {
    return;
  }
  if (isPinching && event.touches.length === 2) {
    const [first, second] = event.touches;
    const distance = Math.hypot(
      second.clientX - first.clientX,
      second.clientY - first.clientY,
    );
    const ratio = distance / pinchStartDistance;
    setScale(pinchStartScale * ratio);
    return;
  }
  if (event.touches.length !== 1) {
    return;
  }
  const touch = event.touches[0];
  const deltaX = touch.clientX - startX;
  const deltaY = touch.clientY - startY;
  if (scale.value > 1) {
    translate.value = {
      x: startTranslateX + deltaX,
      y: startTranslateY + deltaY,
    };
    clampTranslate();
    isInteracting.value = true;
  } else {
    swipeDeltaX = deltaX;
    swipeDeltaY = deltaY;
  }
};

const handleTouchEnd = () => {
  if (!props.visible) {
    return;
  }
  if (isPinching) {
    isPinching = false;
  }
  if (scale.value === 1 && Math.abs(swipeDeltaX) > 50 && Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY)) {
    if (swipeDeltaX < 0) {
      goNext();
    } else {
      goPrev();
    }
  }
  swipeDeltaX = 0;
  swipeDeltaY = 0;
  isInteracting.value = false;
};

const handleMouseDown = (event) => {
  if (!props.visible || event.button !== 0) {
    return;
  }
  isMouseDown = true;
  startX = event.clientX;
  startY = event.clientY;
  startTranslateX = translate.value.x;
  startTranslateY = translate.value.y;
  swipeDeltaX = 0;
  swipeDeltaY = 0;
  isInteracting.value = scale.value > 1;
};

const handleMouseMove = (event) => {
  if (!props.visible || !isMouseDown) {
    return;
  }
  const deltaX = event.clientX - startX;
  const deltaY = event.clientY - startY;
  if (scale.value > 1) {
    translate.value = {
      x: startTranslateX + deltaX,
      y: startTranslateY + deltaY,
    };
    clampTranslate();
    isInteracting.value = true;
  } else {
    swipeDeltaX = deltaX;
    swipeDeltaY = deltaY;
  }
};

const handleMouseUp = () => {
  if (!props.visible || !isMouseDown) {
    return;
  }
  if (scale.value === 1 && Math.abs(swipeDeltaX) > 80 && Math.abs(swipeDeltaX) > Math.abs(swipeDeltaY)) {
    if (swipeDeltaX < 0) {
      goNext();
    } else {
      goPrev();
    }
  }
  isMouseDown = false;
  swipeDeltaX = 0;
  swipeDeltaY = 0;
  isInteracting.value = false;
};

const toggleZoom = () => {
  if (!props.visible) {
    return;
  }
  if (scale.value === 1) {
    setScale(2);
  } else {
    setScale(1);
  }
};

watch(
  () => props.startIndex,
  (value) => {
    currentIndex.value = clamp(value, 0, Math.max(0, props.images.length - 1));
    resetTransform();
  },
  { immediate: true },
);

watch(
  () => props.images,
  () => {
    loadedMap.value = {};
    currentIndex.value = clamp(props.startIndex, 0, Math.max(0, props.images.length - 1));
    resetTransform();
  },
);

watch(
  () => props.visible,
  (value) => {
    if (value) {
      currentIndex.value = clamp(props.startIndex, 0, Math.max(0, props.images.length - 1));
      resetTransform();
      measureFrame();
      updateImageMetrics();
    }
  },
);

watch(currentIndex, () => {
  resetTransform();
  updateImageMetrics();
});

onMounted(() => {
  measureFrame();
  updateImageMetrics();
  window.addEventListener("resize", measureFrame);
});

onUnmounted(() => {
  window.removeEventListener("resize", measureFrame);
});
</script>
