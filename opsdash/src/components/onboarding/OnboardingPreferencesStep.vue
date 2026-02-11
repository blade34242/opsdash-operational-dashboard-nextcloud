<template>
  <h3>Final tweaks</h3>
  <p class="hint">You can change these options later from Config &amp; Setup.</p>
  <div class="preferences-grid">
    <article class="pref-card">
      <h4>Theme &amp; appearance</h4>
      <p class="pref-desc">Choose how Opsdash reacts to your Nextcloud theme. Charts keep their calendar colors.</p>
      <div class="theme-options" role="radiogroup" aria-label="Theme preference">
        <label class="theme-option">
          <input
            type="radio"
            name="onboarding-theme"
            value="auto"
            :checked="themePreference === 'auto'"
            @change="setThemePreference('auto')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Follow Nextcloud</div>
            <div class="theme-option__desc">Matches your account theme (currently {{ systemThemeLabel }}).</div>
          </div>
        </label>
        <label class="theme-option">
          <input
            type="radio"
            name="onboarding-theme"
            value="light"
            :checked="themePreference === 'light'"
            @change="setThemePreference('light')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Force light</div>
            <div class="theme-option__desc">Always use the light palette, even if Nextcloud switches to dark.</div>
          </div>
        </label>
        <label class="theme-option">
          <input
            type="radio"
            name="onboarding-theme"
            value="dark"
            :checked="themePreference === 'dark'"
            @change="setThemePreference('dark')"
          />
          <div class="theme-copy">
            <div class="theme-option__title">Force dark</div>
            <div class="theme-option__desc">Keep Opsdash dark, even when Nextcloud stays light.</div>
          </div>
        </label>
      </div>
      <div class="theme-preview">Preview: {{ previewTheme === 'dark' ? 'Dark' : 'Light' }} mode</div>
    </article>

    <article class="pref-card">
      <h4>Total weekly target</h4>
      <p class="pref-desc">Set your overall weekly goal. You can fine-tune per-category targets later.</p>
      <label class="field">
        <span class="label">Total target (h / week)</span>
        <input
          type="number"
          :value="totalHoursInput ?? categoryTotalHours"
          :disabled="categoriesEnabled"
          min="0"
          max="1000"
          step="0.5"
          @input="onTotalHoursChange($event.target as HTMLInputElement)"
        />
      </label>
      <p v-if="categoriesEnabled" class="pref-hint">
        Using categories — total derives from category targets ({{ categoryTotalHours.toFixed(1) }} h).
      </p>
    </article>

    <article class="pref-card">
      <h4>All-day events</h4>
      <p class="pref-desc">Tell Opsdash how many hours an all-day calendar event should contribute per day.</p>
      <label class="field">
        <span class="label">All-day hours per day</span>
        <input
          type="number"
          :value="allDayHoursInput"
          min="0"
          max="24"
          step="0.25"
          @input="onAllDayHoursChange($event.target as HTMLInputElement)"
        />
      </label>
      <p class="pref-hint">Default is 8 h — adjust if your organisation tracks different durations.</p>
    </article>

    <article class="pref-card">
      <h4>Trend lookback (global)</h4>
      <p class="pref-desc">Controls lookback for Balance, Day-off, and Category mix trends.</p>
      <label class="field">
        <span class="label">Lookback (weeks / months)</span>
        <input
          type="number"
          :value="trendLookbackInput"
          min="1"
          max="6"
          step="1"
          @input="onTrendLookbackChange($event.target as HTMLInputElement)"
        />
      </label>
      <p class="pref-hint">Applies to both week and month views.</p>
    </article>

    <article class="pref-card pref-card--reporting">
      <h4>Weekly/monthly recap</h4>
      <p class="pref-desc">Opsdash can send a summary of targets, balance, and notes so you stay aligned.</p>
      <label class="toggle-row">
        <input
          type="checkbox"
          :checked="reportingDraft.enabled"
          @change="setReportingEnabled(($event.target as HTMLInputElement).checked)"
        />
        <span>Send a recap automatically</span>
      </label>
      <template v-if="reportingDraft.enabled">
        <label class="field">
          <span class="label">Schedule</span>
          <select
            :value="reportingDraft.schedule"
            @change="setReportingSchedule(($event.target as HTMLSelectElement).value as ReportingConfig['schedule'])"
          >
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
            <option value="both">Weekly + Monthly</option>
          </select>
        </label>
        <label class="field">
          <span class="label">Mid-range reminders</span>
          <select
            :value="reportingDraft.interim"
            @change="setReportingInterim(($event.target as HTMLSelectElement).value as ReportingConfig['interim'])"
          >
            <option value="none">No interim reminder</option>
            <option value="midweek">Mid-week / mid-month only</option>
            <option value="daily">Daily nudge while enabled</option>
          </select>
        </label>
        <label class="field checkbox toggle-row">
          <input
            type="checkbox"
            :checked="reportingDraft.alertOnRisk"
            @change="updateReporting({ alertOnRisk: ($event.target as HTMLInputElement).checked })"
          />
          <span>Highlight when targets drift off-track</span>
        </label>
      </template>
    </article>

  </div>
</template>

<script setup lang="ts">
import type { ReportingConfig } from '../../services/reporting'

defineProps<{
  themePreference: 'auto' | 'light' | 'dark'
  systemThemeLabel: string
  previewTheme: 'light' | 'dark'
  setThemePreference: (value: 'auto' | 'light' | 'dark') => void
  totalHoursInput: number | null
  categoryTotalHours: number
  categoriesEnabled: boolean
  onTotalHoursChange: (el: HTMLInputElement) => void
  allDayHoursInput: number
  onAllDayHoursChange: (el: HTMLInputElement) => void
  trendLookbackInput: number
  onTrendLookbackChange: (el: HTMLInputElement) => void
  reportingDraft: ReportingConfig
  setReportingEnabled: (enabled: boolean) => void
  setReportingSchedule: (schedule: ReportingConfig['schedule']) => void
  setReportingInterim: (interim: ReportingConfig['interim']) => void
  updateReporting: (patch: Partial<ReportingConfig>) => void
}>()
</script>
