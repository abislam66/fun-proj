/** Pure array-reordering helpers behind the admin photo manager's up/down/cover controls. */

export function movePhotoToFront<T>(ids: readonly T[], id: T): T[] {
  if (!ids.includes(id)) return [...ids];
  return [id, ...ids.filter((item) => item !== id)];
}

export function movePhoto<T>(
  ids: readonly T[],
  id: T,
  direction: "up" | "down",
): T[] {
  const index = ids.indexOf(id);
  if (index === -1) return [...ids];

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= ids.length) return [...ids];

  const next = [...ids];
  const current = next[index] as T;
  const swapTarget = next[swapWith] as T;
  next[index] = swapTarget;
  next[swapWith] = current;
  return next;
}
