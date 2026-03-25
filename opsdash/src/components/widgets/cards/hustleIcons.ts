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
            class: props.class,
            viewBox: '0 0 24 24',
            fill: 'none',
            xmlns: 'http://www.w3.org/2000/svg',
            stroke: 'currentColor',
            'stroke-width': 1.85,
            'stroke-linecap': 'round',
            'stroke-linejoin': 'round',
            'aria-hidden': 'true',
          },
          paths.map((d) => h('path', { d })),
        )
    },
  })
}

export const HustleRunIcon = createIcon('HustleRunIcon', [
  'M14.8 4.6a1.8 1.8 0 1 1-3.6 0 1.8 1.8 0 0 1 3.6 0Z',
  'M11.3 8.1 8.7 10.9l-2.8.9',
  'M12.2 8.3l2.9 1.6 2.7-.3',
  'M11.7 10.8l2 2.3-1.2 4.3',
  'M10.8 11.6 8.9 15l-3.4 2.4',
  'M13.8 13.2l4 2.1 1.4 3.3',
])

export const HustleSwimIcon = createIcon('HustleSwimIcon', [
  'M8.3 7.2a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z',
  'M10.2 10.1 13.1 11l2.2-1.1',
  'M9.2 11.2 11 13.2l3.9 1.2',
  'M3.5 15.5c1.3 1 2.6 1 3.9 0 1.3-1 2.6-1 3.9 0 1.3 1 2.6 1 3.9 0 1.3-1 2.6-1 3.9 0',
  'M5 18.3c1.1.8 2.2.8 3.3 0 1.1-.8 2.2-.8 3.3 0 1.1.8 2.2.8 3.3 0 1.1-.8 2.2-.8 3.3 0',
])

export const HustleRideIcon = createIcon('HustleRideIcon', [
  'M7.3 17.3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z',
  'M17.5 17.3a3 3 0 1 1 0-6 3 3 0 0 1 0 6Z',
  'M10.2 8.1h2.8l1.9 2.8',
  'M9.9 8.1 7.4 12.5l3.4.1 2.3-4.5',
  'M13.1 12.5h4.4',
  'M11.8 5.5a1.4 1.4 0 1 1 0 2.8 1.4 1.4 0 0 1 0-2.8Z',
])

export const HustleDeadliftIcon = createIcon('HustleDeadliftIcon', [
  'M12 4.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4Z',
  'M10.2 9.1 8.6 12.7',
  'M13.8 9.1l1.6 3.6',
  'M9.1 11.3h5.8',
  'M7.1 12.7H4.4',
  'M19.6 12.7h-2.7',
  'M3.2 11.1v3.2',
  'M20.8 11.1v3.2',
  'M8.8 17.2 10.1 13',
  'M15.2 17.2 13.9 13',
])
