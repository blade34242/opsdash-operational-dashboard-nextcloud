import { defineComponent, h } from 'vue'

type IconProps = {
  class?: string
}

function createIcon(name: string, paths: string[]) {
  return defineComponent<IconProps>({
    name,
    inheritAttrs: false,
    setup(props, { attrs }) {
      return () =>
        h(
          'svg',
          {
            ...attrs,
            class: [attrs.class, props.class],
            width: '24',
            height: '24',
            viewBox: '0 0 24 24',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            stroke: 'currentColor',
            'stroke-width': '1.5',
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
          },
          paths.map((d) => h('path', { d })),
        )
    },
  })
}

// Local vendored icons derived from Iconoir (MIT) so the widget keeps the same
// visual language without depending on the Vue wrapper runtime.
export const HustleRunIcon = createIcon('HustleRunIcon', [
  'M15 7C16.1046 7 17 6.10457 17 5C17 3.89543 16.1046 3 15 3C13.8954 3 13 3.89543 13 5C13 6.10457 13.8954 7 15 7Z',
  'M12.6133 8.26691L9.30505 12.4021L13.4403 16.5374L11.3727 21.0861',
  'M6.4104 9.5075L9.79728 6.19931L12.6132 8.26692L15.508 11.5752H19.2297',
  'M8.89152 15.7103L7.65095 16.5374H4.34277',
])

export const HustleSwimIcon = createIcon('HustleSwimIcon', [
  'M3 15C5.48276 15 7.34483 12 7.34483 12C7.34483 12 9.2069 15 11.6897 15C14.1724 15 16.6552 12 16.6552 12C16.6552 12 19.1379 15 21 15',
  'M3 20C5.48276 20 7.34483 17 7.34483 17C7.34483 17 9.2069 20 11.6897 20C14.1724 20 16.6552 17 16.6552 17C16.6552 17 19.1379 20 21 20',
  'M5 10.5L9 8L7.81306 6.51633C7.36819 5.96024 7.47151 5.14637 8.04123 4.71908V4.71908C8.57851 4.31612 9.33729 4.40475 9.76724 4.92069L14 10',
  'M16.5 8C17.8807 8 19 6.88071 19 5.5C19 4.11929 17.8807 3 16.5 3C15.1193 3 14 4.11929 14 5.5C14 6.88071 15.1193 8 16.5 8Z',
])

export const HustleRideIcon = createIcon('HustleRideIcon', [
  'M5 19C7.20914 19 9 17.2091 9 15C9 12.7909 7.20914 11 5 11C2.79086 11 1 12.7909 1 15C1 17.2091 2.79086 19 5 19Z',
  'M8.5 7.5L14.5 7.5M19 15L15 7.5L14.5 7.5M14.5 7.5L16.5 4.5M16.5 4.5L14 4.5M16.5 4.5L18.5 4.5',
  'M5 15L8.5 7.5L12 14L15 14',
  'M8.5 7.5C8.16667 6.5 7 4.5 5 4.5',
  'M19 19C21.2091 19 23 17.2091 23 15C23 12.7909 21.2091 11 19 11C16.7909 11 15 12.7909 15 15C15 17.2091 16.7909 19 19 19Z',
])

export const HustleDeadliftIcon = createIcon('HustleDeadliftIcon', [
  'M7.4 7H4.6C4.26863 7 4 7.26863 4 7.6V16.4C4 16.7314 4.26863 17 4.6 17H7.4C7.73137 17 8 16.7314 8 16.4V7.6C8 7.26863 7.73137 7 7.4 7Z',
  'M19.4 7H16.6C16.2686 7 16 7.26863 16 7.6V16.4C16 16.7314 16.2686 17 16.6 17H19.4C19.7314 17 20 16.7314 20 16.4V7.6C20 7.26863 19.7314 7 19.4 7Z',
  'M1 14.4V9.6C1 9.26863 1.26863 9 1.6 9H3.4C3.73137 9 4 9.26863 4 9.6V14.4C4 14.7314 3.73137 15 3.4 15H1.6C1.26863 15 1 14.7314 1 14.4Z',
  'M23 14.4V9.6C23 9.26863 22.7314 9 22.4 9H20.6C20.2686 9 20 9.26863 20 9.6V14.4C20 14.7314 20.2686 15 20.6 15H22.4C22.7314 15 23 14.7314 23 14.4Z',
  'M8 12H16',
])
