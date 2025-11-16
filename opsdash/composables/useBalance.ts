import { computed, type ComputedRef } from 'vue'
import { numOrNull, safeInt, stringOrNull } from './useSummaries'

export interface BalanceCategorySummary {
  id: string
  label: string
  hours: number
  share: number
  prevShare: number
  delta: number
  color?: string
}

export interface BalanceOverviewSummary {
  index: number
  categories: BalanceCategorySummary[]
  relations: { label: string; value: string }[]
  trend: {
    delta: Array<{ id: string; label: string; delta: number }>
    badge: string
    history: Array<{
      offset: number
      label: string
      categories: Array<{ id: string; label: string; share: number }>
    }>
  }
  daily: Array<{
    date: string
    weekday: string
    total_hours: number
    categories: Array<{ id: string; label: string; hours: number; share: number }>
  }>
  insights: string[]
  warnings: string[]
}

interface UseBalanceInput {
  stats: any
  categoryColorMap: ComputedRef<Record<string, string>>
  balanceCardConfig: ComputedRef<{ showInsights: boolean; showDailyStacks: boolean; showNotes?: boolean }>
}

export function useBalance(input: UseBalanceInput) {
  const balanceOverview = computed<BalanceOverviewSummary | null>(() => {
    const raw: any = input.stats?.balance_overview
    if (!raw || typeof raw !== 'object') {
      return null
    }

    const categories = Array.isArray(raw.categories)
      ? raw.categories.map((cat: any) => ({
          id: String(cat?.id ?? ''),
          label: String(cat?.label ?? ''),
          hours: numOrNull(cat?.hours) ?? 0,
          share: numOrNull(cat?.share) ?? 0,
          prevShare: numOrNull(cat?.prev_share) ?? 0,
          delta: numOrNull(cat?.delta) ?? 0,
          color: input.categoryColorMap.value[String(cat?.id ?? '')],
        }))
      : []

    const relations = Array.isArray(raw.relations)
      ? raw.relations.map((rel: any) => ({
          label: String(rel?.label ?? ''),
          value: String(rel?.value ?? ''),
        }))
      : []

    const trendHistoryRaw = Array.isArray(raw.trend?.history)
      ? raw.trend.history
      : (Array.isArray(raw.trendHistory) ? raw.trendHistory : [])
    const trend = {
      delta: Array.isArray(raw.trend?.delta)
        ? raw.trend.delta.map((entry: any) => ({
            id: String(entry?.id ?? ''),
            label: String(entry?.label ?? ''),
            delta: numOrNull(entry?.delta) ?? 0,
          }))
        : [],
      badge: String(raw.trend?.badge ?? ''),
      history: trendHistoryRaw.map((entry: any) => ({
        offset: safeInt(entry?.offset) ?? 0,
        label: String(entry?.label ?? ''),
        categories: Array.isArray(entry?.categories)
          ? entry.categories.map((cat: any) => ({
              id: String(cat?.id ?? ''),
              label: String(cat?.label ?? ''),
              share: numOrNull(cat?.share) ?? 0,
            }))
          : [],
      })),
    }

    const daily = Array.isArray(raw.daily)
      ? raw.daily.map((day: any) => ({
          date: String(day?.date ?? ''),
          weekday: String(day?.weekday ?? ''),
          total_hours: numOrNull(day?.total_hours) ?? 0,
          categories: Array.isArray(day?.categories)
            ? day.categories.map((cat: any) => ({
                id: String(cat?.id ?? ''),
                label: String(cat?.label ?? ''),
                hours: numOrNull(cat?.hours) ?? 0,
                share: numOrNull(cat?.share) ?? 0,
              }))
            : [],
        }))
      : []

    const insightsRaw = Array.isArray(raw.insights)
      ? raw.insights.map((s: any) => String(s))
      : []
    const warnings = Array.isArray(raw.warnings)
      ? raw.warnings.map((s: any) => String(s))
      : []
    const indexVal = numOrNull(raw.index) ?? 0
    const filteredInsights = input.balanceCardConfig.value.showInsights ? insightsRaw : []

    return {
      index: indexVal,
      categories,
      relations,
      trend,
      daily,
      insights: filteredInsights,
      warnings,
    }
  })

  return {
    balanceOverview,
  }
}
