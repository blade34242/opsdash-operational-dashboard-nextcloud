import { defineComponent, h } from 'vue'

export const NcAppContent = defineComponent({
  name: 'NcAppContent',
  props: {
    appName: { type: String, default: '' },
    showNavigation: { type: Boolean, default: true },
  },
  setup(props, { slots, attrs }) {
    return () => {
      const navigationVisible = props.showNavigation !== false
      const rootAttrs: Record<string, unknown> = {
        ...attrs,
        class: [attrs.class, 'app-content', navigationVisible ? null : 'app-content--navigation-hidden'],
      }
      const navAttrs: Record<string, unknown> = {
        class: 'app-content__navigation',
        'aria-label': props.appName || 'App navigation',
        'aria-hidden': navigationVisible ? 'false' : 'true',
      }
      return h('div', rootAttrs, [
        h('aside', navAttrs, slots.navigation ? slots.navigation() : []),
        h('section', { class: 'app-content__main', role: 'main' }, slots.default ? slots.default() : []),
      ])
    }
  },
})

export const NcAppNavigation = defineComponent({
  name: 'NcAppNavigation',
  setup(_, { slots, attrs }) {
    return () => {
      const navAttrs: Record<string, unknown> = {
        ...attrs,
        class: [attrs.class, 'app-navigation'],
      }
      if (!('role' in navAttrs)) {
        navAttrs.role = 'navigation'
      }
      const children = []
      if (slots.actions) {
        children.push(h('div', { class: 'app-navigation__actions' }, slots.actions()))
      }
      if (slots.default) {
        children.push(...slots.default())
      }
      return h('nav', navAttrs, children)
    }
  },
})

export const NcButton = defineComponent({
  name: 'NcButton',
  props: { type: { type: String, default: 'primary' }, disabled: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { emit, slots, attrs }) {
    return () => {
      const data: Record<string, unknown> = {
        ...attrs,
        class: [attrs.class, 'btn', props.type],
        disabled: props.disabled,
        onClick: () => emit('click'),
      }
      if (!('type' in data)) {
        data.type = 'button'
      }
      return h('button', data, slots.default ? slots.default() : [])
    }
  },
})

export const NcEmptyContent = defineComponent({
  name: 'NcEmptyContent',
  props: { name: { type: String, default: '' }, description: { type: String, default: '' } },
  setup(props, { attrs }) {
    return () => h('div', { ...attrs, class: [attrs.class, 'card empty'] }, [
      h('div', { class: 'value' }, props.name),
      h('div', { class: 'hint' }, props.description),
    ])
  },
})

export const NcCheckboxRadioSwitch = defineComponent({
  name: 'NcCheckboxRadioSwitch',
  props: { type: { type: String, default: 'checkbox' }, name: { type: String, default: '' }, checked: { type: Boolean, default: false } },
  emits: ['update:checked'],
  setup(props, { emit, slots, attrs }) {
    const onInput = (e: any) => emit('update:checked', !!e?.target?.checked)
    const labelAttrs: Record<string, unknown> = {
      ...attrs,
      class: [attrs.class, 'nc-checkbox-radio-switch'],
    }
    return () => h('label', labelAttrs, [
      h('input', { type: props.type, name: props.name, checked: props.checked, onInput }),
      h('span', {}, slots.default ? slots.default() : []),
    ])
  },
})

export const NcLoadingIcon = defineComponent({
  name: 'NcLoadingIcon',
  props: { size: { type: [String, Number], default: 16 } },
  setup(props, { attrs }) {
    return () => h('span', {
      ...attrs,
      class: [attrs.class, 'nc-loading-icon'],
      style: `width:${props.size}px;height:${props.size}px;border:2px solid var(--line);border-top-color:var(--brand);border-radius:50%;display:inline-block;animation:spin 1s linear infinite`,
    })
  },
})

export const NcAppNavigationItem = defineComponent({
  name: 'NcAppNavigationItem',
  props: { name: { type: String, default: '' }, active: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { emit, slots, attrs }) {
    return () => h('div', {
      ...attrs,
      role: attrs.role ?? 'button',
      'aria-pressed': props.active,
      class: [attrs.class, 'btn', 'soft', 'nav-item', props.active ? 'is-active' : null],
      onClick: () => emit('click'),
    }, [
      slots.icon ? h('span', { class: 'nav-item__icon' }, slots.icon()) : null,
      props.name || '',
    ])
  },
})

export const NcModal = defineComponent({
  name: 'NcModal',
  props: {
    size: { type: String, default: 'medium' },
  },
  emits: ['close'],
  setup(props, { slots, emit }) {
    const onBackdrop = (event: MouseEvent) => {
      if (event.target === event.currentTarget) {
        emit('close')
      }
    }
    return () => h('div', {
      class: ['nc-modal-backdrop', `nc-modal--${props.size}`],
      onClick: onBackdrop,
      role: 'dialog',
      'aria-modal': 'true',
    }, [
      h('div', { class: 'nc-modal-container' }, [
        h('button', { class: 'nc-modal__close', type: 'button', onClick: () => emit('close') }, '×'),
        slots.default ? slots.default() : null,
      ]),
    ])
  },
})

export default {
  NcAppContent,
  NcAppNavigation,
  NcButton,
  NcEmptyContent,
  NcCheckboxRadioSwitch,
  NcLoadingIcon,
  NcAppNavigationItem,
  NcModal,
}
