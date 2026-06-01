export function enableScrollChaining(container) {
  if (!container) {
    return () => {};
  }

  container.style.overscrollBehaviorY = "auto";

  function findScrollableParent(node) {
    let current = node?.parentElement;

    while (current) {
      const style = window.getComputedStyle(current);
      const overflowY = style.overflowY;
      if (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay")
        && current.scrollHeight > current.clientHeight + 1
      ) {
        return current;
      }
      current = current.parentElement;
    }

    return document.scrollingElement || document.documentElement;
  }

  function scrollParentBy(deltaY) {
    const parentScroller = findScrollableParent(container);
    if (parentScroller && parentScroller !== container) {
      parentScroller.scrollTop += deltaY;
      return;
    }

    window.scrollBy({ top: deltaY, left: 0, behavior: "auto" });
  }

  function onWheel(event) {
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atTop = scrollTop <= 0;
    const atBottom = scrollTop + clientHeight >= scrollHeight - 1;

    if ((event.deltaY < 0 && atTop) || (event.deltaY > 0 && atBottom)) {
      scrollParentBy(event.deltaY);
    }
  }

  container.addEventListener("wheel", onWheel, { passive: true });

  return () => {
    container.removeEventListener("wheel", onWheel);
    container.style.overscrollBehaviorY = "";
  };
}
