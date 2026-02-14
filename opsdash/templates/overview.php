<?php
// Minimal mount point; assets are loaded via Util::addScript in controller
?>
<?php
// Template receives optional $version and $changelog from controller
$ver = isset($version) ? (string)$version : '';
$chg = isset($changelog) ? (string)$changelog : '';
$themePref = isset($themePreference) ? (string)$themePreference : '';
$defaultWidgets = $defaultWidgets ?? [];
$defaultWidgetsJson = json_encode($defaultWidgets, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT);
?>
<div
  id="app"
  data-opsdash-version="<?php echo htmlspecialchars($ver, ENT_QUOTES); ?>"
  data-opsdash-changelog="<?php echo htmlspecialchars($chg, ENT_QUOTES); ?>"
  data-opsdash-theme-preference="<?php echo htmlspecialchars($themePref, ENT_QUOTES); ?>"
  data-opsdash-default-widgets="<?php echo htmlspecialchars($defaultWidgetsJson ?: '', ENT_QUOTES); ?>"
>
  <style>
    #content.app-opsdash #app {
      min-height: calc(100vh - 56px);
      background: var(--color-main-background, #f6f7f9);
      color: var(--color-main-text, #1f2937);
      padding: 20px 16px;
    }
    #content.app-opsdash #app .opsdash-boot {
      max-width: 680px;
      margin: 20px auto;
      padding: 24px 24px 20px;
      border-radius: 18px;
      background: color-mix(in srgb, var(--color-main-background, #ffffff) 88%, var(--color-primary-element, #0082c9) 12%);
      border: 1px solid var(--color-border, #e5e7eb);
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
    }
    #content.app-opsdash #app .opsdash-boot__title {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 6px;
      letter-spacing: 0.01em;
    }
    #content.app-opsdash #app .opsdash-boot__hint {
      font-size: 13px;
      color: var(--color-text-maxcontrast, #6b7280);
      margin-top: 8px;
      line-height: 1.45;
    }
    #content.app-opsdash #app .opsdash-boot__bars {
      display: grid;
      gap: 9px;
      margin-top: 13px;
    }
    #content.app-opsdash #app .opsdash-boot__bar {
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(90deg, rgba(148, 163, 184, 0.22), rgba(148, 163, 184, 0.42));
      overflow: hidden;
      position: relative;
    }
    #content.app-opsdash #app .opsdash-boot__bar::after {
      content: '';
      position: absolute;
      inset: 0;
      transform: translateX(-60%);
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.5), transparent);
      animation: opsdash-boot-shimmer 1.4s ease-in-out infinite;
    }
    #content.app-opsdash #app .opsdash-boot__bar--short { width: 52%; }
    #content.app-opsdash #app .opsdash-boot__bar--medium { width: 72%; }
    #content.app-opsdash #app .opsdash-boot__bar--full { width: 100%; }
    @keyframes opsdash-boot-shimmer {
      0% { transform: translateX(-60%); }
      100% { transform: translateX(140%); }
    }
  </style>
  <div class="opsdash-boot">
    <div class="opsdash-boot__title">Preparing your dashboard…</div>
    <div class="opsdash-boot__bars">
      <div class="opsdash-boot__bar opsdash-boot__bar--full"></div>
      <div class="opsdash-boot__bar opsdash-boot__bar--medium"></div>
      <div class="opsdash-boot__bar opsdash-boot__bar--short"></div>
    </div>
    <div class="opsdash-boot__hint">This usually takes a moment on first load.</div>
  </div>
</div>
