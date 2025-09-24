import { defineComponent, h } from 'vue'

export const NcAppContent = defineComponent({
  name: 'NcAppContent',
  props: { appName: { type: String, default: '' } },
  setup(props, { slots }) {
    return () => h('div', { class: 'app-layout' }, [
      h('aside', { class: 'app-sidebar', 'aria-label': 'App navigation' }, slots.navigation ? slots.navigation() : []),
      h('section', { class: 'app-main' }, slots.default ? slots.default() : [])
    ])
  }
})

export const NcAppNavigation = defineComponent({
  name: 'NcAppNavigation',
  setup(_, { slots }) { return () => h('div', { class: 'sidebar' }, slots.default ? slots.default() : []) }
})

export const NcButton = defineComponent({
  name: 'NcButton',
  props: { type: { type: String, default: 'primary' }, disabled: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => h('button', { class: 'btn ' + (props.type||''), disabled: props.disabled, onClick: () => emit('click') }, slots.default ? slots.default() : [])
  }
})

export const NcEmptyContent = defineComponent({
  name: 'NcEmptyContent',
  props: { name: { type: String, default: '' }, description: { type: String, default: '' } },
  setup(props){ return () => h('div', { class:'card' }, [ h('div', { class:'value' }, props.name), h('div', { class:'hint' }, props.description) ]) }
})

export const NcCheckboxRadioSwitch = defineComponent({
  name: 'NcCheckboxRadioSwitch',
  props: { type: { type: String, default: 'checkbox' }, name: { type: String, default: '' }, checked: { type: Boolean, default: false } },
  emits: ['update:checked'],
  setup(props, { emit, slots }) {
    const onInput = (e: any) => emit('update:checked', !!e?.target?.checked)
    return () => h('label', { style:'display:inline-flex;gap:6px;align-items:center' }, [
      h('input', { type: props.type, name: props.name, checked: props.checked, onInput }),
      h('span', {}, slots.default ? slots.default() : [])
    ])
  }
})

export const NcLoadingIcon = defineComponent({ name:'NcLoadingIcon', props:{ size:{ type:[String,Number], default: 16 } }, setup(p){ return () => h('span', { style:`width:${p.size}px;height:${p.size}px;border:2px solid var(--line);border-top-color:var(--brand);border-radius:50%;display:inline-block;animation:spin 1s linear infinite` }) } })

export const NcAppNavigationItem = defineComponent({
  name:'NcAppNavigationItem',
  props: { name: { type: String, default: '' }, active: { type: Boolean, default: false } },
  emits: ['click'],
  setup(props, { emit, slots }) {
    return () => h('div', { role:'button', 'aria-pressed': props.active, class:'btn soft nav-item', onClick: () => emit('click') }, [
      slots.icon ? h('span', { style:'margin-right:6px' }, slots.icon()) : null,
      props.name || ''
    ])
  }
})

export default {
  NcAppContent,
  NcAppNavigation,
  NcButton,
  NcEmptyContent,
  NcCheckboxRadioSwitch,
  NcLoadingIcon,
  NcAppNavigationItem,
}
