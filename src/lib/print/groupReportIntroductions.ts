// WebKit can break after the introductory paragraph even when both it and the
// heading request a keep with the next element. Keep the first visual with them
// as one printable unit, leaving the rest of a long chapter free to paginate.
export function groupReportIntroductions(doc: Document) {
  for (const section of doc.querySelectorAll('main.edition:has(> .folio-cover) .visual-chapter')) {
    const [heading, introduction, visual] = Array.from(section.children);
    if (!heading?.matches('h2') || !introduction?.matches('.edition-deck') ||
        !visual?.matches('.gauge-sport, .lab-figure, .field-card')) continue;
    const group = doc.createElement('div');
    group.className = 'print-introduction';
    heading.before(group);
    group.append(heading, introduction, visual);
  }
}
