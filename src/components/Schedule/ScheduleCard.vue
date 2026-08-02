<script setup>
import { ref, onBeforeUnmount } from 'vue';

const props = defineProps({
  item: { type: Object, required: true },
  colorClass: { type: String, default: 'bg-indigo-500 text-white' },
});

const emit = defineEmits(['click', 'drop', 'longpress', 'record']);

// ── 拖拽状态 ──
const dragging = ref(false);
let longPressTimer = null;
let touchStartX = 0;
let touchStartY = 0;
let moved = false;
let floatEl = null;

/** 长按触发阈值（ms） */
const LONG_PRESS_DELAY = 300;
/** 移动超过此距离视为滚动，取消长按 */
const MOVE_THRESHOLD = 10;

function onTouchStart(e) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  moved = false;
  dragging.value = false;

  longPressTimer = window.setTimeout(() => {
    if (!moved) {
      startDrag(touch);
    }
  }, LONG_PRESS_DELAY);
}

function onTouchMove(e) {
  if (e.touches.length !== 1) return;
  const touch = e.touches[0];

  // 未进入拖拽模式时，检测是否为滚动
  if (!dragging.value) {
    const dx = Math.abs(touch.clientX - touchStartX);
    const dy = Math.abs(touch.clientY - touchStartY);
    if (dx > MOVE_THRESHOLD || dy > MOVE_THRESHOLD) {
      moved = true;
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }
    return;
  }

  // 拖拽中：阻止默认行为（防止页面滚动），更新浮动卡片位置
  e.preventDefault();
  if (floatEl) {
    floatEl.style.left = `${touch.clientX}px`;
    floatEl.style.top = `${touch.clientY}px`;
  }

  // 检测目标格子并高亮
  highlightTargetCell(touch.clientX, touch.clientY);
}

function onTouchEnd(e) {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  if (dragging.value) {
    // 拖拽结束：检测最终目标格
    const touch = e.changedTouches[0];
    if (touch) {
      const target = findCellAtPoint(touch.clientX, touch.clientY);
      if (target) {
        emit('drop', {
          itemId: props.item.id,
          targetWeekday: target.weekday,
          targetSlotStart: target.slotStart,
        });
      }
    }
    cleanupDrag();
  } else if (!moved) {
    // 未拖拽且未移动 → 点击事件
    emit('click', props.item);
  }
}

function startDrag(touch) {
  dragging.value = true;

  // 创建浮动卡片克隆
  floatEl = document.createElement('div');
  floatEl.className = 'schedule-drag-float';
  floatEl.style.cssText = `
    position: fixed;
    left: ${touch.clientX}px;
    top: ${touch.clientY}px;
    transform: translate(-50%, -50%);
    z-index: 9999;
    pointer-events: none;
    opacity: 0.85;
    max-width: 140px;
  `;
  floatEl.innerHTML = `
    <div class="rounded-lg px-2 py-1.5 shadow-lg ${props.colorClass}">
      <div class="text-xs font-bold truncate">${escapeHtml(props.item.course)}</div>
      <div class="text-[10px] opacity-90 truncate">${escapeHtml(props.item.teacher || '')}</div>
    </div>
  `;
  document.body.appendChild(floatEl);
}

function highlightTargetCell(x, y) {
  // 移除之前的高亮
  document.querySelectorAll('.schedule-cell-drag-over').forEach((el) => {
    el.classList.remove('schedule-cell-drag-over');
  });

  const target = findCellAtPoint(x, y);
  if (target && target.element) {
    target.element.classList.add('schedule-cell-drag-over');
  }
}

function findCellAtPoint(x, y) {
  // 临时隐藏浮动元素以获取下方元素
  if (floatEl) floatEl.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  if (floatEl) floatEl.style.display = '';

  if (!el) return null;

  // 向上查找带有 data-cell-weekday 属性的元素
  let current = el;
  while (current && current !== document.body) {
    if (current.dataset && current.dataset.cellWeekday) {
      return {
        weekday: current.dataset.cellWeekday,
        slotStart: current.dataset.cellSlotStart || '',
        element: current,
      };
    }
    current = current.parentElement;
  }
  return null;
}

function cleanupDrag() {
  dragging.value = false;
  if (floatEl) {
    floatEl.remove();
    floatEl = null;
  }
  // 清除高亮
  document.querySelectorAll('.schedule-cell-drag-over').forEach((el) => {
    el.classList.remove('schedule-cell-drag-over');
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str || '');
  return div.innerHTML;
}

onBeforeUnmount(() => {
  if (longPressTimer) clearTimeout(longPressTimer);
  cleanupDrag();
});
</script>

<template>
  <div
    class="schedule-card select-none touch-none cursor-pointer transition-opacity"
    :class="[
      colorClass,
      dragging ? 'opacity-50' : '',
    ]"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="text-xs font-bold leading-tight truncate">{{ item.course }}</div>
    <div v-if="item.teacher" class="text-[10px] opacity-90 truncate mt-0.5">{{ item.teacher }}</div>
    <div v-if="item.classroom" class="text-[10px] opacity-75 truncate">{{ item.classroom }}</div>
    <!-- 底部操作区 -->
    <div class="flex items-center justify-between mt-1 pt-0.5">
      <div class="flex items-center gap-1">
        <!-- 关联教案标记 -->
        <span v-if="item.resourceId" class="text-[8px] opacity-70" title="已关联教案">📎</span>
      </div>
      <div class="flex items-center gap-1">
        <!-- 录课按钮 -->
        <button
          type="button"
          class="rounded-md px-1 py-0.5 text-[8px] font-medium opacity-70 hover:opacity-100 active:opacity-100 transition-opacity"
          :class="colorClass"
          @click.stop="emit('record', item)"
          title="一键录课"
        >
          录课
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.schedule-card {
  border-radius: 0.5rem;
  padding: 0.375rem 0.5rem;
  min-height: 2.5rem;
  touch-action: none;
}
</style>

<style>
/* 拖拽目标格高亮样式（全局，因为需要作用于 grid 内的 cell） */
.schedule-cell-drag-over {
  outline: 2px solid #6366f1 !important;
  outline-offset: -2px;
  background-color: rgba(99, 102, 241, 0.1) !important;
}

/* 冲突格红色闪烁 */
.schedule-cell-conflict {
  animation: conflict-flash 0.6s ease-in-out 3;
}

@keyframes conflict-flash {
  0%, 100% { border-color: rgb(244 63 94); }
  50% { border-color: rgb(244 63 94); background-color: rgba(244, 63, 94, 0.15); }
}
</style>
