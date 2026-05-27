export function permuteDimensions(width, height, depth) {
  const w = Number(width);
  const h = Number(height);
  const d = Number(depth);
  const orientations = [
    [w, h, d],
    [w, d, h],
    [h, w, d],
    [h, d, w],
    [d, w, h],
    [d, h, w],
  ];
  const seen = new Set();

  return orientations.reduce((acc, [ow, oh, od]) => {
    const key = `${ow}:${oh}:${od}`;
    if (seen.has(key)) return acc;
    seen.add(key);
    acc.push({ width: ow, height: oh, depth: od });
    return acc;
  }, []);
}

export function productFitsBox({ width, height, length, weight }, box, shrinkFactor = 0.95) {
  const bin = {
    width: Number(box.widthMm) * shrinkFactor,
    height: Number(box.heightMm) * shrinkFactor,
    depth: Number(box.lengthMm) * shrinkFactor,
    maxWeight: Number(box.maxWeightG),
  };

  const item = {
    width: Number(width),
    height: Number(height),
    depth: Number(length),
    weight: Number(weight),
  };

  if (item.weight > bin.maxWeight) return false;

  return permuteDimensions(item.width, item.height, item.depth).some(
    (orientation) =>
      orientation.width <= bin.width
      && orientation.height <= bin.height
      && orientation.depth <= bin.depth
  );
}
