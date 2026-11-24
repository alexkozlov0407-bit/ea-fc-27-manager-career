export type HubTileId =
  | 'btn-advance'
  | 'btn-practice'
  | 'task-0'
  | 'task-1'
  | 'task-2'
  | 'tasks-all'
  | 'feed-card'
  | 'feed-like'
  | 'feed-comments';

export type HubOverlayKind =
  | 'practice'
  | 'matchday'
  | 'task-detail'
  | 'tasks-all'
  | 'story-detail'
  | 'comments'
  | 'tutorials'
  | 'advance-customisation'
  | 'shortcuts'
  | 'fc-hub'
  | null;

export interface HubFocusLayout {
  visibleTaskCount: number;
  hasTasksAllRow: boolean;
}

export interface HubFocusState {
  focusedId: HubTileId;
  activeOverlay: HubOverlayKind;
  selectedTaskIndex: number | null;
  lastTopAction: 'btn-advance' | 'btn-practice';
  overlayOriginTile: HubTileId | null;
}

export const INITIAL_HUB_FOCUS: HubFocusState = {
  focusedId: 'btn-practice',
  activeOverlay: null,
  selectedTaskIndex: null,
  lastTopAction: 'btn-practice',
  overlayOriginTile: null,
};

export function setHubFocusDirect(
  state: HubFocusState,
  tileId: HubTileId
): HubFocusState {
  const next: HubFocusState = { ...state, focusedId: tileId };
  if (tileId === 'btn-advance' || tileId === 'btn-practice') {
    next.lastTopAction = tileId;
  }
  return next;
}

export function openHubOverlay(
  state: HubFocusState,
  kind: HubOverlayKind,
  options?: { fromTile?: HubTileId; taskIndex?: number }
): HubFocusState {
  const origin = options?.fromTile ?? state.focusedId;
  return {
    ...state,
    activeOverlay: kind,
    overlayOriginTile: origin,
    selectedTaskIndex: options?.taskIndex ?? state.selectedTaskIndex,
    focusedId: origin,
  };
}

export function closeHubOverlay(
  state: HubFocusState,
  layout: HubFocusLayout
): HubFocusState {
  const restoredId = state.overlayOriginTile ?? state.focusedId;
  const nextState: HubFocusState = {
    ...state,
    activeOverlay: null,
    overlayOriginTile: null,
    focusedId: restoredId,
  };
  return clampFocusToLayout(nextState, layout);
}

export function clampFocusToLayout(
  state: HubFocusState,
  layout: HubFocusLayout
): HubFocusState {
  const { focusedId } = state;
  if (focusedId.startsWith('task-')) {
    const idx = parseInt(focusedId.split('-')[1], 10);
    if (layout.visibleTaskCount === 0) {
      return {
        ...state,
        focusedId: layout.hasTasksAllRow ? 'tasks-all' : state.lastTopAction,
      };
    }
    if (idx >= layout.visibleTaskCount) {
      return {
        ...state,
        focusedId: `task-${layout.visibleTaskCount - 1}` as HubTileId,
      };
    }
  } else if (focusedId === 'tasks-all' && !layout.hasTasksAllRow) {
    return {
      ...state,
      focusedId:
        layout.visibleTaskCount > 0
          ? (`task-${layout.visibleTaskCount - 1}` as HubTileId)
          : state.lastTopAction,
    };
  }
  return state;
}

export function cycleStoryIndex(
  current: number,
  total: number,
  delta: number
): number {
  if (total <= 0) return 0;
  return (current + delta + total) % total;
}

export function moveHubFocus(
  state: HubFocusState,
  direction: 'up' | 'down' | 'left' | 'right',
  layout: HubFocusLayout
): HubFocusState {
  const { focusedId, lastTopAction } = state;
  let nextId: HubTileId = focusedId;
  let nextTopAction = lastTopAction;

  switch (focusedId) {
    case 'btn-advance':
      if (direction === 'right') {
        nextId = 'btn-practice';
        nextTopAction = 'btn-practice';
      } else if (direction === 'down') {
        if (layout.visibleTaskCount > 0) nextId = 'task-0';
        else if (layout.hasTasksAllRow) nextId = 'tasks-all';
      }
      break;

    case 'btn-practice':
      if (direction === 'left') {
        nextId = 'btn-advance';
        nextTopAction = 'btn-advance';
      } else if (direction === 'right') {
        nextId = 'feed-card';
      } else if (direction === 'down') {
        if (layout.visibleTaskCount > 0) nextId = 'task-0';
        else if (layout.hasTasksAllRow) nextId = 'tasks-all';
      }
      break;

    case 'task-0':
    case 'task-1':
    case 'task-2': {
      const idx = parseInt(focusedId.split('-')[1], 10);
      if (direction === 'up') {
        if (idx === 0) nextId = lastTopAction;
        else nextId = `task-${idx - 1}` as HubTileId;
      } else if (direction === 'down') {
        if (idx < layout.visibleTaskCount - 1) {
          nextId = `task-${idx + 1}` as HubTileId;
        } else if (layout.hasTasksAllRow) {
          nextId = 'tasks-all';
        }
      } else if (direction === 'right') {
        if (idx === 0) nextId = 'feed-card';
        else nextId = 'feed-card';
      }
      break;
    }

    case 'tasks-all':
      if (direction === 'up') {
        if (layout.visibleTaskCount > 0) {
          nextId = `task-${layout.visibleTaskCount - 1}` as HubTileId;
        } else {
          nextId = lastTopAction;
        }
      } else if (direction === 'right') {
        nextId = 'feed-comments';
      }
      break;

    case 'feed-card':
      if (direction === 'left') {
        nextId = 'btn-practice';
      } else if (direction === 'down') {
        nextId = 'feed-comments';
      }
      break;

    case 'feed-like':
      if (direction === 'left') {
        if (layout.visibleTaskCount > 1) nextId = 'task-1';
        else if (layout.visibleTaskCount > 0) nextId = 'task-0';
        else nextId = 'btn-practice';
      } else if (direction === 'right') {
        nextId = 'feed-comments';
      } else if (direction === 'up') {
        nextId = 'feed-card';
      }
      break;

    case 'feed-comments':
      if (direction === 'left') {
        nextId = 'feed-like';
      } else if (direction === 'up') {
        nextId = 'feed-card';
      }
      break;
  }

  const nextState: HubFocusState = {
    ...state,
    focusedId: nextId,
    lastTopAction: nextTopAction,
  };
  return clampFocusToLayout(nextState, layout);
}
