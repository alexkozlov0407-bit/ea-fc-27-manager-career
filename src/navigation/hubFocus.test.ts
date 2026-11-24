import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_HUB_FOCUS,
  clampFocusToLayout,
  closeHubOverlay,
  cycleStoryIndex,
  moveHubFocus,
  openHubOverlay,
  setHubFocusDirect,
  type HubFocusLayout,
} from './hubFocus';

const layout: HubFocusLayout = {
  visibleTaskCount: 3,
  hasTasksAllRow: true,
};

test('WASD horizontal navigation across primary actions and newsfeed', () => {
  let s = INITIAL_HUB_FOCUS;
  assert.equal(s.focusedId, 'btn-practice');

  s = moveHubFocus(s, 'left', layout);
  assert.equal(s.focusedId, 'btn-advance');

  s = moveHubFocus(s, 'right', layout);
  assert.equal(s.focusedId, 'btn-practice');

  s = moveHubFocus(s, 'right', layout);
  assert.equal(s.focusedId, 'feed-card');

  s = moveHubFocus(s, 'left', layout);
  assert.equal(s.focusedId, 'btn-practice');
});

test('vertical navigation remembers which top action button user descended from', () => {
  let s = INITIAL_HUB_FOCUS;
  s = moveHubFocus(s, 'left', layout); // on btn-advance
  assert.equal(s.focusedId, 'btn-advance');

  s = moveHubFocus(s, 'down', layout); // on task-0
  assert.equal(s.focusedId, 'task-0');

  s = moveHubFocus(s, 'up', layout); // back up -> restores btn-advance
  assert.equal(s.focusedId, 'btn-advance');

  s = moveHubFocus(s, 'right', layout); // on btn-practice
  s = moveHubFocus(s, 'down', layout); // on task-0
  s = moveHubFocus(s, 'up', layout); // back up -> restores btn-practice
  assert.equal(s.focusedId, 'btn-practice');
});

test('navigating down through all task rows and across into feed engagement bar', () => {
  let s = INITIAL_HUB_FOCUS;
  s = moveHubFocus(s, 'down', layout); // task-0
  assert.equal(s.focusedId, 'task-0');
  s = moveHubFocus(s, 'down', layout); // task-1
  assert.equal(s.focusedId, 'task-1');
  s = moveHubFocus(s, 'down', layout); // task-2
  assert.equal(s.focusedId, 'task-2');
  s = moveHubFocus(s, 'down', layout); // tasks-all
  assert.equal(s.focusedId, 'tasks-all');

  s = moveHubFocus(s, 'right', layout); // feed-comments
  assert.equal(s.focusedId, 'feed-comments');
});

test('opening any tile and pressing Back restores focus to that exact tile', () => {
  let s = INITIAL_HUB_FOCUS;
  s = moveHubFocus(s, 'down', layout); // task-0
  s = moveHubFocus(s, 'down', layout); // task-1

  s = openHubOverlay(s, 'task-detail', { fromTile: 'task-1', taskIndex: 1 });
  assert.equal(s.activeOverlay, 'task-detail');

  s = closeHubOverlay(s, layout);
  assert.equal(s.activeOverlay, null);
  assert.equal(s.focusedId, 'task-1');
});

test('clamps focus safely if club switch reduces visible tasks', () => {
  let s = INITIAL_HUB_FOCUS;
  s = setHubFocusDirect(s, 'task-2');

  const reducedLayout: HubFocusLayout = {
    visibleTaskCount: 1,
    hasTasksAllRow: false,
  };
  s = clampFocusToLayout(s, reducedLayout);
  assert.equal(s.focusedId, 'task-0');
});

test('story cycling wraps cleanly forward and backward', () => {
  assert.equal(cycleStoryIndex(0, 3, 1), 1);
  assert.equal(cycleStoryIndex(2, 3, 1), 0);
  assert.equal(cycleStoryIndex(0, 3, -1), 2);
});
