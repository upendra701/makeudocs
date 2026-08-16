export async function normalizeDocxTableLayout(container: HTMLElement) {
  if ("fonts" in document && document.fonts?.ready) {
    await document.fonts.ready;
  }

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  );

  const tables = Array.from(container.querySelectorAll<HTMLTableElement>("table"));

  tables.forEach((table) => {
    table.removeAttribute("height");
    table.style.setProperty("height", "auto", "important");
    table.style.setProperty("max-height", "none", "important");
    table.style.setProperty("overflow", "visible", "important");
    table.style.setProperty("border-collapse", "collapse", "important");

    const rows = Array.from(table.querySelectorAll<HTMLTableRowElement>("tr"));
    rows.forEach((row) => {
      row.removeAttribute("height");
      row.style.setProperty("height", "auto", "important");
      row.style.setProperty("min-height", "0", "important");
      row.style.setProperty("max-height", "none", "important");
      row.style.setProperty("overflow", "visible", "important");

      const cells = Array.from(row.children).filter(
        (child): child is HTMLTableCellElement => child instanceof HTMLTableCellElement
      );

      cells.forEach((cell) => {
        cell.removeAttribute("height");
        cell.style.setProperty("height", "auto", "important");
        cell.style.setProperty("min-height", "0", "important");
        cell.style.setProperty("max-height", "none", "important");
        cell.style.setProperty("overflow", "visible", "important");
        cell.style.setProperty("white-space", "normal", "important");
        cell.style.setProperty("overflow-wrap", "break-word", "important");
        cell.style.setProperty("word-break", "normal", "important");
        cell.style.setProperty("vertical-align", "top", "important");

        const descendants = Array.from(cell.querySelectorAll<HTMLElement>("*"));
        descendants.forEach((node) => {
          node.style.setProperty("height", "auto", "important");
          node.style.setProperty("min-height", "0", "important");
          node.style.setProperty("max-height", "none", "important");
          node.style.setProperty("overflow", "visible", "important");
          node.style.setProperty("white-space", "normal", "important");
          node.style.setProperty("overflow-wrap", "break-word", "important");
        });
      });
    });
  });

  await new Promise<void>((resolve) =>
    requestAnimationFrame(() => resolve())
  );
}
