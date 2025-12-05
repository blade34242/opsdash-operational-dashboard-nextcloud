import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import DeckCardsWidget from '../src/components/DeckCardsWidget.vue'

const stubs = {
  NcEmptyContent: { template: '<div class="stub-empty"></div>' },
  NcLoadingIcon: { template: '<div class="stub-loading"></div>' },
}

describe('DeckCardsWidget', () => {
  const now = Date.now()
  const cards = [
    {
      id: 1,
      title: 'Open mine today',
      boardId: 1,
      boardTitle: 'A',
      status: 'active',
      match: 'due',
      assignees: [{ uid: 'me' }],
      labels: [],
      createdTs: now,
    },
    {
      id: 2,
      title: 'Done other',
      boardId: 2,
      boardTitle: 'B',
      status: 'done',
      match: 'completed',
      assignees: [{ uid: 'other' }],
      labels: [],
      createdTs: now,
    },
    {
      id: 3,
      title: 'Archived other',
      boardId: 1,
      boardTitle: 'A',
      status: 'archived',
      match: 'due',
      assignees: [{ uid: 'me' }],
      labels: [],
      createdTs: now,
    },
  ]

  it('filters by created_today_mine and boardIds', async () => {
    const wrapper = mount(DeckCardsWidget, {
      props: {
        cards,
        rangeLabel: 'This week',
        uid: 'me',
        filters: ['created_today_mine', 'all'],
        defaultFilter: 'created_today_mine',
        boardIds: [1],
      },
      global: { stubs },
    })

    expect(wrapper.findAll('.deck-card').length).toBe(1)
    expect(wrapper.find('.deck-card__title').text()).toBe('Open mine today')
  })
})
