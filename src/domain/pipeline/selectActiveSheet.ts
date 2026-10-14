import type { Sheet, Workbook } from '../model';

/**
 * The active sheet of a workbook. Preference: the named `activeSheetName`, else
 * the first visible sheet, else the first sheet; `null` for a sheet-less workbook.
 * Pure selector so the store, U2 and U3 agree on one owner (AD-12).
 */
export function selectActiveSheet(workbook: Workbook): Sheet | null {
  const visible = workbook.sheets.filter((sheet) => !sheet.hidden);
  return (
    workbook.sheets.find((sheet) => sheet.name === workbook.activeSheetName) ??
    visible[0] ??
    workbook.sheets[0] ??
    null
  );
}
