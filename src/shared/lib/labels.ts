import { it } from '@/i18n';

/**
 * @deprecated Import from `@/i18n` instead:
 * `import { strings as t } from '@/i18n'`
 * Kept for backward compatibility — values now live in `src/i18n/it.ts`.
 */
export const labels = {
  inventory: {
    title: it.inventory.title,
    searchPlaceholder: it.inventory.searchPlaceholder,
    allCategories: it.inventory.allCategories,
    name: it.inventory.name,
    quantity: it.inventory.quantity,
    category: it.inventory.category,
    actions: it.inventory.actions,
    saveSnapshot: it.inventory.saveSnapshot,
    snapshotNotePlaceholder: it.inventory.snapshotNotePlaceholder,
    exportPdf: it.inventory.exportPdf,
    history: it.inventory.history,
    noItems: it.inventory.noItems,
    noSnapshots: it.inventory.noSnapshots,
    newItem: it.inventory.newItem,
    newCategory: it.inventory.newCategory,
    added: it.inventory.added,
    removed: it.inventory.removed,
    changed: it.inventory.changed,
  },
  surveys: {
    title: it.surveys.title,
    newSurvey: it.surveys.newSurvey,
    preview: it.surveys.preview,
    edit: it.surveys.edit,
    publish: it.surveys.publish,
    close: it.surveys.close,
    reopen: it.surveys.reopen,
    delete: it.surveys.delete,
    copyLink: it.surveys.copyLink,
    copied: it.surveys.copied,
    results: it.surveys.results,
    responses: it.surveys.responses,
    submit: it.surveys.submit,
    alreadySubmitted: it.surveys.alreadySubmitted,
  },
} as const
